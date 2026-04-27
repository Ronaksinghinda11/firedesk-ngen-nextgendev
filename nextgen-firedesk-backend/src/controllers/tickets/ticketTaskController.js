'use strict';
const ticketTaskService = require('../../services/tickets/ticketTaskService');

const ticketTaskController = {

    // GET /tickets/:id/tasks
    async getTasks(req, res, next) {
        try {
            const tasks = await ticketTaskService.get_tasks(req.params.id);
            return res.json({ success: true, tasks });
        } catch (e) { return next(e); }
    },

    // POST /tickets/:id/tasks   — bulk create/replace
    async upsertTasks(req, res, next) {
        try {
            const { tasks } = req.body;
            if (!Array.isArray(tasks)) {
                return res.status(400).json({ success: false, message: 'tasks array is required' });
            }
            const result = await ticketTaskService.upsert_tasks(req.params.id, tasks, req.user.id, null);
            return res.status(201).json({ success: true, message: 'Tasks saved', tasks: result });
        } catch (e) { return next(e); }
    },

    // PUT /ticket-tasks/:id
    async updateTask(req, res, next) {
        try {
            const task = await ticketTaskService.update_task(req.params.id, req.body, req.user.id);
            return res.json({ success: true, message: 'Task updated', task });
        } catch (e) { return next(e); }
    },

    // POST /ticket-tasks/:id/assign   body: { technician_id }
    async assignTechnician(req, res, next) {
        try {
            const { technician_id } = req.body;
            const task = await ticketTaskService.assign_technician(req.params.id, technician_id, req.user.id);
            return res.json({ success: true, message: 'Technician assigned', task });
        } catch (e) { return next(e); }
    },

    // POST /ticket-tasks/:id/start   (technician)
    async startTask(req, res, next) {
        try {
            const task = await ticketTaskService.start_task(req.params.id, req.user.id);
            return res.json({ success: true, message: 'Task started', task });
        } catch (e) { return next(e); }
    },

    // POST /ticket-tasks/:id/submit   body: { notes? }
    async submitTask(req, res, next) {
        try {
            const task = await ticketTaskService.submit_task(req.params.id, req.body, req.user.id);
            return res.json({ success: true, message: 'Task submitted', task });
        } catch (e) { return next(e); }
    },

    // POST /ticket-tasks/:id/approve   body: { remarks? }
    async approveTask(req, res, next) {
        try {
            const task = await ticketTaskService.approve_task(req.params.id, req.body, req.user.id);
            return res.json({ success: true, message: 'Task approved', task });
        } catch (e) { return next(e); }
    },

    // POST /ticket-tasks/:id/reject   body: { remarks }
    async rejectTask(req, res, next) {
        try {
            if (!req.body.remarks) {
                return res.status(400).json({ success: false, message: 'remarks are required for rejection' });
            }
            const task = await ticketTaskService.reject_task(req.params.id, req.body, req.user.id);
            return res.json({ success: true, message: 'Task rejected', task });
        } catch (e) { return next(e); }
    },

    // POST /ticket-tasks/:id/checklist   body: { answers: [{ question_id, answer, remarks? }] }
    async saveChecklist(req, res, next) {
        try {
            const { answers } = req.body;
            if (!Array.isArray(answers)) {
                return res.status(400).json({ success: false, message: 'answers array is required' });
            }
            const task = await ticketTaskService.save_checklist_answers(req.params.id, answers, req.user.id);
            return res.json({ success: true, message: 'Checklist saved', task });
        } catch (e) { return next(e); }
    },

    // GET /tickets/:id/inventory-usage
    async getInventoryUsage(req, res, next) {
        try {
            const usage = await ticketTaskService.get_inventory_usage(req.params.id);
            return res.json({ success: true, usage });
        } catch (e) { return next(e); }
    },

    // POST /tickets/:id/consume-inventory   body: { items: [...] }
    async consumeInventory(req, res, next) {
        try {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: 'items array is required' });
            }
            const result = await ticketTaskService.consume_inventory(req.params.id, items, req.user.id);
            return res.json({ success: true, message: `Inventory consumed. Total cost: ₹${result.total_added}`, ...result });
        } catch (e) { return next(e); }
    },

    // POST /tickets/:id/request-spares   body: { items: [...] }
    async requestSpares(req, res, next) {
        try {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: 'items array is required' });
            }
            const result = await ticketTaskService.request_spares(req.params.id, items, req.user.id);
            return res.json({ success: true, message: 'Spare parts requested successfully', ...result });
        } catch (e) { return next(e); }
    },

    // GET /tickets/spares/pending-requests
    async getPendingSpareRequests(req, res, next) {
        try {
            const allowedPlantIds = req.managerPlantIds || null;
            const requests = await ticketTaskService.get_pending_spare_requests(allowedPlantIds);
            return res.json({ success: true, requests });
        } catch (e) { return next(e); }
    },

    // POST /tickets/spares/process/:usage_id   body: { status: 'approved' | 'rejected' }
    async processSpareRequest(req, res, next) {
        try {
            const { status } = req.body;
            const usage = await ticketTaskService.process_spare_request(req.params.usage_id, status, req.user.id);
            return res.json({ success: true, message: `Spare request ${status}`, usage });
        } catch (e) { return next(e); }
    },
};

module.exports = ticketTaskController;
