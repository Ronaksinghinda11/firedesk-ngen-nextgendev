/**
 * Comment Controller
 * HTTP handlers for comment operations
 */

const commentService = require('../../services/comments/comment_service');

const commentController = {
    /**
     * Create a new comment
     * POST /api/comments/:entityType/:entityId
     */
    async create(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const { text } = req.body;
            const userId = req.user?.id;
            const userName = req.user?.name;

            if (!text || !text.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Comment text is required'
                });
            }

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const result = await commentService.createComment(
                entityType,
                entityId,
                text.trim(),
                userId,
                userName
            );

            return res.status(201).json(result);
        } catch (error) {
            console.error('[CommentController] create error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create comment'
            });
        }
    },

    /**
     * Get comments for an entity
     * GET /api/comments/:entityType/:entityId
     */
    async getByEntity(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const { limit = 50, offset = 0, order = 'ASC' } = req.query;

            const result = await commentService.getCommentsByEntity(
                entityType,
                entityId,
                {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    order: order.toUpperCase()
                }
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('[CommentController] getByEntity error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch comments'
            });
        }
    },

    /**
     * Update a comment
     * PUT /api/comments/:id
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { text } = req.body;
            const userId = req.user?.id;

            if (!text || !text.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Comment text is required'
                });
            }

            const result = await commentService.updateComment(id, text.trim(), userId);

            if (!result.success) {
                return res.status(result.error === 'Comment not found' ? 404 : 403).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('[CommentController] update error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update comment'
            });
        }
    },

    /**
     * Delete a comment
     * DELETE /api/comments/:id
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const result = await commentService.deleteComment(id, userId);

            if (!result.success) {
                return res.status(result.error === 'Comment not found' ? 404 : 403).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('[CommentController] delete error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete comment'
            });
        }
    }
};

module.exports = commentController;
