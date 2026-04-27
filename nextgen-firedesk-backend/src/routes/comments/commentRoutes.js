/**
 * Comment Routes
 * API endpoints for entity comments
 */

const express = require('express');
const router = express.Router();
const commentController = require('../../controllers/comments/comment_controller');
const auth = require('../../middleware/auth');

// All routes require authentication
router.use(auth);

// Get comments for an entity
// GET /api/comments/:entityType/:entityId
router.get('/:entityType/:entityId', commentController.getByEntity);

// Create a new comment
// POST /api/comments/:entityType/:entityId
router.post('/:entityType/:entityId', commentController.create);

// Update a comment
// PUT /api/comments/:id
router.put('/:id', commentController.update);

// Delete a comment
// DELETE /api/comments/:id
router.delete('/:id', commentController.delete);

module.exports = router;
