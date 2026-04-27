/**
 * BMStateTransition Model
 * Audit log for BM workflow state transitions
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const BMStateTransition = sequelize.define('BMStateTransition', {
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
        },
        onDelete: 'CASCADE'
    },
    from_state: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'from_state'
    },
    to_state: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'to_state'
    },
    transitioned_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'transitioned_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    transition_data: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'transition_data',
        comment: 'Additional data captured during transition'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'bm_state_transitions',
    timestamps: false,
    underscored: true
});

module.exports = BMStateTransition;
