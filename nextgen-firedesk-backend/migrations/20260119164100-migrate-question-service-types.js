/**
 * Migration: Migrate existing questions to have service types
 * Assigns service types to existing questions based on the forms they are used in.
 * Run with: node migrations/20260119164100-migrate-question-service-types.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');
const { QueryTypes } = require('sequelize');

async function up() {
    console.log('Migrating existing questions to have service types...');

    // 1. Get all questions that don't have a service_type yet
    const questions = await sequelize.query(
        "SELECT id, question_text FROM questions WHERE service_type IS NULL",
        { type: QueryTypes.SELECT }
    );

    console.log(`Found ${questions.length} questions to migrate.`);

    let updatedCount = 0;

    for (const question of questions) {
        // 2. Find which forms use this question and what their service_type is
        // referencing the 'forms' table which has 'service_type' column
        const formsWithQuestion = await sequelize.query(
            `
      SELECT f.service_type, COUNT(*) as usage_count
      FROM form_questions fq
      JOIN forms f ON fq.form_id = f.id
      WHERE fq.question_id = :questionId
      AND f.service_type IS NOT NULL
      GROUP BY f.service_type
      ORDER BY usage_count DESC
      LIMIT 1
      `,
            {
                replacements: { questionId: question.id },
                type: QueryTypes.SELECT
            }
        );

        if (formsWithQuestion.length > 0) {
            const bestServiceType = formsWithQuestion[0].service_type;

            // 3. Update the question with the most common service type
            await sequelize.query(
                "UPDATE questions SET service_type = :serviceType WHERE id = :questionId",
                {
                    replacements: {
                        serviceType: bestServiceType,
                        questionId: question.id
                    },
                    type: QueryTypes.UPDATE
                }
            );

            console.log(`  Updated question "${question.question_text.substring(0, 30)}..." to ${bestServiceType}`);
            updatedCount++;
        } else {
            // If question is not used in any form, or used in forms without service type, we might default it or leave it null.
            // For now, let's leave it null or maybe default to 'general' if that was an option, but the user wants strict filtering.
            // Let's try to infer from question_type if it exists as a fallback
            const qDetails = await sequelize.query(
                "SELECT question_type FROM questions WHERE id = :questionId",
                {
                    replacements: { questionId: question.id },
                    type: QueryTypes.SELECT
                }
            );

            let typeToSet = null;
            if (qDetails[0] && qDetails[0].question_type) {
                // Map question_type to service_type if possible (they are very similar)
                if (['inspection', 'testing', 'maintenance'].includes(qDetails[0].question_type)) {
                    typeToSet = qDetails[0].question_type;
                }
            }

            if (typeToSet) {
                await sequelize.query(
                    "UPDATE questions SET service_type = :serviceType WHERE id = :questionId",
                    {
                        replacements: {
                            serviceType: typeToSet,
                            questionId: question.id
                        },
                        type: QueryTypes.UPDATE
                    }
                );
                console.log(`  Updated unused question "${question.question_text.substring(0, 30)}..." to ${typeToSet} (from question_type)`);
                updatedCount++;
            } else {
                console.log(`  Skipped question "${question.question_text.substring(0, 30)}..." (no usage or type info)`);
            }
        }
    }

    console.log(`✅ Migration complete. Updated ${updatedCount} / ${questions.length} questions.`);
}

async function down() {
    console.log('Rolling back question service types assignment...');
    // This is a data migration, so we probably don't want to blindly nullify everything if we rollback,
    // but for the sake of the pattern:
    await sequelize.query("UPDATE questions SET service_type = NULL");
    console.log('✅ Reverted service_type to NULL for all questions.');
}

// Allow running as standalone script
if (require.main === module) {
    const action = process.argv[2] || 'up';

    (async () => {
        try {
            await sequelize.authenticate();
            console.log('✅ Database connected\n');

            if (action === 'down') {
                await down();
            } else {
                await up();
            }

            console.log('\n✅ Data migration completed successfully');
        } catch (error) {
            console.error('\n❌ Data migration failed:', error.message);
            console.error(error);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}

module.exports = { up, down };
