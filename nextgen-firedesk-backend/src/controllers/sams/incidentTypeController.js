const incidentTypeService = require('../../services/sams/incidentTypeService');
const { asyncHandler } = require('../../middleware/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * Incident Type Controller
 * Handles HTTP requests and delegates to service layer
 */

// @desc    Get all incident types
// @route   GET /sams/admin/incident-type
// @access  Private (All users can view)
exports.getAll = asyncHandler(async (req, res) => {
    const { isActive } = req.query;

    const filters = {};
    if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
    }

    const incidentTypes = await incidentTypeService.getAll(filters);
    return ApiResponse.success(res, incidentTypes, 'Incident types retrieved successfully');
});

// @desc    Get incident type by ID
// @route   GET /sams/admin/incident-type/:id
// @access  Private
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidentType = await incidentTypeService.getById(id);
    return ApiResponse.success(res, incidentType, 'Incident type retrieved successfully');
});

// @desc    Create incident type
// @route   POST /sams/admin/incident-type
// @access  Private (Admin only)
exports.create = asyncHandler(async (req, res) => {
    const incidentType = await incidentTypeService.create(req.body, req.user);
    return ApiResponse.success(res, incidentType, 'Incident type created successfully', 201);
});

// @desc    Update incident type
// @route   PUT /sams/admin/incident-type/:id
// @access  Private (Admin only)
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidentType = await incidentTypeService.update(id, req.body, req.user);
    return ApiResponse.success(res, incidentType, 'Incident type updated successfully');
});

// @desc    Delete incident type
// @route   DELETE /sams/admin/incident-type/:id
// @access  Private (Admin only)
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await incidentTypeService.delete(id, req.user);
    return ApiResponse.success(res, null, 'Incident type deleted successfully');
});

// @desc    Restore incident type
// @route   POST /sams/admin/incident-type/:id/restore
// @access  Private (Admin only)
exports.restore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidentType = await incidentTypeService.restore(id);
    return ApiResponse.success(res, incidentType, 'Incident type restored successfully');
});
