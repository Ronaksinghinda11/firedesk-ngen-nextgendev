/**
 * Technician QR Controller
 * Handles QR code scanning and verification for service completion
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
    ServiceTechnician
} = require('../../models');

/**
 * Get all services for a specific asset (used when QR code is scanned)
 * Shows today's services for that asset assigned to the technician
 * GET /api/technician/services/by-asset/:assetId
 */
const get_services_by_asset = async (req, res, next) => {
    try {
        const { assetId } = req.params;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Find asset by asset_id (the human-readable ID from QR code)
        const asset = await Asset.findOne({
            where: {
                [Op.or]: [
                    { asset_code: assetId },
                    { id: assetId }
                ]
            },
            include: [
                { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'address_line1'] },
                { model: Category, as: 'category', attributes: ['id', 'category_name'] },
                { model: Product, as: 'product', attributes: ['id', 'product_name'] }
            ]
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
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
                data: {
                    asset: {
                        id: asset.id,
                        assetId: asset.asset_code,
                        location: asset.location,
                        tag: asset.tag,
                        plant: asset.plant ? {
                            id: asset.plant.id,
                            plantName: asset.plant.plant_name,
                            address: asset.plant.address_line1
                        } : undefined,
                        category: asset.category ? {
                            id: asset.category.id,
                            name: asset.category.category_name
                        } : undefined,
                        product: asset.product ? {
                            id: asset.product.id,
                            name: asset.product.product_name
                        } : undefined
                    },
                    services: [],
                    servicesCount: 0
                }
            });
        }

        // Get services for this asset assigned to the technician (excluding cancelled)
        const services = await ServiceSubmission.findAll({
            where: {
                id: { [Op.in]: serviceIds },
                asset_id: asset.id,
                status: { [Op.notIn]: ['CANCELLED', 'cancelled', 'Cancelled'] }  // Exclude all cancelled variants
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'floor_id'],
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
                }
            ],
            order: [['scheduled_date', 'ASC']]
        });

        // Transform services to match mobile app expectations (camelCase field names)
        const transformedServices = services.map(service => {
            return {
                id: service.id,
                submissionNumber: service.submission_number,
                scheduledDate: service.scheduled_date,
                status: (service.status || 'PENDING').toUpperCase(),
                inspectionType: service.form?.service_type || 'Inspection',
                startedAt: service.started_at,
                submittedAt: service.submitted_at,
                completedAt: service.completed_at,
                createdAt: service.created_at,
                updatedAt: service.updated_at,
                asset: service.asset ? {
                    id: service.asset.id,
                    assetId: service.asset.asset_code,
                    asset_code: service.asset.asset_code,
                    location: service.asset.location,
                    building: service.asset.building ? {
                        id: service.asset.building.id,
                        buildingName: service.asset.building.building_name
                    } : undefined,
                    floor: service.asset.floor_id,
                    plant: service.asset.plant ? {
                        id: service.asset.plant.id,
                        plantName: service.asset.plant.plant_name,
                        address: service.asset.plant.address_line1
                    } : undefined
                } : undefined,
                form: service.form ? {
                    id: service.form.id,
                    serviceName: service.form.service_name,
                    formCode: service.form.form_code,
                    serviceType: service.form.service_type
                } : undefined,
                frequency: service.inspectionFrequency ? {
                    id: service.inspectionFrequency.id,
                    frequencyName: service.inspectionFrequency.frequency_name,
                    intervalDays: service.inspectionFrequency.interval_days
                } : undefined
            };
        });

        return res.json({
            success: true,
            data: {
                asset: {
                    id: asset.id,
                    assetId: asset.asset_code,
                    location: asset.location,
                    tag: asset.tag,
                    plant: asset.plant ? {
                        id: asset.plant.id,
                        plantName: asset.plant.plant_name,
                        address: asset.plant.address_line1
                    } : undefined,
                    category: asset.category ? {
                        id: asset.category.id,
                        name: asset.category.category_name
                    } : undefined,
                    product: asset.product ? {
                        id: asset.product.id,
                        name: asset.product.product_name
                    } : undefined
                },
                services: transformedServices,
                servicesCount: services.length
            }
        });
    } catch (error) {
        console.error('[Technician QR] Error fetching services by asset:', error);
        return next(error);
    }
};

/**
 * Verify QR code matches the service's assigned asset
 * POST /api/technician/services/:serviceId/verify-qr
 * Body: { asset_id }
 */
const verify_qr_code = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const schema = Joi.object({
            asset_id: Joi.string().required().messages({
                'any.required': 'Asset ID from QR code is required'
            })
        }).unknown(true);

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { asset_id } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician
        const assignment = await ServiceTechnician.findOne({
            where: {
                service_id: serviceId,
                technician_id: technician.id
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Get the service
        const service = await ServiceSubmission.findOne({
            where: { id: serviceId },
            include: [{
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'location', 'building_id'],
                include: [
                    { model: Building, as: 'building', attributes: ['id', 'building_name'] },
                    { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] }
                ]
            }]
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Verify QR code matches using UUID only
        // QR code now contains the asset's UUID (id field)
        const isMatch = service.asset.id === asset_id;

        if (!isMatch) {
            return res.json({
                success: false,
                verified: false,
                message: 'QR code does not match the expected asset. You may request a manager override.',
                expected_asset: service.asset.id,
                expected_asset_code: service.asset.asset_code,
                scanned_asset: asset_id
            });
        }

        // Mark QR as verified on the service
        await service.update({ qr_verified: true, qr_verified_at: new Date() });

        return res.json({
            success: true,
            message: 'QR code verified successfully',
            data: {
                verified: true,
                service
            }
        });
    } catch (error) {
        console.error('[Technician QR] Error verifying QR code:', error);
        return next(error);
    }
};

/**
 * Request manager override when QR verification fails
 * POST /api/technician/services/:serviceId/request-override
 * Body: { reason }
 */
const request_override = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const schema = Joi.object({
            reason: Joi.string().required().min(10).messages({
                'any.required': 'Override reason is required',
                'string.min': 'Reason must be at least 10 characters'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { reason } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician
        const assignment = await ServiceTechnician.findOne({
            where: {
                service_id: serviceId,
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
            where: { id: serviceId }
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        // Check if override already requested
        if (service.override_requested) {
            return res.status(400).json({
                success: false,
                message: 'Override has already been requested for this service'
            });
        }

        // Update service with override request
        await service.update({
            override_requested: true,
            override_reason: reason,
            override_requested_at: new Date(),
            override_status: 'PENDING'
        });

        // TODO: Send notification to manager

        return res.json({
            success: true,
            message: 'Override request submitted. Waiting for manager approval.',
            data: {
                override_status: 'PENDING'
            }
        });
    } catch (error) {
        console.error('[Technician QR] Error requesting override:', error);
        return next(error);
    }
};

/**
 * Check override status
 * GET /api/technician/services/:serviceId/override-status
 */
const get_override_status = async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Check if service is assigned to this technician
        const assignment = await ServiceTechnician.findOne({
            where: {
                service_id: serviceId,
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
            where: { id: serviceId },
            attributes: [
                'id',
                'override_requested',
                'override_status',
                'override_reason',
                'override_requested_at',
                'override_approved_at',
                'qr_verified'
            ]
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or not assigned to you'
            });
        }

        return res.json({
            success: true,
            data: {
                override_requested: service.override_requested || false,
                override_status: service.override_status || null,
                override_reason: service.override_reason || null,
                qr_verified: service.qr_verified || false,
                can_proceed: service.qr_verified || service.override_status === 'APPROVED'
            }
        });
    } catch (error) {
        console.error('[Technician QR] Error fetching override status:', error);
        return next(error);
    }
};

/**
 * Create displacement incident when asset has moved > 5 meters
 * POST /api/technician/displacement-incident
 * 
 * This is a technician-specific endpoint that allows technicians to create
 * displacement incidents without requiring the incidents:create permission.
 */
const create_displacement_incident = async (req, res, next) => {
    try {
        const {
            assetId,
            assetName,
            previousLat,
            previousLong,
            currentLat,
            currentLong,
            distance,
            plantId,
            technicianId,
            technicianName,
            buildingId,
            floorId
        } = req.body;

        // Validate required fields
        if (!assetId || !plantId || !distance) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: assetId, plantId, distance'
            });
        }

        // Import SAMS models for incident creation
        const { IncidentSubtype, IncidentType, Incident, IncidentActivity } = require('../../models/sams');
        const { sequelize } = require('../../../config/config');

        // Find or create 'Displacement' subtype
        let subtype = await IncidentSubtype.findOne({ where: { subtypeName: 'Displacement' } });

        if (!subtype) {
            // Fallback: try to find a 'General' subtype
            subtype = await IncidentSubtype.findOne({ where: { subtypeName: 'General' } });

            if (!subtype) {
                // Create a Displacement subtype if it doesn't exist
                let type = await IncidentType.findOne({ where: { typeName: 'Automatic' } });
                if (!type) type = await IncidentType.findOne(); // Any type

                if (type) {
                    subtype = await IncidentSubtype.create({
                        subtypeName: 'Displacement',
                        subtypeCode: 'DISP',
                        incidentTypeId: type.id,
                        isActive: true
                    });
                }
            }
        }

        if (!subtype) {
            return res.status(400).json({
                success: false,
                message: 'Could not determine Incident Subtype for Displacement. Please configure incident types first.'
            });
        }

        // Generate incident number
        const count = await Incident.count({
            where: { incidentSubtypeId: subtype.id }
        });
        const prefix = subtype.subtypeCode || 'INC';
        const year = new Date().getFullYear();
        const number = String(count + 1).padStart(4, '0');
        const incidentNumber = `${prefix}-${year}-${number}`;

        // Determine severity based on distance
        const severity = distance > 100 ? 'High' : (distance > 20 ? 'Medium' : 'Low');

        const transaction = await sequelize.transaction();

        try {
            // Create the incident
            const incident = await Incident.create({
                incidentNumber,
                incidentSubtypeId: subtype.id,
                plantId: plantId,
                buildingId: buildingId || null,
                floorId: floorId || null,
                incidentDate: new Date(),
                description: `Asset Displacement Detected: ${assetName || assetId} (ID: ${assetId}). Moved ${distance}m. Previous Location: [${previousLat}, ${previousLong}], Current Location: [${currentLat}, ${currentLong}]. Detected by: ${technicianName || 'Technician'}`,
                impact: 'Asset Location Mismatch',
                severity: severity,
                status: 'Open',
                currentCapaStep: 0,
                createdBy: req.user.id
            }, { transaction });

            // Log activity
            await IncidentActivity.create({
                incidentId: incident.id,
                action: 'Incident Created',
                description: `Displacement incident ${incidentNumber} created automatically by mobile app`,
                performedBy: req.user.id,
                metadata: { severity, distance, assetId }
            }, { transaction });

            await transaction.commit();

            console.log('[Technician] Displacement incident created:', incidentNumber);

            return res.status(201).json({
                success: true,
                message: 'Displacement incident created successfully',
                data: {
                    incidentId: incident.id,
                    incidentNumber: incident.incidentNumber,
                    severity: incident.severity,
                    assetId: assetId,
                    distance: distance
                }
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('[Technician QR] Error creating displacement incident:', error);

        // Return detailed error for debugging
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
            errorName: error.name,
            validationErrors: error.errors ? error.errors.map(e => ({ message: e.message, field: e.path, value: e.value })) : null,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    get_services_by_asset,
    verify_qr_code,
    request_override,
    get_override_status,
    create_displacement_incident
};
