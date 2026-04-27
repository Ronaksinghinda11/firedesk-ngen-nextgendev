/**
 * Comment Model
 * Maps to existing 'comments' table from migration 007
 * Simple implementation for entity comments
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class Comment extends Model { }

Comment.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // Entity Information
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    entity_id: {
        type: DataTypes.UUID,
        allowNull: false
    },

    // Comment Content
    comment_text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    raw_text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    comment_format: {
        type: DataTypes.STRING(20),
        defaultValue: 'plain'
    },

    // Author Information
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_by_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    // Edit Tracking
    is_edited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    edited_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    edited_by: {
        type: DataTypes.UUID,
        allowNull: true
    },
    edit_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },

    // Soft Delete
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    deleted_by: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Comment',
    tableName: 'comments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Comment;
