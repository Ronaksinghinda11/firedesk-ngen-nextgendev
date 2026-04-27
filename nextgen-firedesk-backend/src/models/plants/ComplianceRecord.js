/**
 * ComplianceRecord Model
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class ComplianceRecord extends Model { }

ComplianceRecord.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'plants',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    fire_noc_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    fire_noc_expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    insurance_policy_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    insurance_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    insurance_validity_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    num_fire_extinguishers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    num_hydrant_points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    num_sprinklers: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    num_safe_assembly_areas: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    documents_data: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    documents_json: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'ComplianceRecord',
    tableName: 'compliance_records',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ComplianceRecord;
