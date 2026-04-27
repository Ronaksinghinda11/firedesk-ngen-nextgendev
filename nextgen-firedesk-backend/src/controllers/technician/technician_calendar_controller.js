/**
 * Technician Calendar Controller
 * Handles calendar events (services and tickets) for technicians
 */
const { Op } = require('sequelize');
const {
    ServiceSubmission,
    ServiceTechnician,
    Ticket,
    TicketResponse,
    Asset,
    Form,
    Plant,
    Technician,
    User,
    Category,
    Product,
    Building,
    InspectionFrequency
} = require('../../models');

/**
 * Get calendar events for the logged-in technician
 * Returns services and tickets assigned to this technician for the specified month
 * GET /api/technician/calendar/events
 */
const get_calendar_events = async (req, res, next) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required query parameters'
            });
        }

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Calculate date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        console.log(`📅 Fetching calendar events for technician ${technician.id}`);
        console.log(`   Month: ${month}/${year}`);

        // Fix #6: Use a SQL subquery instead of fetching all junction IDs into JS memory
        // This avoids a massive IN(...) clause when a technician has thousands of assignments
        const services = await ServiceSubmission.findAll({
            where: {
                [Op.or]: [
                    { technician_id: technician.id },
                    { submitted_by: technician.id },
                    { id: { [Op.in]: ServiceSubmission.sequelize.literal(
                        `(SELECT service_id FROM service_technicians WHERE technician_id = '${technician.id}')`
                    )}}
                ],
                scheduled_date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id', 'category_id', 'product_id'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'plant_code'] },
                        { model: Category, as: 'category', attributes: ['id', 'category_name'] },
                        { model: Product, as: 'product', attributes: ['id', 'product_name'] },
                        { model: Building, as: 'building', attributes: ['id', 'building_name'] }
                    ]
                },
                {
                    model: Form,
                    as: 'form',
                    attributes: ['id', 'service_name', 'form_code', 'service_type']
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name', 'plant_code']
                },
                {
                    model: InspectionFrequency,
                    as: 'inspectionFrequency',
                    attributes: ['id', 'frequency_name']
                }
            ],
            order: [['scheduled_date', 'ASC']]
        });

        // Fetch tickets assigned to this technician (using technician.id, not user.id)
        const tickets = await Ticket.findAll({
            where: {
                technician_id: technician.id,
                target_date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location', 'building_id'],
                    include: [
                        { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] },
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
                    model: TicketResponse,
                    as: 'responses',
                    limit: 1,
                    order: [['created_at', 'DESC']]
                }
            ],
            order: [['target_date', 'ASC']]
        });

        // Group by date
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
            calendarData[dateKey].serviceDatas.push({
                id: service.id,
                type: 'service',
                submissionNumber: service.submission_number,
                scheduledDate: service.scheduled_date,
                status: service.status,
                approvalStatus: service.approval_status,
                inspectionType: service.inspection_type,
                frequency: {
                    id: service.inspectionFrequency?.id || null,
                    frequencyName: service.inspectionFrequency?.frequency_name || service.frequency || 'N/A',
                    frequencyCode: service.inspectionFrequency?.frequency_code || null
                },
                qrVerified: service.qr_verified,
                asset: service.asset ? {
                    id: service.asset.id,
                    assetId: service.asset.asset_code,
                    assetCode: service.asset.asset_code,
                    location: service.asset.location,
                    category: service.asset.category,
                    product: service.asset.product,
                    building: service.asset.building,
                    plant: service.asset.plant
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
                inspectionFrequency: service.inspectionFrequency ? {
                    id: service.inspectionFrequency.id,
                    frequencyName: service.inspectionFrequency.frequency_name
                } : null,
                startedAt: service.started_at,
                submittedAt: service.submitted_at,
                completedAt: service.completed_at,
                approvalRemarks: service.approval_remarks,
                approvedAt: service.approved_at
            });
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
            calendarData[dateKey].tickets.push({
                id: ticket.id,
                type: 'ticket',
                ticketCode: ticket.ticket_code,
                taskName: ticket.task_name,
                taskDescription: ticket.task_description,
                targetDate: ticket.target_date,
                completedStatus: ticket.completed_status,
                ticketType: ticket.ticket_type,
                asset: ticket.asset ? {
                    id: ticket.asset.id,
                    assetCode: ticket.asset.asset_code,
                    location: ticket.asset.location,
                    building: ticket.asset.building,
                    plant: ticket.asset.plant
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
                latestResponse: ticket.responses?.[0] || null,
                createdAt: ticket.created_at
            });
        });

        const result = Object.values(calendarData);

        console.log(`✅ Found ${services.length} services and ${tickets.length} tickets`);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Error fetching technician calendar events:', error);
        return next(error);
    }
};

/**
 * Get statistics for the technician's calendar
 * GET /api/technician/calendar/statistics
 */
const get_statistics = async (req, res, next) => {
    try {
        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        // Get today's date in YYYY-MM-DD format for DATE column comparison (IST)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5h30m in milliseconds
        const istNow = new Date(now.getTime() + istOffset);
        const todayStr = istNow.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Tomorrow in IST
        const istTomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = istTomorrow.toISOString().split('T')[0];

        // Get service IDs from the junction table (for multi-technician assignments)
        const junctionAssignments = await ServiceTechnician.findAll({
            where: { technician_id: technician.id },
            attributes: ['service_id']
        });
        const junctionServiceIds = junctionAssignments.map(a => a.service_id);

        // Base include for ServiceSubmission
        const serviceInclude = (whereClause) => ({
            model: ServiceSubmission,
            as: 'service',
            where: whereClause,
            required: true
        });

        // Services due today only (use date string for DATE column)
        const serviceDue = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                status: { [Op.in]: ['draft', 'in_progress', 'PENDING', 'IN_PROGRESS'] },
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"service"."scheduled_date" <= '${todayStr}' AND "service"."scheduled_date" + (
                        SELECT CASE LOWER(f.frequency_name)
                            WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'fortnightly' THEN 14
                            WHEN 'monthly' THEN 30 WHEN 'bi-monthly' THEN 60 WHEN 'quarterly' THEN 90
                            WHEN 'half-yearly' THEN 180 WHEN 'semi-annually' THEN 180
                            WHEN 'annually' THEN 365 WHEN 'yearly' THEN 365 ELSE 30
                        END FROM inspection_frequencies f WHERE f.id = "service"."frequency_id"
                    ) * INTERVAL '1 day' >= '${todayStr}'`)
                ]
            })],
            logging: console.log
        });

        // Lapsed - scheduled before today and still PENDING
        const serviceLapsed = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                status: { [Op.in]: ['draft', 'in_progress', 'PENDING', 'IN_PROGRESS'] },
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"service"."scheduled_date" + (
                        SELECT CASE LOWER(f.frequency_name)
                            WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'fortnightly' THEN 14
                            WHEN 'monthly' THEN 30 WHEN 'bi-monthly' THEN 60 WHEN 'quarterly' THEN 90
                            WHEN 'half-yearly' THEN 180 WHEN 'semi-annually' THEN 180
                            WHEN 'annually' THEN 365 WHEN 'yearly' THEN 365 ELSE 30
                        END FROM inspection_frequencies f WHERE f.id = "service"."frequency_id"
                    ) * INTERVAL '1 day' < '${todayStr}'`)
                ]
            })],
            logging: console.log
        });

        // Upcoming - scheduled after today
        const serviceUpcoming = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                status: { [Op.in]: ['draft', 'in_progress', 'PENDING', 'IN_PROGRESS'] },
                [Op.and]: [
                    ServiceSubmission.sequelize.literal(`"service"."scheduled_date" >= '${tomorrowStr}'`)
                ]
            })],
            logging: console.log
        });

        // Completed (approved or completed status)
        const serviceCompleted = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                [Op.or]: [
                    { status: { [Op.in]: ['APPROVED', 'approved', 'COMPLETED', 'completed', 'SUBMITTED', 'submitted'] } },
                    { approval_status: { [Op.in]: ['APPROVED', 'approved', 'COMPLETED', 'completed'] } }
                ]
            })]
        });

        // Submitted (waiting for approval)
        const serviceSubmitted = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                status: { [Op.in]: ['SUBMITTED'] },
                [Op.or]: [
                    { approval_status: { [Op.is]: null } },
                    { approval_status: { [Op.in]: ['PENDING'] } }
                ]
            })]
        });

        // Cancelled
        const serviceCancelled = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                status: { [Op.in]: ['CANCELLED', 'cancelled'] }
            })]
        });

        // Rejected
        const serviceRejected = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id },
            include: [serviceInclude({
                status: { [Op.in]: ['REJECTED', 'rejected'] }
            })]
        });

        // Total assigned to technician
        const totalServices = await ServiceTechnician.count({
            distinct: true,
            col: 'service_id',
            where: { technician_id: technician.id }
        });

        // Tickets - using technician.id (not user.id since tickets reference technicians table)
        const ticketsPending = await Ticket.count({
            where: {
                technician_id: technician.id,
                completed_status: 'Pending'
            }
        });

        const ticketsWaitingApproval = await Ticket.count({
            where: {
                technician_id: technician.id,
                completed_status: 'Waiting for approval'
            }
        });

        const ticketsCompleted = await Ticket.count({
            where: {
                technician_id: technician.id,
                completed_status: 'Completed'
            }
        });

        const ticketsRejected = await Ticket.count({
            where: {
                technician_id: technician.id,
                completed_status: 'Rejected'
            }
        });

        const totalTickets = await Ticket.count({
            where: { technician_id: technician.id }
        });

        console.log(`[Statistics] Technician: ${technician.id}, Due: ${serviceDue}, Lapsed: ${serviceLapsed}, Upcoming: ${serviceUpcoming}, Completed: ${serviceCompleted}`);

        return res.json({
            success: true,
            data: {
                services: {
                    due: serviceDue,
                    lapsed: serviceLapsed,
                    upcoming: serviceUpcoming,
                    completed: serviceCompleted,
                    submitted: serviceSubmitted,
                    cancelled: serviceCancelled,
                    rejected: serviceRejected,
                    total: totalServices
                },
                tickets: {
                    PENDING: ticketsPending,
                    waitingApproval: ticketsWaitingApproval,
                    completed: ticketsCompleted,
                    rejected: ticketsRejected,
                    total: totalTickets
                }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching technician calendar statistics:', error);
        return next(error);
    }
};

module.exports = {
    get_calendar_events,
    get_statistics
};
