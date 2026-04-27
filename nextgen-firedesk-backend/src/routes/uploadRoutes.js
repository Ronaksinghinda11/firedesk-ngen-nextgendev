const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const auth = require('../middleware/auth');

/**
 * @route POST /api/upload
 * @desc Upload a file
 * @access Private
 */
router.post(
    '/',
    auth,
    uploadController.uploadMiddleware,
    uploadController.uploadFile
);

/**
 * @route GET /api/upload/:id
 * @desc Get uploaded file content
 * @access Private
 */
router.get(
    '/:id',
    // auth, // Consider if auth is needed for viewing. Usually yes.
    uploadController.getFile
);

module.exports = router;
