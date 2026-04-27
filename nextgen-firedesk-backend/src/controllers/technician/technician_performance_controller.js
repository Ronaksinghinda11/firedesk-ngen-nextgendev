/**
 * Technician Performance Controller
 * Handles performance report generation for technicians
 */
const { Op } = require('sequelize');
const {
    Technician,
    Plant,
    TechnicianPlant,
    ServiceSubmission
} = require('../../models');

/**
 * Get technician's assigned plants
 * GET /api/technician/performance-report/plants
 */
const get_my_plants = async (req, res, next) => {
    try {
        const technician = await Technician.findOne({
            where: { user_id: req.user.id },
            include: [{
                model: Plant,
                as: 'plants',
                attributes: ['id', ['plant_name', 'plantName'], 'address_line1'],
                through: { attributes: [] }
            }]
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        return res.json({
            success: true,
            plants: technician.plants || []
        });
    } catch (error) {
        console.error('[Performance Report] Error fetching plants:', error);
        return next(error);
    }
};

/**
 * Get Performance Report Data (JSON)
 * GET /api/technician/performance-report/data
 * Query Params: startDate, endDate (ISO format YYYY-MM-DD), plantId (optional)
 */
const get_report_data = async (req, res, next) => {
    try {
        const { startDate, endDate, plantId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate query parameters are required'
            });
        }

        const technician = await Technician.findOne({
            where: { user_id: req.user.id }
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        console.log(`[Performance Report] Fetching data for technician ${technician.id}`);

        // Import the shared service logic
        const { get_technician_performance_data } = require('../../services/reports/technician_performance_report_service');

        // Fetch rich data using the shared service
        // This returns the exact structure expected by the mobile app's PerformanceReportData interface
        const reportData = await get_technician_performance_data(technician.id, startDate, endDate, plantId);

        return res.json({
            success: true,
            ...reportData
        });
    } catch (error) {
        console.error('[Performance Report] Error fetching data:', error);
        return next(error);
    }
};

/**
 * Generate Performance Report PDF
 * POST /api/technician/performance-report/pdf
 * Query Params: startDate, endDate (ISO format YYYY-MM-DD), plantId (optional)
 */
const generate_performance_report = async (req, res, next) => {
    try {
        const { startDate, endDate, plantId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate query parameters are required (format: YYYY-MM-DD)'
            });
        }

        // Validate date format
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const technician = await Technician.findOne({
            where: { user_id: req.user.id },
            include: [{
                model: require('../../models').User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }]
        });

        if (!technician) {
            return res.status(403).json({
                success: false,
                message: 'User is not a technician'
            });
        }

        console.log(`[Performance Report] Generating PDF for technician ${technician.id}`);
        console.log(`[Performance Report] Date range: ${startDate} to ${endDate}`);

        // Import PDF generation service
        const { generate_performance_pdf } = require('../../services/reports/technician_performance_report_service');

        const pdfBuffer = await generate_performance_pdf(technician.id, startDate, endDate, plantId);

        // Set response headers
        const filename = `Performance_Report_${startDate}_to_${endDate}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });

        return res.end(pdfBuffer);
    } catch (error) {
        console.error('[Performance Report] Error generating PDF:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate performance report',
            error: error.message
        });
    }
};

module.exports = {
    get_my_plants,
    get_report_data,
    generate_performance_report
};
