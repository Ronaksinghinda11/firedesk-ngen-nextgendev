const { sequelize } = require('../config/config');
const { IncidentCapaStep } = require('../src/models/sams');
const UploadedFile = require('../src/models/common/UploadedFile');
const { Op } = require('sequelize');

async function purge() {
    const transaction = await sequelize.transaction();
    try {
        console.log('Starting Purge...');

        // 1. Get all file references from CapaSteps
        const steps = await IncidentCapaStep.findAll({
            where: {
                documentsData: { [Op.ne]: null }
            }
        });

        const activeFileIds = new Set();
        steps.forEach(step => {
            if (step.documentsData && step.documentsData.url) {
                const parts = step.documentsData.url.split('/');
                const id = parts[parts.length - 1];
                if (id) activeFileIds.add(id);
            }
        });

        console.log(`Found ${activeFileIds.size} active file references.`);

        // 2. Delete files NOT in activeFileIds
        // If activeFileIds is empty, delete ALL files
        const whereClause = activeFileIds.size > 0
            ? { id: { [Op.notIn]: Array.from(activeFileIds) } }
            : {}; // Delete all if no active references

        const deleted = await UploadedFile.destroy({
            where: whereClause,
            transaction
        });

        console.log(`Deleted ${deleted} orphaned files.`);

        await transaction.commit();
        console.log('Purge Complete.');

    } catch (error) {
        await transaction.rollback();
        console.error('Purge Failed:', error);
    } finally {
        await sequelize.close();
    }
}

purge();
