const reportService = require('../../services/reports/reportService');

/**
 * Service Reports Controller
 * Handles Inspection, Testing, and Maintenance reports
 */
const serviceReportsController = {
    /**
     * GET /api/reports/service/data
     * Returns JSON data for service reports
     */
    async getReportsData(req, res) {
        try {
            const requestData = { ...req.body, ...req.query };

            if (!requestData.serviceType || !['Inspection', 'Testing', 'Maintenance'].includes(requestData.serviceType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid service type. Must be one of: Inspection, Testing, Maintenance'
                });
            }

            const data = await reportService.getServiceReportData(requestData);
            return res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('Error fetching service reports data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching service reports data',
                error: error.message
            });
        }
    },

    /**
     * POST /api/reports/service/pdf
     * Returns PDF for service reports
     */
    async downloadReportsPDF(req, res) {
        try {
            const requestData = { ...req.body, ...req.query };

            // Allow inspectionType as alias for serviceType
            if (!requestData.serviceType && requestData.inspectionType) {
                requestData.serviceType = requestData.inspectionType;
            }

            if (!requestData.serviceType || !['Inspection', 'Testing', 'Maintenance'].includes(requestData.serviceType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid service type. Must be one of: Inspection, Testing, Maintenance'
                });
            }

            const pdfBuffer = await reportService.generateServiceReportPDF(requestData);

            // Send PDF
            const filename = `${requestData.serviceType.toLowerCase()}_report_${Date.now()}.pdf`;
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Content-Length': pdfBuffer.length
            });

            res.end(pdfBuffer);
        } catch (error) {
            console.error('PDF generation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error generating PDF report',
                error: error.message
            });
        }
    }
};

module.exports = serviceReportsController;
