const incidentSubtypeService = require('../../services/sams/incidentSubtypeService');
const { asyncHandler } = require('../../middleware/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * Incident Subtype Controller
 * Handles HTTP requests and delegates to service layer
 */

// @desc    Get all incident subtypes
// @route   GET /sams/admin/incident-subtype
// @access  Private (All users can view)
exports.getAll = asyncHandler(async (req, res) => {
    const { isActive, incidentTypeId } = req.query;

    const filters = {};
    if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
    }
    if (incidentTypeId) {
        filters.incidentTypeId = incidentTypeId;
    }

    const incidentSubtypes = await incidentSubtypeService.getAll(filters);
    return ApiResponse.success(res, incidentSubtypes, 'Incident subtypes retrieved successfully');
});

// @desc    Get incident subtype by ID
// @route   GET /sams/admin/incident-subtype/:id
// @access  Private
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidentSubtype = await incidentSubtypeService.getById(id);
    return ApiResponse.success(res, incidentSubtype, 'Incident subtype retrieved successfully');
});

// @desc    Create incident subtype
// @route   POST /sams/admin/incident-subtype
// @access  Private (Admin only)
exports.create = asyncHandler(async (req, res) => {
    const incidentSubtype = await incidentSubtypeService.create(req.body, req.user);
    return ApiResponse.success(res, incidentSubtype, 'Incident subtype created successfully', 201);
});

// @desc    Update incident subtype
// @route   PUT /sams/admin/incident-subtype/:id
// @access  Private (Admin only)
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidentSubtype = await incidentSubtypeService.update(id, req.body, req.user);
    return ApiResponse.success(res, incidentSubtype, 'Incident subtype updated successfully');
});

// @desc    Delete incident subtype
// @route   DELETE /sams/admin/incident-subtype/:id
// @access  Private (Admin only)
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await incidentSubtypeService.delete(id, req.user);
    return ApiResponse.success(res, null, 'Incident subtype deleted successfully');
});

// @desc    Restore incident subtype
// @route   POST /sams/admin/incident-subtype/:id/restore
// @access  Private (Admin only)
exports.restore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incidentSubtype = await incidentSubtypeService.restore(id);
    return ApiResponse.success(res, incidentSubtype, 'Incident subtype restored successfully');
});
