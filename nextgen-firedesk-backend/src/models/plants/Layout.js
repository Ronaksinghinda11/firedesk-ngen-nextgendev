/**
 * Layout Model
 * Stores floor plan layouts (SVG files) for floors
 * One-to-one relationship with Floor
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Layout extends Model { }

Layout.init({
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
        }
    },
    building_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'buildings',
            key: 'id'
        }
    },
    floor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'floors',
            key: 'id'
        }
    },
    wing_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'wings',
            key: 'id'
        }
    },
    // Text storage for SVG
    svg_picture: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Primary binary storage for SVG files
    svg_binary: {
        type: DataTypes.BLOB,
        allowNull: true
    },
    // File metadata
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    file_size_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    mime_type: {
        type: DataTypes.STRING(100),
        defaultValue: 'image/svg+xml',
        allowNull: true
    },
    health_status: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Layout',
    tableName: 'layouts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Layout;
