const incidentService = require('../../services/sams/incidentService');
const { asyncHandler } = require('../../middleware/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * Incident Controller
 * Handles HTTP requests for incident management
 */

// @desc    Get all incidents for current user
// @route   GET /sams/incident
// @access  Private
exports.getAll = asyncHandler(async (req, res) => {
    const { plantId, severity, status, incidentSubtypeId, startDate, endDate } = req.query;

    const filters = {};
    if (plantId) filters.plantId = plantId;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (incidentSubtypeId) filters.incidentSubtypeId = incidentSubtypeId;
    if (startDate || endDate) {
        filters.incidentDate = {};
        if (startDate) filters.incidentDate[Op.gte] = new Date(startDate);
        if (endDate) filters.incidentDate[Op.lte] = new Date(endDate);
    }

    const incidents = await incidentService.getIncidentsForUser(req.user.id, filters);
    return ApiResponse.success(res, incidents, 'Incidents retrieved successfully');
});

// @desc    Get incident by ID
// @route   GET /sams/incident/:id
// @access  Private
exports.getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incident = await incidentService.getById(id, req.user.id);
    return ApiResponse.success(res, incident, 'Incident retrieved successfully');
});

// @desc    Create incident
// @route   POST /sams/incident
// @access  Private (Any user can create incidents in their plant)
exports.create = asyncHandler(async (req, res) => {
    const incident = await incidentService.create(req.body, req.user);
    return ApiResponse.success(res, incident, 'Incident created successfully', 201);
});

// @desc    Create displacement incident (specifically for mobile app)
// @route   POST /sams/displacement-incident
// @access  Private
exports.createDisplacementIncident = asyncHandler(async (req, res) => {
    const {
        assetId,
        assetName,
        previousLat,
        previousLong,
        currentLat,
        currentLong,
        distance,
        plantId,
        technicianId,
        technicianName,
        buildingId,
        floorId
    } = req.body;

    // Find or create 'Displacement' subtype
    const { IncidentSubtype, IncidentType } = require('../../models/sams');
    let subtype = await IncidentSubtype.findOne({ where: { subtypeName: 'Displacement' } });

    if (!subtype) {
        // Fallback: try to find a 'General' subtype
        subtype = await IncidentSubtype.findOne({ where: { subtypeName: 'General' } });

        if (!subtype && distance) {
            // Fallback: use the first available one or handle error
            // For now, let's create a Displacement one if it doesn't exist to ensure it works
            // We need an IncidentType first usually. 
            let type = await IncidentType.findOne({ where: { typeName: 'Automatic' } });
            if (!type) type = await IncidentType.findOne(); // Any type

            if (type) {
                subtype = await IncidentSubtype.create({
                    subtypeName: 'Displacement',
                    subtypeCode: 'DISP',
                    incidentTypeId: type.id,
                    isActive: true
                });
            }
        }
    }

    if (!subtype) {
        return ApiResponse.error(res, 'Could not determine Incident Subtype for Displacement', 400);
    }

    const payload = {
        incidentSubtypeId: subtype.id,
        plantId: plantId,
        buildingId: buildingId || null,
        floorId: floorId || null,
        incidentDate: new Date(),
        description: `Asset Displacement Detected: ${assetName} (ID: ${assetId}). Moved ${distance}m. Previous Location: [${previousLat}, ${previousLong}], Current Location: [${currentLat}, ${currentLong}]. Detected by: ${technicianName}`,
        impact: 'Asset Location Mismatch',
        severity: distance > 100 ? 'High' : (distance > 20 ? 'Medium' : 'Low'),
    };

    const incident = await incidentService.create(payload, req.user);

    // Return format expected by mobile app
    // success: boolean, message: string, data: { incidentId, incidentNumber, severity, assetId, distance }
    return res.status(201).json({
        success: true,
        message: 'Displacement incident created successfully',
        data: {
            incidentId: incident.id,
            incidentNumber: incident.incidentNumber,
            severity: incident.severity,
            assetId: assetId,
            distance: distance
        }
    });

});

// @desc    Update incident
// @route   PUT /sams/incident/:id
// @access  Private
exports.update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incident = await incidentService.update(id, req.body, req.user);
    return ApiResponse.success(res, incident, 'Incident updated successfully');
});

// @desc    Delete incident
// @route   DELETE /sams/incident/:id
// @access  Private (Admin only)
exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await incidentService.delete(id, req.user);
    return ApiResponse.success(res, null, 'Incident deleted successfully');
});

// @desc    Restore incident
// @route   POST /sams/incident/:id/restore
// @access  Private (Admin only)
exports.restore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incident = await incidentService.restore(id, req.user.id);
    return ApiResponse.success(res, incident, 'Incident restored successfully');
});

// @desc    Get available team members for incident's plant
// @route   GET /sams/incident/:id/available-members
// @access  Private (Admin or Manager)
exports.getAvailableMembers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const members = await incidentService.getAvailableMembers(id, req.user.id);
    return ApiResponse.success(res, members, 'Available team members retrieved successfully');
});

// @desc    Assign team to incident
// @route   POST /sams/incident/:id/assign-team
// @access  Private (Admin or Manager of  plant)
exports.assignTeam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incident = await incidentService.assignTeam(id, req.body, req.user);
    return ApiResponse.success(res, incident, 'Team assigned successfully');
});

// @desc    Submit CAPA step response
// @route   PUT /sams/incident/:id/capa-step/:stepId/submit
// @access  Private (Team members only)
exports.submitCapaStep = asyncHandler(async (req, res) => {
    const { id, stepId } = req.params;
    const incident = await incidentService.submitCapaStep(id, stepId, req.body, req.user);
    return ApiResponse.success(res, incident, 'CAPA step submitted successfully');
});

// @desc    Approve or reject CAPA step
// @route   PUT /sams/incident/:id/capa-step/:stepId/review
// @access  Private (Team creator only)
exports.reviewCapaStep = asyncHandler(async (req, res) => {
    const { id, stepId } = req.params;
    const incident = await incidentService.reviewCapaStep(id, stepId, req.body, req.user);
    return ApiResponse.success(res, incident, 'CAPA step reviewed successfully');
});

// @desc    Get incident timeline
// @route   GET /sams/incident/:id/timeline
// @access  Private
exports.getTimeline = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Timeline is included in getById
    const incident = await incidentService.getById(id, req.user.id);
    return ApiResponse.success(res, incident.activities, 'Timeline retrieved successfully');
});

// @desc    Get my incidents (for current user)
// @route   GET /sams/my-incidents
// @access  Private
exports.getMyIncidents = asyncHandler(async (req, res) => {
    const incidents = await incidentService.getIncidentsForUser(req.user.id);
    return ApiResponse.success(res, incidents, 'My incidents retrieved successfully');
});

// @desc    Get incidents assigned to technician (as team member)
// @route   GET /sams/technician/my-assigned-incidents
// @access  Private
exports.getMyAssignedIncidents = asyncHandler(async (req, res) => {
    const incidents = await incidentService.getMyAssignedIncidents(req.user.id);
    return ApiResponse.success(res, incidents, 'Assigned incidents retrieved successfully');
});

// @desc    Check if current user is a team leader for any incident
// @route   GET /sams/user/is-team-leader
// @access  Private
exports.isTeamLeader = asyncHandler(async (req, res) => {
    const result = await incidentService.isTeamLeader(req.user.id);
    return ApiResponse.success(res, result, 'Team leader status retrieved successfully');
});