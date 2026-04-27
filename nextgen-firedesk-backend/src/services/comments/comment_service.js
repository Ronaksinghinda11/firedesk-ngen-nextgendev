/**
 * Comment Service
 * Handles CRUD operations for entity comments
 */


const { Comment } = require('../../models/comments');
const { User } = require('../../models/user-management');
const auditService = require('../audit/audit_service');

class CommentService {
    /**
     * Create a new comment for an entity
     */
    async createComment(entityType, entityId, text, userId, userName = null) {
        try {
            // Get user name if not provided
            let authorName = userName;
            if (!authorName && userId) {
                const user = await User.findByPk(userId, { attributes: ['name'] });
                authorName = user?.name || 'Unknown User';
            }

            const comment = await Comment.create({
                entity_type: entityType,
                entity_id: entityId,
                comment_text: text,
                raw_text: text,
                comment_format: 'plain',
                created_by: userId,
                created_by_name: authorName
            });

            // Audit Log
            try {
                // Fetch full user for audit
                const user = await User.findByPk(userId);

                // Map layout to floor for audit log enum compatibility
                const auditEntityType = entityType === 'layout' ? 'floor' : entityType;

                await auditService.log({
                    entityType: auditEntityType,
                    entityId: entityId,
                    entityName: `${entityType} ${entityId}`,
                    action: 'UPDATE', // Commenting is an update to the entity
                    fieldName: 'comments',
                    oldValue: null,
                    newValue: text,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : { id: userId, name: authorName || 'Unknown' },
                    source: 'ui',
                    metadata: { commentId: comment.id, action: 'ADD_COMMENT' }
                });
            } catch (error) {
                console.error('[CommentService] Audit log failed for createComment:', error.message);
            }

            return {
                success: true,
                data: comment
            };
        } catch (error) {
            console.error('[CommentService] createComment error:', error);
            throw error;
        }
    }

    /**
     * Get all comments for an entity
     */
    async getCommentsByEntity(entityType, entityId, options = {}) {
        try {
            const { limit = 50, offset = 0, order = 'ASC' } = options;

            const { rows, count } = await Comment.findAndCountAll({
                where: {
                    entity_type: entityType,
                    entity_id: entityId,
                    is_deleted: false
                },
                order: [['created_at', order]],
                limit,
                offset
            });

            return {
                success: true,
                data: {
                    comments: rows,
                    total: count,
                    hasMore: offset + rows.length < count
                }
            };
        } catch (error) {
            console.error('[CommentService] getCommentsByEntity error:', error);
            throw error;
        }
    }

    /**
     * Update a comment
     */
    async updateComment(commentId, text, userId) {
        try {
            const comment = await Comment.findByPk(commentId);

            if (!comment) {
                return { success: false, error: 'Comment not found' };
            }

            // Check if user is the author
            if (comment.created_by !== userId) {
                return { success: false, error: 'Unauthorized to edit this comment' };
            }

            await comment.update({
                comment_text: text,
                raw_text: text,
                is_edited: true,
                edited_at: new Date(),
                edited_by: userId,
                edit_count: (comment.edit_count || 0) + 1
            });

            // Audit Log
            try {
                const user = await User.findByPk(userId);

                // Map layout to floor for audit log enum compatibility
                const auditEntityType = comment.entity_type === 'layout' ? 'floor' : comment.entity_type;

                await auditService.log({
                    entityType: auditEntityType,
                    entityId: comment.entity_id,
                    entityName: `${comment.entity_type} ${comment.entity_id}`,
                    action: 'UPDATE',
                    fieldName: 'comments',
                    changes: { commentId: commentId, oldText: comment.raw_text, newText: text },
                    user: user ? { id: user.id, name: user.name, type: user.userType } : { id: userId },
                    source: 'ui',
                    metadata: { commentId: commentId, action: 'EDIT_COMMENT' }
                });
            } catch (error) {
                console.error('[CommentService] Audit log failed for updateComment:', error.message);
            }

            return { success: true, data: comment };
        } catch (error) {
            console.error('[CommentService] updateComment error:', error);
            throw error;
        }
    }

    /**
     * Delete a comment (soft delete)
     */
    async deleteComment(commentId, userId) {
        try {
            const comment = await Comment.findByPk(commentId);

            if (!comment) {
                return { success: false, error: 'Comment not found' };
            }

            // Check if user is the author (or could add admin check)
            if (comment.created_by !== userId) {
                return { success: false, error: 'Unauthorized to delete this comment' };
            }

            await comment.update({
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId
            });

            // Audit Log
            try {
                const user = await User.findByPk(userId);

                // Map layout to floor for audit log enum compatibility
                const auditEntityType = comment.entity_type === 'layout' ? 'floor' : comment.entity_type;

                await auditService.log({
                    entityType: auditEntityType,
                    entityId: comment.entity_id,
                    entityName: `${comment.entity_type} ${comment.entity_id}`,
                    action: 'UPDATE',
                    fieldName: 'comments',
                    oldValue: 'Comment active',
                    newValue: 'Comment deleted',
                    user: user ? { id: user.id, name: user.name, type: user.userType } : { id: userId },
                    source: 'ui',
                    metadata: { commentId: commentId, action: 'DELETE_COMMENT' }
                });
            } catch (error) {
                console.error('[CommentService] Audit log failed for deleteComment:', error.message);
            }

            return { success: true, message: 'Comment deleted' };
        } catch (error) {
            console.error('[CommentService] deleteComment error:', error);
            throw error;
        }
    }
}

module.exports = new CommentService();
