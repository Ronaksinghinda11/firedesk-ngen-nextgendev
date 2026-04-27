/**
 * Ticket Routes
 * Standalone routes for ticket management
 */
const express = require("express");
const router = express.Router();

// Middleware
const auth = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission_check");
const { ENTITIES, ACTIONS } = require("../utils/permission_constants");

// Controllers
const ticketController = require("../controllers/tickets/ticketController");
const ticketTaskController = require("../controllers/tickets/ticketTaskController");

// Apply auth middleware to all routes
router.use(auth);

// ============================================
// DROPDOWN & LOOKUP ROUTES
// ============================================

// Get dropdown data for ticket form (plants, categories, technicians)
router.get(
  "/dropdown-data",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getDropdownData,
);

// Get assets by plant and category
router.get(
  "/assets",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getAssetsByPlantAndCategory,
);

// Get inventory assets by plant (for installation tickets)
router.get(
  "/inventory-assets",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getInventoryAssets,
);

// Get buildings by plant (for installation ticket location)
router.get(
  "/buildings",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getBuildingsByPlant,
);

// Get floors by building
router.get(
  "/floors",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getFloorsByBuilding,
);

// Get wings by floor
router.get(
  "/wings",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getWingsByFloor,
);

// ============================================
// SPARES ROUTES (Must be before /:id CRUD ops)
// ============================================

router.get(
  "/spares/pending-requests",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketTaskController.getPendingSpareRequests,
);

router.post(
  "/spares/process/:usage_id",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.processSpareRequest,
);

// GET /tickets/available-spares — list inventory spares accessible to anyone with ticket read (incl. technicians)
router.get(
  "/available-spares",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  async (req, res, next) => {
    try {
      const inventory_service = require('../services/inventory/inventory_service');
      const result = await inventory_service.get_spares(req.query, []); // [] = no plant filter = all spares readable
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return next(err);
    }
  }
);

// ============================================
// TICKET CRUD ROUTES
// ============================================

// Get all tickets
router.get(
  "/",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getTickets,
);

// Get single ticket by ID
router.get(
  "/:id",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getTicketById,
);

// Create new ticket
router.post(
  "/",
  requirePermission(ENTITIES.TICKETS, ACTIONS.CREATE),
  ticketController.createTicket,
);

// Update ticket
router.put(
  "/:id",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketController.updateTicket,
);

// Delete ticket
router.delete(
  "/:id",
  requirePermission(ENTITIES.TICKETS, ACTIONS.DELETE),
  ticketController.deleteTicket,
);

// ============================================
// TICKET WORKFLOW ROUTES
// ============================================

// Approve ticket
router.put(
  "/:id/approve",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketController.approveTicket,
);

// Reject ticket
router.put(
  "/:id/reject",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketController.rejectTicket,
);


// ============================================
// TASK ROUTES (renamed from STEP ROUTES)
// ============================================

// GET / POST /tickets/:id/tasks
router.get(
  "/:id/tasks",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketTaskController.getTasks,
);

router.post(
  "/:id/tasks",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.upsertTasks,
);

// ============================================
// BM MAINTENANCE ROUTES
// ============================================

router.get(
  "/bm/issue-types",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getBMIssueTypes,
);

router.get(
  "/:id/bm",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getBMTicketDetail,
);

router.put(
  "/:id/bm/transition",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketController.transitionBMState,
);

router.post(
  "/:id/bm/spares",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketController.attachBMSpares,
);

router.get(
  "/asset/:assetId/bm-spares",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketController.getAssetSpareHistory,
);

// ============================================
// INVENTORY USAGE ROUTES (ticket level)
// ============================================

router.get(
  "/:id/inventory-usage",
  requirePermission(ENTITIES.TICKETS, ACTIONS.READ),
  ticketTaskController.getInventoryUsage,
);

router.post(
  "/:id/consume-inventory",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.consumeInventory,
);

router.post(
  "/:id/request-spares",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.requestSpares,
);

// ============================================
// INDIVIDUAL TASK ROUTES  (/tasks/:id/...)
// ============================================

// PUT /tasks/:id
router.put(
  "/tasks/:id",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.updateTask,
);

// POST /tasks/:id/assign
router.post(
  "/tasks/:id/assign",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.assignTechnician,
);

// POST /tasks/:id/start  (technician or manager)
router.post(
  "/tasks/:id/start",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.startTask,
);

// POST /tasks/:id/submit  (technician)
router.post(
  "/tasks/:id/submit",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.submitTask,
);

// POST /tasks/:id/approve  (manager/creator)
router.post(
  "/tasks/:id/approve",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.approveTask,
);

// POST /tasks/:id/reject  (manager/creator)
router.post(
  "/tasks/:id/reject",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.rejectTask,
);

// POST /tasks/:id/checklist  (technician)
router.post(
  "/tasks/:id/checklist",
  requirePermission(ENTITIES.TICKETS, ACTIONS.UPDATE),
  ticketTaskController.saveChecklist,
);

module.exports = router;
