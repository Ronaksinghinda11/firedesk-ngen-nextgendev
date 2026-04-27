/**
 * Technician Auto-Assignment Service
 *
 * Handles automatic assignment of technicians to services
 * Services are assigned to technicians 7 days before the scheduled date
 */

const { Op } = require("sequelize");

class TechnicianAssignmentService {
    /**
     * Get all models lazily to avoid circular dependency issues
     */
    getModels() {
        const allModels = require('../../models');
        return {
            ServiceSubmission: allModels.ServiceSubmission,
            Asset: allModels.Asset,
            Technician: allModels.Technician,
            TechnicianPlant: allModels.TechnicianPlant,
            TechnicianCategory: allModels.TechnicianCategory,
            User: allModels.User,
            Plant: allModels.Plant,
            Category: allModels.Category
        };
    }

    /**
     * Find eligible technicians for a service
     * Technician must belong to the same plant and category as the asset
     * @param {string} serviceId - Service submission ID
     * @returns {Promise<Array>} List of eligible technicians
     */
    async findEligibleTechnicians(serviceId) {
        const { ServiceSubmission, Asset, Technician, TechnicianPlant, TechnicianCategory, User } = this.getModels();

        try {
            // Get the service with its asset details
            const service = await ServiceSubmission.findByPk(serviceId, {
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'plant_id', 'category_id']
                }]
            });

            if (!service || !service.asset) {
                console.log(`Service ${serviceId} not found or has no asset`);
                return [];
            }

            const { plant_id, category_id } = service.asset;

            if (!plant_id || !category_id) {
                console.log(`Service ${serviceId} asset missing plant_id or category_id`);
                return [];
            }

            // Find technicians that match both the plant AND category
            // Using TechnicianPlant and TechnicianCategory junction tables
            const technicianPlants = await TechnicianPlant.findAll({
                where: { plant_id },
                attributes: ['technician_id']
            });

            const plantTechnicianIds = technicianPlants.map(tp => tp.technician_id);

            if (plantTechnicianIds.length === 0) {
                console.log(`No technicians found for plant ${plant_id}`);
                return [];
            }

            const technicianCategories = await TechnicianCategory.findAll({
                where: {
                    technician_id: { [Op.in]: plantTechnicianIds },
                    category_id
                },
                attributes: ['technician_id']
            });

            const eligibleTechnicianIds = technicianCategories.map(tc => tc.technician_id);

            if (eligibleTechnicianIds.length === 0) {
                console.log(`No technicians found for plant ${plant_id} with category ${category_id}`);
                return [];
            }

            // Get full technician details
            const technicians = await Technician.findAll({
                where: {
                    id: { [Op.in]: eligibleTechnicianIds },
                    status: 'Active'
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'contact_no']
                }]
            });

            return technicians;
        } catch (error) {
            console.error(`Error finding eligible technicians for service ${serviceId}:`, error);
            return [];
        }
    }

    /**
     * Select a random technician from eligible technicians
     * @param {Array} technicians - List of eligible technicians
     * @returns {Object|null} Selected technician or null
     */
    selectRandomTechnician(technicians) {
        if (!technicians || technicians.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * technicians.length);
        return technicians[randomIndex];
    }

    /**
     * Assign a technician to a service
     * @param {string} serviceId - Service submission ID
     * @param {string} technicianId - Technician ID to assign
     * @returns {Promise<Object>} Result of assignment
     */
    async assignTechnicianToService(serviceId, technicianId) {
        const { ServiceSubmission } = this.getModels();

        try {
            const service = await ServiceSubmission.findByPk(serviceId);

            if (!service) {
                console.log(`Service ${serviceId} not found`);
                return { success: false, message: 'Service not found' };
            }

            // Check if service already has a technician assigned
            if (service.technician_id) {
                console.log(`Service ${serviceId} already has technician ${service.technician_id} assigned`);
                return { success: false, message: 'Service already has a technician assigned' };
            }

            // Check if service is in a state that can be assigned
            const nonAssignableStatuses = ['completed', 'rejected', 'cancelled', 'submitted', 'approved'];
            if (nonAssignableStatuses.includes(service.status?.toLowerCase())) {
                console.log(`Service ${serviceId} is ${service.status}, cannot assign technician`);
                return { success: false, message: `Service is ${service.status}` };
            }

            // Assign the technician and update status to in_progress
            await service.update({
                technician_id: technicianId,
                status: 'in_progress'
            });

            console.log(`✅ Assigned technician ${technicianId} to service ${serviceId}`);
            return { success: true, message: 'Technician assigned successfully' };
        } catch (error) {
            console.error(`Error assigning technician to service ${serviceId}:`, error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Auto-assign technicians to services scheduled N days from now
     * This should be run daily via cron job
     * @param {number} daysAhead - Number of days ahead to look for services (default: 7)
     * @returns {Promise<Object>} Result with assignment statistics
     */
    async autoAssignTechniciansForUpcomingServices(daysAhead = 7) {
        const { ServiceSubmission, Asset, User } = this.getModels();

        try {
            console.log('🔄 Starting auto-assignment of technicians for upcoming services...');

            // Calculate date N days from now
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysAhead);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            console.log(`📅 Looking for services scheduled on ${targetDate.toISOString().split('T')[0]}`);

            // Find all services scheduled on target date that don't have a technician assigned
            const services = await ServiceSubmission.findAll({
                where: {
                    scheduled_date: {
                        [Op.between]: [targetDate, endOfDay]
                    },
                    technician_id: null, // Only assign to unassigned services
                    status: {
                        [Op.notIn]: ['completed', 'rejected', 'cancelled', 'submitted', 'approved']
                    }
                },
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'plant_id', 'category_id']
                }]
            });

            console.log(`📋 Found ${services.length} services to assign`);

            let assignedCount = 0;
            let failedCount = 0;
            const results = [];

            for (const service of services) {
                try {
                    // Find eligible technicians
                    const eligibleTechnicians = await this.findEligibleTechnicians(service.id);

                    if (eligibleTechnicians.length === 0) {
                        console.log(`⚠️  No eligible technicians found for service ${service.submission_number} (Asset: ${service.asset?.asset_code})`);
                        failedCount++;
                        results.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            assetCode: service.asset?.asset_code,
                            status: 'no_technicians_available'
                        });
                        continue;
                    }

                    // Select a random technician
                    const selectedTechnician = this.selectRandomTechnician(eligibleTechnicians);

                    // Assign the technician
                    const result = await this.assignTechnicianToService(service.id, selectedTechnician.id);

                    if (result.success) {
                        assignedCount++;
                        results.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            assetCode: service.asset?.asset_code,
                            technicianId: selectedTechnician.id,
                            technicianName: selectedTechnician.user?.name,
                            status: 'assigned'
                        });
                    } else {
                        failedCount++;
                        results.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            assetCode: service.asset?.asset_code,
                            status: 'failed',
                            reason: result.message
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error processing service ${service.id}:`, error);
                    failedCount++;
                    results.push({
                        serviceId: service.id,
                        submissionNumber: service.submission_number,
                        assetCode: service.asset?.asset_code,
                        status: 'error',
                        error: error.message
                    });
                }
            }

            console.log(`✨ Auto-assignment complete: ${assignedCount} assigned, ${failedCount} failed`);

            return {
                success: true,
                totalServices: services.length,
                assignedCount,
                failedCount,
                results
            };
        } catch (error) {
            console.error('❌ Error in auto-assignment process:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manually assign a technician to a service (for manager override)
     * @param {string} serviceId - Service submission ID
     * @param {string} technicianId - Technician ID to assign
     * @returns {Promise<Object>} Result of assignment
     */
    async manuallyAssignTechnician(serviceId, technicianId) {
        try {
            console.log(`🔧 Manually assigning technician ${technicianId} to service ${serviceId}`);

            // Verify technician is eligible (optional - can be bypassed for manager override)
            const eligibleTechnicians = await this.findEligibleTechnicians(serviceId);
            const isEligible = eligibleTechnicians.some(t => t.id === technicianId);

            if (!isEligible) {
                console.log(`⚠️  Warning: Technician ${technicianId} may not be eligible for service ${serviceId} (plant/category mismatch)`);
                // Still allow assignment as this is a manual override by manager
            }

            // Assign the technician
            return await this.assignTechnicianToService(serviceId, technicianId);
        } catch (error) {
            console.error(`Error in manual assignment:`, error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get assignment statistics for a date range
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     * @param {string} plantId - Optional plant ID filter
     * @returns {Promise<Object>} Assignment statistics
     */
    async getAssignmentStats(startDate, endDate, plantId = null) {
        const { ServiceSubmission } = this.getModels();

        try {
            const where = {
                scheduled_date: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            };

            if (plantId) {
                where.plant_id = plantId;
            }

            const totalServices = await ServiceSubmission.count({ where });

            const assignedServices = await ServiceSubmission.count({
                where: {
                    ...where,
                    technician_id: { [Op.ne]: null }
                }
            });

            const unassignedServices = await ServiceSubmission.count({
                where: {
                    ...where,
                    technician_id: null,
                    status: { [Op.notIn]: ['completed', 'rejected', 'cancelled'] }
                }
            });

            return {
                success: true,
                totalServices,
                assignedServices,
                unassignedServices,
                assignmentRate: totalServices > 0 ? ((assignedServices / totalServices) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Error getting assignment stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new TechnicianAssignmentService();
