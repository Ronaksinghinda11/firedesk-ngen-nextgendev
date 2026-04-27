/**
 * Script to set up or reset the organization and enforce plant limits
 * Usage: node src/scripts/setOrganizationLimit.js
 */

const { sequelize } = require('../../config/config');
const { Organization } = require('../models');

async function setOrganizationLimit() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find existing organization
        let organization = await Organization.findOne();

        if (!organization) {
            console.log('No organization found. Creating default organization...');
            organization = await Organization.create({
                organization_name: 'Default Organization',
                organization_code: 'ORG-DEFAULT',
                address: 'Default Address',
                no_of_plants: 3
            });
            console.log('Default organization created.');
        } else {
            console.log(`Found organization: ${organization.organization_name}`);

            // Update limit to 3
            if (organization.no_of_plants !== 3) {
                console.log(`Updating no_of_plants from ${organization.no_of_plants} to 3...`);
                await organization.update({ no_of_plants: 3 });
                console.log('Organization limit updated successfully.');
            } else {
                console.log('Organization already has no_of_plants set to 3.');
            }
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error setting organization limit:', error);
        process.exit(1);
    }
}

setOrganizationLimit();
