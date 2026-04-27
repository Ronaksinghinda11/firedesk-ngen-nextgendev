/**
 * AssetSpareConsumption Model
 * Tracks spare parts consumed by assets during BM tickets
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const AssetSpareConsumption = sequelize.define('AssetSpareConsumption', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'asset_id',
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'CASCADE'
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
    spare_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'spare_id',
        references: {
            model: 'inventory_spares',
            key: 'id'
        }
    },
    quantity_used: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'quantity_used',
        validate: {
            min: 0.01
        }
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'unit_cost'
    },
    total_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'total_cost'
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'used_at'
    },
    used_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'used_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks'
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
    tableName: 'asset_spare_consumptions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = AssetSpareConsumption;
