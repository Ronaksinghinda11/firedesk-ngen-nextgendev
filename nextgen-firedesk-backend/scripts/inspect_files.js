const { sequelize } = require('../config/config');
const { IncidentCapaStep } = require('../src/models/sams');
const UploadedFile = require('../src/models/common/UploadedFile');

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const files = await UploadedFile.findAll({ attributes: ['id', 'original_name', 'mime_type'] });
        console.log(`\nTotal UploadedFiles in DB: ${files.length}`);
        files.forEach(f => console.log(` - [${f.id}] ${f.original_name} (${f.mime_type})`));

        const steps = await IncidentCapaStep.findAll({
            where: {
                documentsData: { [require('sequelize').Op.ne]: null }
            }
        });
        console.log(`\nTotal CapaSteps with documents: ${steps.length}`);

        steps.forEach(step => {
            console.log(`Step ID: ${step.id}, IncidentID: ${step.incidentId}`);
            console.log('documentsData:', JSON.stringify(step.documentsData, null, 2));
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

inspect();
