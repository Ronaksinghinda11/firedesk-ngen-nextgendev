/**
 * Technician Tickets Controller
 * Handles ticket operations for technicians
 */
const Joi = require('joi');
const { Op, literal } = require('sequelize');
const {
    Ticket,
    TicketResponse,
    Asset,
    Plant,
    Category,
    User,
    Technician,
    TicketTask,
    TicketTaskChecklistQuestion,
    TicketTaskApproval
} = require('../../models');

/**
 * Get all tickets assigned to the logged-in technician
 * GET /api/technician/tickets
 */
const get_my_tickets = async (req, res, next) => {
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

        // Tickets are assigned via technician_id -> technicians.id OR via TicketTask.assigned_technician_id
        // Using EXISTS subquery to avoid GROUP BY issues with PostgreSQL + Sequelize LEFT JOINs
        const tickets = await Ticket.findAll({
            where: {
                [Op.or]: [
                    { technician_id: technician.id },
                    literal(`EXISTS (
                        SELECT 1 FROM ticket_tasks tt
                        WHERE tt.ticket_id = "Ticket".id
                          AND tt.assigned_technician_id = '${technician.id}'
                    )`)
                ]
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location'],
                    required: false
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name'],
                    required: false
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Transform to camelCase format expected by frontend
        const formattedTickets = tickets.map(t => ({
            id: t.id,
            ticketId: t.ticket_code,
            taskName: t.task_name,
            taskDescription: t.task_description,
            targetDate: t.target_date,
            completedStatus: t.completed_status,
            ticketType: t.ticket_type,
            priority: t.priority,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            plant: t.plant ? {
                id: t.plant.id,
                plantName: t.plant.plant_name
            } : null,
            asset: t.asset ? {
                id: t.asset.id,
                assetId: t.asset.asset_code,
                location: t.asset.location
            } : null,
            category: t.category ? {
                id: t.category.id,
                categoryName: t.category.category_name
            } : null
        }));

        return res.json({
            success: true,
            count: formattedTickets.length,
            tickets: formattedTickets
        });
    } catch (error) {
        console.error('[Technician Tickets] Error fetching tickets:', error);
        return next(error);
    }
};

/**
 * Get a single ticket by ID
 * GET /api/technician/tickets/:id
 */
const get_ticket_by_id = async (req, res, next) => {
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

        const ticket = await Ticket.findOne({
            where: {
                id,
                [Op.or]: [
                    { technician_id: technician.id },
                    literal(`EXISTS (
                        SELECT 1 FROM ticket_tasks tt
                        WHERE tt.ticket_id = "Ticket".id
                          AND tt.assigned_technician_id = '${technician.id}'
                    )`)
                ]
            },
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    include: [
                        { model: Plant, as: 'plant' },
                        { model: Category, as: 'category' }
                    ],
                    required: false
                },
                {
                    model: Category,
                    as: 'category',
                    required: false
                },
                {
                    model: Plant,
                    as: 'plant',
                    required: false
                },
                {
                    model: TicketResponse,
                    as: 'responses',
                    include: [
                        {
                            model: Technician,
                            as: 'respondingTechnician',
                            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
                        }
                    ],
                    order: [['created_at', 'DESC']],
                    required: false
                },
                {
                    model: User,
                    as: 'createdBy',
                    attributes: ['id', 'name', 'email'],
                    required: false
                },
                {
                    model: TicketTask,
                    as: 'tasks',
                    required: false,
                    include: [
                        { model: Technician, as: 'assignedTechnician', required: false, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
                        { model: TicketTaskChecklistQuestion, as: 'checklistQuestions', required: false },
                        { model: TicketTaskApproval, as: 'approvals', required: false }
                    ]
                }
            ],
            order: [
                [{ model: TicketTask, as: 'tasks' }, 'task_number', 'ASC']
            ]
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found or not assigned to you'
            });
        }

        // Format ticket to match frontend interface
        const formattedTicket = {
            id: ticket.id,
            ticketId: ticket.ticket_code,
            taskName: ticket.task_name,
            taskDescription: ticket.task_description,
            targetDate: ticket.target_date,
            completedStatus: ticket.completed_status,
            ticketType: ticket.ticket_type,
            ticketCategory: ticket.ticket_category,
            priority: ticket.priority,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            asset: ticket.asset ? {
                id: ticket.asset.id,
                assetId: ticket.asset.asset_code,
                location: ticket.asset.location,
                plant: ticket.asset.plant ? {
                    id: ticket.asset.plant.id,
                    plantName: ticket.asset.plant.plant_name
                } : null
            } : null,
            category: ticket.category ? {
                id: ticket.category.id,
                categoryName: ticket.category.category_name
            } : null,
            plant: ticket.plant ? {
                id: ticket.plant.id,
                plantName: ticket.plant.plant_name
            } : null,
            responses: ticket.responses ? ticket.responses.map(r => ({
                id: r.id,
                ticketId: r.ticket_id,
                userId: r.assigned_technician_id, // Map to userId as per frontend interface
                comment: r.comment,
                responseType: r.response_type,
                isFixed: r.is_fixed,
                photoUrls: r.photo_urls || [],
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                user: r.respondingTechnician && r.respondingTechnician.user ? {
                    id: r.respondingTechnician.user.id,
                    name: r.respondingTechnician.user.name,
                    email: r.respondingTechnician.user.email
                } : null
            })) : [],
            steps: ticket.tasks ? ticket.tasks.map(t => ({
                id: t.id,
                ticket_id: t.ticket_id,
                step_number: t.task_number,
                title: t.title,
                description: t.description,
                role_label: t.role_label,
                target_date: t.target_date,
                assigned_technician_id: t.assigned_technician_id,
                requires_approval: t.requires_approval,
                has_checklist: t.has_checklist,
                status: t.status,
                started_at: t.started_at,
                completed_at: t.completed_at,
                rejection_count: t.rejection_count,
                technician_notes: t.technician_notes,
                assignedTechnician: t.assignedTechnician && t.assignedTechnician.user ? {
                    id: t.assignedTechnician.id,
                    name: t.assignedTechnician.user.name,
                    email: t.assignedTechnician.user.email
                } : null,
                checklistQuestions: t.checklistQuestions || [],
                approvals: t.approvals || []
            })) : []
        };

        return res.json({
            success: true,
            data: formattedTicket
        });
    } catch (error) {
        console.error('[Technician Tickets] Error fetching ticket by ID:', error);
        return next(error);
    }
};

/**
 * Start working on a ticket
 * PATCH /api/technician/tickets/:id/start
 */
const start_ticket = async (req, res, next) => {
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

        const ticket = await Ticket.findOne({
            where: {
                id,
                technician_id: technician.id
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found or not assigned to you'
            });
        }

        if (ticket.completed_status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Ticket cannot be started from ${ticket.completed_status} status`
            });
        }

        // Update ticket status
        await ticket.update({
            completed_status: 'In Progress',
            started_at: new Date()
        });

        // Reload ticket with associations
        const updatedTicket = await Ticket.findByPk(id, {
            include: [
                {
                    model: Asset,
                    as: 'asset',
                    attributes: ['id', 'asset_code', 'location'],
                },
                {
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name'],
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'category_name'],
                }
            ]
        });

        return res.json({
            success: true,
            message: 'Ticket started successfully',
            data: updatedTicket // Return full ticket to update UI state
        });
    } catch (error) {
        console.error('[Technician Tickets] Error starting ticket:', error);
        return next(error);
    }
};

/**
 * Submit a ticket as completed with a comment
 * POST /api/technician/tickets/:id/submit
 */
const submit_ticket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schema = Joi.object({
            comment: Joi.string().required().min(5).messages({
                'any.required': 'Comment is required',
                'string.min': 'Comment must be at least 5 characters'
            }),
            isFixed: Joi.boolean().default(true),
            photoUrls: Joi.array().items(Joi.string()).optional().default([])
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { comment, isFixed, photoUrls } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        const ticket = await Ticket.findOne({
            where: {
                id,
                technician_id: technician.id
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found or not assigned to you'
            });
        }

        // Create response
        await TicketResponse.create({
            ticket_id: id,
            assigned_technician_id: technician.id,
            comment,
            response_type: 'submission',
            is_fixed: isFixed,
            photo_urls: photoUrls
        });

        // Update ticket status
        await ticket.update({
            completed_status: 'Waiting for approval'
        });

        // Reload ticket with associations
        const updatedTicket = await Ticket.findByPk(id, {
            include: [
                {
                    model: TicketResponse,
                    as: 'responses',
                    include: [{
                        model: Technician,
                        as: 'respondingTechnician',
                        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
                    }]
                }
            ]
        });

        return res.json({
            success: true,
            message: 'Ticket submitted successfully. Waiting for manager approval.',
            data: updatedTicket
        });
    } catch (error) {
        console.error('[Technician Tickets] Error submitting ticket:', error);
        return next(error);
    }
};

/**
 * Add a comment to a ticket (without changing status)
 * POST /api/technician/tickets/:id/comments
 */
const add_comment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schema = Joi.object({
            comment: Joi.string().required().min(3).messages({
                'any.required': 'Comment is required',
                'string.min': 'Comment must be at least 3 characters'
            })
        });

        const { error, value } = schema.validate(req.body);
        if (error) return next({ status: 400, message: error.details[0].message });

        const { comment } = value;

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        const ticket = await Ticket.findOne({
            where: {
                id,
                technician_id: technician.id
            }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found or not assigned to you'
            });
        }

        const ticketResponse = await TicketResponse.create({
            ticket_id: id,
            assigned_technician_id: technician.id,
            comment,
            response_type: 'comment'
        });

        // Load technician info
        await ticketResponse.reload({
            include: [{
                model: Technician,
                as: 'respondingTechnician',
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
            }]
        });

        return res.json({
            success: true,
            message: 'Comment added successfully',
            data: ticketResponse
        });
    } catch (error) {
        console.error('[Technician Tickets] Error adding comment:', error);
        return next(error);
    }
};

module.exports = {
    get_my_tickets,
    get_ticket_by_id,
    start_ticket,
    submit_ticket,
    add_comment
};
