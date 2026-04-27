/**
 * Audit Log Model
 * Sequelize model for partitioned audit_logs table
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AuditLog extends Model {
    /**
     * Helper method to format audit log for API response
     */
    toJSON() {
        const values = Object.assign({}, this.get());

        // Parse JSONB fields if they're strings
        if (typeof values.changes === 'string') {
            try {
                values.changes = JSON.parse(values.changes);
            } catch (e) {
                // Keep as string if parse fails
            }
        }

        if (typeof values.metadata === 'string') {
            try {
                values.metadata = JSON.parse(values.metadata);
            } catch (e) {
                // Keep as string if parse fails
            }
        }

        return values;
    }
}

AuditLog.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // Entity Information (nullable for deleted entities)
    entity_type: {
        type: DataTypes.ENUM(
            'plant', 'building', 'floor', 'wing', 'asset', 'ticket',
            'user', 'technician', 'manager', 'organization', 'role',
            'fire_safety_system', 'maintenance_schedule', 'service_submission',
            'form', 'vendor', 'category', 'product', 'notification',
            'industry', 'condition', 'scheduler', 'incident', 'incident_type', 'incident_subtype', 'capa',
            'question', 'manufacturer', 'monitoring_device'
        ),
        allowNull: false,
        comment: 'Type of entity being audited'
    },

    entity_id: {
        type: DataTypes.UUID,
        allowNull: true,  // NULLABLE - survives deleted entities
        comment: 'ID of the entity (can be null if entity is deleted)'
    },

    entity_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Human-readable entity name/code for UI display'
    },

    // Action Information
    action: {
        type: DataTypes.ENUM(
            'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE',
            'ASSIGN', 'UNASSIGN', 'APPROVE', 'REJECT', 'SUBMIT',
            'CANCEL', 'COMPLETE', 'STATUS_CHANGE', 'BULK_UPDATE', 'IMPORT'
        ),
        allowNull: false,
        comment: 'Action performed'
    },

    action_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable description of the action'
    },

    // User Information (with snapshots)
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Who performed the action'
    },

    user_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Snapshot of user name at time of action'
    },

    user_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'admin/manager/technician/system'
    },

    // Change Details (prefer changes JSONB)
    changes: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Full change set: { field: { old, new, old_display, new_display } }'
    },

    // Field-level (ONLY for simple cases like STATUS_CHANGE, ASSIGN)
    field_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Name of the field that changed (for simple cases)'
    },

    old_value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Previous value (as string)'
    },

    new_value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'New value (as string)'
    },

    old_value_display: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable old value'
    },

    new_value_display: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable new value'
    },

    // Grouping & Context
    context_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Groups related changes (e.g., single save action with multiple field updates)'
    },

    // Source Tracking (CRITICAL for scale)
    source: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: 'ui',
        comment: 'ui | api | scheduler | system | import'
    },

    // Network Context
    ip_address: {
        type: DataTypes.INET,
        allowNull: true,
        comment: 'IP address of the user'
    },

    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Browser/app user agent'
    },

    request_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Request ID for tracing'
    },

    // Additional Metadata
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Any additional context: { reason, notes, etc. }'
    },

    // Related Entity (for relational actions like ASSIGN)
    related_entity_type: {
        type: DataTypes.ENUM(
            'plant', 'building', 'floor', 'wing', 'asset', 'ticket',
            'user', 'technician', 'manager', 'organization', 'role',
            'fire_safety_system', 'maintenance_schedule', 'service_submission',
            'form', 'vendor', 'category', 'product', 'notification',
            'industry', 'condition', 'scheduler', 'incident', 'capa',
            'question', 'manufacturer', 'monitoring_device'
        ),
        allowNull: true,
        comment: 'E.g., when assigning technician to asset'
    },

    related_entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of the related entity'
    },

    related_entity_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Name of the related entity'
    },

    // Timestamp (PARTITION KEY)
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp of the action (partition key)'
    }
}, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false  // Only created_at (no updated_at)
    // Note: Indexes are created in migration (011_audit_history_system_enhanced.js)
    // Partitioned tables require indexes to be created after partition setup
});

module.exports = AuditLog;
