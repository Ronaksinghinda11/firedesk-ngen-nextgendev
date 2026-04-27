/**
 * Migration: Update service submissions to reference new split forms
 * 
 * This migration updates existing service_submissions to reference the correct
 * new forms that were created when we split forms by service type.
 * 
 * The old forms had names like: freq_category_product (e.g., "WEEKLY_Fire Extinguishers_CO2")
 * The new forms have names like: ServiceType_Category_Product_Frequency (e.g., "Inspection_Fire Extinguishers_CO2_WEEKLY")
 * 
 * This script matches each submission's inspection_type to the new form's service_type
 * and updates the form_id accordingly.
 */

const { sequelize } = require('../../config/config');
const { Op } = require('sequelize');

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await sequelize.transaction();

        try {
            console.log('🔄 Starting service submissions migration...');

            // Get all models (from index to ensure associations are loaded)
            const {
                Form,
                ServiceSubmission
            } = require('../models/service-form');

            // Get all service submissions with their current form
            const submissions = await ServiceSubmission.findAll({
                attributes: ['id', 'form_id', 'inspection_type', 'frequency_id'],
                include: [{
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'service_type', 'category_id', 'product_id', 'frequency_id']
                }],
                transaction
            });

            console.log(`📋 Found ${submissions.length} service submissions to check`);

            let updatedCount = 0;
            let skippedCount = 0;
            let alreadyCorrectCount = 0;
            let noFormFoundCount = 0;

            for (const submission of submissions) {
                try {
                    // Get the inspection type and normalize it
                    const inspectionType = (submission.inspection_type || 'Inspection').toLowerCase();
                    const normalizedServiceType = this._normalizeServiceType(inspectionType);
                    
                    if (!submission.form) {
                        console.log(`⚠️ Submission ${submission.id} has no form, skipping`);
                        skippedCount++;
                        continue;
                    }

                    const currentForm = submission.form;
                    const currentFormServiceType = (currentForm.service_type || 'Inspection').toLowerCase();

                    // Check if form's service_type matches submission's inspection_type
                    if (currentFormServiceType === normalizedServiceType) {
                        // Already pointing to correct form type
                        alreadyCorrectCount++;
                        continue;
                    }

                    // Find the new form with matching service_type
                    const newForm = await Form.findOne({
                        where: {
                            category_id: currentForm.category_id,
                            product_id: currentForm.product_id,
                            frequency_id: submission.frequency_id || currentForm.frequency_id,
                            service_type: this._capitalizeServiceType(normalizedServiceType),
                            status: 'Active'
                        },
                        transaction
                    });

                    if (!newForm) {
                        console.log(`⚠️ No matching form found for submission ${submission.id} (${inspectionType})`);
                        noFormFoundCount++;
                        continue;
                    }

                    // Update the submission to reference the new form
                    await submission.update({
                        form_id: newForm.id
                    }, { transaction });

                    updatedCount++;
                    console.log(`✅ Updated submission ${submission.id}: ${currentForm.service_name} → ${newForm.service_name}`);

                } catch (error) {
                    console.log(`❌ Error processing submission ${submission.id}:`, error.message);
                    skippedCount++;
                }
            }

            await transaction.commit();

            console.log('\n📊 Migration Summary:');
            console.log(`   Submissions updated: ${updatedCount}`);
            console.log(`   Already correct: ${alreadyCorrectCount}`);
            console.log(`   No form found: ${noFormFoundCount}`);
            console.log(`   Skipped (errors): ${skippedCount}`);
            console.log('✅ Service submissions migration completed!');

            return {
                success: true,
                updated: updatedCount,
                alreadyCorrect: alreadyCorrectCount,
                noFormFound: noFormFoundCount,
                skipped: skippedCount
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    /**
     * Normalize service type from various formats
     */
    _normalizeServiceType(inspectionType) {
        const type = inspectionType.toLowerCase().trim();
        
        if (type.includes('maintenance')) return 'maintenance';
        if (type.includes('testing') || type.includes('test')) return 'testing';
        if (type.includes('inspection') || type.includes('inspect')) return 'inspection';
        
        // Default to inspection
        return 'inspection';
    },

    /**
     * Capitalize service type for database
     */
    _capitalizeServiceType(type) {
        const typeMap = {
            'inspection': 'Inspection',
            'testing': 'Testing',
            'maintenance': 'Maintenance',
            'general': 'General'
        };
        return typeMap[type.toLowerCase()] || 'Inspection';
    },

    async down(queryInterface, Sequelize) {
        // This migration cannot be automatically reversed as we would need
        // to know the original form_id for each submission
        console.log('⚠️ This migration cannot be automatically reversed.');
        console.log('   The original form_id values were not stored.');
        console.log('   Please restore from backup if needed.');
    }
};

// Allow running directly
if (require.main === module) {
    (async () => {
        console.log('🚀 Starting Service Submissions Migration');
        console.log('=========================================\n');

        try {
            await sequelize.authenticate();
            console.log('✅ Database connected\n');

            const result = await module.exports.up(null, null);

            console.log('\n=========================================');
            console.log('🎉 Migration completed!');
            console.log(`   Updated: ${result.updated} submissions`);
            console.log(`   Already correct: ${result.alreadyCorrect} submissions`);

        } catch (error) {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}
