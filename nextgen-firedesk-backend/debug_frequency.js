require('dotenv').config();
const { sequelize } = require('./config/config');

async function debug() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        // 1. Find the target form
        const [forms] = await sequelize.query(`
            SELECT f.id, f.service_name, f.form_code, inf.frequency_code
            FROM forms f
            LEFT JOIN inspection_frequencies inf ON f.frequency_id = inf.id
            WHERE f.service_name ILIKE '%Yearly%'
            LIMIT 1
        `);

        if (forms.length === 0) {
            console.log('No matching form found.');
            return;
        }

        const form = forms[0];
        console.log('Found Form:', form);

        // 2. Get questions for this form
        const [questions] = await sequelize.query(`
            SELECT q.id, q.question_text, q.service_type
            FROM form_questions fq
            JOIN questions q ON fq.question_id = q.id
            WHERE fq.form_id = :formId
        `, { replacements: { formId: form.id } });

        console.log(`Form has ${questions.length} questions.`);

        // 3. Check frequencies for these questions
        for (const q of questions) {
            console.log(`\nQuestion: ${q.question_text} (${q.service_type})`);
            const [freqs] = await sequelize.query(`
                SELECT inf.frequency_code, inf.frequency_name
                FROM question_frequencies qp
                JOIN inspection_frequencies inf ON qp.frequency_id = inf.id
                WHERE qp.question_id = :questionId
            `, { replacements: { questionId: q.id } });

            if (freqs.length === 0) {
                console.log('  -> NO FREQUENCIES LINKED');
            } else {
                console.log('  -> Frequencies:', freqs.map(f => f.frequency_code).join(', '));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

debug();
