/**
 * Ticket Controller
 * Handles ticket CRUD operations for managers/admins
 */
const Joi = require("joi");
const ticketService = require("../../services/tickets/ticketService");
const bmWorkflowService = require("../../services/tickets/bmWorkflowService");
const bmIssueTypes = require("../../config/bmIssueTypes");

const ticketController = {
  /**
   * Get dropdown data for ticket form
   */
  async getDropdownData(req, res, next) {
    try {
      const allowedPlantIds = req.managerPlantIds || null;
      const data = await ticketService.getDropdownData(allowedPlantIds);
      return res.json(data);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get buildings for a plant (for installation ticket location)
   */
  async getBuildingsByPlant(req, res, next) {
    try {
      const { plantId } = req.query;
      if (!plantId) return res.status(400).json({ success: false, message: "plantId is required" });
      const buildings = await ticketService.getBuildingsByPlant(plantId);
      return res.json({ buildings });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get floors for a building
   */
  async getFloorsByBuilding(req, res, next) {
    try {
      const { buildingId } = req.query;
      if (!buildingId) return res.status(400).json({ success: false, message: "buildingId is required" });
      const floors = await ticketService.getFloorsByBuilding(buildingId);
      return res.json({ floors });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get wings for a floor
   */
  async getWingsByFloor(req, res, next) {
    try {
      const { floorId } = req.query;
      if (!floorId) return res.status(400).json({ success: false, message: "floorId is required" });
      const wings = await ticketService.getWingsByFloor(floorId);
      return res.json({ wings });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get inventory assets by plant (for installation tickets)
   */
  async getInventoryAssets(req, res, next) {
    try {
      const { plantId, categoryId } = req.query;
      if (!plantId) return res.status(400).json({ success: false, message: "plantId is required" });
      const assets = await ticketService.getInventoryAssetsByPlant(plantId, categoryId);
      return res.json({ assets });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get assets by plant and category
   */
  async getAssetsByPlantAndCategory(req, res, next) {
    try {
      const { plantId, categoryId } = req.query;

      if (!plantId || !categoryId) {
        return res.status(400).json({
          success: false,
          message: "plantId and categoryId are required",
        });
      }

      const assets = await ticketService.getAssetsByPlantAndCategory(
        plantId,
        categoryId,
      );
      return res.json({ assets });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get all tickets
   */
  async getTickets(req, res, next) {
    try {
      const tickets = await ticketService.getTickets(
        req.query,
        req.managerPlantIds,
      );
      return res.json({ tickets });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get single ticket by ID
   */
  async getTicketById(req, res, next) {
    try {
      const { id } = req.params;
      const ticket = await ticketService.getTicketById(id);
      return res.json({ ticket });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Create new ticket
   */
  async createTicket(req, res, next) {
    const createTicketSchema = Joi.object({
      plantId: Joi.string().uuid().required(),
      categoryId: Joi.string().uuid().required(),
      assetId: Joi.string().uuid().optional().allow(null),
      inventoryAssetId: Joi.string().uuid().optional().allow(null),
      buildingId: Joi.string().uuid().optional().allow(null),
      floorId: Joi.string().uuid().optional().allow(null),
      wingId: Joi.string().uuid().optional().allow(null),
      location: Joi.string().optional().allow("", null),
      technicianId: Joi.string().uuid().optional().allow(null),
      taskName: Joi.string().required(),
      taskDescription: Joi.string().optional().allow(""),
      targetDate: Joi.date().iso().required(),
      ticketCategory: Joi.string()
        .valid("Installation", "Breakdown Maintenance", "Refill / HP Test", "General")
        .default("General"),
      maintenance_type: Joi.string()
        .valid("BREAKDOWN", "COMPLIANCE")
        .optional(),
      priority: Joi.string()
        .valid("LOW", "MEDIUM", "HIGH", "CRITICAL")
        .default("MEDIUM"),
      tasks: Joi.array().optional().allow(null),
    });

    const { error, value } = createTicketSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    try {
      // Validation: Refill / HP Test only on "Fire Extinguisher" categories (by name)
      if (value.ticketCategory === "Refill / HP Test") {
        const Category = require("../../models/master-data/category");
        const category = await Category.findByPk(value.categoryId, { attributes: ["id", "category_name"] });
        if (!category || !category.category_name.toLowerCase().includes('fire extinguisher')) {
           return res.status(400).json({
             success: false,
             message: "Refill / HP Test tickets can only be created for 'Fire Extinguisher' category assets.",
           });
        }
      }

      const ticket = await ticketService.createTicket(value, req.user.id);
      return res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        ticket,
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Update ticket
   */
  async updateTicket(req, res, next) {
    const updateTicketSchema = Joi.object({
      plantId: Joi.string().uuid().optional(),
      categoryId: Joi.string().uuid().optional(),
      assetId: Joi.string().uuid().optional().allow(null),
      inventoryAssetId: Joi.string().uuid().optional().allow(null),
      buildingId: Joi.string().uuid().optional().allow(null),
      floorId: Joi.string().uuid().optional().allow(null),
      wingId: Joi.string().uuid().optional().allow(null),
      location: Joi.string().optional().allow("", null),
      technicianId: Joi.string().uuid().optional().allow(null),
      taskName: Joi.string().optional(),
      taskDescription: Joi.string().optional().allow(""),
      targetDate: Joi.date().iso().optional(),
      ticketCategory: Joi.string()
        .valid("Installation", "Breakdown Maintenance", "Refill / HP Test", "General")
        .optional(),
      maintenance_type: Joi.string()
        .valid("BREAKDOWN", "COMPLIANCE")
        .optional(),
      priority: Joi.string()
        .valid("LOW", "MEDIUM", "HIGH", "CRITICAL")
        .optional(),
      completedStatus: Joi.string()
        .valid("Pending", "Rejected", "Waiting for approval", "Completed")
        .optional(),
      bm_metadata: Joi.object().optional(),
      refill_metadata: Joi.object().optional(),
    });

    const { error, value } = updateTicketSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    try {
      const { id } = req.params;
      const updatedTicket = await ticketService.updateTicket(
        id,
        value,
        req.user.id,
      );

      return res.json({
        success: true,
        message: "Ticket updated successfully",
        ticket: updatedTicket,
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Delete ticket
   */
  async deleteTicket(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ticketService.deleteTicket(id);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Approve a ticket
   */
  async approveTicket(req, res, next) {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      const ticket = await ticketService.approveTicket(
        id,
        comment,
        req.user.id,
      );

      return res.json({
        success: true,
        message: "Ticket approved successfully",
        ticket: {
          id: ticket.id,
          completedStatus: "Completed",
        },
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Reject a ticket
   */
  async rejectTicket(req, res, next) {
    const rejectSchema = Joi.object({
      comment: Joi.string().required(),
    });

    const { error, value } = rejectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    try {
      const { id } = req.params;
      const ticket = await ticketService.rejectTicket(
        id,
        value.comment,
        req.user.id,
      );

      return res.json({
        success: true,
        message: "Ticket rejected successfully",
        ticket: {
          id: ticket.id,
          completedStatus: "Rejected",
        },
      });
    } catch (error) {
      return next(error);
    }
  },

  // ============================================
  // BM_MAINTENANCE SPECIFIC ROUTES
  // ============================================

  /**
   * Get BM Issue Types config
   */
  async getBMIssueTypes(req, res, next) {
    try {
      return res.json({ success: true, issueTypes: bmIssueTypes });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get BM Ticket Detail (with SLA & FSM info)
   */
  async getBMTicketDetail(req, res, next) {
    try {
      const { id } = req.params;
      const detail = await bmWorkflowService.getBMTicketDetail(id);
      return res.json({ success: true, ticket: detail });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Transition BM Ticket State
   */
  async transitionBMState(req, res, next) {
    const transitionSchema = Joi.object({
      nextState: Joi.string().required(),
      bm_metadata: Joi.object().optional().default({}),
    });

    const { error, value } = transitionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
      const { id } = req.params;
      const updatedTicket = await bmWorkflowService.transitionState(id, value.nextState, { bm_metadata: value.bm_metadata }, req.user);
      return res.json({ success: true, message: "State transitioned successfully", ticket: updatedTicket });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Attach Spares to BM Ticket
   */
  async attachBMSpares(req, res, next) {
    const attachSchema = Joi.object({
      spares: Joi.array().items(Joi.object({
        spare_id: Joi.string().uuid().required(),
        quantity: Joi.number().min(1).required(),
        unit_cost: Joi.number().optional(),
        remarks: Joi.string().optional().allow("", null)
      })).min(1).required()
    });

    const { error, value } = attachSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
      const { id } = req.params;
      const consumptions = await bmWorkflowService.attachSpares(id, value.spares, req.user);
      return res.json({ success: true, message: "Spares attached successfully", consumptions });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get Asset Spare Lifecycle Consumption
   */
  async getAssetSpareHistory(req, res, next) {
    try {
      const { assetId } = req.params;
      const data = await bmWorkflowService.getAssetSpareHistory(assetId, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  }
};

module.exports = ticketController;
