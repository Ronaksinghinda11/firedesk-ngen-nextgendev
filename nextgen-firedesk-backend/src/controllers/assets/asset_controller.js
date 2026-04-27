/**
 * Asset Controller
 * Handles HTTP requests and responses for asset operations
 */

const asset_service = require('../../services/assets/asset_service');

/**
 * Create a new asset with related data
 */
const create = async (req, res) => {
    try {
        const asset = await asset_service.create_asset(req.body, req.user); // Pass full user

        return res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: asset
        });

    } catch (error) {
        console.error('Error creating asset:', error);

        // Handle unique constraint violation for asset_code
        if (error.name === 'SequelizeUniqueConstraintError' && error.fields?.asset_code) {
            return res.status(409).json({
                success: false,
                message: 'Asset code already exists',
                error: 'An asset with this code already exists in the system. Please use a different code.'
            });
        }

        // Handle validation errors with specific messages
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message || 'Validation failed',
                error: error.errors ? error.errors.map(e => e.message).join(', ') : error.message
            });
        }

        // Handle other errors (including missing required fields)
        const statusCode = error.message.includes('required') ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to create asset',
            error: error.message
        });
    }
};

/**
 * Get all assets with filtering and pagination
 * If user is a manager, only returns assets from their assigned plants
 */
const get_all = async (req, res) => {
    try {
        // Build filters with manager plant restriction
        const filters = { ...req.query };

        // If manager, enforce plant filtering
        if (req.managerPlantIds && req.managerPlantIds.length > 0) {
            filters.allowedPlantIds = req.managerPlantIds;
            console.log(`[AssetController] Manager restricted to plants: ${req.managerPlantIds.join(', ')}`);
        }

        // Pass req.user so the service can properly filter by manager's assigned plants
        const result = await asset_service.get_all_assets(filters, req.user);

        return res.status(200).json({
            success: true,
            data: result.assets,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assets',
            error: error.message
        });
    }
};

/**
 * Get single asset by ID with all relations
 */
const get_by_id = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await asset_service.get_asset_by_id(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Fetch active conditions from asset_active_conditions table
        let activeConditions = [];
        try {
            const assetHealthService = require('../../services/assets/assetHealthService');
            const conditions = await assetHealthService.getAssetActiveConditions(id);
            activeConditions = (conditions || []).map(ac => ({
                id: ac.id,
                conditionName: ac.condition?.condition_name || 'Unknown',
                conditionCode: ac.condition?.condition_code,
                severityLevel: ac.severity_level || ac.condition?.severity_level,
                priorityScore: ac.priority_score,
                detectedAt: ac.detected_at
            }));
        } catch (err) {
            console.error('Error fetching active conditions:', err.message);
        }

        // Fetch recent service submissions
        let recentServices = [];
        try {
            const { ServiceSubmission, Form, Technician, User } = require('../../models');
            const submissions = await ServiceSubmission.findAll({
                where: { asset_id: id },
                include: [
                    {
                        model: Form,
                        as: 'form',
                        attributes: ['id', 'service_name'],
                        required: false
                    },
                    {
                        model: Technician,
                        as: 'technician',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['name']
                        }],
                        required: false
                    }
                ],
                order: [['scheduled_date', 'ASC']]
            });

            recentServices = submissions.map(sub => ({
                id: sub.id,
                scheduledDate: sub.scheduled_date,
                inspectionType: sub.inspection_type || sub.form?.service_name || '-',
                status: sub.status,
                technicianName: sub.technician?.user?.name || 'Unassigned',
                completedAt: sub.completed_at,
                submittedAt: sub.submitted_at
            }));
        } catch (err) {
            console.error('Error fetching recent services:', err.message);
        }

        // Convert to plain object and add extra data
        const assetData = asset.toJSON ? asset.toJSON() : { ...asset.dataValues };
        assetData.activeConditions = activeConditions;
        assetData.recentServices = recentServices;

        return res.status(200).json({
            success: true,
            data: assetData
        });

    } catch (error) {
        console.error('Error fetching asset:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch asset',
            error: error.message
        });
    }
};

/**
 * Update asset
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await asset_service.update_asset(id, req.body, req.user); // Pass full user

        return res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: asset
        });

    } catch (error) {
        console.error('Error updating asset:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to update asset',
            error: error.message
        });
    }
};

/**
 * Permanently delete asset
 */
const delete_asset = async (req, res) => {
    try {
        const { id } = req.params;
        await asset_service.delete_asset(id, req.user); // Pass full user

        return res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });

    } catch (error) {
        console.error('Error archiving asset:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Handle foreign key constraint violation (linked to service submissions)
        if (error.message && error.message.includes('service_submissions_asset_id_fkey')) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete asset because it has associated service submissions. Please delete the service history first.',
                error: 'Foreign key constraint violation: Linked service submissions exist'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to archive asset',
            error: error.message
        });
    }
};

/**
 * Restore archived asset
 */
const restore = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await asset_service.restore_asset(id, req.body, req.user); // Pass full user

        return res.status(200).json({
            success: true,
            message: 'Asset restored successfully',
            data: asset
        });

    } catch (error) {
        console.error('Error restoring asset:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to restore asset',
            error: error.message
        });
    }
};

/**
        const { id } = req.params;
        await asset_service.delete_asset(id);

        return res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting asset:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to delete asset',
            error: error.message
        });
    }
};

/**
 * Get assets by floor (for floorplan view)
 */
const get_by_floor = async (req, res) => {
    try {
        const { floor_id } = req.params;
        const assets = await asset_service.get_assets_by_floor(floor_id);

        return res.status(200).json({
            success: true,
            data: assets
        });

    } catch (error) {
        console.error('Error fetching assets by floor:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assets',
            error: error.message
        });
    }
};

/**
 * Update asset floorplan position
 */
const update_floorplan_position = async (req, res) => {
    try {
        const { id } = req.params;
        // Accept both camelCase (frontend) and snake_case parameter names
        const floor_id = req.body.floor_id || req.body.floorId;
        const coordinate_x = req.body.coordinate_x ?? req.body.floorplanX;
        const coordinate_y = req.body.coordinate_y ?? req.body.floorplanY;

        await asset_service.update_floorplan_position(id, floor_id, coordinate_x, coordinate_y, req.user.id);

        return res.status(200).json({
            success: true,
            message: 'Floorplan position updated successfully'
        });

    } catch (error) {
        console.error('Error updating floorplan position:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to update floorplan position',
            error: error.message
        });
    }
};

/**
 * Remove asset from floorplan (deletes the floorplan position record)
 */
const remove_from_floorplan = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await asset_service.remove_from_floorplan(id);

        return res.status(200).json({
            success: true,
            message: 'Asset removed from floorplan successfully',
            data: result
        });

    } catch (error) {
        console.error('Error removing asset from floorplan:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to remove asset from floorplan',
            error: error.message
        });
    }
};

/**
 * Update asset geolocation (public endpoint for QR scan)
 */
const update_geolocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;

        await asset_service.update_geolocation(id, latitude, longitude, req.user?.id || null);

        return res.status(200).json({
            success: true,
            message: 'Geolocation updated successfully'
        });

    } catch (error) {
        console.error('Error updating geolocation:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to update geolocation',
            error: error.message
        });
    }
};

/**
 * Get asset status history
 */
const get_status_history = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await asset_service.get_status_history(id);

        return res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Error fetching status history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch status history',
            error: error.message
        });
    }
};

/**
 * Get asset location history
 */
const get_location_history = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await asset_service.get_location_history(id);

        return res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Error fetching location history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch location history',
            error: error.message
        });
    }
};

/**
 * Get my assets (for technician)
 */
const get_my_assets = async (req, res) => {
    try {
        const result = await asset_service.get_my_assets(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            data: result.assets,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Error fetching my assets:', error);

        if (error.message === 'Technician profile not found') {
            return res.status(403).json({
                success: false,
                message: 'Technician profile not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assets',
            error: error.message
        });
    }
};

/**
 * Bulk create assets
 */
const bulk_create = async (req, res) => {
    try {
        // Accept both 'assets' and 'records' format for compatibility with import modal
        const assetsData = req.body.assets || req.body.records;

        if (!assetsData || !Array.isArray(assetsData) || assetsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'assets or records array is required'
            });
        }

        const result = await asset_service.bulk_create_assets(assetsData, req.user, req.managerPlantIds);

        // Build appropriate success message based on what happened
        const messages = [];
        if (result.created > 0) messages.push(`${result.created} created`);
        if (result.updated > 0) messages.push(`${result.updated} updated`);
        const successMessage = messages.length > 0 ? `Assets: ${messages.join(', ')}` : 'No assets processed';

        return res.status(201).json({
            success: true,
            created: result.created,
            updated: result.updated || 0,
            imported: result.created + (result.updated || 0),
            message: successMessage,
            data: result,
            errors: result.errors.length > 0 ? result.errors : undefined
        });

    } catch (error) {
        console.error('Error bulk creating assets:', error);

        if (error.message === 'All assets failed to create') {
            return res.status(400).json({
                success: false,
                message: 'All assets failed to create'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to bulk create assets',
            error: error.message
        });
    }
};

/**
 * Get asset counts by status
 */
const get_counts = async (req, res) => {
    try {
        const counts = await asset_service.get_asset_counts(req.query);

        return res.status(200).json({
            success: true,
            data: counts
        });

    } catch (error) {
        console.error('Error fetching asset counts:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch asset counts',
            error: error.message
        });
    }
};

/**
 * Generate PDF report for asset
 */
const get_pdf = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        const asset_pdf_service = require('../../services/assets/asset_pdf_service');
        const pdf_buffer = await asset_pdf_service.generate_asset_pdf(id, {
            start_date: start_date || null,
            end_date: end_date || null
        });

        // Get asset for filename
        const asset = await asset_service.get_asset_by_id(id);
        const filename = `Asset_Report_${asset?.asset_code || id}_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdf_buffer.length);

        return res.end(pdf_buffer);

    } catch (error) {
        console.error('Error generating asset PDF:', error);

        if (error.message === 'Asset not found') {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to generate PDF report',
            error: error.message
        });
    }
};

/**
 * Bulk print QR codes for multiple assets
 */
const bulk_qr_print = async (req, res) => {
    try {
        const { asset_ids, columns = 4, rows = 5, category_id } = req.body;

        if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of asset IDs'
            });
        }

        console.log(`[BulkQRPrint] Fetching ${asset_ids.length} assets for QR print`);

        // Fetch assets with required details
        const assets = await asset_service.get_assets_for_bulk_print(asset_ids, category_id);

        if (assets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No assets found for the provided IDs'
            });
        }

        console.log(`[BulkQRPrint] Found ${assets.length} assets, generating PDF`);

        // Transform to plain objects
        const asset_data = assets.map(asset => asset.toJSON());

        // Generate PDF or ZIP
        const { generate_bulk_qr_pdf } = require('../../services/assets/bulk_qr_print_service');
        const { buffer, isZip } = await generate_bulk_qr_pdf(asset_data, { columns, rows });

        // Send response (PDF or ZIP)
        const dateStr = new Date().toISOString().split('T')[0];
        if (isZip) {
            const filename = `asset_qr_labels_${dateStr}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);
            console.log(`[BulkQRPrint] Sending ZIP (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        } else {
            const filename = `asset_qr_labels_${dateStr}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);
            console.log(`[BulkQRPrint] Sending PDF (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        }

        return res.end(buffer);

    } catch (error) {
        console.error('[BulkQRPrint] Error:', error);
        console.error('[BulkQRPrint] Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate QR print PDF',
            error: error.message,
            details: error.stack
        });
    }
};

/**
 * Get service history for an asset
 */
const get_service_history = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const result = await asset_service.get_service_history(id, page, limit);

        return res.status(200).json({
            success: true,
            data: result.submissions,
            pagination: result.pagination,
            error: result.error || undefined
        });

    } catch (error) {
        console.error('Error fetching service history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch service history',
            error: error.message
        });
    }
};

/**
 * Bulk fetch assets by IDs (for QR modal category filtering)
 */
const bulk_fetch = async (req, res) => {
    try {
        const { asset_ids } = req.body;

        if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of asset IDs'
            });
        }

        console.log(`[BulkFetch] Fetching ${asset_ids.length} assets for category filtering`);

        // Fetch assets with category data
        const assets = await asset_service.get_assets_for_bulk_print(asset_ids);

        return res.status(200).json({
            success: true,
            data: assets,
            count: assets.length
        });

    } catch (error) {
        console.error('[BulkFetch] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assets',
            error: error.message
        });
    }
};

/**
 * Get lifecycle cost & operational stats for an asset
 */
const get_lifecycle_stats = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await asset_service.get_lifecycle_stats(id);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error fetching lifecycle stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch lifecycle stats',
            error: error.message
        });
    }
};

/**
 * Get paginated lifecycle timeline
 */
const get_lifecycle_timeline = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await asset_service.get_lifecycle_timeline(id, req.query);

        return res.status(200).json({
            success: true,
            data: data.timeline,
            pagination: data.pagination
        });

    } catch (error) {
        console.error('Error fetching lifecycle timeline:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch lifecycle timeline',
            error: error.message
        });
    }
};

module.exports = {
    create,
    get_all,
    get_by_id,
    update,
    delete: delete_asset,
    restore,
    get_by_floor,
    update_floorplan_position,
    remove_from_floorplan,
    update_geolocation,
    get_status_history,
    get_location_history,
    get_my_assets,
    bulk_create,
    bulk_fetch,
    get_counts,
    get_pdf,
    bulk_qr_print,
    get_service_history,
    get_lifecycle_stats,
    get_lifecycle_timeline
};
