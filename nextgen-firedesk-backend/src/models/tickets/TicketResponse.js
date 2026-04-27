/**
 * TicketResponse Model
 * Represents responses/comments on tickets
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const TicketResponse = sequelize.define('TicketResponse', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'ticket_id',
        references: {
            model: 'tickets',
            key: 'id'
        }
    },
    assigned_technician_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assigned_technician_id',
        references: {
            model: 'technicians',
            key: 'id'
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'comment'
    },
    response_type: {
        type: DataTypes.ENUM('submission', 'rejection', 'comment'),
        defaultValue: 'comment',
        field: 'response_type'
    },
    is_fixed: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'is_fixed'
    },
    photo_urls: {
        type: DataTypes.JSON, // Array of strings
        allowNull: true,
        defaultValue: [],
        field: 'photo_urls'
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
    tableName: 'ticket_responses',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = TicketResponse;
