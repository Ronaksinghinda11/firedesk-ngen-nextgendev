/**
 * Historical Service Data Seeder
 * 
 * Generates historical service submissions and answers for existing assets
 * based on their scheduler configuration. This creates realistic testing data
 * with varied health statuses.
 * 
 * Usage: node scripts/seed_history_data.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../config/config');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    HISTORY_MONTHS: 1,                    // How far back to generate history
    COMPLIANCE_PROBABILITIES: {
        COMPLIANT: 0.85,                  // 65% of answers are compliant
        NON_COMPLIANT: 0.15               // 35% have issues (increased for more health variation)
    }
};

// Random data generators
const APPROVAL_REMARKS = [
    'Good work', 'Approved', 'All checks passed',
    'Verified and approved', 'Service completed satisfactorily',
    'Well documented', 'Excellent maintenance'
];

const CANCEL_REASONS = [
    'Weather conditions', 'Asset under maintenance',
    'Technician unavailable', 'Duplicate entry', 'Rescheduled',
    'Emergency prioritization', 'Parts not available'
];

const REJECTION_REMARKS = [
    'Incomplete documentation', 'Photos unclear',
    'Wrong asset serviced', 'Missing signatures', 'Data inconsistencies',
    'Requires re-inspection', 'Measurements out of range'
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomHours(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addHours(date, hours) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}



function rollCompliance() {
    return Math.random() < CONFIG.COMPLIANCE_PROBABILITIES.COMPLIANT ? 'COMPLIANT' : 'NON_COMPLIANT';
}

async function generateSubmissionNumber(plantCode) {
    const uniqueId = uuidv4().split('-')[0];
    return `SRV-${plantCode || 'NA'}-${Date.now()}-${uniqueId}`;
}

// ============================================
// MAIN SEEDER FUNCTION
// ============================================

async function seedHistoryData() {
    console.log('\n🚀 Starting Historical Service Data Seeder...\n');
    console.log(`📅 Generating ${CONFIG.HISTORY_MONTHS} months of history`);
    console.log(`📊 Status distribution: EXACTLY 2 Lapsed, 2 Rejected, rest Approved\n`);

    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Import all models from the models index (which sets up associations)
        const {
            Asset,
            Plant,
            Scheduler,
            Form,
            FormQuestion,
            Question,
            Condition,
            InspectionFrequency,
            ServiceSubmission,
            ServiceAnswer,
            Technician,
            Manager
        } = require('../src/models');

        const assetHealthService = require('../src/services/assets/assetHealthService');

        // ============================================
        // STEP 1: Fetch all required data
        // ============================================
        console.log('📥 Fetching data from database...');

        // Get all plants
        const plants = await Plant.findAll({
            where: { status: 'Active' },
            attributes: ['id', 'plant_code', 'plant_name']
        });
        console.log(`   Found ${plants.length} active plants`);

        // Get all assets
        const assets = await Asset.findAll({
            where: { status: 'ACTIVE' },
            attributes: ['id', 'asset_code', 'plant_id', 'category_id', 'product_id']
        });
        console.log(`   Found ${assets.length} active assets`);

        // Get all schedulers
        const schedulers = await Scheduler.findAll({
            where: { is_active: true },
            attributes: ['id', 'plant_id', 'category_id', 'schedule_start_date', 'schedule_end_date',
                'inspection_frequency', 'testing_frequency', 'maintenance_frequency']
        });
        console.log(`   Found ${schedulers.length} active schedulers`);

        // Get all frequencies from database
        const frequencies = await InspectionFrequency.findAll({
            where: { is_active: true },
            attributes: ['id', 'frequency_name', 'interval_days']
        });
        const frequencyMap = {};
        frequencies.forEach(f => {
            frequencyMap[f.frequency_name] = { id: f.id, interval_days: f.interval_days };
            frequencyMap[f.frequency_name.toLowerCase()] = { id: f.id, interval_days: f.interval_days };
        });
        console.log(`   Loaded ${frequencies.length} frequencies from database`);

        // Get all forms
        const forms = await Form.findAll({
            where: { status: 'Active' },
            attributes: ['id', 'form_code', 'service_name', 'service_type', 'category_id', 'product_id', 'frequency_id']
        });
        console.log(`   Found ${forms.length} active forms`);

        // Get all conditions for non-compliant answers
        const conditions = await Condition.findAll({
            where: { is_active: true },
            attributes: ['id', 'condition_code', 'condition_name', 'severity_level', 'priority_score', 'health_impact']
        });
        console.log(`   Found ${conditions.length} conditions`);

        // Get a technician for answered_by field
        const technician = await Technician.findOne({
            where: { status: 'Active' },
            attributes: ['id', 'user_id']
        });
        if (!technician) {
            console.log('⚠️  No active technician found, will skip answer creation');
        }

        // Get a manager for approved_by field
        const manager = await Manager.findOne({
            where: { status: 'Active' },
            attributes: ['id']
        });

        // Create plant code map
        const plantCodeMap = {};
        plants.forEach(p => { plantCodeMap[p.id] = p.plant_code; });

        // Create scheduler lookup by plant+category
        const schedulerLookup = {};
        schedulers.forEach(s => {
            const key = `${s.plant_id}_${s.category_id}`;
            schedulerLookup[key] = s;
        });

        // ============================================
        // STEP 2: Calculate date range
        // ============================================
        // Date variables initialized
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log(`\n📅 Seeding exactly 1 past mathematical occurrence before today (${today.toISOString().split('T')[0]})\n`);

        // ============================================
        // STEP 3: Process each asset
        // ============================================
        let totalSubmissions = 0;
        let totalAnswers = 0;
        let assetsProcessed = 0;
        const statusCounts = { approved: 0, PENDING: 0, cancelled: 0, rejected: 0 };

        for (const asset of assets) {
            // Find scheduler for this asset's plant and category
            const schedulerKey = `${asset.plant_id}_${asset.category_id}`;
            const scheduler = schedulerLookup[schedulerKey];

            if (!scheduler) {
                continue; // No scheduler for this asset
            }

            const plantCode = plantCodeMap[asset.plant_id] || 'NA';

            // Get frequency types from scheduler
            const frequencyTypes = {
                inspection: scheduler.inspection_frequency,
                testing: scheduler.testing_frequency,
                maintenance: scheduler.maintenance_frequency
            };

            // Process each frequency type
            for (const [serviceType, freqString] of Object.entries(frequencyTypes)) {
                if (!freqString) continue;

                // Handle multiple frequencies (comma-separated)
                const freqList = freqString.split(',').map(f => f.trim());

                for (const freqName of freqList) {
                    if (!freqName) continue;

                    const freqInfo = frequencyMap[freqName] || frequencyMap[freqName.toLowerCase()];
                    if (!freqInfo || !freqInfo.interval_days) {
                        console.log(`   ⚠️  Unknown frequency: ${freqName}`);
                        continue;
                    }

                    // Find matching form
                    const form = findBestForm(forms, asset.category_id, asset.product_id, freqInfo.id, serviceType);
                    if (!form) {
                        continue; // No form for this service type
                    }

                    // Get questions for this form
                    const formQuestions = await FormQuestion.findAll({
                        where: { form_id: form.id },
                        attributes: ['question_id'],
                        include: [{
                            model: Question,
                            as: 'question',
                            attributes: ['id', 'question_text', 'answer_type']
                        }]
                    });

                    // We only need ONE past service that is perfectly aligned with the scheduler.
                    // Find the single date occurrence strictly before today
                    let current = new Date(scheduler.schedule_start_date);
                    current.setHours(0,0,0,0);
                    
                    if (current >= today) {
                        // Keep stepping back by interval until strictly before today
                        let safeCounter = 0;
                        while (current >= today && safeCounter < 1000) {
                            current.setDate(current.getDate() - freqInfo.interval_days);
                            safeCounter++;
                        }
                    } else {
                        // Keep stepping forward until the NEXT step would cross today
                        let safeCounter = 0;
                        while (current < today && safeCounter < 1000) {
                            let next = new Date(current);
                            next.setDate(next.getDate() + freqInfo.interval_days);
                            if (next >= today) break;
                            current = next;
                            safeCounter++;
                        }
                    }

                    const serviceDates = [new Date(current)];

                    // Create submissions for exactly 1 past date
                    for (const scheduledDate of serviceDates) {
                        let status = 'approved';
                        statusCounts[status]++;

                        const submissionData = {
                            submission_number: await generateSubmissionNumber(plantCode),
                            asset_id: asset.id,
                            plant_id: asset.plant_id,
                            form_id: form.id,
                            schedule_id: scheduler.id,
                            frequency_id: freqInfo.id,
                            scheduled_date: scheduledDate.toISOString().split('T')[0],
                            inspection_type: capitalizeFirst(serviceType),
                            frequency: freqName,
                            status: status
                        };

                        // Add status-specific fields
                        const scheduledDateTime = new Date(scheduledDate);
                        scheduledDateTime.setHours(9, 0, 0, 0); // Start at 9 AM

                        // Randomize completed offset within reasonable bounds (e.g. 1 to ~15 days based on freq)
                        const randomDaysOffset = Math.floor(Math.random() * Math.min(freqInfo.interval_days - 1, 15));
                        
                        const baseSubmittedDate = new Date(scheduledDateTime);
                        baseSubmittedDate.setDate(baseSubmittedDate.getDate() + randomDaysOffset);

                        const submittedAt = addHours(baseSubmittedDate, randomHours(1, 8));
                        const approvedAt = addHours(submittedAt, randomHours(1, 24));

                        Object.assign(submissionData, {
                            submitted_at: submittedAt,
                            completed_at: submittedAt, // this correctly sets the random completion
                            approved_at: approvedAt,
                            approval_status: 'approved',
                            approval_remarks: randomElement(APPROVAL_REMARKS),
                            approved_by: manager?.id || null,
                            technician_id: technician?.id,
                            created_by: technician?.user_id
                        });

                        try {
                            // Create submission
                            const submission = await ServiceSubmission.create(submissionData);
                            totalSubmissions++;

                            // Create answers only for approved submissions
                            if (status === 'approved' && technician && formQuestions.length > 0) {
                                let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;
                                let totalPriorityScore = 0;

                                for (const fq of formQuestions) {
                                    if (!fq.question) continue;

                                    const compliance = rollCompliance();
                                    const answerData = {
                                        submission_id: submission.id,
                                        question_id: fq.question_id,
                                        compliance_status: compliance,
                                        answered_by: technician.id,
                                        answered_at: submissionData.submitted_at,
                                        boolean_value: compliance === 'COMPLIANT' ? true : false
                                    };

                                    // If non-compliant, pick a random condition
                                    if (compliance === 'NON_COMPLIANT' && conditions.length > 0) {
                                        const condition = randomElement(conditions);
                                        Object.assign(answerData, {
                                            selected_condition_id: condition.id,
                                            condition_code: condition.condition_code,
                                            condition_name: condition.condition_name,
                                            severity_level: condition.severity_level,
                                            priority_score: condition.priority_score,
                                            health_impact: condition.health_impact,
                                            non_compliance_condition_id: condition.id
                                        });

                                        // Count severities
                                        if (condition.severity_level === 'CRITICAL') criticalCount++;
                                        else if (condition.severity_level === 'HIGH') highCount++;
                                        else if (condition.severity_level === 'MEDIUM') mediumCount++;
                                        else if (condition.severity_level === 'LOW') lowCount++;

                                        totalPriorityScore += condition.priority_score || 0;
                                    }

                                    await ServiceAnswer.create(answerData);
                                    totalAnswers++;
                                }

                                // Update submission metrics
                                await submission.update({
                                    critical_count: criticalCount,
                                    high_count: highCount,
                                    medium_count: mediumCount,
                                    low_count: lowCount,
                                    total_priority_score: totalPriorityScore
                                });

                                // Update asset health
                                try {
                                    await assetHealthService.updateAssetHealthFromService(asset.id, submission.id);
                                } catch (healthError) {
                                    console.log(`   ⚠️  Health update failed for asset ${asset.asset_code}: ${healthError.message}`);
                                }
                            }
                        } catch (createError) {
                            // Skip duplicates gracefully
                            if (createError.name !== 'SequelizeUniqueConstraintError') {
                                console.error(`   ❌ Error creating submission: ${createError.message}`);
                            }
                        }
                    }
                }
            }

            assetsProcessed++;
            if (assetsProcessed % 10 === 0) {
                console.log(`   Processed ${assetsProcessed}/${assets.length} assets (${totalSubmissions} submissions)`);
            }
        }

        // ============================================
        // STEP 4: Print summary
        // ============================================
        console.log('\n' + '='.repeat(50));
        console.log('📊 SEEDING COMPLETE');
        console.log('='.repeat(50));
        console.log(`   Assets processed: ${assetsProcessed}`);
        console.log(`   Total submissions created: ${totalSubmissions}`);
        console.log(`   Total answers created: ${totalAnswers}`);
        console.log('\n   Status breakdown:');
        console.log(`     ✅ Approved: ${statusCounts.approved}`);
        console.log(`     ⏳ Lapsed (PENDING): ${statusCounts.PENDING}`);
        console.log(`     🚫 Cancelled: ${statusCounts.cancelled}`);
        console.log(`     ❌ Rejected: ${statusCounts.rejected}`);
        console.log('='.repeat(50) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    }
}

// ============================================
// HELPER: Find best matching form
// ============================================
function findBestForm(forms, categoryId, productId, frequencyId, serviceType) {
    const formServiceType = capitalizeFirst(serviceType);

    // Priority 1: Exact match (Category + Product + Frequency + ServiceType)
    let form = forms.find(f =>
        f.category_id === categoryId &&
        f.product_id === productId &&
        f.frequency_id === frequencyId &&
        f.service_type === formServiceType
    );
    if (form) return form;

    // Priority 2: Category + Frequency + ServiceType (no product)
    form = forms.find(f =>
        f.category_id === categoryId &&
        !f.product_id &&
        f.frequency_id === frequencyId &&
        f.service_type === formServiceType
    );
    if (form) return form;

    // Priority 3: Category + Product + ServiceType (no frequency)
    form = forms.find(f =>
        f.category_id === categoryId &&
        f.product_id === productId &&
        !f.frequency_id &&
        f.service_type === formServiceType
    );
    if (form) return form;

    // Priority 4: Category + ServiceType only
    form = forms.find(f =>
        f.category_id === categoryId &&
        !f.product_id &&
        !f.frequency_id &&
        f.service_type === formServiceType
    );
    if (form) return form;

    return null;
}

// ============================================
// HELPER: Calculate historical dates
// ============================================
function calculateHistoricalDates(startDate, endDate, intervalDays) {
    const dates = [];
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + intervalDays);
    }

    return dates;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// RUN SEEDER
// ============================================
seedHistoryData();