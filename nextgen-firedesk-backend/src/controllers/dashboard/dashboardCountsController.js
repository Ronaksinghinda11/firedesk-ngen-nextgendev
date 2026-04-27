/**
 * Dashboard Counts Controller
 * Provides optimized, aggregated counts for manager dashboard
 * Uses SQL aggregation instead of fetching individual records for performance at scale
 */

const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../../../config/config');
const {
    Asset,
    Plant,
    Category,
    Technician,
    User,
    Manager,
    PlantManager,
    Ticket,
    ServiceSubmission
} = require('../../models');

/**
 * GET /api/manager/dashboard/summary
 * Returns aggregated counts for the manager dashboard
 * 
 * Performance optimized for 100,000+ assets:
 * - Uses COUNT + GROUP BY instead of fetching rows
 * - Single query per entity type
 * - No unnecessary joins or includes
 */
const getManagerSummary = async (req, res) => {
    try {
        const user = req.user;
        const { plantId } = req.query;

        console.log('[ManagerDashboardSummary] User:', user?.id, 'PlantId filter:', plantId);

        // Get manager's assigned plants using PlantManager junction table
        const manager = await Manager.findOne({
            where: { user_id: user.id }
        });

        if (!manager) {
            return res.status(404).json({
                success: false,
                message: 'Manager profile not found'
            });
        }

        // Get assigned plant IDs from junction table
        const plantAssignments = await PlantManager.findAll({
            where: { manager_id: manager.id },
            attributes: ['plant_id'],
            raw: true
        });

        const assignedPlantIds = plantAssignments.map(pa => pa.plant_id);

        // Determine which plants to query
        const plantsToQuery = plantId && plantId !== 'all'
            ? [plantId]
            : assignedPlantIds;

        if (plantsToQuery.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    plantCount: 0,
                    assetCount: 0,
                    assetsByHealth: { healthy: 0, needsAttention: 0, notWorking: 0 },
                    categoryCount: 0,
                    technicianCount: 0,
                    ticketCount: 0,
                    openTicketCount: 0,
                    serviceSummary: { completed: 0, pending: 0, upcoming: 0 }
                }
            });
        }

        // Base asset filter - always filter by assigned plants and active status
        const assetBaseFilter = {
            plant_id: { [Op.in]: plantsToQuery },
            status: { [Op.ne]: 'DEACTIVE' }
        };

        // ============================================
        // PARALLEL QUERIES for maximum performance
        // ============================================
        const [
            // 1. Asset counts by health status (single GROUP BY query)
            healthCounts,
            // 2. Total asset count
            totalAssetCount,
            // 3. Category count (distinct categories in use)
            categoryCount,
            // 4. Technician count
            technicianCount,
            // 5. Ticket counts
            ticketCounts,
            // 6. Service submission counts
            serviceCounts
        ] = await Promise.all([
            // Health status counts using raw SQL for efficiency
            Asset.findAll({
                attributes: [
                    'health_status',
                    [fn('COUNT', col('id')), 'count']
                ],
                where: assetBaseFilter,
                group: ['health_status'],
                raw: true
            }),

            // Total count
            Asset.count({ where: assetBaseFilter }),

            // Unique categories in these plants
            Asset.count({
                where: assetBaseFilter,
                distinct: true,
                col: 'category_id'
            }),

            // Technicians assigned to these plants
            Technician.count({
                include: [{
                    model: Plant,
                    as: 'plants',
                    where: { id: { [Op.in]: plantsToQuery } },
                    through: { attributes: [] },
                    required: true
                }],
                distinct: true,
                col: 'id'
            }),

            // Tickets - total and open
            Ticket ? Promise.all([
                Ticket.count({
                    where: { plant_id: { [Op.in]: plantsToQuery } }
                }),
                Ticket.count({
                    where: {
                        plant_id: { [Op.in]: plantsToQuery },
                        completed_status: 'Pending'
                    }
                })
            ]) : Promise.resolve([0, 0]),

            // Service submissions - completed, pending, upcoming
            Promise.all([
                ServiceSubmission.count({
                    where: {
                        plant_id: { [Op.in]: plantsToQuery },
                        status: { [Op.or]: [{ [Op.iLike]: 'COMPLETED' }, { [Op.iLike]: 'APPROVED' }] }
                    }
                }),
                ServiceSubmission.count({
                    where: {
                        plant_id: { [Op.in]: plantsToQuery },
                        status: { [Op.iLike]: 'PENDING' }
                    }
                }),
                ServiceSubmission.count({
                    where: {
                        plant_id: { [Op.in]: plantsToQuery },
                        scheduled_date: { [Op.gt]: new Date() },
                        status: {
                            [Op.and]: [
                                { [Op.notILike]: 'COMPLETED' },
                                { [Op.notILike]: 'APPROVED' },
                                { [Op.notILike]: 'REJECTED' },
                                { [Op.notILike]: 'CANCELLED' }
                            ]
                        }
                    }
                })
            ])
        ]);

        // Process health counts
        const assetsByHealth = {
            healthy: 0,
            needsAttention: 0,
            notWorking: 0
        };

        healthCounts.forEach(row => {
            const status = row.health_status;
            const count = parseInt(row.count, 10);

            if (status === 'HEALTHY') assetsByHealth.healthy = count;
            else if (status === 'NEEDS_ATTENTION') assetsByHealth.needsAttention = count;
            else if (status === 'NOT_WORKING') assetsByHealth.notWorking = count;
        });

        // Process ticket counts
        const [totalTickets, openTickets] = ticketCounts;

        // Process service counts  
        const [completedServices, pendingServices, upcomingServices] = serviceCounts;

        const result = {
            plantCount: plantsToQuery.length,
            assetCount: totalAssetCount,
            assetsByHealth,
            categoryCount,
            technicianCount,
            ticketCount: totalTickets,
            openTicketCount: openTickets,
            serviceSummary: {
                completed: completedServices,
                pending: pendingServices,
                upcoming: upcomingServices
            }
        };

        console.log('[ManagerDashboardSummary] Result:', JSON.stringify(result, null, 2));

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[ManagerDashboardSummary] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard summary',
            error: error.message
        });
    }
};

module.exports = {
    getManagerSummary
};
