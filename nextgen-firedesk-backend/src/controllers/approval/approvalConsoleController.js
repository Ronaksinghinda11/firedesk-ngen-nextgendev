/**
 * Approval Console Controller
 * HTTP handlers for the Service Approval Console endpoints
 */

const approvalConsoleService = require('../../services/approval/approvalConsoleService');

/**
 * GET /api/manager/approval-console/kpis
 * Returns KPI summary for the top strip
 */
const getKPIs = async (req, res, next) => {
    try {
        const { plantIds } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        if (plantIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_pending: 0,
                    total_submitted_today: 0,
                    high_risk_count: 0,
                    compliance_impact_count: 0,
                    overdue_count: 0,
                    ai_suggested_rejections: 0
                }
            });
        }
        const kpis = await approvalConsoleService.getKPIs(plantIds);
        return res.json({ success: true, data: kpis });
    } catch (error) {
        console.error('❌ [ApprovalConsole] getKPIs error:', error);
        return next(error);
    }
};

/**
 * GET /api/manager/approval-console
 * Returns the approval queue (main table data)
 */
const getApprovalQueue = async (req, res, next) => {
    try {
        const { plantIds } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        if (plantIds.length === 0) {
            return res.json({
                success: true,
                data: { submissions: [], pagination: { total: 0, page: 1, limit: 50, total_pages: 0 } }
            });
        }
        const result = await approvalConsoleService.getApprovalQueue(plantIds, req.query);
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ [ApprovalConsole] getApprovalQueue error:', error);
        return next(error);
    }
};

/**
 * GET /api/manager/approval-console/submissions/:id/details
 * Returns detailed expansion data for a single submission
 */
const getSubmissionDetails = async (req, res, next) => {
    try {
        const { plantIds } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        const details = await approvalConsoleService.getSubmissionDetails(req.params.id);

        if (!details) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        return res.json({ success: true, data: details });
    } catch (error) {
        console.error('❌ [ApprovalConsole] getSubmissionDetails error:', error);
        return next(error);
    }
};

/**
 * POST /api/manager/approval-console/bulk-approve
 * Bulk approve multiple submissions
 * Body: { submissionIds: string[], remarks?: string }
 */
const bulkApprove = async (req, res, next) => {
    try {
        const { submissionIds, remarks } = req.body;

        if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({ success: false, message: 'submissionIds array is required' });
        }

        const { plantIds, managerId } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        if (!managerId) {
            return res.status(403).json({ success: false, message: 'Manager profile not found' });
        }

        const result = await approvalConsoleService.bulkApprove(submissionIds, managerId, remarks, plantIds);

        console.log(`✅ [ApprovalConsole] Bulk approve: ${result.approved} approved, ${result.failed.length} failed`);

        return res.json({
            success: true,
            message: `${result.approved} service(s) approved successfully`,
            data: result
        });
    } catch (error) {
        console.error('❌ [ApprovalConsole] bulkApprove error:', error);
        return next(error);
    }
};

/**
 * POST /api/manager/approval-console/bulk-reject
 * Bulk reject multiple submissions
 * Body: { submissionIds: string[], remarks: string }
 */
const bulkReject = async (req, res, next) => {
    try {
        const { submissionIds, remarks } = req.body;

        if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({ success: false, message: 'submissionIds array is required' });
        }

        if (!remarks || remarks.trim() === '') {
            return res.status(400).json({ success: false, message: 'Rejection remarks are required' });
        }

        const { plantIds, managerId } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        if (!managerId) {
            return res.status(403).json({ success: false, message: 'Manager profile not found' });
        }

        const result = await approvalConsoleService.bulkReject(submissionIds, managerId, remarks, plantIds);

        console.log(`❌ [ApprovalConsole] Bulk reject: ${result.rejected} rejected, ${result.failed.length} failed`);

        return res.json({
            success: true,
            message: `${result.rejected} service(s) rejected`,
            data: result
        });
    } catch (error) {
        console.error('❌ [ApprovalConsole] bulkReject error:', error);
        return next(error);
    }
};

/**
 * GET /api/manager/approval-console/alerts
 * Returns alert data for the right-side panel
 */
const getAlerts = async (req, res, next) => {
    try {
        const { plantIds } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        if (plantIds.length === 0) {
            return res.json({
                success: true,
                data: { assets_not_working: [], repeated_failures: [], critical_compliance: [] }
            });
        }
        const alerts = await approvalConsoleService.getAlerts(plantIds);
        return res.json({ success: true, data: alerts });
    } catch (error) {
        console.error('❌ [ApprovalConsole] getAlerts error:', error);
        return next(error);
    }
};

/**
 * GET /api/manager/approval-console/filter-data
 * Returns dropdown data for filter selects
 */
const getFilterDropdownData = async (req, res, next) => {
    try {
        const { plantIds } = await approvalConsoleService.getManagerPlantIds(req.user.id);
        if (plantIds.length === 0) {
            return res.json({ success: true, data: { technicians: [], categories: [] } });
        }
        const data = await approvalConsoleService.getFilterDropdownData(plantIds);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('❌ [ApprovalConsole] getFilterDropdownData error:', error);
        return next(error);
    }
};

module.exports = {
    getKPIs,
    getApprovalQueue,
    getSubmissionDetails,
    bulkApprove,
    bulkReject,
    getAlerts,
    getFilterDropdownData
};
