/**
 * BM (Breakdown/Compliance Maintenance) Ticket Routes
 * Modular extension to ticket system - does NOT interfere with existing ticket routes
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/rbac');
const { Entity, Action } = require('../../types/permissions');
const ticketService = require('../../services/tickets/ticketService');
const bmWorkflowService = require('../../services/tickets/bmWorkflowService');

// Feature flag check
const checkBMFeature = (req, res, next) => {
  if (process.env.ENABLE_BM_MAINTENANCE === 'true') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      error: 'BM Maintenance feature is not enabled' 
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// BM TICKET CRUD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/bm-tickets
 * Create a new BM ticket
 */
router.post('/bm-tickets', 
  auth, 
  checkBMFeature,
  checkPermission(Entity.TICKETS, Action.CREATE),
  async (req, res, next) => {
    try {
      const ticket = await ticketService.createBMTicket(req.body, req.user);
      res.json({ success: true, ticket });
    } catch (error) {
      console.error('Create BM ticket error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/bm-tickets
 * List BM tickets with filters
 */
router.get('/bm-tickets',
  auth,
  checkBMFeature,
  checkPermission(Entity.TICKETS, Action.READ),
  async (req, res, next) => {
    try {
      const filters = {
        plant_id: req.query.plant_id,
        priority: req.query.priority,
        maintenance_type: req.query.maintenance_type,
        bm_state: req.query.bm_state,
        technician_id: req.query.technician_id,
        sla_breached: req.query.sla_breached === 'true',
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const tickets = await ticketService.listBMTickets(filters);
      res.json({ success: true, tickets });
    } catch (error) {
      console.error('List BM tickets error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/bm-tickets/:id
 * Get BM ticket details
 */
router.get('/bm-tickets/:id',
  auth,
  checkBMFeature,
  checkPermission(Entity.TICKETS, Action.READ),
  async (req, res, next) => {
    try {
      const ticket = await ticketService.getBMTicketById(req.params.id);
      res.json({ success: true, ticket });
    } catch (error) {
      console.error('Get BM ticket error:', error);
      next(error);
    }
  }
);

/**
 * PUT /api/bm-tickets/:id/assign
 * Assign BM ticket to technician
 */
router.put('/bm-tickets/:id/assign',
  auth,
  checkBMFeature,
  checkPermission(Entity.TICKETS, Action.UPDATE),
  async (req, res, next) => {
    try {
      const { technician_id } = req.body;
      if (!technician_id) {
        return res.status(400).json({ success: false, error: 'technician_id is required' });
      }

      const ticket = await ticketService.assignBMTicket(req.params.id, technician_id, req.user);
      res.json({ success: true, ticket });
    } catch (error) {
      console.error('Assign BM ticket error:', error);
      next(error);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// BM WORKFLOW STATE TRANSITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/bm-tickets/:id/transition
 * Transition BM ticket to next state
 */
router.post('/bm-tickets/:id/transition',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const { next_state, bm_metadata } = req.body;

      if (!next_state) {
        return res.status(400).json({ success: false, error: 'next_state is required' });
      }

      const ticket = await bmWorkflowService.transitionState(
        req.params.id,
        next_state,
        { bm_metadata: bm_metadata || {} },
        req.user
      );

      res.json({ success: true, ticket });
    } catch (error) {
      console.error('BM state transition error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /api/bm-tickets/:id/metadata
 * Update BM ticket metadata (form data)
 */
router.put('/bm-tickets/:id/metadata',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const ticket = await ticketService.updateBMMetadata(
        req.params.id,
        req.body,
        req.user
      );
      res.json({ success: true, ticket });
    } catch (error) {
      console.error('Update BM metadata error:', error);
      next(error);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SPARE PARTS MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/bm-tickets/:id/spares
 * Attach spare parts to BM ticket
 */
router.post('/bm-tickets/:id/spares',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const { spares } = req.body;

      if (!Array.isArray(spares) || spares.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'spares array is required with at least one spare part' 
        });
      }

      // Validate spare format
      for (const spare of spares) {
        if (!spare.spare_id || !spare.quantity) {
          return res.status(400).json({
            success: false,
            error: 'Each spare must have spare_id and quantity'
          });
        }
      }

      const consumptions = await bmWorkflowService.attachSpares(
        req.params.id,
        spares,
        req.user
      );

      res.json({ success: true, consumptions });
    } catch (error) {
      console.error('Attach spares error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/assets/:id/spare-history
 * Get spare consumption history for an asset
 */
router.get('/assets/:id/spare-history',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const history = await bmWorkflowService.getAssetSpareHistory(req.params.id, filters);
      res.json({ success: true, ...history });
    } catch (error) {
      console.error('Get spare history error:', error);
      next(error);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MASTER DATA & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/bm-tickets/issue-types
 * Get all BM issue types
 */
router.get('/bm-tickets/issue-types',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const issueTypes = await bmWorkflowService.getIssueTypes(true);
      res.json({ success: true, issueTypes });
    } catch (error) {
      console.error('Get issue types error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/bm-tickets/dashboard
 * Get BM dashboard statistics
 */
router.get('/bm-tickets/dashboard',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const filters = {
        plant_id: req.query.plant_id,
        priority: req.query.priority,
        maintenance_type: req.query.maintenance_type
      };

      const stats = await bmWorkflowService.getDashboardStats(filters);
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/bm-tickets/:id/check-sla
 * Manually check and update SLA breach status
 */
router.post('/bm-tickets/:id/check-sla',
  auth,
  checkBMFeature,
  async (req, res, next) => {
    try {
      const result = await bmWorkflowService.checkSLABreach(req.params.id);
      res.json({ success: true, sla_check: result });
    } catch (error) {
      console.error('Check SLA error:', error);
      next(error);
    }
  }
);

module.exports = router;
