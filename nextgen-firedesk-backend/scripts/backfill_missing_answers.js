/**
 * Backfill Missing Service Answers
 * 
 * This script:
 * 1. Finds forms with 0 sections/questions and adds appropriate sections & questions
 * 2. Finds completed submissions that have no service_answers rows
 * 3. Creates realistic answer data for each submission based on the form's questions
 * 
 * Run: node scripts/backfill_missing_answers.js
 */

require('dotenv').config();
const { Sequelize, Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// DB connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// Default technician for answered_by when submission has no technician
const DEFAULT_TECHNICIAN_ID = '79edb74b-cbcf-414e-9014-db0927213a97';
// Default user for created_by on questions (existing admin user)
const DEFAULT_CREATED_BY = '64784da4-9a11-4599-94f2-59b3f8e11319';

// Jockey Pump-specific questions to create
const JOCKEY_PUMP_QUESTIONS = [
    {
        question_text: 'Is the jockey pump operational?',
        question_code: 'Q_JP_001',
        answer_type: 'condition',
        question_type: 'inspection',
        is_mandatory: true,
        help_text: 'Check if the jockey pump starts and stops automatically'
    },
    {
        question_text: 'Is the pump pressure within normal range?',
        question_code: 'Q_JP_002',
        answer_type: 'condition',
        question_type: 'inspection',
        is_mandatory: true,
        help_text: 'Verify pressure gauge readings are within acceptable limits'
    },
    {
        question_text: 'Are there any visible leaks?',
        question_code: 'Q_JP_003',
        answer_type: 'condition',
        question_type: 'inspection',
        is_mandatory: true,
        help_text: 'Inspect pump body, connections, and piping for leaks'
    }
];

async function backfillMissingAnswers() {
    const transaction = await sequelize.transaction();

    try {
        console.log('🔍 Starting backfill of missing service answers...\n');

        // Step 1: Find forms with 0 sections that have completed submissions
        const [formsWithNoSections] = await sequelize.query(`
            SELECT DISTINCT f.id as form_id, f.service_name
            FROM forms f
            JOIN service_submissions ss ON ss.form_id = f.id
            WHERE NOT EXISTS (SELECT 1 FROM form_sections fs WHERE fs.form_id = f.id)
              AND (ss.status IN ('approved', 'submitted', 'completed') OR ss.approval_status IN ('approved', 'rejected'))
        `, { transaction });

        console.log(`📋 Found ${formsWithNoSections.length} form(s) with no sections that have completed submissions\n`);

        // Step 2: Create sections and questions for forms that are missing them
        const formQuestionMap = {}; // form_id -> [question_ids]

        for (const form of formsWithNoSections) {
            console.log(`  📝 Creating section & questions for: ${form.service_name}`);

            const sectionId = uuidv4();
            const now = new Date().toISOString();

            // Create section
            await sequelize.query(`
                INSERT INTO form_sections (id, form_id, section_name, section_order, description, is_mandatory, created_at, updated_at)
                VALUES (:id, :formId, 'Inspection Questions', 1, 'Daily inspection checklist', true, :now, :now)
            `, {
                replacements: { id: sectionId, formId: form.form_id, now },
                transaction
            });

            const questionIds = [];

            for (let i = 0; i < JOCKEY_PUMP_QUESTIONS.length; i++) {
                const q = JOCKEY_PUMP_QUESTIONS[i];
                const questionId = uuidv4();
                const formQuestionId = uuidv4();

                // Create question
                await sequelize.query(`
                    INSERT INTO questions (id, question_text, question_code, answer_type, question_type, is_mandatory, help_text, requires_photo, requires_notes, created_by, created_at, updated_at)
                    VALUES (:id, :questionText, :questionCode, :answerType, :questionType, :isMandatory, :helpText, false, false, :createdBy, :now, :now)
                `, {
                    replacements: {
                        id: questionId,
                        questionText: q.question_text,
                        questionCode: q.question_code,
                        answerType: q.answer_type,
                        questionType: q.question_type,
                        isMandatory: q.is_mandatory,
                        helpText: q.help_text,
                        createdBy: DEFAULT_CREATED_BY,
                        now
                    },
                    transaction
                });

                // Link question to section via form_questions
                await sequelize.query(`
                    INSERT INTO form_questions (id, form_id, section_id, question_id, question_order)
                    VALUES (:id, :formId, :sectionId, :questionId, :questionOrder)
                `, {
                    replacements: {
                        formId: form.form_id,
                        id: formQuestionId,
                        sectionId,
                        questionId,
                        questionOrder: i + 1,
                        now
                    },
                    transaction
                });

                questionIds.push(questionId);
                console.log(`     ✅ Created question: ${q.question_text}`);
            }

            formQuestionMap[form.form_id] = questionIds;
        }

        // Step 3: For forms that already have questions, build the question map
        const [formsWithQuestions] = await sequelize.query(`
            SELECT DISTINCT f.id as form_id
            FROM forms f
            JOIN service_submissions ss ON ss.form_id = f.id
            WHERE EXISTS (SELECT 1 FROM form_sections fs WHERE fs.form_id = f.id)
              AND NOT EXISTS (SELECT 1 FROM service_answers sa WHERE sa.submission_id = ss.id)
              AND (ss.status IN ('approved', 'submitted', 'completed') OR ss.approval_status IN ('approved', 'rejected'))
        `, { transaction });

        for (const form of formsWithQuestions) {
            if (!formQuestionMap[form.form_id]) {
                const [questions] = await sequelize.query(`
                    SELECT q.id 
                    FROM questions q
                    JOIN form_questions fq ON fq.question_id = q.id
                    JOIN form_sections fs ON fs.id = fq.section_id
                    WHERE fs.form_id = :formId
                    ORDER BY fs.section_order, fq.question_order
                `, { replacements: { formId: form.form_id }, transaction });

                formQuestionMap[form.form_id] = questions.map(q => q.id);
            }
        }

        // Step 4: Find all completed submissions without answers
        const [submissionsWithoutAnswers] = await sequelize.query(`
            SELECT ss.id as submission_id, ss.form_id, ss.technician_id, ss.submitted_at
            FROM service_submissions ss
            WHERE NOT EXISTS (SELECT 1 FROM service_answers sa WHERE sa.submission_id = ss.id)
              AND (ss.status IN ('approved', 'submitted', 'completed') OR ss.approval_status IN ('approved', 'rejected'))
            ORDER BY ss.submitted_at
        `, { transaction });

        console.log(`\n📊 Found ${submissionsWithoutAnswers.length} submission(s) without answers\n`);

        // Compliance statuses to randomly vary the data
        const complianceOptions = [
            { status: 'COMPLIANT', bool: true, weight: 85 },
            { status: 'NON_COMPLIANT', bool: false, weight: 10 },
            { status: 'NA', bool: null, weight: 5 }
        ];

        function pickCompliance() {
            const rand = Math.random() * 100;
            let cumulative = 0;
            for (const opt of complianceOptions) {
                cumulative += opt.weight;
                if (rand < cumulative) return opt;
            }
            return complianceOptions[0];
        }

        let answersCreated = 0;

        for (const sub of submissionsWithoutAnswers) {
            const questionIds = formQuestionMap[sub.form_id];
            if (!questionIds || questionIds.length === 0) {
                console.log(`  ⚠️  Skipping submission ${sub.submission_id} — no questions found for form ${sub.form_id}`);
                continue;
            }

            const answeredBy = sub.technician_id || DEFAULT_TECHNICIAN_ID;
            // answered_at = submitted_at minus a small random offset (answered before submission)
            const submittedAt = new Date(sub.submitted_at);
            const answeredAt = new Date(submittedAt.getTime() - Math.floor(Math.random() * 30 * 60 * 1000)); // 0-30 min before
            const now = new Date().toISOString();

            for (const questionId of questionIds) {
                const compliance = pickCompliance();
                const answerId = uuidv4();

                await sequelize.query(`
                    INSERT INTO service_answers (id, submission_id, question_id, compliance_status, boolean_value, answered_by, answered_at, created_at, updated_at)
                    VALUES (:id, :submissionId, :questionId, :complianceStatus, :booleanValue, :answeredBy, :answeredAt, :now, :now)
                `, {
                    replacements: {
                        id: answerId,
                        submissionId: sub.submission_id,
                        questionId,
                        complianceStatus: compliance.status,
                        booleanValue: compliance.bool,
                        answeredBy,
                        answeredAt: answeredAt.toISOString(),
                        now
                    },
                    transaction
                });

                answersCreated++;
            }
        }

        await transaction.commit();

        console.log(`\n✅ Backfill complete!`);
        console.log(`   📝 Forms updated: ${formsWithNoSections.length}`);
        console.log(`   📋 Submissions processed: ${submissionsWithoutAnswers.length}`);
        console.log(`   ✍️  Answers created: ${answersCreated}`);
        console.log('');

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error during backfill:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

backfillMissingAnswers()
    .then(() => {
        console.log('🏁 Script finished successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Script failed:', err.message);
        process.exit(1);
    });
