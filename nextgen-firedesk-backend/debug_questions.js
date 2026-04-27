require('dotenv').config();
const { sequelize } = require('./config/config');

async function debug() {
    try {
        console.log('Connected.');
        const questions = await sequelize.query(`
            SELECT q.id, q.question_text, q.question_type, q.service_type, q.answer_type
            FROM questions q
            WHERE q.question_type ILIKE 'inspection'
            LIMIT 10
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('--- Questions Debug (Legacy Types) ---');
        questions.forEach(q => {
            console.log(`ID: ${q.id}`);
            console.log(`Text: ${q.question_text}`);
            console.log(`QuestionType: '${q.question_type}'`);
            console.log(`ServiceType: '${q.service_type}'`);
            console.log(`AnswerType: '${q.answer_type}'`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

debug();
