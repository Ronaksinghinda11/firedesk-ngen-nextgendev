/**
 * Technician Services Controller
 * Handles service submissions assigned to technicians
 */
const Joi = require('joi');
const { Op } = require('sequelize');
const {
    ServiceSubmission,
    Form,
    Asset,
    Plant,
    Building,
    Category,
    Product,
    InspectionFrequency,
    Technician,
    User,
    ServiceTechnician
} = require('../../models');

/**
 * Get all services assigned to the current technician
 * GET /api/technician/my-services
 */
const get_my_assigned_services = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50)
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit } = value;

        // Get technician from user
        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get service IDs assigned to this technician via junction table
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });

        const serviceIds = assignments.map(a => a.service_id);

        if (serviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    hasMore: false
                }
            });
        }

        // Query ServiceSubmission - only services in the junction table for consistency with statistics
        // Exclude cancelled services
        const { count, rows: services } = await ServiceSubmission.findAndCountAll({
            where: {
                id: { [Op.in]: serviceIds },
                status: { [Op.ne]: 'CANCELLED' }  // Exclude cancelled services
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id', 'status', 'health_status'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name', 'interval_days']
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['scheduled_date', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        // Transform data to match frontend expectations
        const transformedServices = services.map(service => ({
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        }));

        return res.json({
            success: true,
            data: transformedServices,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: page * limit < count
            }
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching assigned services:', error);
        return next(error);
    }
};

/**
 * Get services due (scheduled for today or past due)
 * GET /api/technician/my-services/due
 */
const get_services_due = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10)
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get service IDs assigned to this technician via junction table
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });

        const serviceIds = assignments.map(a => a.service_id);

        if (serviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    hasMore: false
                }
            });
        }

        // Get today's date in YYYY-MM-DD format for DATE column comparison
        // Use IST date since the app operates in IST
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in milliseconds
        const istNow = new Date(now.getTime() + istOffset);
        const todayStr = istNow.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Query ServiceSubmission - only services in the junction table for consistency with statistics
        const { count, rows: services } = await ServiceSubmission.findAndCountAll({
            distinct: true,
            where: {
                id: { [Op.in]: serviceIds },
                status: { [Op.in]: ['PENDING', 'IN_PROGRESS', 'pending', 'in_progress', 'draft'] },
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"ServiceSubmission"."scheduled_date" <= '${todayStr}' AND "ServiceSubmission"."scheduled_date" + (
                        SELECT CASE LOWER(f.frequency_name)
                            WHEN 'daily' THEN 1
                            WHEN 'weekly' THEN 7
                            WHEN 'fortnightly' THEN 14
                            WHEN 'monthly' THEN 30
                            WHEN 'bi-monthly' THEN 60
                            WHEN 'quarterly' THEN 90
                            WHEN 'half-yearly' THEN 180
                            WHEN 'semi-annually' THEN 180
                            WHEN 'annually' THEN 365
                            WHEN 'yearly' THEN 365
                            ELSE 30
                        END
                        FROM inspection_frequencies f
                        WHERE f.id = "ServiceSubmission"."frequency_id"
                    ) * INTERVAL '1 day' >= '${todayStr}'`)
                ]
            },
            logging: console.log,
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id', 'status', 'health_status'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name', 'interval_days']
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['scheduled_date', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        console.log(`[Due Services] Technician: ${technician.id}, Page: ${page}, Count: ${count}, Date: ${todayStr}`);

        // Transform data
        const transformedServices = services.map(service => ({
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined,
                plantName: service.asset.plant?.plant_name
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        }));

        return res.json({
            success: true,
            data: transformedServices,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: page * limit < count
            }
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching due services:', error);
        return next(error);
    }
};

/**
 * Get upcoming services (scheduled after today)
 * GET /api/technician/my-services/upcoming
 */
const get_upcoming_services = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10)
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get service IDs assigned to this technician via junction table
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });

        const serviceIds = assignments.map(a => a.service_id);

        if (serviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    hasMore: false
                }
            });
        }

        // Get tomorrow's date in YYYY-MM-DD format for DATE column comparison (IST)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in milliseconds
        const istNow = new Date(now.getTime() + istOffset);
        // Add 1 day for tomorrow
        const istTomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = istTomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Query ServiceSubmission - only services in the junction table for consistency with statistics
        const { count, rows: services } = await ServiceSubmission.findAndCountAll({
            distinct: true,
            where: {
                id: { [Op.in]: serviceIds },
                status: { [Op.in]: ['PENDING', 'IN_PROGRESS', 'pending', 'in_progress', 'draft'] },
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"ServiceSubmission"."scheduled_date" >= '${tomorrowStr}'`)
                ]
            },
            logging: console.log,
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id', 'status', 'health_status'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name', 'interval_days']
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['scheduled_date', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        // Transform data
        const transformedServices = services.map(service => ({
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined,
                plantName: service.asset.plant?.plant_name
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        }));

        return res.json({
            success: true,
            data: transformedServices,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: page * limit < count
            }
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching upcoming services:', error);
        return next(error);
    }
};

/**
 * Get lapsed services (scheduled before today and still PENDING)
 * GET /api/technician/my-services/lapsed
 */
const get_lapsed_services = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50)
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get service IDs assigned to this technician
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });

        const serviceIds = assignments.map(a => a.service_id);

        if (serviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    hasMore: false
                }
            });
        }

        // Get today's date in YYYY-MM-DD format for DATE column comparison (IST)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in milliseconds
        const istNow = new Date(now.getTime() + istOffset);
        const todayStr = istNow.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Query ServiceSubmission - only services in the junction table for consistency with statistics
        const { count, rows: services } = await ServiceSubmission.findAndCountAll({
            distinct: true,
            where: {
                id: { [Op.in]: serviceIds },
                status: { [Op.in]: ['PENDING', 'IN_PROGRESS', 'pending', 'in_progress', 'draft'] },
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"ServiceSubmission"."scheduled_date" + (
                        SELECT CASE LOWER(f.frequency_name)
                            WHEN 'daily' THEN 1
                            WHEN 'weekly' THEN 7
                            WHEN 'fortnightly' THEN 14
                            WHEN 'monthly' THEN 30
                            WHEN 'bi-monthly' THEN 60
                            WHEN 'quarterly' THEN 90
                            WHEN 'half-yearly' THEN 180
                            WHEN 'semi-annually' THEN 180
                            WHEN 'annually' THEN 365
                            WHEN 'yearly' THEN 365
                            ELSE 30
                        END
                        FROM inspection_frequencies f
                        WHERE f.id = "ServiceSubmission"."frequency_id"
                    ) * INTERVAL '1 day' < '${todayStr}'`)
                ]
            },
            logging: console.log,
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id', 'status'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name', 'interval_days']
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['scheduled_date', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        // Transform data
        const transformedServices = services.map(service => ({
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined,
                plantName: service.asset.plant?.plant_name
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        }));

        return res.json({
            success: true,
            data: transformedServices,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: page * limit < count
            }
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching lapsed services:', error);
        return next(error);
    }
};

/**
 * Get completed services
 * GET /api/technician/my-services/completed
 */
const get_completed_services = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50)
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get service IDs assigned to this technician
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });

        const serviceIds = assignments.map(a => a.service_id);

        if (serviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    hasMore: false
                }
            });
        }

        // Query ServiceSubmission - only services in the junction table for consistency with statistics
        const { count, rows: services } = await ServiceSubmission.findAndCountAll({
            distinct: true,
            where: {
                id: { [Op.in]: serviceIds },
                status: { [Op.in]: ['COMPLETED', 'SUBMITTED', 'APPROVED', 'completed', 'submitted', 'approved', 'Completed', 'Submitted', 'Approved'] }
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id', 'status'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name', 'interval_days']
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['completed_at', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        // Transform data
        const transformedServices = services.map(service => ({
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined,
                plantName: service.asset.plant?.plant_name
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        }));

        return res.json({
            success: true,
            data: transformedServices,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: page * limit < count
            }
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching completed services:', error);
        return next(error);
    }
};

/**
 * Get rejected services assigned to this technician
 * GET /api/technician/my-services/rejected
 */
const get_rejected_services = async (req, res, next) => {
    try {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50)
        });

        const { error, value } = schema.validate(req.query);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { page, limit } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get service IDs assigned to this technician
        const assignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });

        const serviceIds = assignments.map(a => a.service_id);

        if (serviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    hasMore: false
                }
            });
        }

        // Query ServiceSubmission - only rejected services
        const { count, rows: services } = await ServiceSubmission.findAndCountAll({
            distinct: true,
            where: {
                id: { [Op.in]: serviceIds },
                status: { [Op.in]: ['REJECTED', 'rejected', 'Rejected'] }
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id', 'status'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name', 'interval_days']
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }]
                }
            ],
            order: [['approved_at', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        // Transform data
        const transformedServices = services.map(service => ({
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            approvalRemarks: service.approval_remarks,
            approvedBy: service.approved_by,
            approvedAt: service.approved_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined,
                plantName: service.asset.plant?.plant_name
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        }));

        return res.json({
            success: true,
            data: transformedServices,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: page * limit < count
            }
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching rejected services:', error);
        return next(error);
    }
};

/**
 * Get service details by ID
 * GET /api/technician/my-services/:id
 */
const get_service_by_id = async (req, res, next) => {
    try {
        const { id } = req.params;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician via junction table
        const assignment = await ServiceTechnician.findOne({
            where: {
                service_id: id,
                technician_id: technician.id
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        const service = await ServiceSubmission.findOne({
            where: { id },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    include: [
                        { model: Plant, as: 'plant' },
                        { model: Building, as: 'building' },
                        { model: Category, as: 'category' },
                        { model: Product, as: 'product' }
                    ]
                },
                {
                    model: Form,
                    as: 'form'
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency'
                },
                {
                    model: Technician,
                    as: 'assignedTechnicians',
                    through: { attributes: [] },
                    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
                }
            ]
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Transform the response
        const transformedService = {
            id: service.id,
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            status: service.status,
            inspectionType: service.form?.service_type || 'Inspection',
            startedAt: service.started_at,
            submittedAt: service.submitted_at,
            completedAt: service.completed_at,
            createdAt: service.created_at,
            updatedAt: service.updated_at,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                status: service.asset.status,
                healthStatus: service.asset.health_status,
                location: service.asset.location,
                building: service.asset.building,
                floor: service.asset.floor_id,
                plant: service.asset.plant ? {
                    id: service.asset.plant.id,
                    plantName: service.asset.plant.plant_name,
                    location: service.asset.plant.address_line1
                } : undefined,
                category: service.asset.category,
                product: service.asset.product
            } : undefined,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                description: service.form.description
            } : undefined,
            frequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name,
                intervalDays: service.inspectionFrequency.interval_days
            } : undefined,
            assignedTechnicians: service.assignedTechnicians || []
        };

        return res.json({
            success: true,
            data: transformedService
        });
    } catch (error) {
        console.error('[Technician Services] Error fetching service by ID:', error);
        return next(error);
    }
};

module.exports = {
    get_my_assigned_services,
    get_services_due,
    get_upcoming_services,
    get_lapsed_services,
    get_completed_services,
    get_rejected_services,
    get_service_by_id
};
