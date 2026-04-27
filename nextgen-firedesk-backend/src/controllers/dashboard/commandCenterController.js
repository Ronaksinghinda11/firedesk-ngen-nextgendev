/**
 * Command Center Controller
 *
 * Provides aggregated data for:
 * 1. Plant Command Center — single-plant fire safety summary
 * 2. Regional EHS Command Center — multi-facility overview
 *
 * All category data is loaded dynamically from the DB, never hard-coded.
 *
 * Actual model columns (verified via rawAttributes):
 * - Asset: status, health_status, install_date, plant_id, category_id
 * - Ticket: completed_status, ticket_type, plant_id, category_id
 * - PlantManager: plant_id, manager_id  (association: 'plant')
 * - Manager: user_id, status  (associations: 'user', 'plants', 'plant_assignments')
 * - Category: associations include 'plants' (belongsToMany via PlantCategory)
 */

const { Op } = require('sequelize');
const { sequelize } = require('../../../config/config');
const {
    Asset,
    AssetActiveCondition,
    Plant,
    Category,
    Condition,
    Ticket,
    ServiceSubmission,
    Manager,
    PlantManager,
    Technician,
    TechnicianPlant,
    User,
    Product,
    ComplianceRecord,
} = require('../../models');
const Notification = require('../../models/notifications/Notification');
const Scheduler = require('../../models/plants/Scheduler');

/** UUID v4 regex for parameter validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isFireExtinguisherCategory(name = '') {
    const n = String(name).toLowerCase();
    return n.includes('extinguisher');
}

function isHydrantCategory(name = '') {
    const n = String(name).toLowerCase();
    return n.includes('hydrant');
}

function isPumpRoomCategory(name = '') {
    const n = String(name).toLowerCase();
    return n.includes('pump');
}

/**
 * Determine AMC status for a category by checking the maintenance_schedulers table.
 * Returns 'OK' | 'LAPSED' | 'NO AMC'
 */
async function getAmcStatus(plantId, categoryId) {
    try {
        const record = await Scheduler.findOne({
            where: { plant_id: plantId, category_id: categoryId, is_active: true },
            order: [['created_at', 'DESC']],
        });
        if (!record) return 'NO AMC';
        if (!record.schedule_start_date || !record.schedule_end_date) return 'NO AMC';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(record.schedule_start_date);
        const end = new Date(record.schedule_end_date);
        if (today < start) return 'DUE';
        return (today <= end) ? 'OK' : 'LAPSED';
    } catch {
        return 'NO AMC';
    }
}

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

/**
 * Get categories for a given plant via the PlantCategory junction table.
 */
async function getCategoriesForPlant(plantId) {
    try {
        return await Category.findAll({
            include: [{
                model: Plant,
                as: 'plants',
                where: { id: plantId },
                through: { attributes: [] },
                required: true,
            }],
        });
    } catch {
        return [];
    }
}

/**
 * Build a category summary object for one category within a plant.
 * Uses actual column names: Asset.status, Asset.install_date, Ticket.completed_status.
 */
async function buildCategorySummary(plantId, category) {
    const catId = category.id;
    const catName = category.category_name || category.categoryName || 'Unknown';
    const fireExtCategory = isFireExtinguisherCategory(catName);

    // Total assets in this plant + category
    const totalAssets = await Asset.count({
        where: { plant_id: plantId, category_id: catId },
    });

    // Healthy assets — health_status ENUM: HEALTHY, NEEDS_ATTENTION, NOT_WORKING, INVENTORY, OBSOLETE
    // status ENUM: ACTIVE, DEACTIVE
    const healthyAssets = await Asset.count({
        where: {
            plant_id: plantId,
            category_id: catId,
            status: 'ACTIVE',
            health_status: 'HEALTHY',
        },
    });

    // Category score: assets with compliance_score = 100 (fully compliant) / total assets
    const compliantAssets = await Asset.count({
        where: { plant_id: plantId, category_id: catId, compliance_score: 100 },
    });
    const score = totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 100;

    // Open tickets for this category
    // completed_status ENUM: Pending, In Progress, Rejected, Waiting for approval, Completed
    const openTickets = await Ticket.count({
        where: {
            plant_id: plantId,
            category_id: catId,
            completed_status: { [Op.notIn]: ['Completed'] },
        },
    }).catch(() => 0);

    // Ageing buckets (by install_date — actual column name)
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

    const [age0to3, age3to5, age5plus] = await Promise.all([
        Asset.count({
            where: {
                plant_id: plantId,
                category_id: catId,
                install_date: { [Op.gte]: threeYearsAgo },
            },
        }).catch(() => 0),
        Asset.count({
            where: {
                plant_id: plantId,
                category_id: catId,
                install_date: { [Op.between]: [fiveYearsAgo, threeYearsAgo] },
            },
        }).catch(() => 0),
        Asset.count({
            where: {
                plant_id: plantId,
                category_id: catId,
                install_date: { [Op.lt]: fiveYearsAgo },
            },
        }).catch(() => 0),
    ]);

    const assetIds = await Asset.findAll({
        where: { plant_id: plantId, category_id: catId },
        attributes: ['id'],
        raw: true
    }).then(res => res.map(a => a.id));

    // Also get ServiceSubmission IDs for this category's assets
    // (Service OVERDUE notifications point to ServiceSubmission, not Asset)
    const submissionIds = assetIds.length > 0
        ? await ServiceSubmission.findAll({
            where: { asset_id: { [Op.in]: assetIds } },
            attributes: ['id'],
            raw: true,
        }).then(rows => rows.map(r => r.id)).catch(() => [])
        : [];

    let categoryAlarms = { green: 0, orange: 0, red: 0 };
    if (assetIds.length > 0) {
        // Build OR condition: notifications linked by asset OR by ServiceSubmission
        const orConditions = [
            {
                related_entity_type: { [Op.in]: ['asset', 'Asset'] },
                related_entity_id: { [Op.in]: assetIds },
            },
        ];
        if (submissionIds.length > 0) {
            orConditions.push({
                related_entity_type: 'ServiceSubmission',
                related_entity_id: { [Op.in]: submissionIds },
            });
        }

        categoryAlarms = await Notification.findAll({
            where: {
                [Op.or]: orConditions,
                is_read: false,
            },
            attributes: ['priority'],
            raw: true,
        }).then((rows) => ({
            green: rows.filter((r) => r.priority === 'LOW' || r.priority === 'MEDIUM').length,
            orange: rows.filter((r) => r.priority === 'HIGH').length,
            red: rows.filter((r) => r.priority === 'CRITICAL').length,
        })).catch(() => ({ green: 0, orange: 0, red: 0 }));
    }

    // AMC status for pump room categories (from Scheduler table)
    const pumpCategory = isPumpRoomCategory(catName);
    const amcStatus = pumpCategory ? await getAmcStatus(plantId, catId) : undefined;

    const baseSummary = {
        id: catId,
        name: catName,
        imageUrl: null,
        score,
        scoreLabel: score >= 85 ? 'READY' : score >= 60 ? 'ATTENTION' : 'CRITICAL',
        isLive: false,
        lastUpdated: null,
        statusItems: [
            { label: 'Total Assets', value: totalAssets },
            { label: 'Healthy', value: healthyAssets },
            { label: 'Open Tickets', value: openTickets },
        ],
        alerts: [],
        alarms: categoryAlarms,
        ageing: [
            { label: '0-3Y', count: age0to3, color: '#16a34a' },
            { label: '3-5Y', count: age3to5, color: '#f97316' },
            { label: '5+Y', count: age5plus, color: '#dc2626' },
        ],
        ...(pumpCategory && { amcStatus }),
    };

    const hydrantCategory = isHydrantCategory(catName);

    if (!fireExtCategory && !hydrantCategory) {
        return baseSummary;
    }

    if (fireExtCategory) {
        const currentDate = new Date();
        const fireAssets = await Asset.findAll({
            where: { plant_id: plantId, category_id: catId },
            attributes: [
                'id',
                'asset_code',
                'health_status',
                'manufacturing_date',
                'created_at',
                'updated_at',
                'conditions',
                'next_service_date',
                'last_service_date',
            ],
            raw: true,
        }).catch(() => []);

        // Availability: assets that are HEALTHY or NEEDS_ATTENTION (active equipment)
        const availabilityCount = fireAssets.filter(a =>
            a.health_status === 'HEALTHY' || a.health_status === 'NEEDS_ATTENTION'
        ).length;

        // Refill Status: count assets whose manufacturing_date is on or before today
        // (i.e. already manufactured — all current assets should qualify)
        const refillCount = fireAssets.filter((a) => {
            const d = a.manufacturing_date ? new Date(a.manufacturing_date) : null;
            return d && d <= currentDate;
        }).length;

        // HP Test Status uses the same logic as refill status
        const hpTestCount = refillCount;

        // Service Status: assets with last_service_date OR next_service_date not null
        const serviceStatusCount = fireAssets.filter((a) =>
            (a.last_service_date != null && String(a.last_service_date).trim() !== '') ||
            (a.next_service_date != null && String(a.next_service_date).trim() !== '')
        ).length;

        // Due for Service: assets where next_service_date <= today (due today or already overdue).
        // Since next_service_date is a DATEONLY field, we extract the YYYY, MM, DD manually to avoid timezone bugs.
        const todayY = currentDate.getFullYear();
        const todayM = currentDate.getMonth() + 1;
        const todayD = currentDate.getDate();

        const dueForServiceCount = fireAssets.filter((a) => {
            if (!a.next_service_date || typeof a.next_service_date !== 'string') return false;
            const [y, m, d] = a.next_service_date.split('-').map(Number);
            if (!y || !m || !d) return false;
            if (y !== todayY) return y < todayY;
            if (m !== todayM) return m < todayM;
            return d <= todayD;
        }).length;

        // Condition counts from conditions JSONB array on Asset (array of condition name strings)
        // e.g. ["Obstruct", "Displaced", "Low Pressure"]
        const conditionCounts = fireAssets.reduce((acc, a) => {
            const conds = Array.isArray(a.conditions) ? a.conditions : [];
            conds.forEach((name) => {
                const n = String(name).toLowerCase();
                if (n.includes('obstruct')) acc.obstruct += 1;
                if (n.includes('displac')) acc.displaced += 1;
                if (n.includes('low') && n.includes('press')) acc.lowPressure += 1;
            });
            return acc;
        }, { obstruct: 0, displaced: 0, lowPressure: 0 });

        return {
            ...baseSummary,
            scoreLabel: 'COMPLIANCE',
            statusItems: [
                { label: 'Availability', value: availabilityCount, total: totalAssets },
                { label: 'Refill Status', value: refillCount, total: totalAssets },
                { label: 'Service Status', value: serviceStatusCount, total: totalAssets },
                { label: 'HP Test Status', value: hpTestCount, total: totalAssets },
                { label: 'Due for Service', value: dueForServiceCount, total: totalAssets },
                { label: 'Tickets', value: openTickets },
            ],
            alerts: [
                { icon: 'ban', label: 'OBSTRUCT.', value: String(conditionCounts.obstruct), color: conditionCounts.obstruct > 0 ? '#f97316' : '#16a34a' },
                { icon: 'displaced', label: 'DISPLACED', value: String(conditionCounts.displaced), color: conditionCounts.displaced > 0 ? '#f97316' : '#16a34a' },
                { icon: 'pressure', label: 'LOW PRESS.', value: String(conditionCounts.lowPressure), color: conditionCounts.lowPressure > 0 ? '#dc2626' : '#16a34a' },
            ],
            alarms: categoryAlarms,
        };
    }

    // Build hydrant category data
    // Use nest:true with raw:true so Sequelize properly nests the product association
    // (without nest:true, product columns come back as flat 'product.product_name' string keys
    //  which silently return undefined when the join row is null)
    const hydrantAssets = await Asset.findAll({
        where: { plant_id: plantId, category_id: catId },
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['product_name'],
                required: false,
            },
        ],
        attributes: [
            'id',
            'asset_code',
            'manufacturing_date',
            'conditions',
            'next_service_date',
            'last_service_date',
        ],
        raw: true,
        nest: true,
    }).catch(() => []);

    // Count external and internal hydrants by exact phrase in product name (case-insensitive)
    const externalHydrantCount = hydrantAssets.filter((a) => {
        const productName = String(a.product?.product_name || '').toLowerCase();
        return productName.includes('external hydrant');
    }).length;

    const internalHydrantCount = hydrantAssets.filter((a) => {
        const productName = String(a.product?.product_name || '').toLowerCase();
        return productName.includes('internal hydrant');
    }).length;

    // Condition counts and valve position from conditions JSONB array on Asset
    // (no junction table needed — conditions JSONB is kept in sync by assetHealthService)
    const hydrantConditionCounts = hydrantAssets.reduce((acc, a) => {
        const conds = Array.isArray(a.conditions) ? a.conditions : [];
        conds.forEach((name) => {
            const n = String(name).toLowerCase();
            if (n.includes('obstruct')) acc.obstruct += 1;
            if (n.includes('spare')) acc.spare += 1;
            if (n.includes('valve') && n.includes('close')) acc.valveClose += 1;
        });
        return acc;
    }, { obstruct: 0, spare: 0, valveClose: 0 });

    const valvePositionCount = hydrantConditionCounts.valveClose;

    // Service Status: assets with last_service_date OR next_service_date not null
    const hydrantServiceStatusCount = hydrantAssets.filter((a) =>
        (a.last_service_date != null && String(a.last_service_date).trim() !== '') ||
        (a.next_service_date != null && String(a.next_service_date).trim() !== '')
    ).length;

    return {
        ...baseSummary,
        scoreLabel: 'SYSTEM READINESS',
        statusItems: [
            { label: 'Main Header Pressure', value: '12.0', total: 'bar', unit: '' }, // Hardcoded to 12.0
            { label: 'External Hydrant', value: externalHydrantCount, total: totalAssets },
            { label: 'Valve Position', value: valvePositionCount, total: totalAssets },
            { label: 'Service Status', value: hydrantServiceStatusCount, total: totalAssets },
            { label: 'Internal Hydrant', value: internalHydrantCount, total: totalAssets },
            { label: 'Tickets', value: openTickets },
        ],
        alerts: [
            { icon: 'ban', label: 'OBSTRUCT.', value: String(hydrantConditionCounts.obstruct), color: hydrantConditionCounts.obstruct > 0 ? '#f97316' : '#16a34a' },
            { icon: 'wrench', label: 'SPARES', value: String(hydrantConditionCounts.spare), color: hydrantConditionCounts.spare > 0 ? '#dc2626' : '#16a34a' },
        ],
        alarms: categoryAlarms,
    };
}

/**
 * Count tickets by completed_status for a plant.
 * Open = tickets that are NOT 'Completed' and NOT 'Rejected'.
 */
async function countTicketsForPlant(plantId) {
    const total = await Ticket.count({
        where: { plant_id: plantId },
    }).catch(() => 0);

    const open = await Ticket.count({
        where: {
            plant_id: plantId,
            completed_status: { [Op.notIn]: ['Completed', 'Rejected'] },
        },
    }).catch(() => 0);

    const closed = total - open;

    return { total, open, closed };
}

/**
 * Get all people (managers + technicians) assigned to a plant.
 * Returns an array of { name, role, color } objects.
 */
async function getPlantPeopleInfo(plantId) {
    const people = [];
    const colors = ['red', 'blue', 'purple', 'green', 'indigo', 'orange'];
    let colorIdx = 0;

    try {
        // Managers
        const pmRecords = await PlantManager.findAll({
            where: { plant_id: plantId },
            attributes: ['manager_id'],
        });
        if (pmRecords.length) {
            const managerIds = pmRecords.map(pm => pm.manager_id);
            const managers = await Manager.findAll({
                where: { id: { [Op.in]: managerIds } },
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            });
            for (const mgr of managers) {
                const u = mgr.user;
                if (!u) continue;
                const name = u.name || 'Unknown';
                people.push({
                    initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
                    name,
                    role: 'Manager',
                    email: u.email || null,
                    phone: u.phone || null,
                    tags: [],
                    assetCount: 0,
                    color: colors[colorIdx++ % colors.length],
                });
            }
        }
    } catch { /* ignore */ }

    try {
        // Technicians via TechnicianPlant junction table
        const tpRecords = await TechnicianPlant.findAll({
            where: { plant_id: plantId },
            attributes: ['technician_id'],
            raw: true,
        });
        if (tpRecords.length) {
            const techIds = [...new Set(tpRecords.map(tp => tp.technician_id))];
            const technicians = await Technician.findAll({
                where: { id: { [Op.in]: techIds }, status: 'Active' },
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
            });
            for (const tech of technicians) {
                const u = tech.user;
                if (!u) continue;
                const name = u.name || 'Unknown';
                const role = tech.technician_type === 'Third-Party' ? 'Third-Party Tech' : 'Technician';
                people.push({
                    initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
                    name,
                    role,
                    email: u.email || null,
                    phone: u.phone || null,
                    tags: tech.specialization ? [tech.specialization] : [],
                    assetCount: 0,
                    color: colors[colorIdx++ % colors.length],
                });
            }
        }
    } catch { /* ignore */ }

    return people;
}

/**
 * Resolve plant IDs accessible by a user.
 */
async function getAccessiblePlantIds(user) {
    const userType = user.userType || user.user_type;
    if (userType === 'admin') {
        const allPlants = await Plant.findAll({ attributes: ['id'] });
        return allPlants.map(p => p.id);
    }

    const manager = await Manager.findOne({ where: { user_id: user.id } });
    if (!manager) return [];

    const assignments = await PlantManager.findAll({
        where: { manager_id: manager.id },
        attributes: ['plant_id'],
    });
    return assignments.map(a => a.plant_id);
}

/* ================================================================== */
/*  GET /api/dashboard/plant/:plantId/summary                          */
/*  Summary card data for PlantCommandCenterCard                       */
/* ================================================================== */

const getPlantSummary = async (req, res) => {
    try {
        const { plantId } = req.params;

        if (!UUID_REGEX.test(plantId)) {
            return res.status(400).json({ success: false, message: 'Invalid plant ID format' });
        }

        const plant = await Plant.findByPk(plantId);
        if (!plant) {
            return res.status(404).json({ success: false, message: 'Plant not found' });
        }

        // Dynamic categories for this plant
        const categories = await getCategoriesForPlant(plantId);

        const categoryScores = [];
        for (const cat of categories) {
            const summary = await buildCategorySummary(plantId, cat);
            categoryScores.push({
                id: summary.id,
                name: summary.name,
                score: summary.score,
                scoreLabel: summary.scoreLabel,
            });
        }

        // Plant readiness — weighted formula (same as getPlantCommandCenter):
        //   50% asset compliance + 20% audit + 15% training + 15% statutory
        const totalPlantAssets = await Asset.count({ where: { plant_id: plantId } }).catch(() => 0);
        const compliantPlantAssets = await Asset.count({
            where: { plant_id: plantId, compliance_score: 100 },
        }).catch(() => 0);
        const assetPct = totalPlantAssets > 0 ? ((compliantPlantAssets / totalPlantAssets) * 50) : 50;

        const complianceRec = await ComplianceRecord.findOne({
            where: { plant_id: plantId },
            attributes: ['fire_noc_expiry_date', 'insurance_policy_number'],
            order: [['updated_at', 'DESC']],
        }).catch(() => null);

        const summaryStatutoryPct = (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const fireNocValid = complianceRec?.fire_noc_expiry_date
                ? new Date(complianceRec.fire_noc_expiry_date) > today
                : false;
            const insuranceValid = !!(complianceRec?.insurance_policy_number);
            return (fireNocValid || insuranceValid) ? 15 : 0;
        })();

        const totalReadinessPct = assetPct + 20 + 15 + summaryStatutoryPct;
        const readinessStatus = totalReadinessPct >= 85 ? 'READY'
            : totalReadinessPct >= 60 ? 'ATTENTION'
                : 'CRITICAL';
        const avgScore = categoryScores.length > 0
            ? Math.round(categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length)
            : 100;

        const criticalGaps = await Asset.count({
            where: {
                plant_id: plantId,
                status: 'ACTIVE',
                health_status: 'NOT_WORKING',
            },
        }).catch(() => 0);

        // Open issues
        const tickets = await countTicketsForPlant(plantId);

        // Last service
        const lastService = await ServiceSubmission.findOne({
            where: { plant_id: plantId },
            order: [['created_at', 'DESC']],
            attributes: ['created_at'],
        }).catch(() => null);

        const lastServiceDate = lastService
            ? new Date(lastService.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '-';

        res.json({
            success: true,
            data: {
                readinessStatus,
                operationalScore: avgScore,
                criticalGaps,
                openIssues: { critical: 0, major: tickets.open, minor: 0 },
                lastHealthCheck: { date: '-', time: '-', completed: false },
                nextAuditDue: { date: '-', label: '-', daysRemaining: 0 },
                compliance: {
                    fireNOC: { validTill: '-', daysRemaining: 0 },
                    insurance: { validTill: '-', daysRemaining: 0 },
                    training: 'On Schedule',
                    audit: 'On Schedule',
                },
                openIssuesCount: tickets.open,
                alarmsCount: 0,
                lastServiceDate,
                categories: categoryScores,
            },
        });
    } catch (err) {
        console.error('[CommandCenter] getPlantSummary error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/* ================================================================== */
/*  GET /api/dashboard/plant/:plantId/command-center                   */
/*  Full page data for PlantCommandCenterPage                          */
/* ================================================================== */

const getPlantCommandCenter = async (req, res) => {
    try {
        const { plantId } = req.params;

        if (!UUID_REGEX.test(plantId)) {
            return res.status(400).json({ success: false, message: 'Invalid plant ID format' });
        }

        const plant = await Plant.findByPk(plantId);
        if (!plant) {
            return res.status(404).json({ success: false, message: 'Plant not found' });
        }

        // Dynamic categories
        const categories = await getCategoriesForPlant(plantId);

        const categorySummaries = [];
        for (const cat of categories) {
            categorySummaries.push(await buildCategorySummary(plantId, cat));
        }

        // Tickets
        const tickets = await countTicketsForPlant(plantId);

        // People (managers + technicians assigned to this plant)
        const people = await getPlantPeopleInfo(plantId);

        // Compliance data from ComplianceRecord table (fetched early — needed for readiness calculation)
        const complianceRecord = await ComplianceRecord.findOne({
            where: { plant_id: plantId },
            attributes: [
                'fire_noc_number',
                'fire_noc_expiry_date',
                'insurance_policy_number',
                'insurance_name',
                'insurance_validity_date',
            ],
            order: [['updated_at', 'DESC']],
        }).catch(() => null);

        // Plant readiness — weighted formula:
        //   50% = asset compliance  (assets with compliance_score=100 across whole plant / total plant assets)
        //   20% = audit compliance  (not tracked yet → always full)
        //   15% = training compliance (not tracked yet → always full)
        //   15% = statutory compliance (fire NOC expiry in future OR insurance present → full 15, else 0)
        const totalPlantAssets = await Asset.count({ where: { plant_id: plantId } }).catch(() => 0);
        const compliantPlantAssets = await Asset.count({
            where: { plant_id: plantId, compliance_score: 100 },
        }).catch(() => 0);
        const assetPct = totalPlantAssets > 0
            ? ((compliantPlantAssets / totalPlantAssets) * 50)
            : 50; // no assets → full weightage

        // Statutory: fire NOC valid (expiry in future) OR insurance present
        const statutoryPct = (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const fireNocValid = complianceRecord?.fire_noc_expiry_date
                ? new Date(complianceRecord.fire_noc_expiry_date) > today
                : false;
            const insuranceValid = !!(complianceRecord?.insurance_policy_number);
            return (fireNocValid || insuranceValid) ? 15 : 0;
        })();

        const totalReadinessPct = assetPct + 20 + 15 + statutoryPct;
        const readinessStatus = totalReadinessPct >= 85 ? 'READY'
            : totalReadinessPct >= 60 ? 'ATTENTION'
                : 'CRITICAL';

        const criticalGaps = await Asset.count({
            where: {
                plant_id: plantId,
                status: 'ACTIVE',
                health_status: 'NOT_WORKING',
            },
        }).catch(() => 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // FireNOC: valid if fire_noc_expiry_date exists
        let fireNOCValidTill = '-';
        let fireNOCDaysRemaining = 0;
        if (complianceRecord?.fire_noc_expiry_date) {
            const expiryDate = new Date(complianceRecord.fire_noc_expiry_date);
            fireNOCValidTill = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            fireNOCDaysRemaining = Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)));
        }

        // Insurance: use insurance_validity_date if present, else fall back to policy number presence
        let insuranceValidTill = '-';
        let insuranceDaysRemaining = 0;
        if (complianceRecord?.insurance_validity_date) {
            const insuranceExpiry = new Date(complianceRecord.insurance_validity_date);
            insuranceValidTill = insuranceExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            insuranceDaysRemaining = Math.max(0, Math.ceil((insuranceExpiry - today) / (1000 * 60 * 60 * 24)));
        } else if (complianceRecord?.insurance_policy_number) {
            // Policy exists but no validity date recorded yet — show as 'Valid'
            insuranceValidTill = 'Valid';
            insuranceDaysRemaining = 999;
        }

        res.json({
            success: true,
            data: {
                plantName: plant.plant_name || plant.plantName || 'Plant Fire Safety Command Dashboard',
                unitLabel: `${plant.address_line1 || 'Manufacturing Unit'} — Real-time Status`,
                readinessStatus,
                criticalGaps,
                openIssues: { critical: 0, major: tickets.open, minor: 0 },
                lastHealthCheck: { date: '-', time: '-', completed: false },
                nextAuditDue: { date: '-', label: '-', daysRemaining: 0 },
                compliance: {
                    fireNOC: { validTill: fireNOCValidTill, daysRemaining: fireNOCDaysRemaining },
                    insurance: { validTill: insuranceValidTill, daysRemaining: insuranceDaysRemaining },
                    training: 'On Schedule',
                    audit: 'On Schedule',
                },
                categories: categorySummaries,
                people,
                recentActivity: [],
            },
        });
    } catch (err) {
        console.error('[CommandCenter] getPlantCommandCenter error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/* ================================================================== */
/*  GET /api/dashboard/region/:regionId/facilities/summary             */
/*  Summary card data for RegionalEHSCommandCenterCard                 */
/* ================================================================== */

const getRegionFacilitiesSummary = async (req, res) => {
    try {
        const user = req.user;
        const plantIds = await getAccessiblePlantIds(user);

        const facilities = [];
        let totalReady = 0, totalAttention = 0, totalCritical = 0;
        let totalOpenIssues = 0;

        for (const pid of plantIds) {
            const plant = await Plant.findByPk(pid);
            if (!plant) continue;

            const categories = await getCategoriesForPlant(pid);

            let plantScore = 100;
            if (categories.length > 0) {
                let scoreSum = 0;
                for (const cat of categories) {
                    const totalAssets = await Asset.count({ where: { plant_id: pid, category_id: cat.id } });
                    const compliantAssets = await Asset.count({
                        where: { plant_id: pid, category_id: cat.id, status: 'ACTIVE', compliance_score: 100 },
                    });
                    scoreSum += totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 100;
                }
                plantScore = Math.round(scoreSum / categories.length);
            }

            const status = plantScore >= 85 ? 'READY' : plantScore >= 60 ? 'ATTENTION' : 'CRITICAL';
            if (status === 'READY') totalReady++;
            else if (status === 'ATTENTION') totalAttention++;
            else totalCritical++;

            const tickets = await countTicketsForPlant(pid);
            totalOpenIssues += tickets.open;

            facilities.push({
                id: pid,
                name: plant.plant_name || plant.plantName,
                location: plant.address_line1 || plant.city || '-',
                status,
                openIssues: tickets.open,
            });
        }

        const overallScore = plantIds.length > 0
            ? Math.round(((totalReady * 100 + totalAttention * 80 + totalCritical * 50) / plantIds.length))
            : 0;

        res.json({
            success: true,
            data: {
                totalFacilities: plantIds.length,
                overallScore,
                statusCounts: { ready: totalReady, attention: totalAttention, critical: totalCritical },
                criticalFacilities: facilities.filter(f => f.status === 'CRITICAL'),
                attentionFacilities: facilities.filter(f => f.status === 'ATTENTION'),
                totals: { openIssues: totalOpenIssues, overdue: 0, alarms: 0 },
                nextAuditDue: { facilityName: '-', date: '-', daysRemaining: 0 },
                lastUpdated: '1 min ago',
            },
        });
    } catch (err) {
        console.error('[CommandCenter] getRegionFacilitiesSummary error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/* ================================================================== */
/*  GET /api/dashboard/regional-ehs/facilities                         */
/*  Full page data for RegionalEHSCommandCenterPage                    */
/* ================================================================== */

const getRegionalEHSFacilities = async (req, res) => {
    try {
        const user = req.user;
        const plantIds = await getAccessiblePlantIds(user);

        const facilities = [];
        let totalReady = 0, totalAttention = 0, totalCritical = 0;

        for (const pid of plantIds) {
            const plant = await Plant.findByPk(pid);
            if (!plant) continue;

            const categories = await getCategoriesForPlant(pid);

            const catStatuses = [];
            let scoreSum = 0;
            for (const cat of categories) {
                const totalAssets = await Asset.count({ where: { plant_id: pid, category_id: cat.id } });
                const compliantAssets = await Asset.count({
                    where: { plant_id: pid, category_id: cat.id, status: 'ACTIVE', compliance_score: 100 },
                });
                const score = totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 100;
                scoreSum += score;
                catStatuses.push({
                    name: cat.category_name || cat.categoryName,
                    score,
                    total: totalAssets,
                    serviceable: compliantAssets,
                    status: score >= 85 ? 'READY' : score >= 60 ? 'ATTENTION' : 'CRITICAL',
                });
            }

            const plantScore = categories.length > 0 ? Math.round(scoreSum / categories.length) : 100;
            const status = plantScore >= 85 ? 'READY' : plantScore >= 60 ? 'ATTENTION' : 'CRITICAL';
            if (status === 'READY') totalReady++;
            else if (status === 'ATTENTION') totalAttention++;
            else totalCritical++;

            const tickets = await countTicketsForPlant(pid);

            // People info (managers + technicians) — use first manager for facility card display
            const facilityPeople = await getPlantPeopleInfo(pid);
            const firstManager = facilityPeople.find(p => p.role === 'Manager');

            facilities.push({
                id: pid,
                name: plant.plant_name || plant.plantName,
                location: plant.address_line1 || plant.city || '-',
                imageUrl: null,
                status,
                categories: catStatuses,
                compliance: {
                    fireNOCStatus: 'Valid',
                    fireNOCLabel: 'Valid',
                    auditLast: '-',
                    auditNext: '-',
                    trainingLast: '-',
                    trainingNext: '-',
                },
                risk: { openIssues: tickets.open, overdue: 0, alarms: 0 },
                manager: {
                    name: firstManager?.name || '-',
                    phone: '-',
                    email: '-',
                    lastSeen: '5 mins ago',
                },
            });
        }

        res.json({
            success: true,
            data: {
                totalFacilities: plantIds.length,
                statusCounts: { ready: totalReady, attention: totalAttention, critical: totalCritical },
                facilities,
            },
        });
    } catch (err) {
        console.error('[CommandCenter] getRegionalEHSFacilities error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/* ================================================================== */
/*  GET /api/dashboard/plant/:plantId/extinguisher-types/:categoryId   */
/*  Breakdown of fire extinguisher assets grouped by type              */
/* ================================================================== */

const getExtinguisherTypeBreakdown = async (req, res) => {
    try {
        const { plantId, categoryId } = req.params;

        if (!UUID_REGEX.test(plantId) || !UUID_REGEX.test(categoryId)) {
            return res.status(400).json({ success: false, message: 'Invalid plant or category ID format' });
        }

        const now = new Date();
        // todayStr (YYYY-MM-DD): used for date-only string comparisons to avoid UTC vs local timezone issues
        // so that an asset due TODAY is NOT counted as overdue (only strictly past dates are overdue)
        const todayStr = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('-');
        // HP test is due when manufacturing_date + 5 years <= today
        const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

        const assets = await Asset.findAll({
            where: { plant_id: plantId, category_id: categoryId },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['product_name'],
                    required: false,
                },
            ],
            attributes: [
                'id',
                'type',
                'health_status',
                'install_date',
                'manufacturing_date',
                'next_service_date',
                'last_service_date',
                'conditions',
            ],
            raw: true,
            nest: true,
        }).catch(() => []);

        // Fetch critical alarms for all found assets
        const assetIds = assets.map(a => a.id);
        const critNotifs = await Notification.findAll({
            where: {
                related_entity_type: 'asset',
                related_entity_id: { [Op.in]: assetIds },
                priority: 'CRITICAL',
                is_read: false
            },
            attributes: ['related_entity_id'],
            raw: true
        }).catch(() => []);

        const critByAsset = {};
        for (const n of critNotifs) {
            critByAsset[n.related_entity_id] = (critByAsset[n.related_entity_id] || 0) + 1;
        }

        // Group by type
        const typeMap = {};
        for (const asset of assets) {
            const typeName = String(asset.type || 'Unknown').trim();
            if (!typeMap[typeName]) {
                typeMap[typeName] = [];
            }
            typeMap[typeName].push(asset);
        }

        const result = Object.entries(typeMap).map(([typeName, typeAssets]) => {
            const total = typeAssets.length;
            const healthy = typeAssets.filter(a => a.health_status === 'HEALTHY').length;
            const healthPct = total > 0 ? Math.round((healthy / total) * 100) : 100;

            const installed = typeAssets.filter(a =>
                a.install_date != null && String(a.install_date).trim() !== ''
            ).length;

            // HP due: assets where manufacturing_date <= (today - 5 years)
            const hpDue = typeAssets.filter(a => {
                if (!a.manufacturing_date) return false;
                const mfgDate = new Date(a.manufacturing_date);
                return mfgDate <= fiveYearsAgo;
            }).length;

            const activeEquipment = typeAssets.filter(a =>
                a.health_status === 'HEALTHY' || a.health_status === 'NEEDS_ATTENTION'
            ).length;

            // Overdue: next_service_date is strictly BEFORE today.
            // Parse robustly to avoid any timezone/string offset issues.
            const todayY = now.getFullYear();
            const todayM = now.getMonth() + 1;
            const todayD = now.getDate();

            const overdue = typeAssets.filter(a => {
                if (!a.next_service_date || typeof a.next_service_date !== 'string') return false;
                const [y, m, d] = a.next_service_date.split('-').map(Number);
                if (!y || !m || !d) return false;
                if (y !== todayY) return y < todayY;
                if (m !== todayM) return m < todayM;
                return d < todayD; // Strictly less than today's date
            }).length;

            // refill_due is always 0 because next_refill_date is null for all assets
            const refillDue = 0;

            // Condition counts from conditions JSONB array
            let displaced = 0;
            let lowPressure = 0;
            for (const a of typeAssets) {
                const conds = Array.isArray(a.conditions) ? a.conditions : [];
                for (const name of conds) {
                    const n = String(name).toLowerCase();
                    if (n.includes('displac')) displaced++;
                    if (n.includes('low') && n.includes('press')) lowPressure++;
                }
            }

            const criticalAlarms = typeAssets.reduce((sum, a) => sum + (critByAsset[a.id] || 0), 0);

            return {
                typeName,
                total,
                healthy,
                healthPct,
                installed,
                hpDue,
                activeEquipment,
                overdue,
                refillDue,
                displaced,
                lowPressure,
                criticalAlarms,
            };
        });

        // Sort by total descending so largest types appear first
        result.sort((a, b) => b.total - a.total);

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[CommandCenter] getExtinguisherTypeBreakdown error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



/* ================================================================== */
/*  GET /api/dashboard/plant/:plantId/recent-activity                  */
/*  Filterable recent activity for: service, alarms, assets, all       */
/* ================================================================== */

function relativeTime(date) {
    if (!date) return '';
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const getPlantRecentActivity = async (req, res) => {
    try {
        const { plantId } = req.params;
        const filter = (req.query.filter || 'all').toLowerCase();
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

        if (!UUID_REGEX.test(plantId)) {
            return res.status(400).json({ success: false, message: 'Invalid plant ID' });
        }

        // Helper: fetch service activity
        const fetchService = async (lim) => {
            const rows = await ServiceSubmission.findAll({
                where: { plant_id: plantId },
                order: [['submitted_at', 'DESC']],
                limit: lim,
                include: [{
                    model: Asset,
                    as: 'asset',
                    attributes: ['asset_code', 'type'],
                    required: false,
                }],
                attributes: ['id', 'submitted_at', 'inspection_type', 'status', 'asset_id'],
            }).catch(() => []);

            return rows.map(r => {
                const assetCode = r.asset?.asset_code || 'Unknown Asset';
                const type = r.inspection_type || 'Service';
                const status = r.status || 'pending';
                return {
                    id: `svc-${r.id}`,
                    type: 'service',
                    icon: 'wrench',
                    iconColor: 'text-blue-500',
                    title: `${type} — ${assetCode}`,
                    subtitle: `${type} for ${assetCode} is ${status.toLowerCase()}.`,
                    time: relativeTime(r.submitted_at),
                    _ts: r.submitted_at,
                };
            });
        };

        // Helper: fetch alarm activity (CRITICAL, non-IoT notifications only)
        const fetchAlarms = async (lim) => {
            // All asset IDs + a code map for enriching notification messages
            const assetRecords = await Asset.findAll({
                where: { plant_id: plantId },
                attributes: ['id', 'asset_code'],
                raw: true,
            }).catch(() => []);

            if (!assetRecords.length) return [];
            const assetIds = assetRecords.map(a => a.id);
            const assetCodeMap = new Map(assetRecords.map(a => [a.id, a.asset_code]));

            // Also collect ServiceSubmission IDs → asset_code map
            // (OVERDUE service notifications link to ServiceSubmission, not Asset)
            const submissionRecords = await ServiceSubmission.findAll({
                where: { asset_id: { [Op.in]: assetIds } },
                attributes: ['id', 'asset_id'],
                raw: true,
            }).catch(() => []);
            const submissionIds = submissionRecords.map(s => s.id);
            // Map: submission_id → asset_code (via asset_id → assetCodeMap)
            const submissionAssetCodeMap = new Map(
                submissionRecords.map(s => [s.id, assetCodeMap.get(s.asset_id) || ''])
            );

            // Build OR: by asset ID OR by ServiceSubmission ID
            const orConditions = [
                { related_entity_id: { [Op.in]: assetIds } },
            ];
            if (submissionIds.length > 0) {
                orConditions.push({ related_entity_id: { [Op.in]: submissionIds } });
            }

            const rows = await Notification.findAll({
                where: {
                    [Op.or]: orConditions,
                    priority: 'CRITICAL',
                    // Exclude IoT pump events — they belong in the Assets tab
                    notification_source: { [Op.ne]: 'IOT_DEVICE' },
                },
                order: [['created_at', 'DESC']],
                limit: lim,
                attributes: ['id', 'title', 'message', 'created_at', 'related_entity_id', 'related_entity_type'],
                raw: true,
            }).catch(() => []);

            return rows.map(r => {
                // Resolve asset code from either entity type
                const assetCode = assetCodeMap.get(r.related_entity_id)
                    || submissionAssetCodeMap.get(r.related_entity_id)
                    || '';
                const suffix = assetCode ? ` for ${assetCode}` : '';
                return {
                    id: `alm-${r.id}`,
                    type: 'alarm',
                    icon: 'alert',
                    iconColor: 'text-red-500',
                    title: r.title,
                    subtitle: `${r.title}${suffix} — requires immediate attention.`,
                    time: relativeTime(r.created_at),
                    _ts: r.created_at,
                };
            });
        };

        // Helper: fetch asset activity (all asset changes + IoT pump events)
        const fetchAssets = async (lim) => {
            const halfLim = Math.ceil(lim / 2);

            // (a) Recent asset record changes (all asset types in plant)
            const assetRows = await Asset.findAll({
                where: {
                    plant_id: plantId,
                    updated_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
                order: [['updated_at', 'DESC']],
                limit: halfLim,
                include: [{
                    model: Category,
                    as: 'category',
                    attributes: ['category_name'],
                    required: false,
                }],
                attributes: ['id', 'asset_code', 'type', 'health_status', 'updated_at'],
            }).catch(() => []);

            const assetItems = assetRows.map(r => {
                const cat = r.category?.category_name || r.type || 'Asset';
                const health = r.health_status || 'Unknown';
                const statusLabel = health === 'HEALTHY' ? 'is healthy and operational.'
                    : health === 'NEEDS_ATTENTION' ? 'needs attention.'
                        : 'is not working — check immediately.';
                return {
                    id: `ast-${r.id}`,
                    type: 'asset',
                    icon: 'check',
                    iconColor: health === 'HEALTHY' ? 'text-green-500'
                        : health === 'NEEDS_ATTENTION' ? 'text-yellow-500' : 'text-red-500',
                    title: `${r.asset_code} — ${cat}`,
                    subtitle: `${r.asset_code} ${statusLabel}`,
                    time: relativeTime(r.updated_at),
                    _ts: r.updated_at,
                };
            });

            // (b) IoT asset notifications (pump power/mode/trip events only)
            const allAssetRecords = await Asset.findAll({
                where: { plant_id: plantId },
                attributes: ['id', 'asset_code'],
                raw: true,
            }).catch(() => []);
            const allAssetIds = allAssetRecords.map(a => a.id);
            const allAssetCodeMap = new Map(allAssetRecords.map(a => [a.id, a.asset_code]));

            const iotItems = allAssetIds.length > 0 ? await Notification.findAll({
                where: {
                    related_entity_id: { [Op.in]: allAssetIds },
                    notification_source: 'IOT_DEVICE',
                },
                order: [['created_at', 'DESC']],
                // Fetch more rows so we have enough unique events after deduplication
                limit: halfLim * 5,
                attributes: ['id', 'title', 'message', 'created_at', 'related_entity_id'],
                raw: true,
            }).then(rows => {
                // Deduplicate: keep the most recent notification per (title, assetCode) pair
                // so multiple DB rows for the same pump trip on the same asset appear only once.
                const seen = new Set();
                const dedupedRows = [];
                for (const r of rows) {
                    const assetCode = allAssetCodeMap.get(r.related_entity_id) || r.related_entity_id || '';
                    const key = `${(r.title || '').toLowerCase()}::${assetCode}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        dedupedRows.push({ ...r, _assetCode: assetCode });
                    }
                    if (dedupedRows.length >= halfLim) break;
                }

                return dedupedRows.map(r => ({
                    id: `iot-${r.id}`,
                    type: 'asset',
                    icon: 'lightning',
                    iconColor: 'text-orange-500',
                    title: r.title,
                    subtitle: `${r.title}${r._assetCode ? ` detected on ${r._assetCode}` : ''} — check pump room.`,
                    time: relativeTime(r.created_at),
                    _ts: r.created_at,
                }));
            }).catch(() => []) : [];

            return [...assetItems, ...iotItems]
                .sort((a, b) => new Date(b._ts).getTime() - new Date(a._ts).getTime())
                .slice(0, lim);
        };

        let items = [];

        if (filter === 'service') {
            items = await fetchService(limit);
        } else if (filter === 'alarms') {
            items = await fetchAlarms(limit);
        } else if (filter === 'assets') {
            items = await fetchAssets(limit);
        } else {
            // 'all' — run in parallel, merge and sort
            const perSource = Math.ceil(limit / 3);
            const [svc, alm, ast] = await Promise.all([
                fetchService(perSource),
                fetchAlarms(perSource),
                fetchAssets(perSource),
            ]);
            items = [...svc, ...alm, ...ast]
                .sort((a, b) => new Date(b._ts).getTime() - new Date(a._ts).getTime())
                .slice(0, limit);
        }

        // Strip internal _ts field before sending
        const result = items.map(({ _ts, ...rest }) => rest);

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('[CommandCenter] getPlantRecentActivity error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getPlantSummary,
    getPlantCommandCenter,
    getRegionFacilitiesSummary,
    getRegionalEHSFacilities,
    getExtinguisherTypeBreakdown,
    getPlantRecentActivity,
};
