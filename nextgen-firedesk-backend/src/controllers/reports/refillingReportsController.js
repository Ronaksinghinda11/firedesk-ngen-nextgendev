const reportService = require('../../services/reports/reportService');

/**
 * Refilling Reports Controller
 */
const refillingReportsController = {
    /**
     * GET /api/reports/refilling/data
     * Returns JSON data for refilling reports
     */
    async getRefillingData(req, res) {
        try {
            const requestData = { ...req.body, ...req.query };
            const data = await reportService.getRefillingReportData(requestData);
            return res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('Error fetching refilling data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching refilling report data',
                error: error.message
            });
        }
    },

    /**
     * POST /api/reports/refilling/pdf
     * Returns PDF for refilling reports
     */
    async downloadRefillingPDF(req, res) {
        try {
            const requestData = { ...req.body, ...req.query };
            const pdfBuffer = await reportService.generateRefillingReportPDF(requestData);

            const filename = `refilling_report_${Date.now()}.pdf`;
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

module.exports = refillingReportsController;
