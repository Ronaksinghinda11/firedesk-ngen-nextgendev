'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');

// Models loaded lazily to avoid circular deps
function getModels() {
    return require('../../models');
}

class TicketTaskService {

    // ── TASKS ─────────────────────────────────────────────────────────────────

    /**
     * Bulk-create or replace tasks for a ticket.
     * Deletes all existing tasks first (safe because tickets start with no tasks).
     * Called from createTicket / updateTicket.
     */
    async upsert_tasks(ticket_id, tasks_data, user_id, transaction) {
        const { TicketTask, TicketTaskChecklistQuestion } = getModels();

        // Delete existing tasks (cascade removes questions/answers/approvals)
        await TicketTask.destroy({ where: { ticket_id }, transaction });

        if (!tasks_data || tasks_data.length === 0) return [];

        const created_tasks = [];

        for (let i = 0; i < tasks_data.length; i++) {
            const t = tasks_data[i];
            const task = await TicketTask.create({
                ticket_id,
                task_number: t.task_number !== undefined ? t.task_number : (t.step_number !== undefined ? t.step_number : i + 1),
                title: t.title || null,
                description: t.description || null,
                role_label: t.role_label || null,
                target_date: t.target_date,
                assigned_technician_id: t.assigned_technician_id || null,
                requires_approval: !!t.requires_approval,
                has_checklist: !!t.has_checklist,
                status: 'pending',
                created_by: user_id,
            }, { transaction });

            // If has_checklist, create the questions
            if (t.has_checklist && Array.isArray(t.checklist_questions) && t.checklist_questions.length > 0) {
                await TicketTaskChecklistQuestion.bulkCreate(
                    t.checklist_questions.map((q, idx) => ({
                        task_id: task.id,
                        question_text: q.question_text || q.text || q,
                        question_order: q.question_order !== undefined ? q.question_order : idx,
                        is_mandatory: q.is_mandatory !== false,
                    })),
                    { transaction }
                );
            }

            created_tasks.push(task);
        }

        return created_tasks;
    }

    /**
     * Get all tasks for a ticket with full details.
     */
    async get_tasks(ticket_id) {
        const { TicketTask, TicketTaskChecklistQuestion, TicketTaskApproval, Technician, User } = getModels();

        return TicketTask.findAll({
            where: { ticket_id },
            include: [
                {
                    model: Technician,
                    as: 'assignedTechnician',
                    attributes: ['id'],
                    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
                    required: false,
                },
                {
                    model: TicketTaskChecklistQuestion,
                    as: 'checklistQuestions',
                    required: false,
                    order: [['question_order', 'ASC']],
                },
                {
                    model: TicketTaskApproval,
                    as: 'approvals',
                    required: false,
                    order: [['approval_round', 'DESC']],
                    limit: 1, // latest approval only
                    include: [
                        { model: User, as: 'requestedBy', attributes: ['id', 'name'], required: false },
                        { model: User, as: 'approvedBy', attributes: ['id', 'name'], required: false },
                    ],
                },
            ],
            order: [['task_number', 'ASC']],
        });
    }

    /**
     * Update a single task (manager/creator level).
     */
    async update_task(task_id, data, user_id) {
        const { TicketTask, TicketTaskChecklistQuestion } = getModels();

        const task = await TicketTask.findByPk(task_id);
        if (!task) throw { status: 404, message: 'Task not found' };

        const allowed = ['title', 'description', 'role_label', 'target_date', 'assigned_technician_id', 'requires_approval', 'has_checklist'];
        const updates = {};
        allowed.forEach(f => { if (data[f] !== undefined) updates[f] = data[f]; });

        await task.update(updates);

        // Replace checklist questions if provided
        if (data.checklist_questions !== undefined) {
            await TicketTaskChecklistQuestion.destroy({ where: { task_id } });
            if (Array.isArray(data.checklist_questions) && data.checklist_questions.length > 0) {
                await TicketTaskChecklistQuestion.bulkCreate(
                    data.checklist_questions.map((q, idx) => ({
                        task_id,
                        question_text: q.question_text || q.text || q,
                        question_order: q.question_order !== undefined ? q.question_order : idx,
                        is_mandatory: q.is_mandatory !== false,
                    }))
                );
            }
        }

        return this._load_task(task_id);
    }

    /**
     * Assign (or reassign) a technician to a task.
     */
    async assign_technician(task_id, technician_id, user_id) {
        const { TicketTask } = getModels();
        const task = await TicketTask.findByPk(task_id, { include: [{ association: 'ticket' }] });
        if (!task) throw { status: 404, message: 'Task not found' };
        await task.update({ assigned_technician_id: technician_id || null });
        return this._load_task(task_id);
    }

    // ── TECHNICIAN WORKFLOW ───────────────────────────────────────────────────

    /**
     * Technician starts a task.
     */
    async start_task(task_id, user_id) {
        const { TicketTask, Ticket, TicketTaskChecklistAnswer } = getModels();
        const task = await TicketTask.findByPk(task_id);
        if (!task) throw { status: 404, message: 'Task not found' };
        if (!['pending', 'rejected'].includes(task.status)) {
            throw { status: 400, message: `Task is already ${task.status} — cannot start` };
        }

        // If restarting a rejected task, clear old checklist answers for fresh submission
        if (task.status === 'rejected' && task.has_checklist) {
            await TicketTaskChecklistAnswer.destroy({
                where: { task_id }
            });
        }

        await task.update({ status: 'in_progress', started_at: new Date() });

        // Update ticket status to in_progress if still pending
        await Ticket.update(
            { completed_status: 'In Progress' },
            { where: { id: task.ticket_id, completed_status: 'Pending' } }
        );

        return this._load_task(task_id);
    }

    /**
     * Technician submits a task for completion / approval.
     * - If requires_approval = false → task is immediately 'completed'
     * - If requires_approval = true  → task moves to 'pending_approval' and an approval record is created
     */
    async submit_task(task_id, data, user_id) {
        const { TicketTask, TicketTaskApproval, Ticket } = getModels();
        const task = await TicketTask.findByPk(task_id);
        if (!task) throw { status: 404, message: 'Task not found' };
        if (task.status !== 'in_progress') {
            throw { status: 400, message: 'Task must be in_progress to submit' };
        }

        // Check for pending spare requests
        const { TicketInventoryUsage } = getModels();
        const pendingSpares = await TicketInventoryUsage.count({
            where: { ticket_id: task.ticket_id, status: 'pending' }
        });
        if (pendingSpares > 0) {
            throw { status: 400, message: 'Cannot submit task while spare part requests are pending approval.' };
        }

        const transaction = await sequelize.transaction();
        try {
            if (task.requires_approval) {
                await task.update({
                    status: 'pending_approval',
                    technician_notes: data.notes || null,
                }, { transaction });

                await TicketTaskApproval.create({
                    task_id,
                    ticket_id: task.ticket_id,
                    approval_round: task.rejection_count + 1,
                    status: 'pending',
                    requested_by: user_id,
                    requested_at: new Date(),
                }, { transaction });

                await Ticket.update(
                    { completed_status: 'Waiting for approval' },
                    { where: { id: task.ticket_id }, transaction }
                );
            } else {
                await task.update({
                    status: 'completed',
                    completed_at: new Date(),
                    technician_notes: data.notes || null,
                }, { transaction });

                await this._maybe_close_ticket(task.ticket_id, transaction);
            }

            await transaction.commit();
            return this._load_task(task_id);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    // ── CHECKLIST ─────────────────────────────────────────────────────────────

    /**
     * Save checklist answers for a task.
     */
    async save_checklist_answers(task_id, answers, user_id) {
        const { TicketTask, TicketTaskChecklistQuestion, TicketTaskChecklistAnswer } = getModels();

        const task = await TicketTask.findByPk(task_id, {
            include: [{ model: TicketTaskChecklistQuestion, as: 'checklistQuestions' }],
        });
        if (!task) throw { status: 404, message: 'Task not found' };
        if (!task.has_checklist) throw { status: 400, message: 'This task does not have a checklist' };

        for (const ans of answers) {
            // Find existing answer or create new one
            const [answerRecord] = await TicketTaskChecklistAnswer.findOrCreate({
                where: {
                    question_id: ans.question_id,
                    task_id
                },
                defaults: {
                    answered_by: user_id,
                    answer: typeof ans.answer === 'boolean' ? ans.answer : null,
                    remarks: ans.remarks || null,
                    answered_at: new Date(),
                }
            });

            // If it already existed, update it
            if (answerRecord) {
                await answerRecord.update({
                    answered_by: user_id,
                    answer: typeof ans.answer === 'boolean' ? ans.answer : null,
                    remarks: ans.remarks || null,
                    answered_at: new Date(),
                });
            }
        }

        return task.reload({
            include: [
                {
                    model: TicketTaskChecklistQuestion, as: 'checklistQuestions',
                    include: [{ association: 'answers' }]
                }
            ]
        });
    }

    // ── APPROVALS ─────────────────────────────────────────────────────────────

    /**
     * Manager/creator approves a task.
     */
    async approve_task(task_id, data, user_id) {
        const { TicketTask, TicketTaskApproval, Ticket } = getModels();

        const task = await TicketTask.findByPk(task_id);
        if (!task) throw { status: 404, message: 'Task not found' };
        if (task.status !== 'pending_approval') {
            throw { status: 400, message: 'Task is not pending approval' };
        }

        const transaction = await sequelize.transaction();
        try {
            // Update the latest approval record
            await TicketTaskApproval.update(
                { status: 'approved', approved_by: user_id, remarks: data.remarks || null, acted_at: new Date() },
                { where: { task_id, status: 'pending' }, transaction }
            );

            await task.update({ status: 'completed', completed_at: new Date() }, { transaction });

            await this._maybe_close_ticket(task.ticket_id, transaction);

            await transaction.commit();
            return this._load_task(task_id);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    /**
     * Manager/creator rejects a task — sends it back to technician.
     */
    async reject_task(task_id, data, user_id) {
        const { TicketTask, TicketTaskApproval, Ticket } = getModels();

        const task = await TicketTask.findByPk(task_id);
        if (!task) throw { status: 404, message: 'Task not found' };
        if (task.status !== 'pending_approval') {
            throw { status: 400, message: 'Task is not pending approval' };
        }

        const transaction = await sequelize.transaction();
        try {
            await TicketTaskApproval.update(
                { status: 'rejected', approved_by: user_id, remarks: data.remarks || null, acted_at: new Date() },
                { where: { task_id, status: 'pending' }, transaction }
            );

            await task.update({
                status: 'rejected',
                rejection_count: task.rejection_count + 1,
            }, { transaction });

            // Recalculate ticket status
            await Ticket.update(
                { completed_status: 'In Progress' },
                { where: { id: task.ticket_id }, transaction }
            );

            await transaction.commit();
            return this._load_task(task_id);
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    // ── INVENTORY USAGE ───────────────────────────────────────────────────────

    /**
     * Log inventory consumption for a ticket.
     * Deducts from inventory_assets or inventory_spares.
     */
    async consume_inventory(ticket_id, items, user_id) {
        const {
            Ticket, TicketInventoryUsage, InventoryAsset, InventorySpare, InventorySpareTransaction
        } = getModels();

        const ticket = await Ticket.findByPk(ticket_id);
        if (!ticket) throw { status: 404, message: 'Ticket not found' };

        const transaction = await sequelize.transaction();
        try {
            const usage_records = [];
            let ticket_total = 0;

            for (const item of items) {
                const qty = parseFloat(item.quantity);
                let unit_cost = item.unit_cost ? parseFloat(item.unit_cost) : null;
                let item_name = item.item_name || null;

                if (item.item_type === 'asset') {
                    const inv_asset = await InventoryAsset.findByPk(item.item_id, { transaction, lock: true });
                    if (!inv_asset) throw { status: 404, message: `Inventory asset ${item.item_id} not found` };
                    if (inv_asset.status !== 'available') throw { status: 400, message: `Asset ${item.item_id} is not available` };

                    item_name = item_name || inv_asset.manufacturer + ' ' + (inv_asset.model || '');
                    unit_cost = unit_cost ?? parseFloat(inv_asset.unit_price || 0);

                    // Mark as reserved (will be moved when ticket completes)
                    await inv_asset.update({ status: 'reserved' }, { transaction });

                } else if (item.item_type === 'spare') {
                    const spare = await InventorySpare.findByPk(item.item_id, { transaction, lock: true });
                    if (!spare) throw { status: 404, message: `Spare ${item.item_id} not found` };
                    if (parseFloat(spare.quantity) < qty) {
                        throw { status: 400, message: `Insufficient stock for spare "${spare.spare_name}": ${spare.quantity} available, ${qty} requested` };
                    }

                    item_name = item_name || spare.spare_name;
                    unit_cost = unit_cost ?? parseFloat(spare.unit_price || 0);
                    const new_qty = parseFloat((parseFloat(spare.quantity) - qty).toFixed(3));
                    await spare.update({ quantity: new_qty }, { transaction });

                    // Create a transaction log for the spare
                    await InventorySpareTransaction.create({
                        spare_id: spare.id,
                        transaction_type: 'issue',
                        quantity: qty,
                        quantity_before: parseFloat(spare.quantity),
                        quantity_after: new_qty,
                        purpose: `Consumed for ticket ${ticket.ticket_code || ticket.id}`,
                        linked_ticket_id: ticket_id,
                        created_by: user_id,
                    }, { transaction });
                } else {
                    throw { status: 400, message: `Invalid item_type: ${item.item_type}` };
                }

                const total_item_cost = unit_cost != null ? unit_cost * qty : null;
                if (total_item_cost) ticket_total += total_item_cost;

                const usage = await TicketInventoryUsage.create({
                    ticket_id,
                    task_id: item.task_id || null,
                    item_type: item.item_type,
                    item_id: item.item_id,
                    item_name,
                    quantity: qty,
                    unit_cost,
                    consumed_by: user_id,
                    notes: item.notes || null,
                }, { transaction });

                usage_records.push(usage);
            }

            // Update ticket total spare cost
            if (ticket_total > 0) {
                const current_total = parseFloat(ticket.total_spare_cost || 0);
                await ticket.update({ total_spare_cost: current_total + ticket_total }, { transaction });
            }

            await transaction.commit();
            return { usage_records, total_added: ticket_total };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    /**
     * Technician requests inventory for a ticket.
     * Sets TicketInventoryUsage status to 'pending' and Ticket to 'Waiting for spare'.
     */
    async request_spares(ticket_id, items, user_id) {
        const {
            Ticket, TicketInventoryUsage, InventorySpare
        } = getModels();

        const ticket = await Ticket.findByPk(ticket_id);
        if (!ticket) throw { status: 404, message: 'Ticket not found' };

        const transaction = await sequelize.transaction();
        try {
            const usage_records = [];

            for (const item of items) {
                if (item.item_type !== 'spare') {
                    throw { status: 400, message: 'Only spare parts can be requested through this workflow' };
                }

                const spare = await InventorySpare.findByPk(item.item_id, { transaction });
                if (!spare) throw { status: 404, message: `Spare ${item.item_id} not found` };

                const qty = parseFloat(item.quantity);
                const unit_cost = parseFloat(spare.unit_price || 0);
                const item_name = item.item_name || spare.spare_name || spare.part_name;

                const usage = await TicketInventoryUsage.create({
                    ticket_id,
                    task_id: item.task_id || null,
                    item_type: 'spare',
                    item_id: item.item_id,
                    item_name,
                    quantity: qty,
                    unit_cost,
                    consumed_by: user_id,
                    notes: item.notes || null,
                    status: 'pending' // New status field
                }, { transaction });

                usage_records.push(usage);
            }

            // Update ticket status
            await ticket.update({ completed_status: 'Waiting for spare' }, { transaction });

            await transaction.commit();
            return { usage_records, message: 'Sprate parts requested successfully' };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    /**
     * Get pending spare requests.
     */
    async get_pending_spare_requests(plant_ids = null) {
        const { TicketInventoryUsage, Ticket, User, InventorySpare, Asset } = getModels();

        const includeTicket = {
            model: Ticket,
            as: 'ticket',
            attributes: ['id', 'ticket_code', 'task_name', 'completed_status', 'plant_id'],
            required: true,
            include: [{ model: Asset, as: 'asset', attributes: ['id', 'asset_code'], required: false }]
        };

        if (plant_ids && plant_ids.length > 0) {
            includeTicket.where = { plant_id: { [Op.in]: plant_ids } };
        }

        return TicketInventoryUsage.findAll({
            where: { status: 'pending', item_type: 'spare' },
            include: [
                includeTicket,
                { model: User, as: 'consumedBy', attributes: ['id', 'name'], required: false },
            ],
            order: [['created_at', 'ASC']],
        });
    }

    /**
     * Approve or reject a spare request.
     */
    async process_spare_request(usage_id, status, user_id) {
        const { TicketInventoryUsage, InventorySpare, InventorySpareTransaction, Ticket, User } = getModels();

        if (!['approved', 'rejected'].includes(status)) {
            throw { status: 400, message: 'Invalid status' };
        }

        const transaction = await sequelize.transaction();
        try {
            const usage = await TicketInventoryUsage.findByPk(usage_id, { transaction, lock: true });
            if (!usage) throw { status: 404, message: 'Spare request not found' };
            if (usage.status !== 'pending') throw { status: 400, message: `Request is already ${usage.status}` };

            const ticket = await Ticket.findByPk(usage.ticket_id, { 
                transaction
            });

            // Fallback to fetch technician if not included
            let technicianName = 'Technician';
            const { Technician, User: UserModel } = getModels();
            const tech = await Technician.findOne({
                where: { id: ticket.technician_id },
                include: [{ model: UserModel, as: 'user' }]
            });
            if (tech && tech.user) technicianName = tech.user.name;

            if (status === 'approved') {
                const spare = await InventorySpare.findByPk(usage.item_id, { transaction, lock: true });
                if (!spare) throw { status: 404, message: `Spare ${usage.item_id} not found` };

                const qty = parseFloat(usage.quantity);
                if (parseFloat(spare.quantity) < qty) {
                    throw { status: 400, message: `Insufficient stock for spare "${spare.spare_name || spare.part_name}". Available: ${spare.quantity}` };
                }

                const new_qty = parseFloat((parseFloat(spare.quantity) - qty).toFixed(3));
                await spare.update({ quantity: new_qty }, { transaction });

                // Transaction log
                await InventorySpareTransaction.create({
                    spare_id: spare.id,
                    transaction_type: 'issue',
                    quantity: qty,
                    quantity_before: parseFloat(spare.quantity),
                    quantity_after: new_qty,
                    purpose: `Approved spare request for ticket ${ticket.ticket_code || ticket.id}`,
                    linked_ticket_id: ticket.id,
                    issued_to: technicianName,
                    created_by: user_id,
                }, { transaction });

                // Cost addition
                const total_cost = (parseFloat(usage.unit_cost) || 0) * qty;
                const current_ticket_cost = parseFloat(ticket.total_spare_cost || 0);
                await ticket.update({ total_spare_cost: current_ticket_cost + total_cost }, { transaction });
            }

            // Update usage status
            await usage.update({ status }, { transaction });

            // If rejected, put ticket on hold
            if (status === 'rejected') {
                await ticket.update({ completed_status: 'On Hold' }, { transaction });
                ticket.completed_status = 'On Hold'; // Ensure in-memory object is updated
            }

            // Check if there are any remaining pending requests for this ticket
            const remaining_pending = await TicketInventoryUsage.count({
                where: { ticket_id: ticket.id, status: 'pending' },
                transaction
            });

            if (remaining_pending === 0 && ticket.completed_status === 'Waiting for spare') {
                // Change ticket status back to In Progress
                await ticket.update({ completed_status: 'In Progress' }, { transaction });
            }

            await transaction.commit();
            return usage;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    /**
     * Get inventory usage for a ticket.
     */
    async get_inventory_usage(ticket_id) {
        const { TicketInventoryUsage, TicketTask, User } = getModels();

        return TicketInventoryUsage.findAll({
            where: { ticket_id },
            include: [
                { model: TicketTask, as: 'task', attributes: ['id', 'task_number', 'title'], required: false },
                { model: User, as: 'consumedBy', attributes: ['id', 'name'], required: false },
            ],
            order: [['created_at', 'ASC']],
        });
    }

    // ── PRIVATE ───────────────────────────────────────────────────────────────

    /** Load a single task with all associations */
    async _load_task(task_id) {
        const { TicketTask, TicketTaskChecklistQuestion, TicketTaskApproval, Technician, User } = getModels();

        return TicketTask.findByPk(task_id, {
            include: [
                {
                    model: Technician, as: 'assignedTechnician', required: false,
                    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }]
                },
                { model: TicketTaskChecklistQuestion, as: 'checklistQuestions', required: false },
                {
                    model: TicketTaskApproval, as: 'approvals', required: false,
                    include: [
                        { model: User, as: 'requestedBy', attributes: ['id', 'name'], required: false },
                        { model: User, as: 'approvedBy', attributes: ['id', 'name'], required: false },
                    ],
                },
            ],
        });
    }

    /**
     * Close ticket if ALL tasks are completed.
     * Handles post-completion logic per ticket category:
     * - Installation: Move inventory asset to live assets table
     * - Breakdown/Preventive: Accumulate spare costs
     */
    async _maybe_close_ticket(ticket_id, transaction) {
        const { TicketTask, Ticket, InventoryAsset, TicketInventoryUsage } = getModels();

        const tasks = await TicketTask.findAll({ where: { ticket_id }, transaction });
        const ticket = await Ticket.findByPk(ticket_id, { transaction });
        if (!ticket) return;

        if (tasks.length > 0) {
            const all_done = tasks.every(t => t.status === 'completed');
            if (!all_done) return;
        } else {
            // No tasks exist
            if (!['Refill / HP Test', 'Breakdown Maintenance', 'BM_MAINTENANCE'].includes(ticket.ticket_category) && ticket.ticket_type !== 'BM_MAINTENANCE') {
                return; // Only Refill / HP Test and BM can auto-close without tasks right now
            }
        }

        // Additional checks for specific ticket categories before closing
        if (ticket.ticket_category === 'Refill / HP Test') {
             if (!ticket.refill_metadata || ticket.refill_metadata.is_final !== true) {
                 return; // Wait for the form to be filled and marked as final
             }
        }

        if (['Breakdown Maintenance', 'BM_MAINTENANCE'].includes(ticket.ticket_category) || ticket.ticket_type === 'BM_MAINTENANCE') {
             if (!ticket.bm_metadata || ticket.bm_metadata.is_final !== true) {
                 return; // Wait for the form to be explicitly marked final
             }
        }

        // ─── Installation ticket completion: move inventory asset to assets table ──
        if (ticket.ticket_category === 'Installation' && ticket.inventory_asset_id) {
            try {
                const inventory_service = require('../inventory/inventory_service');
                const { InventoryAsset } = require('../../models');
                
                // Get the inventory asset to calculate cost and validate required fields
                const inv_asset = await InventoryAsset.findByPk(ticket.inventory_asset_id, { transaction });
                
                if (!inv_asset) {
                    throw new Error(`Inventory asset ${ticket.inventory_asset_id} not found`);
                }
                
                // ✅ CRITICAL VALIDATION: Ensure mandatory fields are present
                if (!inv_asset.type) {
                    throw new Error('Cannot install asset: Type is missing. Please update the inventory asset with the required type field.');
                }
                if (!inv_asset.manufacturing_date) {
                    throw new Error('Cannot install asset: Manufacturing date is missing. Please update the inventory asset with the required manufacturing date.');
                }
                
                // Set total_spare_cost to the asset's total price
                if (inv_asset.total_price) {
                    await ticket.update({ total_spare_cost: inv_asset.total_price }, { transaction });
                }
                
                const additional_data = {
                    building_id: ticket.building_id || null,
                    floor_id: ticket.floor_id || null,
                    wing_id: ticket.wing_id || null,
                    location: ticket.location || null,
                    install_date: new Date().toISOString().split('T')[0],
                    ticket_id: ticket.id,  // Pass ticket_id for history tracking
                };

                const new_asset = await inventory_service.move_to_assets(
                    ticket.inventory_asset_id,
                    additional_data,
                    { id: ticket.created_by }
                );

                // Link the new asset to the ticket
                await ticket.update({
                    asset_id: new_asset.id,
                }, { transaction });
            } catch (err) {
                console.error(`[TicketTaskService] Failed to move inventory asset on ticket completion:`, err.message);
                // Re-throw validation errors so ticket completion fails with clear message
                if (err.message.includes('Cannot install asset')) {
                    throw err;
                }
                // Don't fail the ticket completion for other errors — log them
            }
        }

        // ─── Breakdown / Refill / HP Test: Sum spare costs and record AssetSpareConsumption
        if (['Breakdown Maintenance', 'Refill / HP Test', 'BM_MAINTENANCE'].includes(ticket.ticket_category) || ticket.ticket_type === 'BM_MAINTENANCE') {
            try {
                const usage = await TicketInventoryUsage.findAll({
                    where: { ticket_id, status: 'approved' },
                    transaction,
                });
                
                const { AssetSpareConsumption } = getModels();

                for (const u of usage) {
                    if (u.item_type === 'spare' && ticket.asset_id) {
                        const total_item_cost = parseFloat(u.unit_cost || 0) * parseFloat(u.quantity || 0);
                        await AssetSpareConsumption.create({
                            asset_id: ticket.asset_id,
                            ticket_id: ticket.id,
                            spare_id: u.item_id,
                            quantity_used: u.quantity,
                            unit_cost: u.unit_cost,
                            total_cost: total_item_cost,
                            used_by: u.consumed_by || ticket.technician_id,
                            remarks: u.notes
                        }, { transaction });
                    }
                }
                
                const total_cost = usage.reduce((sum, u) => {
                    const cost = parseFloat(u.unit_cost || 0) * parseFloat(u.quantity || 0);
                    return sum + cost;
                }, 0);
                await ticket.update({ total_spare_cost: total_cost }, { transaction });
            } catch (err) {
                console.error(`[TicketTaskService] Failed to record asset spare consumptions:`, err.message);
            }
        }

        // Mark ticket as completed
        await Ticket.update(
            { completed_status: 'Completed' },
            { where: { id: ticket_id }, transaction }
        );
    }
}

module.exports = new TicketTaskService();
