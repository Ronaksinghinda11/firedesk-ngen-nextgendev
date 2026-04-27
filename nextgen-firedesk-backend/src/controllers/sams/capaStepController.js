const capaService = require('../../services/sams/capaService');
const { asyncHandler } = require('../../middleware/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * CAPA Step Definition Controller
 * Handles HTTP requests and delegates to service layer
 */

// @desc    Get all CAPA step definitions
// @route   GET /sams/admin/capa-step
// @access  Private (All users can view)
exports.getAll = asyncHandler(async (req, res) => {
    const { isActive } = req.query;

    const filters = {};
    if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
    }

    const capaSteps = await capaService.getAll(filters);
    return ApiResponse.success(res, capaSteps, 'CAPA step definitions retrieved successfully');
});

// @desc    Get CAPA step definition by ID
// @route   GET /sams/admin/capa-step/:id
// @access  Private
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const capaStep = await capaService.getById(id);
    return ApiResponse.success(res, capaStep, 'CAPA step definition retrieved successfully');
});

// @desc    Create CAPA step definition
// @route   POST /sams/admin/capa-step
// @access  Private (Admin only)
exports.create = asyncHandler(async (req, res) => {
    const capaStep = await capaService.create(req.body, req.user);
    return ApiResponse.success(res, capaStep, 'CAPA step definition created successfully', 201);
});

// @desc    Update CAPA step definition
// @route   PUT /sams/admin/capa-step/:id
// @access  Private (Admin only)
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const capaStep = await capaService.update(id, req.body, req.user);
    return ApiResponse.success(res, capaStep, 'CAPA step definition updated successfully');
});

// @desc    Delete CAPA step definition
// @route   DELETE /sams/admin/capa-step/:id
// @access  Private (Admin only)
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await capaService.delete(id, req.user);
    return ApiResponse.success(res, null, 'CAPA step definition deleted successfully');
});

// @desc    Restore CAPA step definition
// @route   POST /sams/admin/capa-step/:id/restore
// @access  Private (Admin only)
exports.restore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const capaStep = await capaService.restore(id);
    return ApiResponse.success(res, capaStep, 'CAPA step definition restored successfully');
});

// @desc    Reorder CAPA steps
// @route   PUT /sams/admin/capa-step/reorder
// @access  Private (Admin only)
exports.reorder = asyncHandler(async (req, res) => {
    const { steps } = req.body;
    const updatedSteps = await capaService.reorder(steps, req.user);
    return ApiResponse.success(res, updatedSteps, 'CAPA steps reordered successfully');
});
