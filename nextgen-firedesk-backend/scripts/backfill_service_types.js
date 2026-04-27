const { sequelize } = require('../config/config');
const { Form, Question, FormSection, FormQuestion } = require('../src/models/service-form');

async function backfillServiceTypes() {
    try {
        const forms = await Form.findAll({
            include: [{
                model: FormSection,
                as: 'sections',
                include: [{
                    model: FormQuestion,
                    as: 'formQuestions',
                    include: [{ model: Question, as: 'question' }]
                }]
            }]
        });

        console.log(`Found ${forms.length} forms to process.`);

        for (const form of forms) {
            let serviceType = 'Inspection'; // Default
            const types = new Set();

            // Gather types from questions
            if (form.sections) {
                for (const section of form.sections) {
                    if (section.formQuestions) {
                        for (const fq of section.formQuestions) {
                            if (fq.question && fq.question.question_type) {
                                types.add(fq.question.question_type.toLowerCase());
                            }
                        }
                    }
                }
            }

            // Determine dominant type
            if (types.has('maintenance')) {
                serviceType = 'Maintenance';
            } else if (types.has('testing')) {
                serviceType = 'Testing';
            } else if (types.has('inspection')) {
                serviceType = 'Inspection';
            }

            console.log(`Updating Form ${form.service_name} (${form.id}) to ${serviceType} [Types found: ${Array.from(types).join(', ')}]`);
            await form.update({ service_type: serviceType });
        }

        console.log('Backfill complete.');
    } catch (error) {
        console.error('Error backfilling forms:', error);
    } finally {
        await sequelize.close();
    }
}

backfillServiceTypes();
