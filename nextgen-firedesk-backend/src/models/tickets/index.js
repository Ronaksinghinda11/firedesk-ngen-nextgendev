const Ticket = require("./Ticket");
const TicketResponse = require("./TicketResponse");
const TicketTask = require("./TicketTask");
const TicketTaskChecklistQuestion = require("./TicketTaskChecklistQuestion");
const TicketTaskChecklistAnswer = require("./TicketTaskChecklistAnswer");
const TicketTaskApproval = require("./TicketTaskApproval");
const TicketInventoryUsage = require("./TicketInventoryUsage");
// BM Maintenance models
const AssetSpareConsumption = require("./AssetSpareConsumption");
const BMIssueType = require("./BMIssueType");
const BMStateTransition = require("./BMStateTransition");

const setupTicketAssociations = (models) => {
  const { User, Asset, Plant, Category, Technician, Building, Floor, Wing, InventoryAsset, InventorySpare } = models;

  // ── Ticket ↔ core models ───────────────────────────────────────────────────
  if (Asset) {
    Ticket.belongsTo(Asset, { foreignKey: "asset_id", as: "asset" });
    Asset.hasMany(Ticket, { foreignKey: "asset_id", as: "tickets" });
  }
  if (Plant) {
    Ticket.belongsTo(Plant, { foreignKey: "plant_id", as: "plant" });
    Plant.hasMany(Ticket, { foreignKey: "plant_id", as: "tickets" });
  }
  if (Category) {
    Ticket.belongsTo(Category, { foreignKey: "category_id", as: "category" });
  }
  if (User) {
    Ticket.belongsTo(User, { foreignKey: "created_by", as: "createdBy" });
    User.hasMany(Ticket, { foreignKey: "created_by", as: "createdTickets" });
  }
  if (Technician) {
    Ticket.belongsTo(Technician, {
      foreignKey: "technician_id",
      as: "technician",
    });
    Technician.hasMany(Ticket, {
      foreignKey: "technician_id",
      as: "assignedTickets",
    });
  }

  // ── Ticket ↔ InventoryAsset ────────────────────────────────────────────────
  if (InventoryAsset) {
    Ticket.belongsTo(InventoryAsset, { foreignKey: "inventory_asset_id", as: "inventoryAsset" });
    InventoryAsset.hasMany(Ticket, { foreignKey: "inventory_asset_id", as: "tickets" });
  }

  // ── Ticket ↔ Location (for installation tickets) ──────────────────────────
  if (Building) {
    Ticket.belongsTo(Building, { foreignKey: "building_id", as: "building" });
  }
  if (Floor) {
    Ticket.belongsTo(Floor, { foreignKey: "floor_id", as: "floor" });
  }
  if (Wing) {
    Ticket.belongsTo(Wing, { foreignKey: "wing_id", as: "wing" });
  }

  // ── Ticket ↔ TicketResponse ────────────────────────────────────────────────
  Ticket.hasMany(TicketResponse, { foreignKey: "ticket_id", as: "responses" });
  TicketResponse.belongsTo(Ticket, { foreignKey: "ticket_id", as: "ticket" });
  if (Technician) {
    TicketResponse.belongsTo(Technician, {
      foreignKey: "assigned_technician_id",
      as: "respondingTechnician",
    });
  }

  // ── Ticket ↔ TicketTask ────────────────────────────────────────────────────
  Ticket.hasMany(TicketTask, { foreignKey: "ticket_id", as: "tasks" });
  TicketTask.belongsTo(Ticket, { foreignKey: "ticket_id", as: "ticket" });

  if (Technician) {
    TicketTask.belongsTo(Technician, {
      foreignKey: "assigned_technician_id",
      as: "assignedTechnician",
    });
    Technician.hasMany(TicketTask, {
      foreignKey: "assigned_technician_id",
      as: "assignedTasks",
    });
  }
  if (User) {
    TicketTask.belongsTo(User, { foreignKey: "created_by", as: "createdBy" });
  }

  // ── TicketTask ↔ Checklist ─────────────────────────────────────────────────
  TicketTask.hasMany(TicketTaskChecklistQuestion, {
    foreignKey: "task_id",
    as: "checklistQuestions",
  });
  TicketTaskChecklistQuestion.belongsTo(TicketTask, {
    foreignKey: "task_id",
    as: "task",
  });

  TicketTaskChecklistQuestion.hasMany(TicketTaskChecklistAnswer, {
    foreignKey: "question_id",
    as: "answers",
  });
  TicketTaskChecklistAnswer.belongsTo(TicketTaskChecklistQuestion, {
    foreignKey: "question_id",
    as: "question",
  });

  TicketTask.hasMany(TicketTaskChecklistAnswer, {
    foreignKey: "task_id",
    as: "checklistAnswers",
  });
  TicketTaskChecklistAnswer.belongsTo(TicketTask, {
    foreignKey: "task_id",
    as: "task",
  });

  if (User) {
    TicketTaskChecklistAnswer.belongsTo(User, {
      foreignKey: "answered_by",
      as: "answeredBy",
    });
  }

  // ── TicketTask ↔ Approvals ─────────────────────────────────────────────────
  TicketTask.hasMany(TicketTaskApproval, {
    foreignKey: "task_id",
    as: "approvals",
  });
  TicketTaskApproval.belongsTo(TicketTask, {
    foreignKey: "task_id",
    as: "task",
  });
  Ticket.hasMany(TicketTaskApproval, {
    foreignKey: "ticket_id",
    as: "taskApprovals",
  });
  if (User) {
    TicketTaskApproval.belongsTo(User, {
      foreignKey: "requested_by",
      as: "requestedBy",
    });
    TicketTaskApproval.belongsTo(User, {
      foreignKey: "approved_by",
      as: "approvedBy",
    });
  }

  // ── Ticket ↔ InventoryUsage ────────────────────────────────────────────────
  Ticket.hasMany(TicketInventoryUsage, {
    foreignKey: "ticket_id",
    as: "inventoryUsage",
  });
  TicketInventoryUsage.belongsTo(Ticket, {
    foreignKey: "ticket_id",
    as: "ticket",
  });
  TicketTask.hasMany(TicketInventoryUsage, {
    foreignKey: "task_id",
    as: "inventoryUsage",
  });
  TicketInventoryUsage.belongsTo(TicketTask, {
    foreignKey: "task_id",
    as: "task",
  });
  if (User) {
    TicketInventoryUsage.belongsTo(User, {
      foreignKey: "consumed_by",
      as: "consumedBy",
    });
  }

  // ── BM Maintenance Associations ────────────────────────────────────────────
  
  // AssetSpareConsumption associations
  if (Asset) {
    AssetSpareConsumption.belongsTo(Asset, {
      foreignKey: "asset_id",
      as: "asset",
    });
    Asset.hasMany(AssetSpareConsumption, {
      foreignKey: "asset_id",
      as: "spareConsumptions",
    });
  }
  
  AssetSpareConsumption.belongsTo(Ticket, {
    foreignKey: "ticket_id",
    as: "ticket",
  });
  Ticket.hasMany(AssetSpareConsumption, {
    foreignKey: "ticket_id",
    as: "spareConsumptions",
  });
  
  if (InventorySpare) {
    AssetSpareConsumption.belongsTo(InventorySpare, {
      foreignKey: "spare_id",
      as: "spare",
    });
    InventorySpare.hasMany(AssetSpareConsumption, {
      foreignKey: "spare_id",
      as: "consumptions",
    });
  }
  
  if (User) {
    AssetSpareConsumption.belongsTo(User, {
      foreignKey: "used_by",
      as: "usedBy",
    });
  }
  
  // BMStateTransition associations
  BMStateTransition.belongsTo(Ticket, {
    foreignKey: "ticket_id",
    as: "ticket",
  });
  Ticket.hasMany(BMStateTransition, {
    foreignKey: "ticket_id",
    as: "stateTransitions",
  });
  
  if (User) {
    BMStateTransition.belongsTo(User, {
      foreignKey: "transitioned_by",
      as: "transitionedBy",
    });
  }
};

module.exports = {
  Ticket,
  TicketResponse,
  TicketTask,
  TicketTaskChecklistQuestion,
  TicketTaskChecklistAnswer,
  TicketTaskApproval,
  TicketInventoryUsage,
  AssetSpareConsumption,
  BMIssueType,
  BMStateTransition,
  setupTicketAssociations,
};
