/**
 * Ticket Model
 * Represents tasks/tickets assigned to technicians
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ticket_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'ticket_code'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'plant_id',
        references: {
            model: 'plants',
            key: 'id'
        }
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'asset_id',
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    inventory_asset_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'inventory_asset_id',
        references: {
            model: 'inventory_assets',
            key: 'id'
        }
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'category_id'
    },
    technician_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'technician_id',
        references: {
            model: 'technicians',
            key: 'id'
        }
    },
    task_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'task_name'
    },
    task_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'task_description'
    },
    target_date: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'target_date'
    },
    ticket_category: {
        type: DataTypes.ENUM('Installation', 'Breakdown Maintenance', 'Refill / HP Test', 'General'),
        defaultValue: 'General',
        field: 'ticket_category'
    },
    completed_status: {
        type: DataTypes.ENUM('Pending', 'In Progress', 'Waiting for spare', 'Rejected', 'Waiting for approval', 'Completed'),
        defaultValue: 'Pending',
        field: 'completed_status'
    },
    // Location fields for installation tickets
    building_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'building_id',
        references: {
            model: 'buildings',
            key: 'id'
        }
    },
    floor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'floor_id',
        references: {
            model: 'floors',
            key: 'id'
        }
    },
    wing_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'wing_id',
        references: {
            model: 'wings',
            key: 'id'
        }
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'location'
    },
    total_spare_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'total_spare_cost'
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'started_at'
    },
    // BM Maintenance fields
    ticket_type: {
        type: DataTypes.STRING(50),
        defaultValue: 'STANDARD',
        field: 'ticket_type',
        comment: 'STANDARD, BM_MAINTENANCE, INSTALLATION, INSPECTION'
    },
    maintenance_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'maintenance_type',
        comment: 'BREAKDOWN or COMPLIANCE (for BM tickets only)'
    },
    priority: {
        type: DataTypes.STRING(20),
        defaultValue: 'MEDIUM',
        field: 'priority',
        comment: 'LOW, MEDIUM, HIGH, CRITICAL'
    },
    bm_state: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'bm_state',
        comment: 'FSM state for BM workflow'
    },
    bm_metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'bm_metadata',
        comment: 'Flexible JSON for BM form data'
    },
    refill_metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'refill_metadata',
        comment: 'Flexible JSON for Refill/HP Test form data'
    },
    // SLA fields
    acknowledged_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'acknowledged_at',
        comment: 'When technician acknowledged the BM ticket (SLA starts)'
    },
    sla_deadline: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sla_deadline',
        comment: 'Calculated SLA deadline based on priority'
    },
    sla_breached: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'sla_breached',
        comment: 'True if ticket passed SLA deadline'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'tickets',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Ticket;
