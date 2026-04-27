/**
 * Script to create INFO condition and run boolean compliance migration
 * Run this after the schema migration to seed the INFO condition
 */

const { Condition } = require('../src/models');

async function createInfoCondition() {
    try {
        console.log('Creating INFO condition for compliant answers...');
        
        // Check if INFO condition already exists
        const existing = await Condition.findOne({
            where: { condition_code: 'COMPLIANT_OK' }
        });

        if (existing) {
            console.log('INFO condition already exists:', existing.id);
            return existing;
        }

        // Create new INFO condition
        const infoCondition = await Condition.create({
            condition_code: 'COMPLIANT_OK',
            condition_name: 'Compliant / Satisfactory',
            severity_level: 'INFO',
            priority_score: 0,
            health_impact: 'No impact - item meets requirements',
            recommended_action: 'No action required',
            requires_immediate_action: false,
            is_active: true
        });

        console.log('✓ INFO condition created successfully:', infoCondition.id);
        return infoCondition;

    } catch (error) {
        console.error('Error creating INFO condition:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    createInfoCondition()
        .then(() => {
            console.log('\n✓ INFO condition setup complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ INFO condition setup failed:', error);
            process.exit(1);
        });
}

module.exports = { createInfoCondition };
