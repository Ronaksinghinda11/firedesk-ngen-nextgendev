/**
 * BM Workflow Service
 * Handles Breakdown/Compliance Maintenance state machine and business logic
 * 
 * This is a modular extension to the ticket system - does NOT modify core ticket flows
 */

const { Ticket, AssetSpareConsumption, BMIssueType, BMStateTransition } = require('../../models/tickets');
const { InventorySpare, Asset, User } = require('../../models');
const auditService = require('../audit/audit_service');
const notificationService = require('../notifications/notificationService');

// ══════════════════════════════════════════════════════════════════════════════
// BM STATE MACHINE DEFINITION
// ══════════════════════════════════════════════════════════════════════════════

const BM_STATES = {
  CREATED: 'CREATED',
  NOTIFIED: 'NOTIFIED',
  ASSIGNED: 'ASSIGNED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',          // SLA STARTS HERE
  DIAGNOSIS: 'DIAGNOSIS',
  ACTION_IN_PROGRESS: 'ACTION_IN_PROGRESS',
  TESTING: 'TESTING',
  CLOSURE_SUBMITTED: 'CLOSURE_SUBMITTED',
  SUPERVISOR_REVIEW: 'SUPERVISOR_REVIEW',
  REWORK: 'REWORK',                     // Goes back to ACTION_IN_PROGRESS
  CLOSED: 'CLOSED'
};

// Valid state transitions (FSM)
const BM_STATE_TRANSITIONS = {
  [BM_STATES.CREATED]: [BM_STATES.NOTIFIED],
  [BM_STATES.NOTIFIED]: [BM_STATES.ASSIGNED],
  [BM_STATES.ASSIGNED]: [BM_STATES.ACKNOWLEDGED],
  [BM_STATES.ACKNOWLEDGED]: [BM_STATES.DIAGNOSIS],
  [BM_STATES.DIAGNOSIS]: [BM_STATES.ACTION_IN_PROGRESS],
  [BM_STATES.ACTION_IN_PROGRESS]: [BM_STATES.TESTING],
  [BM_STATES.TESTING]: [BM_STATES.CLOSURE_SUBMITTED],
  [BM_STATES.CLOSURE_SUBMITTED]: [BM_STATES.SUPERVISOR_REVIEW],
  [BM_STATES.SUPERVISOR_REVIEW]: [BM_STATES.CLOSED, BM_STATES.REWORK],
  [BM_STATES.REWORK]: [BM_STATES.ACTION_IN_PROGRESS]
};

// Required fields per state
const BM_STATE_REQUIRED_FIELDS = {
  [BM_STATES.DIAGNOSIS]: ['issue_type', 'root_cause'],
  [BM_STATES.ACTION_IN_PROGRESS]: ['action_type', 'work_description', 'start_time'],
  [BM_STATES.TESTING]: ['test_status', 'system_restored'],
  [BM_STATES.CLOSURE_SUBMITTED]: ['downtime_minutes', 'end_time'],
  [BM_STATES.SUPERVISOR_REVIEW]: ['final_remarks']
};

// SLA hours by priority
const SLA_HOURS = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72
};

// ══════════════════════════════════════════════════════════════════════════════
// BM WORKFLOW SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class BMWorkflowService {
  
  /**
   * Validate if transition is allowed
   */
  validateTransition(currentState, nextState) {
    const allowedTransitions = BM_STATE_TRANSITIONS[currentState] || [];
    if (!allowedTransitions.includes(nextState)) {
      throw new Error(
        `Invalid BM state transition: ${currentState} → ${nextState}. ` +
        `Allowed: ${allowedTransitions.join(', ')}`
      );
    }
    return true;
  }

  /**
   * Validate required fields for target state
   */
  validateRequiredFields(targetState, metadata) {
    const requiredFields = BM_STATE_REQUIRED_FIELDS[targetState] || [];
    const missingFields = [];

    for (const field of requiredFields) {
      if (!metadata[field] || metadata[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields for state ${targetState}: ${missingFields.join(', ')}`
      );
    }
    return true;
  }

  /**
   * Calculate SLA deadline based on priority
   */
  calculateSLADeadline(priority, acknowledgedAt = new Date()) {
    const hours = SLA_HOURS[priority] || SLA_HOURS.MEDIUM;
    const deadline = new Date(acknowledgedAt);
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }

  /**
   * Calculate SLA status
   */
  calculateSLAStatus(ticket) {
    if (!ticket.sla_deadline) {
      return { status: 'NOT_STARTED', remaining: null, percentage: null };
    }
    
    const now = new Date();
    const deadline = new Date(ticket.sla_deadline);
    const acknowledged = new Date(ticket.acknowledged_at);
    const totalDuration = deadline - acknowledged;
    const remaining = deadline - now;
    
    if (remaining < 0) {
      return { 
        status: 'BREACHED', 
        overdue: Math.abs(remaining),
        overdueHours: Math.abs(remaining) / (1000 * 60 * 60)
      };
    }
    
    const percentage = (remaining / totalDuration) * 100;
    
    if (percentage < 25) {
      return { status: 'CRITICAL', remaining, percentage, remainingHours: remaining / (1000 * 60 * 60) };
    }
    if (percentage < 50) {
      return { status: 'WARNING', remaining, percentage, remainingHours: remaining / (1000 * 60 * 60) };
    }
    return { status: 'ON_TRACK', remaining, percentage, remainingHours: remaining / (1000 * 60 * 60) };
  }

  /**
   * Transition BM ticket to new state
   */
  async transitionState(ticketId, nextState, updateData = {}, user) {
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.ticket_type !== 'BM_MAINTENANCE') {
      throw new Error('Not a BM maintenance ticket');
    }

    const currentState = ticket.bm_state;

    // Validate transition
    this.validateTransition(currentState, nextState);

    // Merge metadata
    const newMetadata = {
      ...ticket.bm_metadata,
      ...(updateData.bm_metadata || {})
    };

    // Validate required fields for target state
    this.validateRequiredFields(nextState, newMetadata);

    const updates = {
      bm_state: nextState,
      bm_metadata: newMetadata
    };

    // Special handling for ACKNOWLEDGED state (start SLA)
    if (nextState === BM_STATES.ACKNOWLEDGED && !ticket.acknowledged_at) {
      updates.acknowledged_at = new Date();
      updates.sla_deadline = this.calculateSLADeadline(ticket.priority, updates.acknowledged_at);
      console.log(`⏱️  SLA started for ticket ${ticket.ticket_code}: ${ticket.priority} priority, deadline: ${updates.sla_deadline}`);
    }

    // Special handling for ACTION_IN_PROGRESS from REWORK
    if (currentState === BM_STATES.REWORK && nextState === BM_STATES.ACTION_IN_PROGRESS) {
      console.log(`🔄 Rework cycle: ${ticket.ticket_code} returning to action`);
    }

    // Special handling for CLOSED state
    if (nextState === BM_STATES.CLOSED) {
      updates.completed_status = 'Completed';
      console.log(`✅ BM ticket ${ticket.ticket_code} closed successfully`);
    }

    // Update ticket
    await ticket.update(updates);

    // Log state transition
    await BMStateTransition.create({
      ticket_id: ticketId,
      from_state: currentState,
      to_state: nextState,
      transitioned_by: user.id,
      transition_data: updateData.bm_metadata || {}
    });

    // Audit log
    await auditService.log({
      entity_type: 'TICKET',
      entity_id: ticketId,
      action: `BM_STATE_CHANGE_${nextState}`,
      performed_by: user.id,
      changes: { 
        from: currentState, 
        to: nextState,
        metadata_updated: Object.keys(updateData.bm_metadata || {})
      }
    });

    // Send notifications
    await this.sendStateChangeNotification(ticket, currentState, nextState, user);

    return ticket.reload({
      include: [
        { model: Asset, as: 'asset', include: ['plant', 'category', 'product'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
        { model: AssetSpareConsumption, as: 'spareConsumptions', include: ['spare'] }
      ]
    });
  }

  /**
   * Send notifications on state change
   */
  async sendStateChangeNotification(ticket, fromState, toState, changedBy) {
    const notificationMap = {
      [BM_STATES.NOTIFIED]: {
        recipients: ['managers'],
        message: `New BM ticket created: ${ticket.task_name}`
      },
      [BM_STATES.ASSIGNED]: {
        recipients: ['technician'],
        message: `BM ticket assigned to you: ${ticket.task_name}`
      },
      [BM_STATES.ACKNOWLEDGED]: {
        recipients: ['managers'],
        message: `BM ticket acknowledged. SLA started: ${ticket.task_name}`
      },
      [BM_STATES.SUPERVISOR_REVIEW]: {
        recipients: ['supervisor', 'managers'],
        message: `BM ticket ready for review: ${ticket.task_name}`
      },
      [BM_STATES.REWORK]: {
        recipients: ['technician'],
        message: `BM ticket requires rework: ${ticket.task_name}`
      },
      [BM_STATES.CLOSED]: {
        recipients: ['all'],
        message: `BM ticket completed: ${ticket.task_name}`
      }
    };

    const config = notificationMap[toState];
    if (config) {
      try {
        // Use existing notification service
        // This is a placeholder - adapt to your actual notification service API
        console.log(`📬 Notification: ${config.message} (to: ${config.recipients.join(', ')})`);
      } catch (error) {
        console.error('Notification failed:', error.message);
      }
    }
  }

  /**
   * Check and mark SLA breach
   */
  async checkSLABreach(ticketId) {
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket || ticket.ticket_type !== 'BM_MAINTENANCE') {
      return null;
    }

    if (!ticket.sla_deadline || ticket.sla_breached || ticket.bm_state === BM_STATES.CLOSED) {
      return null;
    }

    const now = new Date();
    const deadline = new Date(ticket.sla_deadline);

    if (now > deadline) {
      await ticket.update({ sla_breached: true });

      await auditService.log({
        entity_type: 'TICKET',
        entity_id: ticketId,
        action: 'BM_SLA_BREACHED',
        performed_by: null,
        changes: { 
          deadline: ticket.sla_deadline,
          breach_time: now,
          delay_hours: (now - deadline) / (1000 * 60 * 60)
        }
      });

      // Send breach alert
      console.log(`⚠️  SLA BREACH: Ticket ${ticket.ticket_code} exceeded deadline by ${((now - deadline) / (1000 * 60 * 60)).toFixed(1)} hours`);
      
      // TODO: Send SLA breach notification via notification service
      
      return { breached: true, delay_hours: (now - deadline) / (1000 * 60 * 60) };
    }

    return { breached: false };
  }

  /**
   * Attach spare parts to BM ticket
   */
  async attachSpares(ticketId, spares, user) {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [{ model: Asset, as: 'asset' }]
    });
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.ticket_type !== 'BM_MAINTENANCE') {
      throw new Error('Not a BM maintenance ticket');
    }

    if (!ticket.asset_id) {
      throw new Error('BM ticket must be linked to an asset to consume spares');
    }

    const consumptions = [];
    let totalCost = 0;

    for (const spare of spares) {
      // Validate spare exists and has sufficient quantity
      const spareRecord = await InventorySpare.findByPk(spare.spare_id);
      if (!spareRecord) {
        throw new Error(`Spare part ${spare.spare_id} not found`);
      }

      if (spareRecord.current_stock < spare.quantity) {
        throw new Error(
          `Insufficient stock for ${spareRecord.part_name}. ` +
          `Available: ${spareRecord.current_stock}, Requested: ${spare.quantity}`
        );
      }

      // Create consumption record
      const consumption = await AssetSpareConsumption.create({
        asset_id: ticket.asset_id,
        ticket_id: ticketId,
        spare_id: spare.spare_id,
        quantity_used: spare.quantity,
        unit_cost: spare.unit_cost || spareRecord.unit_cost,
        total_cost: spare.quantity * (spare.unit_cost || spareRecord.unit_cost),
        used_by: user.id,
        remarks: spare.remarks || null
      });

      // Deduct from inventory
      await spareRecord.update({
        current_stock: spareRecord.current_stock - spare.quantity
      });

      consumptions.push(consumption);
      totalCost += consumption.total_cost;

      console.log(`📦 Consumed ${spare.quantity} units of ${spareRecord.part_name} for ticket ${ticket.ticket_code}`);
    }

    // Update ticket total spare cost
    await ticket.update({
      total_spare_cost: (parseFloat(ticket.total_spare_cost) || 0) + totalCost
    });

    // Audit log
    await auditService.log({
      entity_type: 'TICKET',
      entity_id: ticketId,
      action: 'BM_SPARES_CONSUMED',
      performed_by: user.id,
      changes: {
        spares_count: spares.length,
        total_cost: totalCost,
        spare_ids: spares.map(s => s.spare_id)
      }
    });

    return consumptions;
  }

  /**
   * Get spare consumption history for an asset
   */
  async getAssetSpareHistory(assetId, filters = {}) {
    const where = { asset_id: assetId };

    // Optional date range filter
    if (filters.start_date || filters.end_date) {
      where.used_at = {};
      if (filters.start_date) where.used_at[Op.gte] = new Date(filters.start_date);
      if (filters.end_date) where.used_at[Op.lte] = new Date(filters.end_date);
    }

    const consumptions = await AssetSpareConsumption.findAll({
      where,
      include: [
        { 
          model: Ticket, 
          as: 'ticket',
          attributes: ['id', 'ticket_code', 'task_name', 'bm_state', 'maintenance_type']
        },
        { 
          model: InventorySpare, 
          as: 'spare',
          attributes: ['id', 'part_name', 'part_number', 'unit']
        },
        { 
          model: User, 
          as: 'usedBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['used_at', 'DESC']]
    });

    // Calculate summary statistics
    const summary = {
      total_consumptions: consumptions.length,
      total_cost: consumptions.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0),
      unique_spares: new Set(consumptions.map(c => c.spare_id)).size,
      unique_tickets: new Set(consumptions.map(c => c.ticket_id)).size
    };

    return { consumptions, summary };
  }

  /**
   * Get all issue types
   */
  async getIssueTypes(activeOnly = true) {
    const where = activeOnly ? { is_active: true } : {};
    return BMIssueType.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
  }

  /**
   * Get BM ticket details with full context
   */
  async getBMTicketDetail(ticketId) {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        { 
          model: Asset, 
          as: 'asset',
          include: ['plant', 'category', 'product']
        },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
        { 
          model: AssetSpareConsumption, 
          as: 'spareConsumptions',
          include: ['spare', 'usedBy']
        },
        {
          model: BMStateTransition,
          as: 'stateTransitions',
          include: [{ model: User, as: 'transitionedBy', attributes: ['id', 'name'] }],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!ticket || ticket.ticket_type !== 'BM_MAINTENANCE') {
      throw new Error('BM ticket not found');
    }

    // Calculate SLA status
    const slaStatus = this.calculateSLAStatus(ticket);

    // Get allowed next states
    const allowedTransitions = BM_STATE_TRANSITIONS[ticket.bm_state] || [];

    return {
      ...ticket.toJSON(),
      slaStatus,
      allowedTransitions,
      requiredFieldsForNextStates: allowedTransitions.reduce((acc, state) => {
        acc[state] = BM_STATE_REQUIRED_FIELDS[state] || [];
        return acc;
      }, {})
    };
  }

  /**
   * Get BM tickets dashboard stats
   */
  async getDashboardStats(filters = {}) {
    const where = { ticket_type: 'BM_MAINTENANCE' };

    if (filters.plant_id) where.plant_id = filters.plant_id;
    if (filters.priority) where.priority = filters.priority;
    if (filters.maintenance_type) where.maintenance_type = filters.maintenance_type;

    const tickets = await Ticket.findAll({ where });

    const stats = {
      total: tickets.length,
      by_state: {},
      by_priority: {},
      sla_breached: tickets.filter(t => t.sla_breached).length,
      sla_critical: 0,
      avg_resolution_time: 0,
      active_tickets: tickets.filter(t => t.bm_state !== BM_STATES.CLOSED).length
    };

    // Count by state
    tickets.forEach(t => {
      stats.by_state[t.bm_state] = (stats.by_state[t.bm_state] || 0) + 1;
      stats.by_priority[t.priority] = (stats.by_priority[t.priority] || 0) + 1;
      
      const slaStatus = this.calculateSLAStatus(t);
      if (slaStatus.status === 'CRITICAL') stats.sla_critical++;
    });

    return stats;
  }
}

module.exports = new BMWorkflowService();
module.exports.BM_STATES = BM_STATES;
module.exports.BM_STATE_TRANSITIONS = BM_STATE_TRANSITIONS;
module.exports.SLA_HOURS = SLA_HOURS;
