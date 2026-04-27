const reportService = require('../../services/reports/reportService');

/**
 * Hydrostatic Test Reports Controller
 */
const hydroReportsController = {
    /**
     * GET /api/reports/hydro/data
     * Returns JSON data for hydrostatic test reports
     */
    async getHydroData(req, res) {
        try {
            const requestData = { ...req.body, ...req.query };
            const data = await reportService.getHydroReportData(requestData);
            return res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('Error fetching hydro data:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching hydrostatic report data',
                error: error.message
            });
        }
    },

    /**
     * POST /api/reports/hydro/pdf
     * Returns PDF for hydrostatic test reports
     */
    async downloadHydroPDF(req, res) {
        try {
            const requestData = { ...req.body, ...req.query };
            const pdfBuffer = await reportService.generateHydroReportPDF(requestData);

            const filename = `hydrostatic_test_report_${Date.now()}.pdf`;
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

module.exports = hydroReportsController;
