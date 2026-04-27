/**
 * Ticket Service
 * Handles business logic for tickets
 */
const { Op } = require("sequelize");
const { sequelize } = require("../../../config/config");
const {
  Ticket,
  TicketResponse,
  TicketTask,
  TicketTaskChecklistQuestion,
  TicketTaskApproval,
  Plant,
  Asset,
  Building,
  Floor,
  Wing,
  Category,
  User,
  Technician,
  InventoryAsset,
  IncidentAssignment,
} = require("../../models");

const notificationService = require("../../services/notifications/notificationService");
const auditService = require("../audit/audit_service");
const bmWorkflowService = require("./bmWorkflowService");

// Lazy-load complianceScoreService to avoid circular dependency
let complianceScoreService = null;
const getComplianceScoreService = () => {
    if (!complianceScoreService) {
        complianceScoreService = require('../assets/complianceScoreService');
    }
    return complianceScoreService;
};

class TicketService {
  /**
   * Get dropdown data for ticket form
   * @param {string[]} allowedPlantIds - If provided, restrict plants to these IDs (for manager filtering)
   */
  async getDropdownData(allowedPlantIds = null) {
    // Build plant query with optional filtering
    const plantWhereCondition = {};
    if (allowedPlantIds && allowedPlantIds.length > 0) {
      plantWhereCondition.id = { [Op.in]: allowedPlantIds };
    }

    // Get plants (filtered if manager) with their assigned categories
    const plants = await Plant.findAll({
      where: plantWhereCondition,
      attributes: ["id", "plant_name"],
      include: [
        {
          model: Category,
          as: "categories",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
      order: [["plant_name", "ASC"]],
    });

    // Get all categories
    const categories = await Category.findAll({
      attributes: ["id", "category_name"],
      order: [["category_name", "ASC"]],
    });

    // Get technicians (users with technician records) with their assigned plants
    const technicians = await Technician.findAll({
      attributes: ["id"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Plant,
          as: "plants",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
    });

    // Transform technicians to expected format
    const formattedTechnicians = technicians.map((t) => ({
      id: t.id,
      name: t.user?.name || "Unknown",
      email: t.user?.email || "",
      plantIds: t.plants ? t.plants.map((p) => p.id) : [],
    }));

    return {
      plants: plants.map((p) => ({
        id: p.id,
        plantName: p.plant_name,
        categoryIds: p.categories ? p.categories.map((c) => c.id) : [],
      })),
      categories: categories.map((c) => ({
        id: c.id,
        categoryName: c.category_name,
      })),
      technicians: formattedTechnicians,
      features: {
        enable_bm_maintenance: process.env.ENABLE_BM_MAINTENANCE === "true"
      }
    };
  }

  /**
   * Get buildings for a plant (for installation ticket location selection)
   */
  async getBuildingsByPlant(plantId) {
    const buildings = await Building.findAll({
      where: { plant_id: plantId },
      attributes: [
        "id",
        ["building_name", "buildingName"], // Map to camelCase for frontend
      ],
      order: [["building_name", "ASC"]],
    });
    return buildings;
  }

  /**
   * Get floors for a building
   */
  async getFloorsByBuilding(buildingId) {
    const floors = await Floor.findAll({
      where: { building_id: buildingId },
      attributes: [
        "id",
        ["floor_name", "floorName"], // Map to camelCase for frontend
      ],
      order: [["floor_name", "ASC"]],
    });
    return floors;
  }

  /**
   * Get wings for a floor
   */
  async getWingsByFloor(floorId) {
    const wings = await Wing.findAll({
      where: { floor_id: floorId },
      attributes: [
        "id",
        ["wing_name", "wingName"], // Map to camelCase for frontend
      ],
      order: [["wing_name", "ASC"]],
    });
    return wings;
  }

  /**
   * Get inventory assets for a plant (for installation tickets)
   */
  async getInventoryAssetsByPlant(plantId, categoryId) {
    const where = { plant_id: plantId, status: 'available' };
    if (categoryId) where.category_id = categoryId;

    const assets = await InventoryAsset.findAll({
      where,
      attributes: ["id", "asset_code", "manufacturer", "model", "serial_number", "quantity", "status"],
      include: [
        { model: Category, as: "category", attributes: ["id", "category_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return assets.map((a) => ({
      id: a.id,
      assetCode: a.asset_code,
      manufacturer: a.manufacturer,
      model: a.model,
      serialNumber: a.serial_number,
      quantity: a.quantity,
      status: a.status,
      category: a.category ? { id: a.category.id, categoryName: a.category.category_name } : null,
    }));
  }

  /**
   * Get assets by plant and category
   */
  async getAssetsByPlantAndCategory(plantId, categoryId) {
    const assets = await Asset.findAll({
      where: {
        plant_id: plantId,
        category_id: categoryId,
        status: "ACTIVE",
      },
      include: [
        {
          model: Building,
          as: "building",
          attributes: ["id", "building_name"],
        },
      ],
      attributes: ["id", "asset_code", "building_id"],
    });

    return assets.map((a) => ({
      id: a.id,
      assetId: a.asset_code,
      buildingId: a.building_id,
      buildingRef: a.building
        ? {
          id: a.building.id,
          buildingName: a.building.building_name,
        }
        : null,
    }));
  }

  /**
   * Get all tickets with filters
   * @param {Object} query - Query parameters (plantId, status, ticketCategory)
   * @param {string[]} allowedPlantIds - If provided, restrict tickets to these plant IDs (for manager filtering)
   */
  async getTickets(query, allowedPlantIds = null) {
    const { plantId, status, ticketCategory } = query;
    const whereClause = {};

    // Apply manager plant filter if provided
    if (allowedPlantIds && allowedPlantIds.length > 0) {
      if (plantId && plantId !== "all") {
        if (!allowedPlantIds.includes(plantId)) {
          return [];
        }
        whereClause.plant_id = plantId;
      } else {
        whereClause.plant_id = { [Op.in]: allowedPlantIds };
      }
    } else if (plantId && plantId !== "all") {
      whereClause.plant_id = plantId;
    }

    if (status && status !== "all") {
      whereClause.completed_status = status;
    }

    if (ticketCategory && ticketCategory !== "all") {
      whereClause.ticket_category = ticketCategory;
    }

    const tickets = await Ticket.findAll({
      where: whereClause,
      include: [
        {
          model: Plant,
          as: "plant",
          attributes: ["id", "plant_name"],
        },
        {
          model: Asset,
          as: "asset",
          attributes: ["id", "asset_code"],
          include: [
            {
              model: Building,
              as: "building",
              attributes: ["id", "building_name"],
            },
          ],
          required: false,
        },
        {
          model: InventoryAsset,
          as: "inventoryAsset",
          attributes: ["id", "asset_code", "manufacturer", "model", "status"],
          required: false,
        },
        {
          model: Technician,
          as: "technician",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
          required: false,
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "category_name"],
          required: false,
        },
        {
          model: TicketResponse,
          as: "responses",
          include: [
            {
              model: Technician,
              as: "respondingTechnician",
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
          order: [['created_at', 'ASC']], // Chronological order - oldest first
          required: false,
        },
        {
          model: TicketTask,
          as: "tasks",
          required: false,
          attributes: ["id", "task_number", "status", "target_date"],
        },
        {
          model: Building,
          as: "building",
          attributes: ["id", "building_name"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return tickets.map((t) => this._transformTicket(t));
  }

  /**
   * Get single ticket by ID
   */
  async getTicketById(id) {
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: Plant,
          as: "plant",
          attributes: ["id", "plant_name"],
        },
        {
          model: Asset,
          as: "asset",
          attributes: ["id", "asset_code"],
          include: [
            {
              model: Building,
              as: "building",
              attributes: ["id", "building_name"],
            },
          ],
          required: false,
        },
        {
          model: InventoryAsset,
          as: "inventoryAsset",
          attributes: ["id", "asset_code", "manufacturer", "model", "status"],
          required: false,
        },
        {
          model: Technician,
          as: "technician",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
          required: false,
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "category_name"],
          required: false,
        },
        {
          model: TicketResponse,
          as: "responses",
          include: [
            {
              model: Technician,
              as: "respondingTechnician",
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
          order: [["created_at", "ASC"]], // Chronological order - oldest first
        },
        {
          model: TicketTask,
          as: "tasks",
          required: false,
          order: [["task_number", "ASC"]],
          include: [
            {
              model: Technician,
              as: "assignedTechnician",
              required: false,
              attributes: ["id"],
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "name", "email"],
                },
              ]
            },
            {
              model: TicketTaskChecklistQuestion,
              as: "checklistQuestions",
              required: false,
            },
            {
              model: TicketTaskApproval,
              as: "approvals",
              required: false,
              include: [
                {
                  model: User,
                  as: "requestedBy",
                  attributes: ["id", "name"],
                  required: false,
                },
                {
                  model: User,
                  as: "approvedBy",
                  attributes: ["id", "name"],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: Building,
          as: "building",
          attributes: ["id", "building_name"],
          required: false,
        },
      ],
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    return this._transformTicket(ticket);
  }

  /**
   * Create new ticket
   */
  async createTicket(data, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Generate ticket code
      const ticketCount = await Ticket.count();
      const ticketCode = `TKT-${String(ticketCount + 1).padStart(4, "0")}`;

      const createData = {
        ticket_code: ticketCode,
        created_by: userId,
        plant_id: data.plantId,
        category_id: data.categoryId,
        asset_id: data.assetId || null,
        inventory_asset_id: data.inventoryAssetId || null,
        technician_id: data.technicianId || null,
        task_name: data.taskName,
        task_description: data.taskDescription || null,
        target_date: data.targetDate,
        ticket_category: data.ticketCategory || 'General',
        completed_status: "Pending",
        building_id: data.buildingId || null,
        floor_id: data.floorId || null,
        wing_id: data.wingId || null,
        location: data.location || null,
        total_spare_cost: 0,
      };

      if (data.ticketCategory === 'Breakdown Maintenance') {
        createData.ticket_type = 'BM_MAINTENANCE';
        createData.maintenance_type = data.maintenance_type || 'BREAKDOWN';
        createData.priority = data.priority || 'MEDIUM';
        createData.bm_state = 'CREATED';
        createData.bm_metadata = {};
      }

      const ticket = await Ticket.create(createData, { transaction });

      // If tasks are provided, create them within the transaction
      if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
        const ticketTaskService = require("./ticketTaskService");
        await ticketTaskService.upsert_tasks(
          ticket.id,
          data.tasks,
          userId,
          transaction,
        );
      }

      await transaction.commit();

      // Fetch created ticket for notification
      const createdTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
          { model: Asset, as: "asset", attributes: ["id", "asset_code"], required: false },
          {
            model: Technician,
            as: "technician",
            attributes: ["id"],
            include: [
              { model: User, as: "user", attributes: ["id", "name", "email"] },
            ],
            required: false,
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "category_name"],
            required: false,
          },
        ],
      });

      // Audit Log
      try {
        await auditService.log({
          entityType: "ticket",
          entityId: ticket.id,
          entityName: ticket.ticket_code,
          action: "CREATE",
          user: userId ? { id: userId } : null,
          source: "ui",
        });
      } catch (error) {
        console.error("Audit log failed for createTicket:", error.message);
      }

      // Send notification
      try {
        await notificationService.notify_ticket_created(createdTicket, userId);
      } catch (notifError) {
        console.error(
          "Failed to send ticket creation notification:",
          notifError,
        );
      }

      // Recalculate compliance score for the asset (fire-and-forget, non-blocking)
      if (data.assetId) {
          getComplianceScoreService().updateComplianceScore(data.assetId)
              .then(score => {
                  console.log(`📊 Updated compliance score for asset ${data.assetId} after ticket creation: ${score}%`);
              })
              .catch(scoreError => {
                  console.error('⚠️ Error recalculating compliance score after ticket creation:', scoreError.message);
              });
      }

      return this._transformTicket(createdTicket);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update ticket
   */
  async updateTicket(id, data, userId) {
    const transaction = await sequelize.transaction();

    try {
      const ticket = await Ticket.findByPk(id);

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      // Capture old values for audit BEFORE making changes
      const oldValues = ticket.toJSON();

      // Update fields
      if (data.plantId) ticket.plant_id = data.plantId;
      if (data.categoryId) ticket.category_id = data.categoryId;
      if (data.assetId !== undefined) ticket.asset_id = data.assetId || null;
      if (data.inventoryAssetId !== undefined) ticket.inventory_asset_id = data.inventoryAssetId || null;
      if (data.technicianId !== undefined)
        ticket.technician_id = data.technicianId;
      if (data.taskName) ticket.task_name = data.taskName;
      if (data.taskDescription !== undefined)
        ticket.task_description = data.taskDescription;
      if (data.targetDate) ticket.target_date = data.targetDate;
      if (data.ticketCategory) ticket.ticket_category = data.ticketCategory;
      if (data.completedStatus) ticket.completed_status = data.completedStatus;
      if (data.buildingId !== undefined) ticket.building_id = data.buildingId || null;
      if (data.floorId !== undefined) ticket.floor_id = data.floorId || null;
      if (data.location !== undefined) ticket.location = data.location || null;
      
      if (data.ticketCategory === 'Breakdown Maintenance' || ticket.ticket_category === 'Breakdown Maintenance') {
        ticket.ticket_type = 'BM_MAINTENANCE';
        if (data.maintenance_type) ticket.maintenance_type = data.maintenance_type;
        if (data.priority) ticket.priority = data.priority;
        if (!ticket.bm_state) ticket.bm_state = 'CREATED';
      }

      if (data.bm_metadata) {
        ticket.bm_metadata = data.bm_metadata;
      }
      
      if (data.refill_metadata) {
        ticket.refill_metadata = data.refill_metadata;
      }

      // If tasks are provided, upsert them within the transaction
      if (data.tasks && Array.isArray(data.tasks)) {
        const ticketTaskService = require("./ticketTaskService");
        await ticketTaskService.upsert_tasks(
          ticket.id,
          data.tasks,
          userId,
          transaction,
        );
      }

      await ticket.save({ transaction });

      if ((ticket.ticket_category === 'Refill / HP Test' && data.refill_metadata && Object.keys(data.refill_metadata).length > 0) ||
          ((ticket.ticket_category === 'Breakdown Maintenance' || ticket.ticket_type === 'BM_MAINTENANCE') && data.bm_metadata && Object.keys(data.bm_metadata).length > 0)) {
          const ticketTaskService = require("./ticketTaskService");
          await ticketTaskService._maybe_close_ticket(ticket.id, transaction);
      }

      await transaction.commit();

      // Audit Log
      try {
        const changes = auditService.calculateChanges(
          oldValues,
          ticket.toJSON(),
        );
        if (changes) {
          await auditService.log({
            entityType: "ticket",
            entityId: id,
            entityName: ticket.ticket_code,
            action: "UPDATE",
            changes,
            user: userId ? { id: userId } : null,
            source: "ui",
          });
        }
      } catch (error) {
        console.error("Audit log failed for updateTicket:", error.message);
      }

      // Fetch updated ticket for response
      const updatedTicket = await Ticket.findByPk(id, {
        include: [
          { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
          { model: Asset, as: "asset", attributes: ["id", "asset_code"], required: false },
          {
            model: Technician,
            as: "technician",
            attributes: ["id"],
            include: [
              { model: User, as: "user", attributes: ["id", "name", "email"] },
            ],
            required: false,
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "category_name"],
            required: false,
          },
        ],
      });

      // Send notifications
      try {
          // 1. If technician changed
          if (data.technicianId && data.technicianId !== ticket.technician_id) {
              const newTech = await Technician.findByPk(data.technicianId, {
                  include: [{ model: User, as: 'user', attributes: ['id'] }]
              });

              if (newTech?.user?.id) {
                  await notificationService.notify_ticket_assigned(updatedTicket, newTech.user.id, userId);
              }
          }

          // 2. If status changed
          if (data.completedStatus && data.completedStatus !== ticket.completed_status) {
              const creatorId = ticket.created_by;
              // Dont notify if user is updating their own ticket, unless they want confirmation (but usually "info" to creator is if someone else updated it)
              // Let's stick to safe logic: notify creator if they didn't do the update.
              if (creatorId && creatorId !== userId) {
                  await notificationService.createNotification({
                      type: 'TICKET_UPDATED',
                      category: 'INFO',
                      priority: 'MEDIUM',
                      title: `Ticket Updated: ${updatedTicket.ticket_code}`,
                      message: `Ticket status changed to ${data.completedStatus}`,
                      user_id: creatorId,
                      related_entity_type: 'Ticket',
                      related_entity_id: updatedTicket.id,
                      action_url: `/admin/tickets?id=${updatedTicket.id}`,
                      is_actionable: true,
                      triggered_by: userId,
                      notification_source: 'SYSTEM'
                  });
              }
          }
      } catch (notifError) {
          console.error('Failed to send ticket update notification:', notifError);
      }

      // Recalculate compliance score for the asset if status changed (fire-and-forget, non-blocking)
      if (data.completedStatus && ticket.asset_id) {
          getComplianceScoreService().updateComplianceScore(ticket.asset_id)
              .then(score => {
                  console.log(`📊 Updated compliance score for asset ${ticket.asset_id} after ticket update: ${score}%`);
              })
              .catch(scoreError => {
                  console.error('⚠️ Error recalculating compliance score after ticket update:', scoreError.message);
              });
      }

      return this._transformTicket(updatedTicket);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete ticket
   */
  async deleteTicket(id, userId = null) {
    const ticket = await Ticket.findByPk(id);

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const ticketCode = ticket.ticket_code;
    await ticket.destroy();

    try {
      await auditService.log({
        entityType: "ticket",
        entityId: id,
        entityName: ticketCode,
        action: "DELETE",
        user: userId ? { id: userId } : null,
        source: "ui",
      });
    } catch (error) {
      console.error("Audit log failed for deleteTicket:", error.message);
    }

    return { message: "Ticket deleted successfully" };
  }

  /**
   * Approve a ticket
   */
  async approveTicket(id, comment, userId) {
    const transaction = await sequelize.transaction();

    try {
      const ticket = await Ticket.findByPk(id);

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      if (ticket.completed_status !== "Waiting for approval") {
        throw new Error("Ticket is not waiting for approval");
      }

      // Check for pending spares
      const { TicketInventoryUsage } = require('../../models'); // Dynamic import if needed or check existing
      const pendingSpares = await TicketInventoryUsage.count({
        where: { ticket_id: id, status: 'pending' }
      });
      if (pendingSpares > 0) {
        throw new Error("Cannot approve ticket while spare part requests are pending approval.");
      }

      const oldStatus = ticket.completed_status;
      await ticket.update({ completed_status: "Completed" }, { transaction });

      try {
        await auditService.log({
          entityType: "ticket",
          entityId: id,
          entityName: ticket.ticket_code,
          action: "STATUS_CHANGE",
          changes: { completed_status: { old: oldStatus, new: "Completed" } },
          user: userId ? { id: userId } : null,
          source: "ui",
          metadata: { approval: true, comment },
        });
      } catch (error) {
        console.error("Audit log failed for approveTicket:", error.message);
      }

      if (comment) {
        const answeringTech = await Technician.findOne({
          where: { user_id: userId },
        });
        const technicianIdToUse = answeringTech
          ? answeringTech.id
          : ticket.technician_id;

        if (technicianIdToUse) {
          await TicketResponse.create(
            {
              ticket_id: id,
              assigned_technician_id: technicianIdToUse,
              comment: `Approved: ${comment}`,
              response_type: "comment",
              is_fixed: false,
            },
            { transaction },
          );
        }
      }

      await transaction.commit();

      const creatorId = ticket.created_by;
      if (creatorId && creatorId !== userId) {
        await notificationService.createNotification({
          type: "TICKET_UPDATED",
          category: "INFO",
          priority: "MEDIUM",
          title: `Ticket Approved: ${ticket.ticket_code}`,
          message: `Your ticket has been approved.`,
          user_id: creatorId,
          related_entity_type: "Ticket",
          related_entity_id: ticket.id,
          action_url: `/admin/tickets?id=${ticket.id}`,
          is_actionable: true,
          triggered_by: userId,
          notification_source: "SYSTEM",
        });
      }

      return ticket;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reject a ticket
   */
  async rejectTicket(id, comment, userId) {
    const transaction = await sequelize.transaction();

    try {
      const ticket = await Ticket.findByPk(id);

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      if (ticket.completed_status !== "Waiting for approval") {
        throw new Error("Ticket is not waiting for approval");
      }

      const oldStatus = ticket.completed_status;
      await ticket.update({ completed_status: "Rejected" }, { transaction });

      try {
        await auditService.log({
          entityType: "ticket",
          entityId: id,
          entityName: ticket.ticket_code,
          action: "STATUS_CHANGE",
          changes: { completed_status: { old: oldStatus, new: "Rejected" } },
          user: userId ? { id: userId } : null,
          source: "ui",
          metadata: { rejection: true, comment },
        });
      } catch (error) {
        console.error("Audit log failed for rejectTicket:", error.message);
      }

      if (comment) {
        const answeringTech = await Technician.findOne({
          where: { user_id: userId },
        });
        const technicianIdToUse = answeringTech
          ? answeringTech.id
          : ticket.technician_id;

        if (technicianIdToUse) {
          await TicketResponse.create(
            {
              ticket_id: id,
              assigned_technician_id: technicianIdToUse,
              comment: `Rejected: ${comment}`,
              response_type: "rejection",
              is_fixed: false,
            },
            { transaction },
          );
        } else {
          throw new Error(
            "Cannot create rejection response: No technician assigned to ticket and manager is not a technician.",
          );
        }
      }

      await transaction.commit();

      const creatorId = ticket.created_by;
      if (creatorId && creatorId !== userId) {
        await notificationService.createNotification({
          type: "TICKET_UPDATED",
          category: "ALERT",
          priority: "HIGH",
          title: `Ticket Rejected: ${ticket.ticket_code}`,
          message: `Your ticket has been rejected: ${comment}`,
          user_id: creatorId,
          related_entity_type: "Ticket",
          related_entity_id: ticket.id,
          action_url: `/admin/tickets?id=${ticket.id}`,
          is_actionable: true,
          triggered_by: userId,
          notification_source: "SYSTEM",
        });
      }

      return ticket;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Transform ticket for response
   */
  _transformTicket(t) {
    const ticket = t.toJSON ? t.toJSON() : t;

    const transformed = {
      id: ticket.id,
      ticketId: ticket.ticket_code,
      plantId: ticket.plant_id,
      assetId: ticket.asset_id,
      inventoryAssetId: ticket.inventory_asset_id,
      categoryId: ticket.category_id,
      technicianId: ticket.technician_id,
      taskName: ticket.task_name,
      taskDescription: ticket.task_description,
      targetDate: ticket.target_date,
      ticketCategory: ticket.ticket_category,
      completedStatus: ticket.completed_status,
      ticket_type: ticket.ticket_type,
      maintenance_type: ticket.maintenance_type,
      priority: ticket.priority,
      bm_state: ticket.bm_state,
      bm_metadata: ticket.bm_metadata,
      refill_metadata: ticket.refill_metadata,
      buildingId: ticket.building_id,
      floorId: ticket.floor_id,
      wingId: ticket.wing_id,
      location: ticket.location,
      totalSpareCost: ticket.total_spare_cost,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      plant: ticket.plant
        ? { id: ticket.plant.id, plantName: ticket.plant.plant_name }
        : null,
      asset: ticket.asset
        ? {
          id: ticket.asset.id,
          assetId: ticket.asset.asset_code,
          building: ticket.asset.building
            ? {
              id: ticket.asset.building.id,
              buildingName: ticket.asset.building.building_name,
            }
            : null,
        }
        : null,
      inventoryAsset: ticket.inventoryAsset
        ? {
          id: ticket.inventoryAsset.id,
          assetCode: ticket.inventoryAsset.asset_code,
          manufacturer: ticket.inventoryAsset.manufacturer,
          model: ticket.inventoryAsset.model,
          status: ticket.inventoryAsset.status,
        }
        : null,
      building: ticket.building
        ? { id: ticket.building.id, buildingName: ticket.building.building_name }
        : null,
      technician: ticket.technician
        ? {
          id: ticket.technician.id,
          name: ticket.technician.user?.name || "Unknown",
          email: ticket.technician.user?.email || "",
        }
        : null,
      category: ticket.category
        ? {
          id: ticket.category.id,
          categoryName: ticket.category.category_name,
        }
        : null,
      responses: ticket.responses || [],
      tasks: ticket.tasks || [],
    };

    return transformed;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BM MAINTENANCE METHODS (Modular Extension)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a BM (Breakdown/Compliance Maintenance) ticket
   * @param {Object} data - Ticket data
   * @param {Object} user - User creating the ticket
   */
  async createBMTicket(data, user) {
    console.log('🔧 Creating BM Ticket:', {
      asset_id: data.asset_id,
      maintenance_type: data.maintenance_type,
      priority: data.priority
    });

    // Validate asset exists
    if (!data.asset_id) {
      throw new Error('BM ticket requires an asset/system to be selected');
    }

    const asset = await Asset.findByPk(data.asset_id, {
      include: ['plant', 'category', 'product']
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Generate ticket code
    const ticketCode = await this.generateTicketCode();

    // Create ticket with BM-specific fields
    const ticket = await Ticket.create({
      ticket_code: ticketCode,
      ticket_type: 'BM_MAINTENANCE',
      maintenance_type: data.maintenance_type || 'BREAKDOWN',
      priority: data.priority || 'MEDIUM',
      bm_state: 'CREATED',
      bm_metadata: {
        issue_type: data.issue_type || null,
        severity: data.severity || data.priority,
        problem_description: data.problem_description || data.task_description,
        ...data.bm_metadata
      },
      // Standard ticket fields
      created_by: user.id,
      plant_id: asset.plant_id,
      asset_id: data.asset_id,
      category_id: asset.category_id,
      technician_id: data.technician_id || null,
      task_name: data.task_name || `${data.maintenance_type} - ${asset.name}`,
      task_description: data.task_description || data.problem_description,
      target_date: data.target_date || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 24h
      ticket_category: 'Breakdown Maintenance',
      completed_status: 'Pending',
      building_id: data.building_id || asset.building_id,
      floor_id: data.floor_id || asset.floor_id,
      wing_id: data.wing_id || asset.wing_id,
      location: data.location || asset.location
    });

    console.log(`✅ BM Ticket created: ${ticket.ticket_code}`);

    // Auto-transition to NOTIFIED state
    await bmWorkflowService.transitionState(
      ticket.id, 
      'NOTIFIED', 
      {},
      user
    );

    // Log in audit
    await auditService.log({
      entity_type: 'TICKET',
      entity_id: ticket.id,
      action: 'CREATE_BM_TICKET',
      performed_by: user.id,
      changes: {
        ticket_type: 'BM_MAINTENANCE',
        maintenance_type: ticket.maintenance_type,
        priority: ticket.priority,
        asset_id: ticket.asset_id
      }
    });

    return ticket.reload({
      include: [
        { model: Asset, as: 'asset', include: ['plant', 'category', 'product'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] }
      ]
    });
  }

  /**
   * Generate unique ticket code
   */
  async generateTicketCode() {
    const prefix = 'BM';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Find last ticket code for this month
    const lastTicket = await Ticket.findOne({
      where: {
        ticket_code: {
          [Op.like]: `${prefix}-${year}${month}%`
        }
      },
      order: [['created_at', 'DESC']]
    });

    let sequence = 1;
    if (lastTicket && lastTicket.ticket_code) {
      const lastSequence = parseInt(lastTicket.ticket_code.split('-')[1].slice(4));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}-${year}${month}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Assign BM ticket to technician
   */
  async assignBMTicket(ticketId, technicianId, user) {
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket || ticket.ticket_type !== 'BM_MAINTENANCE') {
      throw new Error('BM ticket not found');
    }

    await ticket.update({
      technician_id: technicianId
    });

    // Transition to ASSIGNED if currently NOTIFIED
    if (ticket.bm_state === 'NOTIFIED') {
      await bmWorkflowService.transitionState(
        ticketId,
        'ASSIGNED',
        {},
        user
      );
    }

    console.log(`👤 BM Ticket ${ticket.ticket_code} assigned to technician ${technicianId}`);
    
    return ticket.reload();
  }

  /**
   * Update BM ticket metadata (used for form submissions at various stages)
   */
  async updateBMMetadata(ticketId, metadata, user) {
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket || ticket.ticket_type !== 'BM_MAINTENANCE') {
      throw new Error('BM ticket not found');
    }

    const updatedMetadata = {
      ...ticket.bm_metadata,
      ...metadata
    };

    await ticket.update({
      bm_metadata: updatedMetadata
    });

    await auditService.log({
      entity_type: 'TICKET',
      entity_id: ticketId,
      action: 'UPDATE_BM_METADATA',
      performed_by: user.id,
      changes: { fields_updated: Object.keys(metadata) }
    });

    return ticket;
  }

  /**
   * Get BM ticket full details
   */
  async getBMTicketById(ticketId) {
    return bmWorkflowService.getBMTicketDetail(ticketId);
  }

  /**
   * List BM tickets with filters
   */
  async listBMTickets(filters = {}) {
    const where = { ticket_type: 'BM_MAINTENANCE' };

    if (filters.plant_id) where.plant_id = filters.plant_id;
    if (filters.priority) where.priority = filters.priority;
    if (filters.maintenance_type) where.maintenance_type = filters.maintenance_type;
    if (filters.bm_state) where.bm_state = filters.bm_state;
    if (filters.technician_id) where.technician_id = filters.technician_id;
    if (filters.sla_breached !== undefined) where.sla_breached = filters.sla_breached;

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: Asset, as: 'asset', include: ['plant', 'category'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: Technician, as: 'technician', include: ['user'] }
      ],
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });

    // Add SLA status to each ticket
    const ticketsWithSLA = tickets.map(ticket => {
      const slaStatus = bmWorkflowService.calculateSLAStatus(ticket);
      return {
        ...ticket.toJSON(),
        slaStatus
      };
    });

    return ticketsWithSLA;
  }
}

module.exports = new TicketService();
