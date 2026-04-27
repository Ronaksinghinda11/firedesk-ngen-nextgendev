/**
 * Scheduler Service
 * Handles service generation, scheduling, and maintenance scheduling operations
 * Ported from old serviceGenerationService.js with improvements
 */

const { Op } = require('sequelize');
const auditService = require('../../services/audit/audit_service');

class SchedulerService {
    /**
     * Frequency name to code mapping
     */
    frequencyNameToCode = {
        "Daily": "D",
        "daily": "D",
        "Weekly": "W",
        "weekly": "W",
        "Fortnightly": "FN",
        "fortnightly": "FN",
        "Fortnight": "FN",
        "Monthly": "M",
        "monthly": "M",
        "Quarterly": "Q",
        "quarterly": "Q",
        "Half Year": "HY",
        "Half Yearly": "HY",
        "half-yearly": "HY",
        "Yearly": "Y",
        "yearly": "Y"
    };

    /**
     * Service type display names
     */
    serviceTypeDisplayNames = {
        inspection: 'Inspection',
        testing: 'Testing',
        maintenance: 'Maintenance'
    };

    /**
     * Get all Sequelize models
     * @returns {Object} All models
     */
    getModels() {
        return {
            Asset: require('../../models/assets/Asset'),
            Plant: require('../../models/plants/Plant'),
            Scheduler: require('../../models/plants/Scheduler'),
            ServiceSubmission: require('../../models/service-form/ServiceSubmission'),
            ServiceForm: require('../../models/service-form/Form'),
            InspectionFrequency: require('../../models/service-form/InspectionFrequency')
        };
    }

    /**
     * Get today's date in YYYY-MM-DD format (UTC)
     * @returns {string} Today's date
     */
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Get frequency ID by name
     * @param {string} frequencyName - e.g., "Daily", "Weekly"
     * @returns {Promise<string|null>} Frequency ID or null
     */
    async getFrequencyId(frequencyName) {
        const { InspectionFrequency } = this.getModels();
        const frequency = await InspectionFrequency.findOne({
            where: { frequency_name: frequencyName },
            attributes: ['id']
        });
        return frequency ? frequency.id : null;
    }

    /**
     * Get frequency interval in days
     * @param {string} frequencyName - e.g., "Daily", "Weekly"
     * @returns {Promise<number|null>} Interval in days or null
     */
    async getFrequencyIntervalDays(frequencyName) {
        const { InspectionFrequency } = this.getModels();
        const frequency = await InspectionFrequency.findOne({
            where: { frequency_name: frequencyName },
            attributes: ['interval_days']
        });
        return frequency ? frequency.interval_days : null;
    }

    /**
     * Calculate all service dates within a range
     * @param {string|Date} startDate - Schedule start date
     * @param {string|Date} endDate - Schedule end date
     * @param {number} intervalDays - Interval in days
     * @returns {Date[]} Array of service dates
     */
    calculateServiceDates(startDate, endDate, intervalDays) {
        const dates = [];
        let currentDate = new Date(startDate);
        const finalDate = new Date(endDate);

        // Ensure currentDate is not in the past for initial run by forwarding the cadence
        const today = new Date(this.getTodayDate());
        if (intervalDays > 0) {
            while (currentDate < today) {
                currentDate.setDate(currentDate.getDate() + intervalDays);
            }
        } else if (currentDate < today) {
            currentDate = today; // Fallback if interval is 0 or negative
        }

        while (currentDate <= finalDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + intervalDays);
        }
        return dates;
    }

    /**
     * Get the best matching form for a service
     * @param {string} serviceType - e.g., "inspection"
     * @param {string} plantId 
     * @param {string} categoryId 
     * @param {string} productId 
     * @param {string} frequencyId 
     * @returns {Promise<string|null>} Form ID or null
     */
    async getFormForService(serviceType, plantId, categoryId, productId, frequencyId) {
        const { ServiceForm } = this.getModels();
        const serviceNamePrefix = `${frequencyId}_${serviceType}`.toUpperCase();

        // Map service type to form service_type (capitalize first letter)
        const formServiceType = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);

        // Priority 1: Exact match (Category + Product + Frequency + ServiceType)
        let form = await ServiceForm.findOne({
            where: {
                category_id: categoryId,
                product_id: productId,
                frequency_id: frequencyId,
                service_type: formServiceType,
                status: 'Active'
            },
            attributes: ['id', 'service_name']
        });
        if (form) {
            console.log(`Found exact match form (category+product+frequency+type): ${form.service_name}`);
            return form.id;
        }

        // Priority 2: Category + Frequency + ServiceType
        form = await ServiceForm.findOne({
            where: {
                category_id: categoryId,
                frequency_id: frequencyId,
                service_type: formServiceType,
                product_id: { [Op.is]: null },
                status: 'Active'
            },
            attributes: ['id', 'service_name']
        });
        if (form) {
            console.log(`Found form by category+frequency+type: ${form.service_name}`);
            return form.id;
        }

        // Fallback: Just Category + Product + ServiceType
        form = await ServiceForm.findOne({
            where: {
                category_id: categoryId,
                product_id: productId,
                service_type: formServiceType,
                frequency_id: { [Op.is]: null },
                status: 'Active'
            },
            attributes: ['id', 'service_name']
        });
        if (form) {
            console.log(`Found form by category+product+type: ${form.service_name}`);
            return form.id;
        }

        // Fallback: Just Category + ServiceType
        form = await ServiceForm.findOne({
            where: {
                category_id: categoryId,
                service_type: formServiceType,
                product_id: { [Op.is]: null },
                frequency_id: { [Op.is]: null },
                status: 'Active'
            },
            attributes: ['id', 'service_name']
        });
        if (form) {
            console.log(`Found form by category+type only: ${form.service_name}`);
            return form.id;
        }

        return null; // No form found for this service type
    }

    /**
     * Generate a unique submission number using UUID for guaranteed uniqueness
     * @param {string} plantId 
     * @returns {Promise<string>} Unique submission number
     */
    async generateSubmissionNumber(plantId) {
        const { Plant } = this.getModels();
        const { v4: uuidv4 } = require('uuid');
        const plant = await Plant.findByPk(plantId, { attributes: ['plant_code'] });
        const plantCode = plant ? plant.plant_code : 'NA';
        const uniqueId = uuidv4().split('-')[0]; // First 8 chars of UUID
        return `SRV-${plantCode}-${Date.now()}-${uniqueId}`;
    }

    /**
     * Generate services for a specific asset based on its category's scheduler
     * @param {string} assetId 
     * @param {string} plantId
     * @returns {Promise<Object>} Result of service generation
     */
    async generateServicesForAsset(assetId, plantId) {
        const { Asset, Scheduler, ServiceSubmission } = this.getModels();

        try {
            console.log(`Generating services for asset ${assetId} in plant ${plantId}`);

            const asset = await Asset.findByPk(assetId);
            if (!asset) {
                throw new Error("Asset not found");
            }

            // Find scheduler matching asset's category
            const scheduler = await Scheduler.findOne({
                where: {
                    plant_id: plantId,
                    category_id: asset.category_id,
                    is_active: true
                },
                order: [['created_at', 'DESC']]
            });

            if (!scheduler || !scheduler.schedule_start_date || !scheduler.schedule_end_date) {
                console.log(`No valid scheduler found for plant ${plantId} and category ${asset.category_id}`);
                return { success: false, message: "No valid scheduler found for asset category" };
            }

            console.log(`Found scheduler for category: ${scheduler.category_id} (${scheduler.id})`);

            const generatedServices = [];
            const frequencies = {
                inspection: scheduler.inspection_frequency,
                testing: scheduler.testing_frequency,
                maintenance: scheduler.maintenance_frequency
            };

            // Generate services for each service type
            for (const [serviceType, frequencyString] of Object.entries(frequencies)) {
                if (!frequencyString) {
                    console.log(`No ${serviceType} frequency set for scheduler ${scheduler.id}`);
                    continue;
                }

                // Handle multiple frequencies (comma-separated)
                const frequencyList = frequencyString.split(',').map(f => f.trim());

                for (const frequencyName of frequencyList) {
                    if (!frequencyName) continue;

                    // Get frequency details
                    const frequencyId = await this.getFrequencyId(frequencyName);
                    const intervalDays = await this.getFrequencyIntervalDays(frequencyName);

                    if (!frequencyId || !intervalDays) {
                        console.log(`Invalid frequency ${frequencyName} for ${serviceType}`);
                        continue;
                    }

                    // Calculate service dates using original start date to preserve mathematical cadence
                    const serviceDates = this.calculateServiceDates(
                        scheduler.schedule_start_date,
                        scheduler.schedule_end_date,
                        intervalDays
                    );

                    console.log(`Generating ${serviceDates.length} ${serviceType} services (${frequencyName}) for asset ${assetId}`);

                    // Get form for this service type - matching category (scheduler) + product (asset) + frequency
                    const formId = await this.getFormForService(
                        serviceType,
                        plantId,
                        asset.category_id,
                        asset.product_id,
                        frequencyId
                    );

                    if (!formId) {
                        console.log(`No form found for ${serviceType} (category: ${asset.category_id}, product: ${asset.product_id}, frequency: ${frequencyId}), skipping...`);
                        continue;
                    }

                    console.log(`Using form ${formId} for ${serviceType} (category: ${asset.category_id}, product: ${asset.product_id}, frequency: ${frequencyId})`);

                    // Create service submission for each date (one service per date, not per manager)
                    for (const scheduledDate of serviceDates) {
                        try {
                            const submissionNumber = await this.generateSubmissionNumber(plantId);
                            const scheduledDateStr = scheduledDate.toISOString().split('T')[0];
                            const inspectionType = this.serviceTypeDisplayNames[serviceType] || serviceType;

                            // Check for duplicate service - use form_id to allow different frequencies to have their own services
                            const existingService = await ServiceSubmission.findOne({
                                where: {
                                    asset_id: assetId,
                                    scheduled_date: scheduledDateStr,
                                    form_id: formId,
                                    status: {
                                        [Op.notIn]: ['rejected', 'cancelled']
                                    }
                                }
                            });

                            if (existingService) {
                                console.log(`Skipping duplicate service for asset ${assetId} on ${scheduledDateStr} (${inspectionType}, form: ${formId})`);
                                continue;
                            }

                            // Create one service per date - no manager assignment needed, service belongs to the plant
                            const service = await ServiceSubmission.create({
                                submission_number: submissionNumber,
                                asset_id: assetId,
                                schedule_id: scheduler.id,
                                form_id: formId,
                                frequency_id: frequencyId,
                                plant_id: plantId,
                                manager_id: null,
                                status: 'PENDING',
                                scheduled_date: scheduledDateStr,
                                inspection_type: inspectionType
                            });

                            generatedServices.push(service);
                        } catch (error) {
                            console.error(`Error creating service for date ${scheduledDate}:`, error);
                        }
                    }
                }
            }

            console.log(`Generated ${generatedServices.length} services for asset ${assetId}`);

            // Update next_service_date on asset to closest upcoming pending service
            if (generatedServices.length > 0) {
                try {
                    const nextPending = await ServiceSubmission.findOne({
                        where: {
                            asset_id: assetId,
                            scheduled_date: { [Op.gte]: new Date() },
                            status: { [Op.notIn]: ['approved', 'rejected', 'cancelled'] }
                        },
                        order: [['scheduled_date', 'ASC']],
                        attributes: ['scheduled_date']
                    });
                    if (nextPending) {
                        await Asset.update(
                            { next_service_date: nextPending.scheduled_date },
                            { where: { id: assetId } }
                        );
                    }
                } catch (e) {
                    console.error(`[generateServicesForAsset] Failed to update next_service_date for ${assetId}:`, e.message);
                }
            }

            return {
                success: true,
                count: generatedServices.length,
                services: generatedServices
            };
        } catch (error) {
            console.error(`Error in generateServicesForAsset for asset ${assetId}:`, error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Generate services for all relevant assets in a plant
     * @param {string} plantId 
     * @param {string} schedulerId - Optional scheduler ID to filter by
     * @returns {Promise<Object>} Result with total services generated
     */
    async generateServicesForPlant(plantId, schedulerId = null) {
        const { Asset, Scheduler } = this.getModels();

        try {
            console.log(`Starting service generation for plant ${plantId}`);

            // Get scheduler(s) for filtering
            const schedulerWhere = { plant_id: plantId, is_active: true };
            if (schedulerId) {
                schedulerWhere.id = schedulerId;
            }

            const schedulers = await Scheduler.findAll({ where: schedulerWhere });

            if (schedulers.length === 0) {
                console.log(`No active schedulers found for plant ${plantId}`);
                return {
                    success: true,
                    message: "No active schedulers found",
                    totalAssets: 0,
                    totalServices: 0
                };
            }

            // Get category IDs from schedulers
            const categoryIds = schedulers.map(s => s.category_id);

            // Get all assets matching scheduler categories
            const assets = await Asset.findAll({
                where: {
                    plant_id: plantId,
                    category_id: { [Op.in]: categoryIds }
                }
            });

            if (assets.length === 0) {
                console.log(`No active assets found for plant ${plantId} with scheduler categories`);
                return {
                    success: true,
                    message: "No active assets found for scheduler categories",
                    totalAssets: 0,
                    totalServices: 0
                };
            }

            console.log(`Found ${assets.length} assets in plant ${plantId}`);

            let totalServices = 0;
            const results = [];

            // Generate services for each asset
            for (const asset of assets) {
                try {
                    const result = await this.generateServicesForAsset(asset.id, plantId);
                    if (result.success) {
                        totalServices += result.count;
                        results.push({
                            assetId: asset.id,
                            assetCode: asset.asset_code,
                            servicesGenerated: result.count
                        });
                    }
                } catch (error) {
                    console.error(`Error generating services for asset ${asset.id}:`, error);
                    results.push({
                        assetId: asset.id,
                        assetCode: asset.asset_code,
                        error: error.message
                    });
                }
            }

            console.log(`Service generation complete for plant ${plantId}. Generated ${totalServices} services across ${assets.length} assets`);

            return {
                success: true,
                message: `Generated ${totalServices} services across ${assets.length} assets`,
                totalAssets: assets.length,
                totalServices
            };
        } catch (error) {
            console.error(`Error in generateServicesForPlant for plant ${plantId}:`, error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Cancel all future PENDING/draft services for a scheduler
     * @param {string} schedulerId 
     * @returns {Promise<Object>} Result of cancellation
     */
    async cancelFutureServices(schedulerId) {
        const { ServiceSubmission } = this.getModels();
        try {
            const today = this.getTodayDate();
            const result = await ServiceSubmission.update({
                status: 'cancelled',
                cancelled_reason: 'The scheduler for the service is cancelled'
            }, {
                where: {
                    schedule_id: schedulerId,
                    status: {
                        [Op.in]: ['PENDING', 'pending', 'draft', 'Draft', 'assigned', 'ASSIGNED', 'due', 'DUE']
                    },
                    scheduled_date: {
                        [Op.gte]: today
                    }
                }
            });

            console.log(`Cancelled ${result[0]} future services for scheduler ${schedulerId}`);
            return {
                success: true,
                cancelledCount: result[0]
            };
        } catch (error) {
            console.error('Error cancelling future services:', error);
            throw error;
        }
    }

    /**
     * Check if scheduler data has changed in a way that requires service regeneration
     * @param {Object} oldValues 
     * @param {Object} newValues 
     * @returns {boolean} True if regeneration is needed
     */
    didSchedulerChange(oldValues, newValues) {
        const fieldsToCheck = [
            'schedule_start_date',
            'schedule_end_date',
            'inspection_frequency',
            'testing_frequency',
            'maintenance_frequency',
            'is_active'
        ];

        for (const field of fieldsToCheck) {
            // Normalize values for comparison
            const oldValue = oldValues[field] ? String(oldValues[field]).trim() : null;
            const newValue = newValues[field] ? String(newValues[field]).trim() : null;

            if (oldValue !== newValue) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create a new scheduler with validation and auto-generation
     * @param {Object} data - Scheduler data
     * @returns {Promise<Object>} Created scheduler and generation result
     */
    async createScheduler(data, user) {
        const { Scheduler } = this.getModels();

        try {
            // Validation
            if (!data.plant_id || !data.category_id || !data.schedule_start_date || !data.schedule_end_date) {
                throw new Error('Missing required fields for scheduler');
            }
            if (new Date(data.schedule_start_date) > new Date(data.schedule_end_date)) {
                throw new Error('Start date cannot be after end date');
            }

            // Check for existing scheduler with same plant + category
            const existing = await Scheduler.findOne({
                where: {
                    plant_id: data.plant_id,
                    category_id: data.category_id
                }
            });

            if (existing) {
                throw new Error('A scheduler already exists for this plant and category combination');
            }

            // Create scheduler
            const scheduler = await Scheduler.create({
                plant_id: data.plant_id,
                category_id: data.category_id,
                schedule_start_date: data.schedule_start_date,
                schedule_end_date: data.schedule_end_date,
                inspection_frequency: data.inspection_frequency || null,
                testing_frequency: data.testing_frequency || null,
                maintenance_frequency: data.maintenance_frequency || null,
                is_active: true
            });

            console.log(`Created scheduler ${scheduler.id} for plant ${data.plant_id}`);

            // Auto-generate services in background (fire-and-forget)
            this.generateServicesForPlant(data.plant_id, scheduler.id)
                .then(result => {
                    console.log(`Async service generation completed for new scheduler ${scheduler.id}: ${result.message}`);
                })
                .catch(err => {
                    console.error(`Async service generation failed for new scheduler ${scheduler.id}:`, err);
                });

            // Audit Log
            try {
                const { Plant } = this.getModels();
                const auditPlant = await Plant.findByPk(scheduler.plant_id, { attributes: ['plant_name'] });
                const plantDisplayName = auditPlant?.plant_name || scheduler.plant_id;
                await auditService.log({
                    entityType: 'scheduler',
                    entityId: scheduler.id,
                    entityName: `Scheduler for Plant ${plantDisplayName}`,
                    action: 'CREATE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for createScheduler:', error.message);
            }

            return {
                scheduler,
                generationResult: {
                    success: true,
                    message: 'Service generation started in background',
                    isAsync: true
                }
            };
        } catch (error) {
            console.error('Error creating scheduler:', error);
            throw error;
        }
    }

    /**
     * Update a scheduler with validation and auto-regeneration
     * @param {string} schedulerId - Scheduler ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated scheduler with update result
     */
    async updateScheduler(schedulerId, data, user) {
        const { Scheduler } = this.getModels();

        try {
            const scheduler = await Scheduler.findByPk(schedulerId);
            if (!scheduler) {
                throw new Error('Scheduler not found');
            }

            // Store old values for comparison
            const oldSchedulerValues = {
                schedule_start_date: scheduler.schedule_start_date,
                schedule_end_date: scheduler.schedule_end_date,
                inspection_frequency: scheduler.inspection_frequency,
                testing_frequency: scheduler.testing_frequency,
                maintenance_frequency: scheduler.maintenance_frequency,
                is_active: scheduler.is_active
            };

            // Check if any critical fields have changed that require regeneration
            const hasChanged = this.didSchedulerChange(oldSchedulerValues, data);

            // Update the scheduler record
            await scheduler.update(data);
            console.log(`Updated scheduler ${schedulerId}`);

            let updateResult = {
                needsRegeneration: false,
                message: "Scheduler updated. No changes required for existing services."
            };

            // If critical fields changed, handle service regeneration
            if (hasChanged) {
                console.log(`Scheduler ${schedulerId} changed, starting regeneration in background...`);

                // Fire-and-forget regeneration
                this.cancelFutureServices(scheduler.id)
                    .then(cancelResult => {
                        console.log(`Async cancel completed for scheduler ${schedulerId}: ${cancelResult.cancelledCount} services cancelled.`);
                        return this.generateServicesForPlant(scheduler.plant_id, scheduler.id);
                    })
                    .then(generationResult => {
                        console.log(`Async regeneration completed for scheduler ${schedulerId}: ${generationResult.message}`);
                    })
                    .catch(err => {
                        console.error(`Async service regeneration failed for scheduler ${schedulerId}:`, err);
                    });

                updateResult = {
                    needsRegeneration: true,
                    message: 'Service regeneration started in background.'
                };
            }

            // Audit Log
            try {
                const changes = auditService.calculateChanges(oldSchedulerValues, scheduler.toJSON());
                if (changes) {
                    const { Plant } = this.getModels();
                    const auditPlant = await Plant.findByPk(scheduler.plant_id, { attributes: ['plant_name'] });
                    const plantDisplayName = auditPlant?.plant_name || scheduler.plant_id;
                    await auditService.log({
                        entityType: 'scheduler',
                        entityId: schedulerId,
                        entityName: `Scheduler for Plant ${plantDisplayName}`,
                        action: 'UPDATE',
                        changes,
                        user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                        source: 'ui'
                    });
                }
            } catch (error) {
                console.error('Audit log failed for updateScheduler:', error.message);
            }

            return {
                scheduler,
                updateResult
            };
        } catch (error) {
            console.error('Error updating scheduler:', error);
            throw error;
        }
    }

    /**
     * Get all schedulers by plant ID
     * @param {string} plantId 
     * @returns {Promise<Scheduler[]>} Array of schedulers
     */
    async getSchedulersByPlant(plantId) {
        const { Scheduler } = this.getModels();
        return Scheduler.findAll({ where: { plant_id: plantId } });
    }

    /**
     * Get all schedulers
     * @returns {Promise<Scheduler[]>} Array of all schedulers
     */
    async getAllSchedulers() {
        const { Scheduler } = this.getModels();
        return Scheduler.findAll();
    }

    /**
     * Delete a scheduler and cancel its future services
     * @param {string} schedulerId 
     * @returns {Promise<Object>} Deletion result
     */
    async deleteScheduler(schedulerId, user) {
        const { Scheduler } = this.getModels();
        try {
            const scheduler = await Scheduler.findByPk(schedulerId);
            if (!scheduler) {
                throw new Error('Scheduler not found');
            }

            // Cancel future services before deleting
            const cancelResult = await this.cancelFutureServices(schedulerId);

            // Capture info for audit (resolve plant name before deleting)
            let plantDisplayName = scheduler.plant_id;
            try {
                const { Plant } = this.getModels();
                const auditPlant = await Plant.findByPk(scheduler.plant_id, { attributes: ['plant_name'] });
                plantDisplayName = auditPlant?.plant_name || scheduler.plant_id;
            } catch (_) { /* fallback to plant_id */ }
            const schedulerInfo = `Scheduler for Plant ${plantDisplayName}`;

            // Delete the scheduler
            await scheduler.destroy();

            console.log(`Deleted scheduler ${schedulerId}`);

            // Audit Log
            try {
                await auditService.log({
                    entityType: 'scheduler',
                    entityId: schedulerId,
                    entityName: schedulerInfo,
                    action: 'DELETE',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            } catch (error) {
                console.error('Audit log failed for deleteScheduler:', error.message);
            }

            return {
                success: true,
                schedulerId,
                cancelResult
            };
        } catch (error) {
            console.error('Error deleting scheduler:', error);
            throw error;
        }
    }

    /**
     * Cancel all future services for a specific form
     * Called when a form is deleted
     * @param {string} formId - Form ID
     * @param {string} reason - Reason for cancellation
     * @returns {Promise<Object>} Result of cancellation
     */
    async cancelServicesForForm(formId, reason = 'Form deleted') {
        const { ServiceSubmission } = this.getModels();
        try {
            const today = this.getTodayDate();
            const result = await ServiceSubmission.update({
                status: 'cancelled',
                cancelled_reason: reason
            }, {
                where: {
                    form_id: formId,
                    status: {
                        [Op.in]: ['PENDING', 'pending', 'draft', 'Draft']
                    },
                    scheduled_date: {
                        [Op.gte]: today
                    }
                }
            });

            console.log(`Cancelled ${result[0]} future services for form ${formId} (reason: ${reason})`);
            return {
                success: true,
                cancelledCount: result[0]
            };
        } catch (error) {
            console.error('Error cancelling services for form:', error);
            throw error;
        }
    }

    /**
     * Generate services for a newly created form
     * Finds matching scheduler and assets, generates services from today to scheduler end
     * @param {Object} form - The newly created form object
     * @returns {Promise<Object>} Generation result
     */
    async generateServicesForNewForm(form) {
        const { Asset, Scheduler, ServiceSubmission, Plant, InspectionFrequency } = this.getModels();

        try {
            if (!form || !form.category_id || !form.frequency_id) {
                console.log('Form missing category_id or frequency_id, skipping service generation');
                return { success: false, message: 'Form missing required fields for service generation' };
            }

            console.log(`Generating services for new form: ${form.service_name} (${form.id})`);

            // Find scheduler matching form's category (scoped to any plant that has assets with this category)
            // Get all plants that have assets with this category
            const assets = await Asset.findAll({
                where: { category_id: form.category_id },
                attributes: ['id', 'plant_id', 'product_id', 'category_id'],
                raw: true
            });

            if (assets.length === 0) {
                console.log(`No assets found for form's category ${form.category_id}`);
                return { success: true, message: 'No assets found for form\'s category', servicesGenerated: 0 };
            }

            // Group assets by plant
            const assetsByPlant = {};
            for (const asset of assets) {
                if (!assetsByPlant[asset.plant_id]) {
                    assetsByPlant[asset.plant_id] = [];
                }
                assetsByPlant[asset.plant_id].push(asset);
            }

            let totalServicesGenerated = 0;

            // For each plant with matching assets, find the scheduler and generate services
            for (const [plantId, plantAssets] of Object.entries(assetsByPlant)) {
                // Find scheduler for this plant and category
                const scheduler = await Scheduler.findOne({
                    where: {
                        plant_id: plantId,
                        category_id: form.category_id,
                        is_active: true
                    }
                });

                if (!scheduler) {
                    console.log(`No scheduler found for plant ${plantId} with category ${form.category_id}`);
                    continue;
                }

                // Get frequency details
                const frequency = await InspectionFrequency.findByPk(form.frequency_id);
                if (!frequency) {
                    console.log(`Frequency ${form.frequency_id} not found`);
                    continue;
                }

                const frequencyName = frequency.frequency_name;
                const intervalDays = frequency.interval_days;

                // Check if scheduler has this frequency for the form's service type
                const serviceType = (form.service_type || 'Inspection').toLowerCase();
                let schedulerFrequencies = null;

                if (serviceType === 'inspection') {
                    schedulerFrequencies = scheduler.inspection_frequency;
                } else if (serviceType === 'testing') {
                    schedulerFrequencies = scheduler.testing_frequency;
                } else if (serviceType === 'maintenance') {
                    schedulerFrequencies = scheduler.maintenance_frequency;
                }

                if (!schedulerFrequencies) {
                    console.log(`Scheduler has no ${serviceType} frequency configured`);
                    continue;
                }

                // Check if the form's frequency matches any of the scheduler's frequencies
                const schedulerFrequencyList = schedulerFrequencies.split(',').map(f => f.trim().toLowerCase());
                if (!schedulerFrequencyList.includes(frequencyName.toLowerCase())) {
                    console.log(`Form frequency ${frequencyName} not in scheduler's ${serviceType} frequencies: ${schedulerFrequencies}`);
                    continue;
                }

                // Calculate service dates from today to scheduler end
                const today = this.getTodayDate();
                const effectiveStartDate = new Date(scheduler.schedule_start_date) > new Date(today)
                    ? scheduler.schedule_start_date
                    : today;

                const serviceDates = this.calculateServiceDates(
                    effectiveStartDate,
                    scheduler.schedule_end_date,
                    intervalDays
                );

                if (serviceDates.length === 0) {
                    console.log(`No service dates calculated for scheduler ${scheduler.id}`);
                    continue;
                }

                console.log(`Generating ${serviceDates.length} ${serviceType} services for ${plantAssets.length} assets in plant ${plantId}`);

                // Filter assets by product if form has product_id
                let relevantAssets = plantAssets;
                if (form.product_id) {
                    relevantAssets = plantAssets.filter(a => a.product_id === form.product_id);
                }

                if (relevantAssets.length === 0) {
                    console.log(`No assets match form's product_id ${form.product_id}`);
                    continue;
                }

                // Generate services for each asset and date
                for (const asset of relevantAssets) {
                    for (const scheduledDate of serviceDates) {
                        try {
                            const submissionNumber = await this.generateSubmissionNumber(plantId);
                            const scheduledDateStr = scheduledDate.toISOString().split('T')[0];
                            const inspectionType = this.serviceTypeDisplayNames[serviceType] || serviceType;

                            // Check for duplicate
                            const existingService = await ServiceSubmission.findOne({
                                where: {
                                    asset_id: asset.id,
                                    scheduled_date: scheduledDateStr,
                                    inspection_type: inspectionType,
                                    form_id: form.id,
                                    status: {
                                        [Op.notIn]: ['rejected', 'cancelled']
                                    }
                                }
                            });

                            if (existingService) {
                                continue;
                            }

                            await ServiceSubmission.create({
                                submission_number: submissionNumber,
                                asset_id: asset.id,
                                schedule_id: scheduler.id,
                                form_id: form.id,
                                frequency_id: form.frequency_id,
                                plant_id: plantId,
                                status: 'PENDING',
                                scheduled_date: scheduledDateStr,
                                inspection_type: inspectionType
                            });

                            totalServicesGenerated++;
                        } catch (error) {
                            console.error(`Error creating service for asset ${asset.id}:`, error.message);
                        }
                    }

                    // Update next_service_date on asset to closest upcoming pending service
                    try {
                        const nextPending = await ServiceSubmission.findOne({
                            where: {
                                asset_id: asset.id,
                                scheduled_date: { [Op.gte]: new Date() },
                                status: { [Op.notIn]: ['approved', 'rejected', 'cancelled'] }
                            },
                            order: [['scheduled_date', 'ASC']],
                            attributes: ['scheduled_date']
                        });
                        if (nextPending) {
                            await Asset.update(
                                { next_service_date: nextPending.scheduled_date },
                                { where: { id: asset.id } }
                            );
                        }
                    } catch (e) {
                        console.error(`[generateServicesForNewForm] Failed to update next_service_date for ${asset.id}:`, e.message);
                    }
                }
            }

            console.log(`✅ Generated ${totalServicesGenerated} services for new form ${form.service_name}`);
            return {
                success: true,
                servicesGenerated: totalServicesGenerated,
                message: `Generated ${totalServicesGenerated} services`
            };
        } catch (error) {
            console.error('Error generating services for new form:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = new SchedulerService();
