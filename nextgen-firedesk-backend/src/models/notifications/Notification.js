const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

// Enum definitions
const NOTIFICATION_TYPE_ENUM = [
    'ASSET_ALERT',
    'SERVICE_DUE',
    'SERVICE_DUE',
    'HP_TEST_DUE',
    'REFILL_DUE',
    'TICKET_ASSIGNED',
    'TICKET_UPDATED',
    'INCIDENT_CREATED',
    'INCIDENT_ASSIGNED',
    'CAPA_INITIATED',
    'CAPA_STEP_ACTION',
    'AUDIT_SCHEDULED',
    'AUDIT_REMINDER',
    'TRAINING_SCHEDULED',
    'SYSTEM_ALERT',
    'GENERAL'
];

const NOTIFICATION_PRIORITY_ENUM = [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
];

const NOTIFICATION_CATEGORY_ENUM = [
    'ALERT',
    'WARNING',
    'INFO',
    'SUCCESS',
    'REMAINDER'
];

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    type: {
        type: DataTypes.ENUM(...NOTIFICATION_TYPE_ENUM),
        allowNull: false,
        field: 'type'
    },
    category: {
        type: DataTypes.ENUM(...NOTIFICATION_CATEGORY_ENUM),
        defaultValue: 'INFO',
        field: 'category'
    },
    priority: {
        type: DataTypes.ENUM(...NOTIFICATION_PRIORITY_ENUM),
        defaultValue: 'MEDIUM',
        field: 'priority'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'title'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'message'
    },
    related_entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'related_entity_type'
    },
    related_entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'related_entity_id'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'action_url'
    },
    is_actionable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_actionable'
    },
    action_taken: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'action_taken'
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'read_at'
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sent_at'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at'
    },
    triggered_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'triggered_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    notification_source: {
        type: DataTypes.STRING(50),
        defaultValue: 'SYSTEM',
        field: 'notification_source'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_notifications_user',
            fields: ['user_id']
        },
        {
            name: 'idx_notifications_user_read',
            fields: ['user_id', 'is_read']
        },
        {
            name: 'idx_notifications_priority',
            fields: ['user_id', 'priority', 'is_read']
        },
        {
            name: 'idx_notifications_type',
            fields: ['type']
        },
        {
            name: 'idx_notifications_entity_type',
            fields: ['related_entity_type']
        },
        {
            name: 'idx_notifications_entity',
            fields: ['related_entity_type', 'related_entity_id']
        },
        {
            name: 'idx_notifications_created',
            fields: ['created_at']
        },
        {
            name: 'idx_notifications_expires',
            fields: ['expires_at']
        }
    ]
});

// Export enums for use in other parts of the application
Notification.NOTIFICATION_TYPE_ENUM = NOTIFICATION_TYPE_ENUM;
Notification.NOTIFICATION_PRIORITY_ENUM = NOTIFICATION_PRIORITY_ENUM;
Notification.NOTIFICATION_CATEGORY_ENUM = NOTIFICATION_CATEGORY_ENUM;

module.exports = Notification;
