/**
 * Scheduler Controller
 * Handles HTTP requests for scheduler CRUD and service generation
 */

const schedulerService = require('../../services/scheduler/schedulerService');

/**
 * Get all schedulers
 * @route GET /schedulers
 */
const getAllSchedulers = async (req, res) => {
    try {
        const schedulers = await schedulerService.getAllSchedulers();

        res.status(200).json({
            success: true,
            data: schedulers,
            count: schedulers.length
        });
    } catch (error) {
        console.error('Error getting all schedulers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get schedulers',
            error: error.message
        });
    }
};

/**
 * Get schedulers by plant ID
 * @route GET /schedulers/plant/:plantId
 */
const getSchedulersByPlant = async (req, res) => {
    try {
        const { plantId } = req.params;

        if (!plantId) {
            return res.status(400).json({
                success: false,
                message: 'Plant ID is required'
            });
        }

        const schedulers = await schedulerService.getSchedulersByPlant(plantId);

        res.status(200).json({
            success: true,
            data: schedulers,
            count: schedulers.length
        });
    } catch (error) {
        console.error('Error getting schedulers by plant:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get schedulers',
            error: error.message
        });
    }
};

/**
 * Get single scheduler by ID
 * @route GET /schedulers/:id
 */
const getSchedulerById = async (req, res) => {
    try {
        const { id } = req.params;
        const { Scheduler, Plant, Category } = require('../../models');

        const scheduler = await Scheduler.findByPk(id, {
            include: [
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_code', 'plant_name']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name']
                }
            ]
        });

        if (!scheduler) {
            return res.status(404).json({
                success: false,
                message: 'Scheduler not found'
            });
        }

        res.status(200).json({
            success: true,
            data: scheduler
        });
    } catch (error) {
        console.error('Error getting scheduler:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scheduler',
            error: error.message
        });
    }
};

/**
 * Create a new scheduler
 * @route POST /schedulers
 */
const createScheduler = async (req, res) => {
    try {
        const data = req.body;

        // Validate required fields
        if (!data.plant_id || !data.category_id || !data.schedule_start_date || !data.schedule_end_date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: plant_id, category_id, schedule_start_date, schedule_end_date'
            });
        }

        const result = await schedulerService.createScheduler(data, req.user);

        res.status(201).json({
            success: true,
            message: 'Scheduler created successfully',
            data: result.scheduler,
            generationResult: result.generationResult
        });
    } catch (error) {
        console.error('Error creating scheduler:', error);

        // Handle specific validation errors
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('Missing required') || error.message.includes('must be after')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create scheduler',
            error: error.message
        });
    }
};

/**
 * Update a scheduler
 * @route PUT /schedulers/:id
 */
const updateScheduler = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const result = await schedulerService.updateScheduler(id, data, req.user);

        res.status(200).json({
            success: true,
            message: 'Scheduler updated successfully',
            data: result.scheduler,
            updateResult: result.updateResult
        });
    } catch (error) {
        console.error('Error updating scheduler:', error);

        // Handle specific validation errors
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('cannot be changed') ||
            error.message.includes('can only be reduced') ||
            error.message.includes('cannot be set')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update scheduler',
            error: error.message
        });
    }
};

/**
 * Delete a scheduler
 * @route DELETE /schedulers/:id
 */
const deleteScheduler = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await schedulerService.deleteScheduler(id, req.user);

        res.status(200).json({
            success: true,
            message: 'Scheduler deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error deleting scheduler:', error);

        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to delete scheduler',
            error: error.message
        });
    }
};

/**
 * Bulk create/update schedulers for a plant
 * @route POST /schedulers/bulk
 */
const bulkSaveSchedulers = async (req, res) => {
    try {
        const { plant_id, schedulers } = req.body;

        if (!plant_id || !schedulers || !Array.isArray(schedulers)) {
            return res.status(400).json({
                success: false,
                message: 'plant_id and schedulers array are required'
            });
        }

        const results = {
            created: [],
            updated: [],
            deleted: [],
            errors: []
        };

        // Get existing schedulers for this plant
        const existingSchedulers = await schedulerService.getSchedulersByPlant(plant_id);
        const existingIds = new Set(existingSchedulers.map(s => s.id));
        const incomingIds = new Set(schedulers.filter(s => s.id && !s.id.startsWith('temp_')).map(s => s.id));

        // Process each incoming scheduler
        for (const schedulerData of schedulers) {
            try {
                if (!schedulerData.id || schedulerData.id.startsWith('temp_')) {
                    // New scheduler - create
                    const result = await schedulerService.createScheduler({
                        plant_id,
                        category_id: schedulerData.category_id,
                        schedule_start_date: schedulerData.schedule_start_date,
                        schedule_end_date: schedulerData.schedule_end_date,
                        inspection_frequency: schedulerData.inspection_frequency,
                        testing_frequency: schedulerData.testing_frequency,
                        maintenance_frequency: schedulerData.maintenance_frequency
                    }, req.user);
                    results.created.push({
                        id: result.scheduler.id,
                        category_id: result.scheduler.category_id,
                        servicesGenerated: result.generationResult?.totalServices || 0,
                        assetsFound: result.generationResult?.totalAssets || 0,
                        generationMessage: result.generationResult?.message || null,
                        isAsync: result.generationResult?.isAsync || false
                    });
                } else if (existingIds.has(schedulerData.id)) {
                    // Existing scheduler - update
                    const result = await schedulerService.updateScheduler(schedulerData.id, {
                        schedule_start_date: schedulerData.schedule_start_date,
                        schedule_end_date: schedulerData.schedule_end_date,
                        inspection_frequency: schedulerData.inspection_frequency,
                        testing_frequency: schedulerData.testing_frequency,
                        maintenance_frequency: schedulerData.maintenance_frequency
                    }, req.user);
                    results.updated.push({
                        id: result.scheduler.id,
                        category_id: result.scheduler.category_id,
                        updateResult: result.updateResult
                    });
                }
            } catch (error) {
                results.errors.push({
                    schedulerData,
                    error: error.message
                });
            }
        }

        // Delete schedulers that were removed
        for (const existingScheduler of existingSchedulers) {
            if (!incomingIds.has(existingScheduler.id)) {
                try {
                    const result = await schedulerService.deleteScheduler(existingScheduler.id, req.user);
                    results.deleted.push({
                        id: existingScheduler.id,
                        category_id: existingScheduler.category_id,
                        servicesCancelled: result.cancelResult?.cancelledCount || 0
                    });
                } catch (error) {
                    results.errors.push({
                        id: existingScheduler.id,
                        action: 'delete',
                        error: error.message
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `Processed ${results.created.length} created, ${results.updated.length} updated, ${results.deleted.length} deleted`,
            data: results
        });
    } catch (error) {
        console.error('Error in bulk save:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk save schedulers',
            error: error.message
        });
    }
};

/**
 * Manually trigger service generation for a scheduler
 * @route POST /schedulers/:id/generate-services
 */
const generateServices = async (req, res) => {
    try {
        const { id } = req.params;
        const { Scheduler } = require('../../models');

        const scheduler = await Scheduler.findByPk(id);
        if (!scheduler) {
            return res.status(404).json({
                success: false,
                message: 'Scheduler not found'
            });
        }

        const result = await schedulerService.generateServicesForPlant(scheduler.plant_id, id);

        res.status(200).json({
            success: true,
            message: 'Services generated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error generating services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate services',
            error: error.message
        });
    }
};

/**
 * Generate services for all schedulers in a plant
 * @route POST /schedulers/plant/:plantId/generate-services
 */
const generateServicesForPlant = async (req, res) => {
    try {
        const { plantId } = req.params;

        const result = await schedulerService.generateServicesForPlant(plantId);

        res.status(200).json({
            success: true,
            message: 'Services generated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error generating services for plant:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate services',
            error: error.message
        });
    }
};

/**
 * Trigger technician auto-assignment for upcoming services
 * @route POST /schedulers/auto-assign
 */
const triggerAutoAssignment = async (req, res) => {
    try {
        const { daysAhead = 7 } = req.body;
        const { technicianAutoAssignment } = require('../../schedulers');

        const result = await technicianAutoAssignment.runNow(daysAhead);
        
        res.status(200).json({
            success: true,
            message: 'Auto-assignment triggered successfully',
            data: result
        });
    } catch (error) {
        console.error('Error triggering auto-assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger auto-assignment',
            error: error.message
        });
    }
};

/**
 * Manually assign a technician to a specific service
 * @route POST /schedulers/services/:serviceId/assign-technician
 */
const assignTechnicianToService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { technician_id } = req.body;

        if (!technician_id) {
            return res.status(400).json({
                success: false,
                message: 'technician_id is required'
            });
        }

        const { technicianAssignmentService } = require('../../services/scheduler');
        const result = await technicianAssignmentService.manuallyAssignTechnician(serviceId, technician_id);
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Error assigning technician:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign technician',
            error: error.message
        });
    }
};

/**
 * Get technician assignment statistics
 * @route GET /schedulers/assignment-stats
 */
const getAssignmentStats = async (req, res) => {
    try {
        const { startDate, endDate, plantId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }

        const { technicianAssignmentService } = require('../../services/scheduler');
        const result = await technicianAssignmentService.getAssignmentStats(startDate, endDate, plantId);
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting assignment stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get assignment statistics',
            error: error.message
        });
    }
};

/**
 * Get status of all cron schedulers
 * @route GET /schedulers/cron-status
 */
const getCronStatus = async (req, res) => {
    try {
        const { getAllSchedulerStatuses } = require('../../schedulers');
        const statuses = getAllSchedulerStatuses();
        
        res.status(200).json({
            success: true,
            data: statuses
        });
    } catch (error) {
        console.error('Error getting cron status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cron status',
            error: error.message
        });
    }
};

module.exports = {
    getAllSchedulers,
    getSchedulersByPlant,
    getSchedulerById,
    createScheduler,
    updateScheduler,
    deleteScheduler,
    bulkSaveSchedulers,
    generateServices,
    generateServicesForPlant,
    triggerAutoAssignment,
    assignTechnicianToService,
    getAssignmentStats,
    getCronStatus
};
