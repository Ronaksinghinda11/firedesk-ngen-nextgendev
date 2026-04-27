/**
 * Manager Calendar Controller
 * Handles calendar operations for managers with plant-scoped access
 * Includes technician assignment and service approval functionality
 */

const { Op } = require('sequelize');
const calendarService = require('../../services/calendar/calendarService');
const {
    ServiceSubmission,
    Ticket,
    Asset,
    Plant,
    Technician,
    TechnicianPlant,
    TechnicianCategory,
    Manager,
    PlantManager,
    User,
    Category,
    AssetHealthHistory,
    ServiceTechnician
} = require('../../models');

/**
 * Get manager's assigned plant IDs
 * @param {string} userId - User ID of the manager
 * @returns {Promise<Array>} Array of plant IDs
 */
const getManagerPlantIds = async (userId) => {
    const manager = await Manager.findOne({
        where: { user_id: userId },
        include: [{
            model: PlantManager,
            as: 'plant_assignments',
            include: [{ model: Plant, as: 'plant', attributes: ['id'] }]
        }]
    });

    if (!manager) {
        return [];
    }

    return manager.plant_assignments?.map(pa => pa.plant?.id).filter(Boolean) || [];
};

/**
 * Get manager record by user ID
 */
const getManagerByUserId = async (userId) => {
    return Manager.findOne({ where: { user_id: userId } });
};

const managerCalendarController = {
    /**
     * Get calendar events for manager's assigned plants
     * GET /api/v1/manager/calendar/events
     */
    async getCalendarEvents(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);

            if (plantIds.length === 0) {
                return res.json({
                    success: true,
                    message: 'No plants assigned to this manager',
                    events: []
                });
            }

            const events = await calendarService.getCalendarEvents(req.query, req.user, plantIds);

            return res.json({
                success: true,
                events
            });
        } catch (error) {
            console.error('❌ Error fetching manager calendar events:', error);
            return next(error);
        }
    },

    /**
     * Get service statistics for manager's assigned plants
     * GET /api/v1/manager/calendar/statistics
     */
    async getServiceStatistics(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);

            if (plantIds.length === 0) {
                return res.json({
                    success: true,
                    stats: {
                        services: { completed: 0, due: 0, lapsed: 0, cancelled: 0, rejected: 0, PENDINGApproval: 0 },
                        tickets: { PENDING: 0, waitingApproval: 0, completed: 0 }
                    }
                });
            }

            const stats = await calendarService.getServiceStatistics(req.query, req.user, plantIds);

            return res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('❌ Error fetching manager calendar statistics:', error);
            return next(error);
        }
    },

    /**
     * Get completed services for manager's plants
     * GET /api/v1/manager/calendar/services/completed
     */
    async getCompletedServices(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getCompletedServices(req.query, req.user, plantIds, { includeAnswers: true });

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get due services for manager's plants
     * GET /api/v1/manager/calendar/services/due
     */
    async getServicesDue(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getServicesDue(req.query, req.user, plantIds);

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get lapsed services for manager's plants
     * GET /api/v1/manager/calendar/services/lapsed
     */
    async getLapsedServices(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getLapsedServices(req.query, req.user, plantIds);

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get cancelled services for manager's plants
     * GET /api/v1/manager/calendar/services/cancelled
     */
    async getCancelledServices(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getCancelledServices(req.query, req.user, plantIds);

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get rejected services for manager's plants
     * GET /api/v1/manager/calendar/services/rejected
     */
    async getRejectedServices(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getRejectedServices(req.query, req.user, plantIds);

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get PENDING approval services for manager's plants
     * GET /api/v1/manager/calendar/services/PENDING-approval
     */
    async getPendingApprovalServices(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getPendingApprovalServices(req.query, req.user, plantIds);

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get combined calendar dashboard (counts + statistics) in one call
     * GET /api/v1/manager/calendar/dashboard
     */
    async getCalendarDashboard(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);

            if (plantIds.length === 0) {
                return res.json({
                    success: true,
                    counts: [],
                    statistics: {
                        services: { completed: 0, due: 0, lapsed: 0, cancelled: 0, PENDINGApproval: 0 },
                        tickets: { PENDING: 0, waitingApproval: 0, completed: 0 }
                    }
                });
            }

            const result = await calendarService.getCalendarDashboard(req.query, req.user, plantIds);
            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('❌ Error fetching manager calendar dashboard:', error);
            return next(error);
        }
    },

    /**
     * Get lightweight calendar counts per date
     * GET /api/v1/manager/calendar/counts
     */
    async getCalendarCounts(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);

            if (plantIds.length === 0) {
                return res.json({ success: true, counts: [] });
            }

            const counts = await calendarService.getCalendarCounts(req.query, plantIds);
            return res.json({
                success: true,
                counts
            });
        } catch (error) {
            console.error('❌ Error fetching manager calendar counts:', error);
            return next(error);
        }
    },

    /**
     * Get unassigned services for manager's plants
     * GET /api/v1/manager/calendar/services/unassigned
     */
    async getUnassignedServices(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const result = await calendarService.getUnassignedServices(req.query, plantIds);

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get eligible technicians for a specific service
     * Returns technicians who:
     * - Are active
     * - Are assigned to the service's plant (for In-House) or not conflicting (for Third-Party)
     * - Are qualified for the asset's category
     * GET /api/v1/manager/calendar/eligible-technicians/:serviceId
     */
    async getEligibleTechnicians(req, res, next) {
        try {
            const { serviceId } = req.params;
            const plantIds = await getManagerPlantIds(req.user.id);

            console.log(`🔍 Finding eligible technicians for service ${serviceId}`);

            // Get the service
            const service = await ServiceSubmission.findByPk(serviceId, {
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'category_id']
                }]
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            console.log(`   Plant ID: ${service.plant_id}, Category ID: ${service.asset?.category_id}`);

            // Validate manager has access to this plant
            if (!plantIds.includes(service.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Service belongs to a plant not assigned to you'
                });
            }

            // Get technicians assigned to the plant
            const plantTechnicians = await TechnicianPlant.findAll({
                where: { plant_id: service.plant_id },
                attributes: ['technician_id']
            });
            const plantTechnicianIds = plantTechnicians.map(tp => tp.technician_id);
            console.log(`   Technicians assigned to plant: ${plantTechnicianIds.length}`);

            // Get technicians qualified for the category (optional - if category exists)
            let categoryTechnicianIds = null;
            if (service.asset?.category_id) {
                const categoryQualifiedTechnicians = await TechnicianCategory.findAll({
                    where: { category_id: service.asset.category_id },
                    attributes: ['technician_id']
                });
                categoryTechnicianIds = categoryQualifiedTechnicians.map(tc => tc.technician_id);
                console.log(`   Technicians qualified for category: ${categoryTechnicianIds.length}`);
            }

            // Build where clause for eligible technicians
            // ALL technicians must be assigned to the plant
            // Category qualification is additional filtering when available
            const whereClause = {
                status: 'Active'
            };

            // If no technicians are assigned to this plant, return empty list
            if (plantTechnicianIds.length === 0) {
                console.log(`   No technicians assigned to this plant`);
                return res.json({
                    success: true,
                    technicians: []
                });
            }

            // Find technicians that are assigned to the plant AND (optionally) qualified for category
            let eligibleTechnicianIds;
            if (categoryTechnicianIds && categoryTechnicianIds.length > 0) {
                // Filter to technicians in BOTH plant AND category
                eligibleTechnicianIds = plantTechnicianIds.filter(id => categoryTechnicianIds.includes(id));
                console.log(`   Technicians (plant AND category): ${eligibleTechnicianIds.length}`);
            } else {
                // No category filter, use all plant technicians
                eligibleTechnicianIds = plantTechnicianIds;
                console.log(`   Technicians (plant only, no category filter): ${eligibleTechnicianIds.length}`);
            }

            // All technicians must be in the eligible list (matching plant and category)
            whereClause.id = { [Op.in]: eligibleTechnicianIds };

            // Find eligible technicians
            const eligibleTechnicians = await Technician.findAll({
                where: whereClause,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'profile_pic']
                }]
            });

            console.log(`   Found ${eligibleTechnicians.length} eligible technicians before conflict check`);

            // Filter Third-Party technicians for same-day plant conflicts
            const filteredTechnicians = [];
            for (const tech of eligibleTechnicians) {
                const isThirdParty = ['Third-Party', 'Third Party'].includes(tech.technician_type);

                if (isThirdParty) {
                    // Check if assigned to a different plant on the same day
                    const conflictingService = await ServiceSubmission.findOne({
                        where: {
                            technician_id: tech.id,
                            scheduled_date: service.scheduled_date,
                            plant_id: { [Op.ne]: service.plant_id },
                            status: { [Op.notIn]: ['rejected', 'cancelled'] }
                        }
                    });

                    if (!conflictingService) {
                        filteredTechnicians.push(tech);
                    }
                } else {
                    filteredTechnicians.push(tech);
                }
            }

            console.log(`✅ Returning ${filteredTechnicians.length} eligible technicians`);

            return res.json({
                success: true,
                technicians: filteredTechnicians.map(t => ({
                    id: t.id,
                    technicianCode: t.technician_code,
                    technicianType: t.technician_type,
                    name: t.user?.name,
                    email: t.user?.email,
                    profilePic: t.user?.profile_pic
                }))
            });
        } catch (error) {
            console.error('❌ Error fetching eligible technicians:', error);
            return next(error);
        }
    },

    /**
     * Assign a technician to a service
     * PUT /api/v1/manager/calendar/assign-technician/:serviceId
     * 
     * Validation rules:
     * - In-House technicians must be assigned to the plant
     * - Third-Party technicians cannot serve different plants on the same day
     * - Technician must be qualified for the asset's category
     * - Technician must be active
     */
    async assignTechnician(req, res, next) {
        try {
            const { serviceId } = req.params;
            const { technicianId } = req.body;
            const plantIds = await getManagerPlantIds(req.user.id);
            const manager = await getManagerByUserId(req.user.id);

            console.log(`📋 Assigning technician ${technicianId} to service ${serviceId}`);

            if (!technicianId) {
                return res.status(400).json({
                    success: false,
                    message: 'Technician ID is required'
                });
            }

            // Get the service with asset details
            const service = await ServiceSubmission.findByPk(serviceId, {
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'category_id', 'asset_code']
                }]
            });

            if (!service) {
                console.log(`   ❌ Service not found: ${serviceId}`);
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            console.log(`   Service found: ${service.submission_number}, plant: ${service.plant_id}`);

            // Validate manager has access to this plant
            if (!plantIds.includes(service.plant_id)) {
                console.log(`   ❌ Manager doesn't have access to plant ${service.plant_id}`);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Service belongs to a plant not assigned to you'
                });
            }

            // Get technician with plants and categories
            const technician = await Technician.findByPk(technicianId, {
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name'] },
                    { model: Plant, as: 'plants', attributes: ['id'] },
                    { model: Category, as: 'categories', attributes: ['id'] }
                ]
            });

            if (!technician) {
                console.log(`   ❌ Technician not found: ${technicianId}`);
                return res.status(404).json({
                    success: false,
                    message: 'Technician not found'
                });
            }

            console.log(`   Technician: ${technician.user?.name}, type: ${technician.technician_type}, status: ${technician.status}`);

            // Check active status
            if (technician.status !== 'Active') {
                return res.status(400).json({
                    success: false,
                    message: 'Technician is not active'
                });
            }

            // Check plant assignment for In-House technicians (handle both variations)
            const isInHouse = ['In-House', 'In House'].includes(technician.technician_type);
            const isPlantAssigned = technician.plants?.some(p => p.id === service.plant_id);

            if (isInHouse && !isPlantAssigned) {
                console.log(`   ❌ In-House technician not assigned to plant`);
                return res.status(400).json({
                    success: false,
                    message: 'In-House technician is not assigned to this plant'
                });
            }

            // Check Third-Party same-day plant constraint
            const isThirdParty = ['Third-Party', 'Third Party'].includes(technician.technician_type);
            if (isThirdParty) {
                const conflictingService = await ServiceSubmission.findOne({
                    where: {
                        technician_id: technicianId,
                        scheduled_date: service.scheduled_date,
                        plant_id: { [Op.ne]: service.plant_id },
                        status: { [Op.notIn]: ['rejected', 'cancelled'] },
                        id: { [Op.ne]: serviceId }
                    }
                });

                if (conflictingService) {
                    return res.status(400).json({
                        success: false,
                        message: 'Third-Party technician is already assigned to another plant on this date'
                    });
                }
            }

            // Check category qualification - only if service has a category
            if (service.asset?.category_id) {
                const isCategoryQualified = technician.categories?.some(c => c.id === service.asset.category_id);
                console.log(`   Category check: ${service.asset.category_id}, qualified: ${isCategoryQualified}`);

                if (!isCategoryQualified) {
                    return res.status(400).json({
                        success: false,
                        message: 'Technician is not qualified for this asset category'
                    });
                }
            }

            // Create assignment in service_technicians junction table
            console.log(`   Creating assignment in service_technicians...`);
            const [assignment, created] = await ServiceTechnician.findOrCreate({
                where: {
                    service_id: serviceId,
                    technician_id: technicianId
                },
                defaults: {
                    assigned_by: manager?.id,
                    assigned_at: new Date(),
                    status: 'assigned'
                }
            });

            if (!created) {
                console.log(`   Technician already assigned to this service`);
                return res.status(400).json({
                    success: false,
                    message: 'Technician is already assigned to this service'
                });
            }

            // Update service status if it's in draft
            console.log(`   Updating service status...`);
            await service.update({
                manager_id: manager?.id,
                status: service.status === 'draft' ? 'pending' : service.status
            });

            console.log(`✅ Technician ${technician.user?.name} assigned to service ${service.submission_number}`);

            return res.json({
                success: true,
                message: 'Technician assigned successfully',
                service: {
                    id: service.id,
                    submissionNumber: service.submission_number,
                    technicianId: technicianId,
                    technicianName: technician.user?.name
                }
            });
        } catch (error) {
            console.error('❌ Error assigning technician:', error);
            return next(error);
        }
    },

    /**
     * Bulk assign technicians for the next week
     * POST /api/v1/manager/calendar/assign-technicians-weekly
     * 
     * Auto-assigns unassigned services for the next 7 days
     * using eligible technicians based on workload balancing
     * Uses ServiceTechnician junction table for multiple technician support
     */
    async assignTechniciansForWeek(req, res, next) {
        try {
            const plantIds = await getManagerPlantIds(req.user.id);
            const manager = await getManagerByUserId(req.user.id);

            if (plantIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No plants assigned to this manager'
                });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(23, 59, 59, 999);

            // Get services without any technician assigned in service_technicians junction table
            const unassignedServices = await ServiceSubmission.findAll({
                where: {
                    plant_id: { [Op.in]: plantIds },
                    scheduled_date: { [Op.between]: [today, nextWeek] },
                    status: { [Op.notIn]: ['approved', 'cancelled', 'rejected'] }
                },
                include: [
                    {
                        model: Asset,
                        as: 'asset',
                        attributes: ['id', 'category_id']
                    },
                    {
                        model: ServiceTechnician,
                        as: 'serviceTechnicians',
                        required: false
                    }
                ],
                order: [['scheduled_date', 'ASC']]
            });

            // Filter to only services with no technicians assigned
            const servicesNeedingAssignment = unassignedServices.filter(
                service => !service.serviceTechnicians || service.serviceTechnicians.length === 0
            );

            if (servicesNeedingAssignment.length === 0) {
                return res.json({
                    success: true,
                    message: 'No unassigned services found for the next 7 days',
                    assigned: 0,
                    failed: 0
                });
            }

            let assigned = 0;
            let failed = 0;
            const assignments = [];
            const failures = [];

            for (const service of servicesNeedingAssignment) {
                try {
                    // Get plant technicians
                    const plantTechnicians = await TechnicianPlant.findAll({
                        where: { plant_id: service.plant_id },
                        attributes: ['technician_id']
                    });
                    const plantTechnicianIds = plantTechnicians.map(tp => tp.technician_id);

                    if (plantTechnicianIds.length === 0) {
                        failed++;
                        failures.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            reason: 'No technicians assigned to this plant'
                        });
                        continue;
                    }

                    // Get category qualified technicians (if category exists)
                    let eligibleTechnicianIds = plantTechnicianIds;
                    if (service.asset?.category_id) {
                        const categoryTechnicians = await TechnicianCategory.findAll({
                            where: { category_id: service.asset.category_id },
                            attributes: ['technician_id']
                        });
                        const categoryTechnicianIds = categoryTechnicians.map(tc => tc.technician_id);

                        // Intersection: must be in BOTH plant AND category
                        eligibleTechnicianIds = plantTechnicianIds.filter(id => categoryTechnicianIds.includes(id));
                    }

                    if (eligibleTechnicianIds.length === 0) {
                        failed++;
                        failures.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            reason: 'No eligible technicians found (plant AND category)'
                        });
                        continue;
                    }

                    // Find eligible technicians using the properly intersected IDs
                    const eligibleTechnicians = await Technician.findAll({
                        where: {
                            status: 'Active',
                            id: { [Op.in]: eligibleTechnicianIds }
                        },
                        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
                    });

                    if (eligibleTechnicians.length === 0) {
                        failed++;
                        failures.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            reason: 'No active technicians found'
                        });
                        continue;
                    }

                    // Assign ALL eligible technicians to this service
                    let assignedTechnicians = [];

                    for (const tech of eligibleTechnicians) {
                        // Create assignment in service_technicians junction table for each eligible technician
                        const [assignment, created] = await ServiceTechnician.findOrCreate({
                            where: {
                                service_id: service.id,
                                technician_id: tech.id
                            },
                            defaults: {
                                assigned_by: manager?.id,
                                assigned_at: new Date(),
                                status: 'assigned'
                            }
                        });

                        if (created) {
                            assignedTechnicians.push({
                                technicianId: tech.id,
                                technicianName: tech.user?.name
                            });
                        }
                    }

                    if (assignedTechnicians.length > 0) {
                        // Update service status if it's in draft
                        await service.update({
                            manager_id: manager?.id,
                            status: service.status === 'draft' ? 'pending' : service.status
                        });

                        assigned++;
                        assignments.push({
                            serviceId: service.id,
                            submissionNumber: service.submission_number,
                            techniciansAssigned: assignedTechnicians.length,
                            technicians: assignedTechnicians
                        });
                    }
                } catch (error) {
                    failed++;
                    failures.push({
                        serviceId: service.id,
                        submissionNumber: service.submission_number,
                        reason: error.message
                    });
                }
            }

            console.log(`✅ Weekly assignment complete: ${assigned} assigned, ${failed} failed`);

            return res.json({
                success: true,
                message: `Assigned ${assigned} services, ${failed} failed`,
                assigned,
                failed,
                assignments,
                failures
            });
        } catch (error) {
            console.error('❌ Error in weekly technician assignment:', error);
            return next(error);
        }
    },

    /**
     * Approve a submitted service
     * POST /api/v1/manager/calendar/approve-service/:serviceId
     * 
     * Updates approval status and creates asset health history record
     */
    async approveService(req, res, next) {
        try {
            const { serviceId } = req.params;
            const { remarks } = req.body;
            const plantIds = await getManagerPlantIds(req.user.id);
            const manager = await getManagerByUserId(req.user.id);

            // Get the service
            const service = await ServiceSubmission.findByPk(serviceId, {
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code']
                }]
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            // Validate manager has access to this plant
            if (!plantIds.includes(service.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Service belongs to a plant not assigned to you'
                });
            }

            // Validate service is in submitted status (case-insensitive)
            if (service.status.toUpperCase() !== 'SUBMITTED') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot approve service with status '${service.status}'. Service must be in 'submitted' status.`
                });
            }

            // Update service approval
            await service.update({
                approval_status: 'approved',
                approved_by: manager?.id,
                approved_at: new Date(),
                approval_remarks: remarks || null,
                status: 'approved',
                completed_at: new Date()
            });

            // Create asset health history record
            if (service.asset_id) {
                await AssetHealthHistory.create({
                    asset_id: service.asset_id,
                    submission_id: service.id,
                    submitted_at: service.submitted_at || new Date(),
                    critical_count: service.critical_count || 0,
                    high_count: service.high_count || 0,
                    medium_count: service.medium_count || 0,
                    low_count: service.low_count || 0,
                    total_priority_score: service.total_priority_score || 0,
                    health_status: service.calculated_health_status || 'HEALTHY'
                });

                // Update asset health status and conditions
                const assetHealthService = require('../../services/assets/assetHealthService');
                await assetHealthService.updateAssetHealthFromService(
                    service.asset_id,
                    service.id
                );
            }

            // Send notification to technician
            const { notify_service_approved } = require('../../services/notifications/notificationService');
            // Reload service with necessary associations for notification if needed, 
            // but current service object has 'asset' included which is used.
            // The service object from line 818 has 'asset' include.
            // We might need 'technician' or 'submitted_by' info which is likely on the service object itself or we fallback to 'technician_id'.
            // Let's ensure we have the technician info. The 'notify_service_approved' uses 'submitted_by' or 'technician_id'. 
            // We should check if 'service' has these fields. 'ServiceSubmission' model usually has them.
            await notify_service_approved(service, manager.id);

            console.log(`✅ Service ${service.submission_number} approved by manager`);

            return res.json({
                success: true,
                message: 'Service approved successfully',
                service: {
                    id: service.id,
                    submissionNumber: service.submission_number,
                    approvalStatus: 'approved',
                    approvedAt: new Date()
                }
            });
        } catch (error) {
            console.error('❌ Error approving service:', error);
            return next(error);
        }
    },

    /**
     * Reject a submitted service
     * POST /api/v1/manager/calendar/reject-service/:serviceId
     */
    async rejectService(req, res, next) {
        try {
            const { serviceId } = req.params;
            const { remarks } = req.body;
            const plantIds = await getManagerPlantIds(req.user.id);
            const manager = await getManagerByUserId(req.user.id);

            if (!remarks) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection remarks are required'
                });
            }

            // Get the service
            const service = await ServiceSubmission.findByPk(serviceId);

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            // Validate manager has access to this plant
            if (!plantIds.includes(service.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Service belongs to a plant not assigned to you'
                });
            }

            // Validate service is in submitted status (case-insensitive)
            if (service.status.toUpperCase() !== 'SUBMITTED') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot reject service with status '${service.status}'. Service must be in 'submitted' status.`
                });
            }

            // Update service rejection
            await service.update({
                approval_status: 'rejected',
                approved_by: manager?.id,
                approved_at: new Date(),
                approval_remarks: remarks,
                status: 'rejected'
            });

            // Send notification to technician
            // We need to fetch asset info if not present, because notify_service_rejected uses asset.asset_code
            // The service fetched at line 915 is just findByPk without includes.
            const serviceWithAsset = await ServiceSubmission.findByPk(serviceId, {
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code']
                }]
            });

            const { notify_service_rejected } = require('../../services/notifications/notificationService');
            await notify_service_rejected(serviceWithAsset, manager.id, remarks);

            console.log(`❌ Service ${service.submission_number} rejected by manager`);

            return res.json({
                success: true,
                message: 'Service rejected',
                service: {
                    id: service.id,
                    submissionNumber: service.submission_number,
                    approvalStatus: 'rejected',
                    remarks
                }
            });
        } catch (error) {
            console.error('❌ Error rejecting service:', error);
            return next(error);
        }
    },

    /**
     * Assign technician to a ticket
     * PUT /api/v1/manager/calendar/assign-ticket-technician/:ticketId
     */
    async assignTicketTechnician(req, res, next) {
        try {
            const { ticketId } = req.params;
            const { technicianId } = req.body;
            const plantIds = await getManagerPlantIds(req.user.id);

            if (!technicianId) {
                return res.status(400).json({
                    success: false,
                    message: 'Technician ID is required'
                });
            }

            // Get the ticket
            const ticket = await Ticket.findByPk(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            // Validate manager has access to this plant
            if (ticket.plant_id && !plantIds.includes(ticket.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Ticket belongs to a plant not assigned to you'
                });
            }

            // Get technician
            const technician = await Technician.findByPk(technicianId, {
                include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
            });

            if (!technician) {
                return res.status(404).json({
                    success: false,
                    message: 'Technician not found'
                });
            }

            if (technician.status !== 'Active') {
                return res.status(400).json({
                    success: false,
                    message: 'Technician is not active'
                });
            }

            // Update ticket
            await ticket.update({
                technician_id: technicianId
            });

            console.log(`✅ Technician ${technician.user?.name} assigned to ticket ${ticket.ticket_code}`);

            return res.json({
                success: true,
                message: 'Technician assigned to ticket successfully',
                ticket: {
                    id: ticket.id,
                    ticketCode: ticket.ticket_code,
                    technicianId: technicianId,
                    technicianName: technician.user?.name
                }
            });
        } catch (error) {
            console.error('❌ Error assigning technician to ticket:', error);
            return next(error);
        }
    },

    /**
     * Get all technicians assigned to a service
     * GET /api/manager/calendar/services/:serviceId/technicians
     */
    async getServiceTechnicians(req, res, next) {
        try {
            const { serviceId } = req.params;
            const plantIds = await getManagerPlantIds(req.user.id);

            // Verify service exists and manager has access
            const service = await ServiceSubmission.findByPk(serviceId);
            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            if (!plantIds.includes(service.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Get all assigned technicians
            const assignments = await ServiceTechnician.findAll({
                where: { service_id: serviceId },
                include: [{
                    model: Technician,
                    as: 'technician',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'profile_pic']
                    }]
                }, {
                    model: Manager,
                    as: 'assignedByManager',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name']
                    }]
                }],
                order: [['assigned_at', 'ASC']]
            });

            return res.json({
                success: true,
                technicians: assignments.map(a => ({
                    id: a.technician.id,
                    technicianCode: a.technician.technician_code,
                    technicianType: a.technician.technician_type,
                    name: a.technician.user?.name,
                    email: a.technician.user?.email,
                    profilePic: a.technician.user?.profile_pic,
                    status: a.status,
                    assignedAt: a.assigned_at,
                    assignedBy: a.assignedByManager?.user?.name
                }))
            });
        } catch (error) {
            console.error('❌ Error fetching service technicians:', error);
            return next(error);
        }
    },

    /**
     * Unassign a technician from a service
     * DELETE /api/manager/calendar/services/:serviceId/technicians/:technicianId
     */
    async unassignTechnician(req, res, next) {
        try {
            const { serviceId, technicianId } = req.params;
            const plantIds = await getManagerPlantIds(req.user.id);

            // Verify service exists and manager has access
            const service = await ServiceSubmission.findByPk(serviceId);
            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            if (!plantIds.includes(service.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Cannot unassign if service is completed
            if (['completed', 'submitted', 'approved'].includes(service.status?.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot unassign technician from completed service'
                });
            }

            // Delete the assignment
            const deleted = await ServiceTechnician.destroy({
                where: {
                    service_id: serviceId,
                    technician_id: technicianId
                }
            });

            if (deleted === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Technician was not assigned to this service'
                });
            }

            console.log(`✅ Technician ${technicianId} unassigned from service ${service.submission_number}`);

            return res.json({
                success: true,
                message: 'Technician unassigned successfully'
            });
        } catch (error) {
            console.error('❌ Error unassigning technician:', error);
            return next(error);
        }
    },

    /**
     * Assign all eligible technicians to a service
     * POST /api/manager/calendar/assign-all-technicians/:serviceId
     */
    async assignAllEligibleTechnicians(req, res, next) {
        try {
            const { serviceId } = req.params;
            const plantIds = await getManagerPlantIds(req.user.id);
            const manager = await getManagerByUserId(req.user.id);

            // Get the service
            const service = await ServiceSubmission.findByPk(serviceId, {
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'category_id']
                }]
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found'
                });
            }

            if (!plantIds.includes(service.plant_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Get all eligible technicians (reuse existing logic)
            const plantTechnicians = await TechnicianPlant.findAll({
                where: { plant_id: service.plant_id },
                attributes: ['technician_id']
            });
            const plantTechnicianIds = plantTechnicians.map(tp => tp.technician_id);

            let whereClause = {
                status: 'Active'
            };

            if (plantTechnicianIds.length > 0) {
                whereClause[Op.or] = [
                    {
                        technician_type: { [Op.in]: ['In-House', 'In House'] },
                        id: { [Op.in]: plantTechnicianIds }
                    },
                    {
                        technician_type: { [Op.in]: ['Third-Party', 'Third Party'] }
                    }
                ];
            }

            // Category filter if applicable
            if (service.asset?.category_id) {
                const categoryTechnicians = await TechnicianCategory.findAll({
                    where: { category_id: service.asset.category_id },
                    attributes: ['technician_id']
                });
                const categoryTechnicianIds = categoryTechnicians.map(tc => tc.technician_id);
                if (categoryTechnicianIds.length > 0) {
                    whereClause.id = { [Op.in]: categoryTechnicianIds };
                }
            }

            const eligibleTechnicians = await Technician.findAll({
                where: whereClause
            });

            // Assign all eligible technicians
            let assignedCount = 0;
            let skippedCount = 0;

            for (const tech of eligibleTechnicians) {
                try {
                    const [assignment, created] = await ServiceTechnician.findOrCreate({
                        where: {
                            service_id: serviceId,
                            technician_id: tech.id
                        },
                        defaults: {
                            assigned_by: manager?.id,
                            assigned_at: new Date(),
                            status: 'assigned'
                        }
                    });

                    if (created) {
                        assignedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to assign technician ${tech.id}:`, err);
                    skippedCount++;
                }
            }

            // Update service status if needed
            if (assignedCount > 0 && service.status === 'draft') {
                await service.update({
                    manager_id: manager?.id,
                    status: 'pending'
                });
            }

            console.log(`✅ Assigned ${assignedCount} technicians to service ${service.submission_number}`);

            return res.json({
                success: true,
                message: `Assigned ${assignedCount} technicians`,
                assigned: assignedCount,
                skipped: skippedCount,
                total: eligibleTechnicians.length
            });
        } catch (error) {
            console.error('❌ Error assigning all technicians:', error);
            return next(error);
        }
    }
};

module.exports = managerCalendarController;
