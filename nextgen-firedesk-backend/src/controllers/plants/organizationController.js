/**
 * Organization Controller
 * Handles HTTP requests for organization operations
 */

const { Organization } = require('../../models');

class OrganizationController {
    /**
     * Get the single organization
     * GET /organization
     */
    async getOrganization(req, res) {
        try {
            // Find the first organization (since we only supported one)
            const org = await Organization.findOne();

            if (!org) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            const organization = {
                id: org.id,
                organizationName: org.organization_name,
                organizationCode: org.organization_code,
                address: org.address,
                gstNumber: org.gst_number,
                country: org.country,
                state: org.state,
                city: org.city,
                createdBy: org.created_by,
                noOfPlants: org.no_of_plants,
                createdAt: org.created_at,
                updatedAt: org.updated_at
            };

            res.status(200).json({
                success: true,
                organization
            });
        } catch (error) {
            console.error('Get organization error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch organization',
                error: error.message
            });
        }
    }

    /**
     * Create organization
     * POST /organization
     * Note: Should only allow one organization
     */
    async createOrganization(req, res) {
        try {
            // Check if organization already exists
            const existingOrg = await Organization.findOne();
            if (existingOrg) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization already exists. Cannot create more than one.'
                });
            }

            const {
                organizationName,
                address,
                gstNumber,
                country,
                state,
                city,
                organizationCode
            } = req.body;

            const organization = await Organization.create({
                organization_name: organizationName,
                organization_code: organizationCode || `ORG-${Date.now()}`,
                address: address,
                gst_number: gstNumber,
                country: country || 'India',
                state: state,
                city: city,
                created_by: req.user?.id || null
            });

            const responseOrg = {
                id: organization.id,
                organizationName: organization.organization_name,
                organizationCode: organization.organization_code,
                address: organization.address,
                gstNumber: organization.gst_number,
                country: organization.country,
                state: organization.state,
                city: organization.city,
                createdBy: organization.created_by,
                noOfPlants: organization.no_of_plants,
                createdAt: organization.created_at,
                updatedAt: organization.updated_at
            };

            res.status(201).json({
                success: true,
                message: 'Organization created successfully',
                organization: responseOrg
            });
        } catch (error) {
            console.error('Create organization error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create organization',
                error: error.message
            });
        }
    }

    /**
     * Update organization
     * PUT /organization/:id
     */
    async updateOrganization(req, res) {
        try {
            const { id } = req.params;
            const organization = await Organization.findByPk(id);

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            const {
                organizationName,
                address,
                gstNumber,
                country,
                state,
                city
            } = req.body;

            const updateData = {};
            if (organizationName) updateData.organization_name = organizationName;
            if (address) updateData.address = address;
            if (gstNumber) updateData.gst_number = gstNumber;
            if (country) updateData.country = country;
            if (state) updateData.state = state;
            if (city) updateData.city = city;

            await organization.update(updateData);

            const responseOrg = {
                id: organization.id,
                organizationName: organization.organization_name,
                organizationCode: organization.organization_code,
                address: organization.address,
                gstNumber: organization.gst_number,
                country: organization.country,
                state: organization.state,
                city: organization.city,
                createdBy: organization.created_by,
                noOfPlants: organization.no_of_plants,
                createdAt: organization.created_at,
                updatedAt: organization.updated_at
            };

            res.status(200).json({
                success: true,
                message: 'Organization updated successfully',
                organization: responseOrg
            });
        } catch (error) {
            console.error('Update organization error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update organization',
                error: error.message
            });
        }
    }
}

module.exports = new OrganizationController();
