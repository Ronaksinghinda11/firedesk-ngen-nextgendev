/**
 * Dashboard Analytics Controller
 *
 * HTTP layer for dashboard analytics endpoints
 * Delegates all business logic to dashboardService
 */

const dashboardService = require('../../services/dashboard/dashboardService');

const dashboardAnalyticsController = {
    // System Health
    async getSystemHealth(req, res, next) {
        try {
            const result = await dashboardService.getSystemHealth(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Hydrostatic Tests
    async getHydrostaticTests(req, res, next) {
        try {
            const result = await dashboardService.getHydrostaticTests(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Refill Status
    async getRefillStatus(req, res, next) {
        try {
            const result = await dashboardService.getRefillStatus(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Asset Distribution
    async getAssetDistribution(req, res, next) {
        try {
            const result = await dashboardService.getAssetDistribution(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Tasks Overview
    async getTasksOverview(req, res, next) {
        try {
            const result = await dashboardService.getTasksOverview(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Technician Performance
    async getTechnicianPerformance(req, res, next) {
        try {
            const result = await dashboardService.getTechnicianPerformance(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Task Distribution
    async getTaskDistribution(req, res, next) {
        try {
            const result = await dashboardService.getTaskDistribution(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Maintenance Summary
    async getMaintenanceSummary(req, res, next) {
        try {
            const result = await dashboardService.getMaintenanceSummary(req.query, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump System Overview (POST)
    async getPumpSystemOverview(req, res, next) {
        try {
            const result = await dashboardService.getPumpSystemOverview(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Water Level Trend (POST)
    async getWaterLevelTrend(req, res, next) {
        try {
            const result = await dashboardService.getWaterLevelTrend(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Diesel Level Trend (POST)
    async getDieselLevelTrend(req, res, next) {
        try {
            const result = await dashboardService.getDieselLevelTrend(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Header Pressure Trend (POST)
    async getHeaderPressureTrend(req, res, next) {
        try {
            const result = await dashboardService.getHeaderPressureTrend(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Maintenance Overview (POST)
    async getPumpMaintenanceOverviewData(req, res, next) {
        try {
            const result = await dashboardService.getPumpMaintenanceOverviewData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Know More Data (POST)
    async getPumpKnowMoreData(req, res, next) {
        try {
            const result = await dashboardService.getPumpKnowMoreData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Mode Status Trend (POST)
    async getPumpModeStatusTrend(req, res, next) {
        try {
            const result = await dashboardService.getPumpModeStatusTrend(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Condition Log Data (POST)
    async getPumpConditionLogData(req, res, next) {
        try {
            const result = await dashboardService.getPumpConditionLogData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Runtime Data (POST)
    async getPumpRuntimeData(req, res, next) {
        try {
            const result = await dashboardService.getPumpRuntimeData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Auto Manual Status Data (POST)
    async getPumpAutoManualStatusData(req, res, next) {
        try {
            const result = await dashboardService.getPumpAutoManualStatusData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Auto Manual Duration Data (POST)
    async getPumpAutoManualDurationData(req, res, next) {
        try {
            const result = await dashboardService.getPumpAutoManualDurationData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Pump Dashboard Data (POST)
    async getPumpDashboardData(req, res, next) {
        try {
            const result = await dashboardService.getPumpDashboardData(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    // Filter Helper Functions (POST)
    async getProductsByPlantAndCategory(req, res, next) {
        try {
            const result = await dashboardService.getProductsByPlantAndCategory(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getTypesByPlantAndCategory(req, res, next) {
        try {
            const result = await dashboardService.getTypesByPlantAndCategory(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getCapacitysByPlantAndCategory(req, res, next) {
        try {
            const result = await dashboardService.getCapacitysByPlantAndCategory(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getCategoriesByPlant(req, res, next) {
        try {
            const result = await dashboardService.getCategoriesByPlant(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getLocationsByBuilding(req, res, next) {
        try {
            const result = await dashboardService.getLocationsByBuilding(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getSubTypesByType(req, res, next) {
        try {
            const result = await dashboardService.getSubTypesByType(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getManufacturersByCategory(req, res, next) {
        try {
            const result = await dashboardService.getManufacturersByCategory(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async getAllAssetsForFiltering(req, res, next) {
        try {
            const result = await dashboardService.getAllAssetsForFiltering(req.body, req.user);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = dashboardAnalyticsController;
