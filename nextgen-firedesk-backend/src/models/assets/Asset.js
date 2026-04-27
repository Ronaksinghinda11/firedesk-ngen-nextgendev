/**
 * Asset Model
 * Core asset table matching 004_assets_module migration schema
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Asset extends Model {
    // Associations are set up in assets/index.js via setupAssetAssociations()
}

Asset.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    asset_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },

    // Location references
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'plants',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    building_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'buildings',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    floor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'floors',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    wing_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'wings',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },

    // Location description
    location: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    // Product references
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    product_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    manufacturer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'manufacturers',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },

    // Creator
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },

    // Asset details
    type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    sub_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    manufacturing_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    install_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    warranty_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    // Service tracking (updated by trigger on service_submission approval)
    last_service_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    next_service_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    lifespan_years: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // Geolocation
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },

    // Status fields (enums)
    status: {
        type: DataTypes.ENUM('ACTIVE', 'DEACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE'
    },
    health_status: {
        type: DataTypes.ENUM('HEALTHY', 'NEEDS_ATTENTION', 'NOT_WORKING', 'INVENTORY', 'OBSOLETE'),
        allowNull: false,
        defaultValue: 'HEALTHY'
    },
    maintenance_status: {
        type: DataTypes.ENUM('UNDER_WARRANTY', 'OUT_OF_WARRANTY', 'UNDER_AMC', 'OUT_OF_AMC', 'IN_HOUSE'),
        allowNull: false,
        defaultValue: 'IN_HOUSE'
    },

    // Conditions (JSONB for flexible condition tracking)
    conditions: {
        type: DataTypes.JSONB,
        allowNull: true
    },

    // Compliance Score (calculated field)
    // Formula: OAC = 100% - 50% (if critical condition) - 25% (if open ticket/service pending) - 25% (if lifespan exceeded)
    compliance_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 100,
        validate: {
            min: 0,
            max: 100
        }
    },

    // Soft delete
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Asset',
    tableName: 'assets',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
});

module.exports = Asset;
