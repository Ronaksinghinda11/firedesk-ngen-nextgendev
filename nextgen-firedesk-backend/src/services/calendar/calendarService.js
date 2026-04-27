/**
 * Calendar Service
 * Handles data fetching for calendar and service statistics
 * Supports Admin (all plants), Manager (assigned plants), and Technician (assigned services) views
 */

const {
    ServiceSubmission,
    ServiceTechnician,
    ServiceAnswer,
    Question,
    Condition,
    Ticket,
    TicketResponse,
    Asset,
    Plant,
    Form,
    Technician,
    User,
    InspectionFrequency,
    Category,
    Product,
    Building
} = require('../../models');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

class CalendarService {
    /**
     * Helper to build a SQL plant filter clause
     * @param {string} plantId - Specific plant ID
     * @param {Array} plantIds - Array of plant IDs (for manager scope)
     * @param {Object} replacements - Replacements object to add params to
     * @returns {string} SQL WHERE fragment
     */
    buildPlantFilterSQL(plantId, plantIds, replacements) {
        if (plantId) {
            replacements.plantId = plantId;
            return 'AND plant_id = :plantId';
        } else if (plantIds && plantIds.length > 0) {
            replacements.plantIds = plantIds;
            return 'AND plant_id IN (:plantIds)';
        }
        return '';
    }
    /**
     * Build base where clause for filtering by date range and plant
     * @param {Object} filters - Query filters (month, year, plantId)
     * @param {Array} plantIds - Optional array of plant IDs to filter by (for manager)
     * @returns {Object} Sequelize where clause
     */
    buildDateAndPlantFilter(filters, plantIds = null) {
        const { month, year, plantId } = filters;
        const where = {};

        // Date range filter
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of month
            where.scheduled_date = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Plant filter - specific plant or manager's plants
        if (plantId) {
            where.plant_id = plantId;
        } else if (plantIds && plantIds.length > 0) {
            where.plant_id = { [Op.in]: plantIds };
        }

        return where;
    }

    /**
     * Build ticket where clause for filtering by date range and plant
     */
    buildTicketDateAndPlantFilter(filters, plantIds = null) {
        const { month, year, plantId } = filters;
        const where = {};

        // Date range filter using target_date for tickets
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            where.target_date = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Plant filter
        if (plantId) {
            where.plant_id = plantId;
        } else if (plantIds && plantIds.length > 0) {
            where.plant_id = { [Op.in]: plantIds };
        }

        return where;
    }

    /**
     * Common include for service queries
     */
    getServiceIncludes() {
        return [
            {
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'location', 'category_id', 'product_id', 'building_id'],
                include: [
                    { model: Category, as: 'category', attributes: ['id', 'category_name'] },
                    { model: Product, as: 'product', attributes: ['id', 'product_name', 'variants'] },
                    { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                ]
            },
            {
                model: Plant,
                as: 'plant',
                attributes: ['id', 'plant_name', 'plant_code']
            },
            {
                model: Form,
                as: 'form',
                attributes: ['id', 'service_name', 'form_code', 'service_type']
            },
            {
                model: Technician,
                as: 'technician',
                attributes: ['id', 'technician_code', 'technician_type'],
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profile_pic'] }
                ]
            },
            {
                model: Technician,
                as: 'submitter',
                attributes: ['id', 'technician_code', 'technician_type'],
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profile_pic'] }
                ]
            },
            {
                model: InspectionFrequency,
                as: 'inspectionFrequency',
                attributes: ['id', 'frequency_name', 'frequency_code']
            },
            {
                model: ServiceTechnician,
                as: 'serviceTechnicians',
                include: [{
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'technician_code', 'technician_type'],
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profile_pic'] }
                    ]
                }]
            }
        ];
    }

    /**
     * Lightweight includes for paginated list views (Fix #4)
     * Includes submitter for "Completed By" column display
     */
    getServiceListIncludes() {
        return [
            {
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'location', 'category_id', 'building_id'],
                include: [
                    { model: Category, as: 'category', attributes: ['id', 'category_name'] },
                    { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                ]
            },
            {
                model: Plant,
                as: 'plant',
                attributes: ['id', 'plant_name', 'plant_code']
            },
            {
                model: Form,
                as: 'form',
                attributes: ['id', 'service_name', 'form_code', 'service_type']
            },
            {
                model: Technician,
                as: 'technician',
                attributes: ['id', 'technician_code', 'technician_type'],
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
                ]
            },
            {
                model: Technician,
                as: 'submitter',
                attributes: ['id', 'technician_code', 'technician_type'],
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
                ]
            },
            {
                model: InspectionFrequency,
                as: 'inspectionFrequency',
                attributes: ['id', 'frequency_name', 'frequency_code']
            },
            {
                model: ServiceTechnician,
                as: 'serviceTechnicians',
                include: [{
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'technician_code', 'technician_type'],
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profile_pic'] }
                    ]
                }]
            }
        ];
    }


    /**
     * Extended includes for list views that also include answers with questions
     * Used when the frontend needs Q&A data (e.g. Manager completed services)
     */
    getServiceListIncludesWithAnswers() {
        const includes = this.getServiceListIncludes();
        includes.push({
            model: ServiceAnswer,
            as: 'answers',
            include: [
                {
                    model: Question,
                    as: 'question',
                    attributes: ['id', 'question_text', 'question_code', 'answer_type', 'question_type']
                },
                {
                    model: Condition,
                    as: 'selectedCondition',
                    attributes: ['id', 'condition_code', 'condition_name', 'severity_level', 'priority_score']
                }
            ]
        });
        return includes;
    }
    /**
     * Common include for ticket queries
     */
    getTicketIncludes() {
        return [
            {
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'location', 'category_id'],
                include: [
                    { model: Category, as: 'category', attributes: ['id', 'category_name'] },
                    { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                ]
            },
            {
                model: Plant,
                as: 'plant',
                attributes: ['id', 'plant_name', 'plant_code']
            },
            {
                model: User,
                as: 'createdBy',
                attributes: ['id', 'name', 'email']
            },
            {
                model: Technician,
                as: 'technician',
                attributes: ['id', 'technician_code', 'technician_type'],
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profile_pic'] }
                ]
            },
            {
                model: TicketResponse,
                as: 'responses',
                limit: 1,
                order: [['created_at', 'DESC']]
            }
        ];
    }

    /**
     * Get lightweight calendar counts per date for the month grid (Fix #1)
     * Returns only aggregated counts per day — no JOINs, no full objects.
     * @param {Object} filters - Query filters (month, year, plantId)
     * @param {Array} plantIds - Optional array of plant IDs (for manager scope)
     */
    async getCalendarCounts(filters = {}, plantIds = null) {
        try {
            const { month, year, plantId } = filters;
            if (!month || !year) return [];

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of month

            const replacements = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            };
            const plantFilter = this.buildPlantFilterSQL(plantId, plantIds, replacements);

            // Single query: counts per date + status for services (include rejected for visibility)
            const serviceRows = await ServiceSubmission.sequelize.query(`
                SELECT scheduled_date::date AS date, status, COUNT(*)::int AS count
                FROM service_submissions
                WHERE scheduled_date BETWEEN :startDate AND :endDate
                  AND status NOT IN ('cancelled')
                  ${plantFilter}
                GROUP BY scheduled_date::date, status
                ORDER BY date
            `, { replacements, type: QueryTypes.SELECT });

            // Single query: counts per date for tickets
            const ticketRows = await ServiceSubmission.sequelize.query(`
                SELECT target_date::date AS date, completed_status AS status, COUNT(*)::int AS count
                FROM tickets
                WHERE target_date BETWEEN :startDate AND :endDate
                  ${plantFilter}
                GROUP BY target_date::date, completed_status
                ORDER BY date
            `, { replacements, type: QueryTypes.SELECT });

            // Aggregate into per-date summary
            const result = {};
            serviceRows.forEach(r => {
                const key = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0];
                if (!result[key]) result[key] = { date: key, serviceCount: 0, ticketCount: 0, statusBreakdown: {} };
                result[key].serviceCount += r.count;
                result[key].statusBreakdown[r.status] = (result[key].statusBreakdown[r.status] || 0) + r.count;
            });
            ticketRows.forEach(r => {
                const key = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0];
                if (!result[key]) result[key] = { date: key, serviceCount: 0, ticketCount: 0, statusBreakdown: {} };
                result[key].ticketCount += r.count;
            });

            return Object.values(result);
        } catch (error) {
            console.error('❌ Error in getCalendarCounts:', error);
            throw error;
        }
    }

    /**
     * Get calendar events (services and tickets)
     * @param {Object} filters - Query filters (month, year, plantId, assetIds, etc.)
     * @param {Object} user - Current user object
     * @param {Array} plantIds - Optional array of plant IDs (for manager scope)
     */
    async getCalendarEvents(filters = {}, user = null, plantIds = null) {
        try {
            // Use buildServiceFilters to get the where clause including asset/type filters
            const { where: serviceWhere, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            // We also need date range for the month
            const { month, year } = filters;
            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0); // Last day of month
                serviceWhere.scheduled_date = {
                    [Op.between]: [startDate, endDate]
                };
            }

            const ticketWhere = this.buildTicketDateAndPlantFilter(filters, plantIds);

            // Fetch services - exclude cancelled and rejected
            // Apply all service filters (asset, type, frequency, etc.)
            const serviceIncludes = this.getServiceIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = serviceIncludes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = serviceIncludes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const services = await ServiceSubmission.findAll({
                where: {
                    ...serviceWhere,
                    status: { [Op.notIn]: ['cancelled', 'CANCELLED', 'Cancelled'] }
                },
                include: serviceIncludes,
                distinct: true,
                order: [['scheduled_date', 'ASC']]
            });

            // Fetch tickets (both assigned and unassigned for managers)
            const tickets = await Ticket.findAll({
                where: ticketWhere,
                include: this.getTicketIncludes(),
                order: [['target_date', 'ASC']]
            });

            // Group by date for calendar display
            const calendarData = {};

            services.forEach((service) => {
                const scheduledDate = new Date(service.scheduled_date);
                const dateKey = scheduledDate.toISOString().split('T')[0];
                if (!calendarData[dateKey]) {
                    calendarData[dateKey] = {
                        date: dateKey,
                        serviceDatas: [],
                        tickets: []
                    };
                }
                calendarData[dateKey].serviceDatas.push(this.formatServiceForCalendar(service));
            });

            tickets.forEach((ticket) => {
                const targetDate = new Date(ticket.target_date);
                const dateKey = targetDate.toISOString().split('T')[0];
                if (!calendarData[dateKey]) {
                    calendarData[dateKey] = {
                        date: dateKey,
                        serviceDatas: [],
                        tickets: []
                    };
                }
                calendarData[dateKey].tickets.push(this.formatTicketForCalendar(ticket));
            });

            return Object.values(calendarData);
        } catch (error) {
            console.error('❌ Error in getCalendarEvents:', error);
            throw error;
        }
    }

    /**
     * Format service for calendar display
     */
    formatServiceForCalendar(service) {
        // Use submitter (who completed the service) if available, otherwise fall back to assigned technician
        const displayTechnician = service.submitter || service.technician;

        return {
            id: service.id,
            type: 'service',
            submissionNumber: service.submission_number,
            scheduledDate: service.scheduled_date,
            completedAt: service.completed_at,
            status: service.status,
            approvalStatus: service.approval_status,
            inspectionType: service.inspection_type,
            // Format frequency as object with frequencyName for frontend compatibility
            frequency: {
                id: service.inspectionFrequency?.id || null,
                frequencyName: service.inspectionFrequency?.frequency_name || service.frequency || 'N/A',
                frequencyCode: service.inspectionFrequency?.frequency_code || null
            },
            technicianId: service.technician_id,
            asset: service.asset ? {
                id: service.asset.id,
                assetId: service.asset.asset_code,
                assetCode: service.asset.asset_code,
                location: service.asset.location,
                category: service.asset.category,
                product: service.asset.product,
                building: service.asset.building
            } : null,
            plant: service.plant ? {
                id: service.plant.id,
                plantName: service.plant.plant_name,
                plantCode: service.plant.plant_code
            } : null,
            form: service.form ? {
                id: service.form.id,
                serviceName: service.form.service_name,
                formCode: service.form.form_code,
                serviceType: service.form.service_type
            } : null,
            technician: displayTechnician ? {
                id: displayTechnician.id,
                technicianCode: displayTechnician.technician_code,
                technicianType: displayTechnician.technician_type,
                name: displayTechnician.user?.name,
                email: displayTechnician.user?.email,
                profilePic: displayTechnician.user?.profile_pic
            } : null,
            submitter: service.submitter ? {
                id: service.submitter.id,
                technicianCode: service.submitter.technician_code,
                technicianType: service.submitter.technician_type,
                user: service.submitter.user ? {
                    name: service.submitter.user.name,
                    email: service.submitter.user.email
                } : null
            } : null,
            inspectionFrequency: service.inspectionFrequency ? {
                id: service.inspectionFrequency.id,
                frequencyName: service.inspectionFrequency.frequency_name
            } : null,
            // Assigned technicians from junction table
            assignedTechnicians: service.serviceTechnicians?.map(st => ({
                id: st.technician?.id,
                technicianCode: st.technician?.technician_code,
                technicianType: st.technician?.technician_type,
                name: st.technician?.user?.name,
                email: st.technician?.user?.email,
                profilePic: st.technician?.user?.profile_pic,
                status: st.status,
                assignedAt: st.assigned_at
            })) || [],
            // Health metrics
            criticalCount: service.critical_count,
            highCount: service.high_count,
            mediumCount: service.medium_count,
            lowCount: service.low_count,
            totalPriorityScore: service.total_priority_score,
            calculatedHealthStatus: service.calculated_health_status,
            // Cancellation reason
            cancelledReason: service.cancelled_reason,
            // Rejection details
            approvalRemarks: service.approval_remarks,
            approvedBy: service.approved_by,
            approvedAt: service.approved_at,
            // Answers (only present when includeAnswers option is used)
            ...(service.answers ? {
                answers: service.answers.map(answer => ({
                    id: answer.id,
                    questionId: answer.question_id,
                    questionText: answer.question?.question_text,
                    questionCode: answer.question?.question_code,
                    answerType: answer.question?.answer_type,
                    complianceStatus: answer.compliance_status,
                    textValue: answer.text_value,
                    numericValue: answer.numeric_value,
                    booleanValue: answer.boolean_value,
                    notes: answer.notes,
                    photoUrls: answer.photo_urls,
                    selectedCondition: answer.selectedCondition ? {
                        id: answer.selectedCondition.id,
                        conditionCode: answer.selectedCondition.condition_code,
                        conditionName: answer.selectedCondition.condition_name,
                        severityLevel: answer.selectedCondition.severity_level,
                        priorityScore: answer.selectedCondition.priority_score
                    } : null,
                    answeredAt: answer.answered_at
                }))
            } : {})
        };
    }

    /**
     * Format ticket for calendar display
     */
    formatTicketForCalendar(ticket) {
        return {
            id: ticket.id,
            type: 'ticket',
            ticketId: ticket.ticket_code,
            ticketCode: ticket.ticket_code,
            taskName: ticket.task_name,
            taskDescription: ticket.task_description,
            targetDate: ticket.target_date,
            completedStatus: ticket.completed_status,
            ticketType: ticket.ticket_type,
            technicianId: ticket.technician_id,
            asset: ticket.asset ? {
                id: ticket.asset.id,
                assetId: ticket.asset.asset_code,
                assetCode: ticket.asset.asset_code,
                location: ticket.asset.location,
                category: ticket.asset.category,
                building: ticket.asset.building
            } : null,
            plant: ticket.plant ? {
                id: ticket.plant.id,
                plantName: ticket.plant.plant_name,
                plantCode: ticket.plant.plant_code
            } : null,
            createdBy: ticket.createdBy ? {
                id: ticket.createdBy.id,
                name: ticket.createdBy.name,
                email: ticket.createdBy.email
            } : null,
            technician: ticket.technician ? {
                id: ticket.technician.id,
                technicianCode: ticket.technician.technician_code,
                technicianType: ticket.technician.technician_type,
                name: ticket.technician.user?.name,
                email: ticket.technician.user?.email,
                profilePic: ticket.technician.user?.profile_pic
            } : null,
            latestResponse: ticket.responses?.[0] || null,
            createdAt: ticket.created_at
        };
    }

    /**
     * Get service statistics (counts by status) — Fix #2
     * Uses conditional aggregation (2 SQL queries instead of 8)
     * @param {Object} filters - Query filters (month, year, plantId)
     * @param {Object} user - Current user object
     * @param {Array} plantIds - Optional array of plant IDs (for manager scope)
     */
    async getServiceStatistics(filters = {}, user = null, plantIds = null) {
        try {
            const { month, year, plantId } = filters;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const replacements = { today: todayStr };
            const plantFilter = this.buildPlantFilterSQL(plantId, plantIds, replacements);

            // Build optional date filter for completed/cancelled (scoped to month)
            let dateFilterSQL = '';
            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                replacements.startDate = startDate.toISOString().split('T')[0];
                replacements.endDate = endDate.toISOString().split('T')[0];
                dateFilterSQL = 'AND scheduled_date BETWEEN :startDate AND :endDate';
            }

            // Single query for all 5 service counts using FILTER
            const [serviceStats] = await ServiceSubmission.sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE
                        (status = 'approved' OR approval_status = 'approved')
                        ${dateFilterSQL}
                    )::int AS completed,
                    COUNT(*) FILTER (WHERE
                        scheduled_date + (
                            SELECT CASE LOWER(f.frequency_name)
                                WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'fortnightly' THEN 14
                                WHEN 'monthly' THEN 30 WHEN 'bi-monthly' THEN 60 WHEN 'quarterly' THEN 90
                                WHEN 'half-yearly' THEN 180 WHEN 'semi-annually' THEN 180
                                WHEN 'annually' THEN 365 WHEN 'yearly' THEN 365 ELSE 30
                            END FROM inspection_frequencies f WHERE f.id = service_submissions.frequency_id
                        ) * INTERVAL '1 day' >= :today
                        AND status NOT IN ('approved','cancelled','rejected')
                        AND (approval_status IS NULL OR approval_status != 'approved')
                    )::int AS due,
                    COUNT(*) FILTER (WHERE
                        scheduled_date + (
                            SELECT CASE LOWER(f.frequency_name)
                                WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'fortnightly' THEN 14
                                WHEN 'monthly' THEN 30 WHEN 'bi-monthly' THEN 60 WHEN 'quarterly' THEN 90
                                WHEN 'half-yearly' THEN 180 WHEN 'semi-annually' THEN 180
                                WHEN 'annually' THEN 365 WHEN 'yearly' THEN 365 ELSE 30
                            END FROM inspection_frequencies f WHERE f.id = service_submissions.frequency_id
                        ) * INTERVAL '1 day' < :today
                        AND status NOT IN ('approved','cancelled','rejected','submitted')
                        AND (approval_status IS NULL OR approval_status != 'approved')
                    )::int AS lapsed,
                    COUNT(*) FILTER (WHERE
                        status = 'cancelled'
                        ${dateFilterSQL}
                    )::int AS cancelled,
                    COUNT(*) FILTER (WHERE
                        status = 'submitted'
                        AND (approval_status IS NULL OR approval_status = 'PENDING')
                    )::int AS pending_approval,
                    COUNT(*) FILTER (WHERE
                        status = 'rejected'
                        ${dateFilterSQL}
                    )::int AS rejected
                FROM service_submissions
                WHERE 1=1 ${plantFilter}
            `, { replacements, type: QueryTypes.SELECT });

            // Single query for all 3 ticket counts using FILTER
            const [ticketStats] = await ServiceSubmission.sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE completed_status = 'Pending')::int AS pending,
                    COUNT(*) FILTER (WHERE completed_status = 'Waiting for approval')::int AS waiting_approval,
                    COUNT(*) FILTER (WHERE completed_status = 'Completed')::int AS completed
                FROM tickets
                WHERE 1=1 ${plantFilter}
            `, { replacements, type: QueryTypes.SELECT });

            return {
                services: {
                    completed: serviceStats.completed || 0,
                    due: serviceStats.due || 0,
                    lapsed: serviceStats.lapsed || 0,
                    cancelled: serviceStats.cancelled || 0,
                    rejected: serviceStats.rejected || 0,
                    PENDINGApproval: serviceStats.pending_approval || 0
                },
                tickets: {
                    PENDING: ticketStats.pending || 0,
                    waitingApproval: ticketStats.waiting_approval || 0,
                    completed: ticketStats.completed || 0
                }
            };
        } catch (error) {
            console.error('❌ Error in getServiceStatistics:', error);
            throw error;
        }
    }

    /**
     * Helper to parse filter arrays from query params
     * Handles arrays, comma-separated strings, and undefined/null values
     */
    parseFilterArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === 'string') {
            return value.split(',').map(v => v.trim()).filter(Boolean);
        }
        return [];
    }

    /**
     * Build service filters based on request parameters
     */
    buildServiceFilters(filters, plantIds = null) {
        const {
            plantId,
            assetIds,
            serviceTypes,
            frequencies,
            categories,
            products,
            subTypes,
            startDate,
            endDate
        } = filters;

        // Parse filter arrays defensively
        const parsedAssetIds = this.parseFilterArray(assetIds);
        const parsedServiceTypes = this.parseFilterArray(serviceTypes);
        const parsedFrequencies = this.parseFilterArray(frequencies);
        const parsedCategories = this.parseFilterArray(categories);
        const parsedProducts = this.parseFilterArray(products);
        const parsedSubTypes = this.parseFilterArray(subTypes);

        const where = {};
        const assetWhere = {};
        const frequencyWhere = {};

        // Base plant filter
        if (plantId) {
            where.plant_id = plantId;
        } else if (plantIds && plantIds.length > 0) {
            where.plant_id = { [Op.in]: plantIds };
        }

        // Date range filter helper
        if (startDate && endDate) {
            where.scheduled_date = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Service Type filter
        if (parsedServiceTypes.length > 0) {
            where.inspection_type = { [Op.in]: parsedServiceTypes };
        }

        // Asset filter (by asset code or id)
        if (parsedAssetIds.length > 0) {
            assetWhere.asset_code = { [Op.in]: parsedAssetIds };
        }

        // Category filter
        if (parsedCategories.length > 0) {
            assetWhere.category_id = { [Op.in]: parsedCategories };
        }

        // Product filter
        if (parsedProducts.length > 0) {
            assetWhere.product_id = { [Op.in]: parsedProducts };
        }

        // Sub-type filter (asset sub_type_id or type_id)
        if (parsedSubTypes.length > 0) {
            assetWhere.sub_type_id = { [Op.in]: parsedSubTypes };
        }

        // Frequency filter
        if (parsedFrequencies.length > 0) {
            frequencyWhere.frequency_name = { [Op.in]: parsedFrequencies };
        }

        return { where, assetWhere, frequencyWhere };
    }

    /**
     * Get completed services (paginated)
     * @param {Object} filters - Query filters
     * @param {Object} user - Current user
     * @param {Array} plantIds - Plant IDs for manager scope
     * @param {Object} options - Additional options
     * @param {boolean} options.includeAnswers - Whether to include Q&A data
     */
    async getCompletedServices(filters = {}, user = null, plantIds = null, options = {}) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            // Add completed status condition
            const completedWhere = {
                ...where,
                [Op.or]: [
                    { status: 'approved' },
                    { approval_status: 'approved' },
                    { status: { [Op.in]: ['submitted', 'SUBMITTED'] } }
                ]
            };

            // Use extended includes with answers if requested, otherwise lightweight
            const includes = options.includeAnswers
                ? this.getServiceListIncludesWithAnswers()
                : this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: completedWhere,
                include: includes,
                distinct: true, // Important for accurate counts with includes
                order: [['approved_at', 'DESC'], ['submitted_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getCompletedServices:', error);
            throw error;
        }
    }

    /**
     * Get services due (paginated)
     */
    async getServicesDue(filters = {}, user = null, plantIds = null) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            const dueWhere = {
                ...where,
                scheduled_date: { [Op.gte]: today },
                status: { [Op.notIn]: ['approved', 'cancelled', 'rejected', 'submitted', 'SUBMITTED'] },
                [Op.or]: [
                    { approval_status: { [Op.is]: null } },
                    { approval_status: { [Op.notIn]: ['approved'] } }
                ]
            };

            // Lightweight includes for list view (Fix #4)
            const includes = this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: dueWhere,
                include: includes,
                distinct: true,
                order: [['scheduled_date', 'ASC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getServicesDue:', error);
            throw error;
        }
    }

    /**
     * Get lapsed services (paginated)
     */
    async getLapsedServices(filters = {}, user = null, plantIds = null) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            const lapsedWhere = {
                ...where,
                [Op.and]: [
                    sequelize.literal(`"ServiceSubmission"."scheduled_date" + (
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
                ],
                status: { [Op.notIn]: ['approved', 'cancelled', 'rejected', 'submitted'] },
                [Op.or]: [
                    { approval_status: { [Op.is]: null } },
                    { approval_status: { [Op.notIn]: ['approved'] } }
                ]
            };

            // Lightweight includes for list view (Fix #4)
            const includes = this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: lapsedWhere,
                include: includes,
                distinct: true,
                order: [['scheduled_date', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getLapsedServices:', error);
            throw error;
        }
    }

    /**
     * Get cancelled services (paginated)
     */
    async getCancelledServices(filters = {}, user = null, plantIds = null) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            const cancelledWhere = {
                ...where,
                status: 'cancelled'
            };

            // Lightweight includes for list view (Fix #4)
            const includes = this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: cancelledWhere,
                include: includes,
                distinct: true,
                order: [['cancelled_at', 'DESC'], ['updated_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getCancelledServices:', error);
            throw error;
        }
    }

    /**
     * Get rejected services (paginated)
     */
    async getRejectedServices(filters = {}, user = null, plantIds = null) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            const rejectedWhere = {
                ...where,
                status: 'rejected'
            };

            // Lightweight includes for list view
            const includes = this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: rejectedWhere,
                include: includes,
                distinct: true,
                order: [['approved_at', 'DESC'], ['updated_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getRejectedServices:', error);
            throw error;
        }
    }

    /**
     * Get PENDING approval services (submitted but not yet approved)
     */
    async getPendingApprovalServices(filters = {}, user = null, plantIds = null) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            const pendingWhere = {
                ...where,
                status: 'submitted',
                [Op.or]: [
                    { approval_status: { [Op.is]: null } },
                    { approval_status: 'PENDING' }
                ]
            };

            // Lightweight includes for list view (Fix #4)
            const includes = this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: pendingWhere,
                include: includes,
                distinct: true,
                order: [['submitted_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getPendingApprovalServices:', error);
            throw error;
        }
    }

    /**
     * Get unassigned services (no technician assigned)
     */
    async getUnassignedServices(filters = {}, plantIds = null) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { where, assetWhere, frequencyWhere } = this.buildServiceFilters(filters, plantIds);

            const unassignedWhere = {
                ...where,
                technician_id: { [Op.is]: null },
                status: { [Op.notIn]: ['approved', 'cancelled', 'rejected'] }
            };

            // Lightweight includes for list view (Fix #4)
            const includes = this.getServiceListIncludes();

            // Inject asset filters
            if (Object.keys(assetWhere).length > 0) {
                const assetInclude = includes.find(inc => inc.as === 'asset');
                if (assetInclude) {
                    assetInclude.where = { ...assetInclude.where, ...assetWhere };
                }
            }

            // Inject frequency filters
            if (Object.keys(frequencyWhere).length > 0) {
                const freqInclude = includes.find(inc => inc.as === 'inspectionFrequency');
                if (freqInclude) {
                    freqInclude.where = { ...freqInclude.where, ...frequencyWhere };
                }
            }

            const { count, rows } = await ServiceSubmission.findAndCountAll({
                where: unassignedWhere,
                include: includes,
                distinct: true,
                order: [['scheduled_date', 'ASC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                services: rows.map(s => this.formatServiceForCalendar(s)),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error in getUnassignedServices:', error);
            throw error;
        }
    }
    /**
     * Combined dashboard endpoint (Fix #7)
     * Returns calendar counts + statistics in a single call
     * @param {Object} filters - Query filters (month, year, plantId)
     * @param {Object} user - Current user object
     * @param {Array} plantIds - Optional array of plant IDs (for manager scope)
     */
    async getCalendarDashboard(filters = {}, user = null, plantIds = null) {
        try {
            const [counts, statistics] = await Promise.all([
                this.getCalendarCounts(filters, plantIds),
                this.getServiceStatistics(filters, user, plantIds)
            ]);

            return { counts, statistics };
        } catch (error) {
            console.error('❌ Error in getCalendarDashboard:', error);
            throw error;
        }
    }
}

module.exports = new CalendarService();