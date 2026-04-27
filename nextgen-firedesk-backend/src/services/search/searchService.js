/**
 * Search Service
 * Provides global search across multiple entities
 */

const { Op } = require('sequelize');

// Import models
const { User, Manager, Technician } = require('../../models/user-management');
const { Plant } = require('../../models/plants');
const { Asset } = require('../../models/assets');
const { Category, Product, Vendor, Industry, ConditionMaster } = require('../../models/master-data');
const { Ticket } = require('../../models/tickets/Ticket');
const { Incident, IncidentType, IncidentSubtype, CapaStepDefinition } = require('../../models/sams');

// Permission mapping: Maps search entity types to permission entities
const SEARCH_PERMISSIONS = {
    'User': 'users',
    'Manager': 'managers',
    'Technician': 'technicians',
    'Plant': 'plants',
    'Asset': 'assets',
    'Category': 'categories',
    'Product': 'products',
    'Vendor': 'vendors',
    'Industry': 'industries',
    'Condition': 'conditions',
    'Ticket': 'tickets',
    'Incident': 'incidents',
    'Incident Type': null,  // Admin-only master data
    'Incident Subtype': null,  // Admin-only master data
    'CAPA Step': 'capaSteps'
};

// Entity whitelists based on sidebar configuration
// These define which entities should be searchable for each role
const MANAGER_SEARCHABLE_ENTITIES = [
    'plants',        // Manager sidebar: Operations
    'floorplans',    // Manager sidebar: Operations
    'categories',    // Manager sidebar: Operations
    'products',      // Manager sidebar: Operations
    'technicians',   // Manager sidebar: Operations
    'assets',        // Manager sidebar: Operations
    'serviceForms',  // Manager sidebar: Operations
    'tickets',       // Manager sidebar: Operations
    'incidents',     // Manager sidebar: Safety & Audit
    'dashboard',     // Manager sidebar: Dashboard
    'reports'        // Manager sidebar: Operations
];

// Admin can search everything
const ADMIN_SEARCHABLE_ENTITIES = null; // null = all entities

// Custom roles use the same whitelist as managers
const CUSTOM_ROLE_SEARCHABLE_ENTITIES = MANAGER_SEARCHABLE_ENTITIES;


class SearchService {
    /**
     * Check if user has read permission for an entity AND it's in their sidebar
     * @param {object} user - User object with role and permissions
     * @param {string|null} permissionEntity - Permission entity name (null = admin-only)
     * @returns {boolean}
     */
    hasReadPermission(user, permissionEntity) {
        console.log(`[SearchService] Checking permission for entity: ${permissionEntity}`);
        console.log(`[SearchService] User type: ${user?.userType}`);

        // Admins have access to everything
        if (user?.userType === 'admin') {
            console.log(`[SearchService] ✅ Admin user - granting access`);
            return true;
        }

        // No user = no access
        if (!user) {
            console.log(`[SearchService] ❌ No user - denying access`);
            return false;
        }

        // Null permission entity = admin-only
        if (permissionEntity === null) {
            console.log(`[SearchService] ❌ Admin-only entity - denying access`);
            return false;
        }

        // STEP 1: Check sidebar whitelist for ALL non-admin users
        // Both managers and custom roles use the same sidebar configuration
        if (!MANAGER_SEARCHABLE_ENTITIES.includes(permissionEntity)) {
            console.log(`[SearchService] ❌ Entity '${permissionEntity}' not in sidebar - denying access`);
            return false;
        }

        // STEP 2: Check role permissions
        const permissions = user?.role?.permissions?.entities;
        console.log(`[SearchService] User role:`, user?.role?.name);
        console.log(`[SearchService] Permissions structure exists:`, !!permissions);

        if (!permissions) {
            console.log(`[SearchService] ❌ No permissions structure - denying access`);
            return false;
        }

        // Check if user has read permission for this entity
        const hasRead = permissions[permissionEntity]?.actions?.read === true;
        console.log(`[SearchService] ${hasRead ? '✅' : '❌'} Read permission for '${permissionEntity}': ${hasRead}`);

        return hasRead;
    }

    /**
     * Search across all entities
     * @param {string} query - Search query
     * @param {number} limit - Max results per entity type
     * @param {object} user - User object with permissions
     * @param {array} managerPlantIds - Plant IDs accessible to manager (for filtering)
     * @returns {Promise<Array>} Search results
     */
    async search(query, limit = 3, user = null, managerPlantIds = []) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchTerm = `%${query.trim()}%`;
        const results = [];

        // Helper to safely search each entity with permission check
        const safeSearch = async (searchFn, type, permissionEntity) => {
            // Check permission before searching
            if (!this.hasReadPermission(user, permissionEntity)) {
                return [];
            }

            try {
                const items = await searchFn();
                return items.map(item => ({ ...item, type }));
            } catch (error) {
                console.error(`[SearchService] Error searching ${type}:`, error.message);
                return [];
            }
        };

        // 1. Search Users (requires 'users' permission)
        const userResults = await safeSearch(async () => {
            const users = await User.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.iLike]: searchTerm } },
                        { email: { [Op.iLike]: searchTerm } },
                        { phone: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'name', 'email'],
                limit
            });
            return users.map(u => ({
                id: u.id,
                name: u.name,
                description: u.email,
                path: '/admin/users'
            }));
        }, 'User', SEARCH_PERMISSIONS['User']);
        results.push(...userResults);

        // 2. Search Plants (requires 'plants' permission)
        const plantResults = await safeSearch(async () => {
            // Build where clause
            const whereClause = {
                [Op.or]: [
                    { plant_name: { [Op.iLike]: searchTerm } },
                    { city: { [Op.iLike]: searchTerm } }
                ]
            };

            // Filter by manager's assigned plants if applicable
            if (managerPlantIds && managerPlantIds.length > 0) {
                whereClause.id = { [Op.in]: managerPlantIds };
            }

            const plants = await Plant.findAll({
                where: whereClause,
                attributes: ['id', 'plant_name', 'city'],
                limit
            });
            return plants.map(p => ({
                id: p.id,
                name: p.plant_name,
                description: p.city || '',
                path: '/admin/plants'
            }));
        }, 'Plant', SEARCH_PERMISSIONS['Plant']);
        results.push(...plantResults);

        // 3. Search Assets (requires 'assets' permission)
        const assetResults = await safeSearch(async () => {
            // Build where clause
            const whereClause = {
                [Op.or]: [
                    { asset_code: { [Op.iLike]: searchTerm } },
                    { type: { [Op.iLike]: searchTerm } },
                    { location: { [Op.iLike]: searchTerm } }
                ]
            };

            // Filter by manager's assigned plants if applicable
            if (managerPlantIds && managerPlantIds.length > 0) {
                whereClause.plant_id = { [Op.in]: managerPlantIds };
            }

            const assets = await Asset.findAll({
                where: whereClause,
                attributes: ['id', 'asset_code', 'type', 'location'],
                limit
            });
            return assets.map(a => ({
                id: a.id,
                name: a.asset_code,
                description: `${a.type || ''}${a.location ? ' - ' + a.location : ''}`,
                path: `/admin/assets/${a.id}`
            }));
        }, 'Asset', SEARCH_PERMISSIONS['Asset']);
        results.push(...assetResults);

        // 4. Search Categories (requires 'categories' permission)
        const categoryResults = await safeSearch(async () => {
            const categories = await Category.findAll({
                where: {
                    [Op.or]: [
                        { category_name: { [Op.iLike]: searchTerm } },
                        { category_code: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'category_name', 'category_code'],
                limit
            });
            return categories.map(c => ({
                id: c.id,
                name: c.category_name,
                description: c.category_code || '',
                path: '/admin/categories'
            }));
        }, 'Category', SEARCH_PERMISSIONS['Category']);
        results.push(...categoryResults);

        // 5. Search Products (requires 'products' permission)
        const productResults = await safeSearch(async () => {
            const products = await Product.findAll({
                where: {
                    [Op.or]: [
                        { product_name: { [Op.iLike]: searchTerm } },
                        { product_code: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'product_name', 'product_code'],
                limit
            });
            return products.map(p => ({
                id: p.id,
                name: p.product_name,
                description: p.product_code || '',
                path: '/admin/products'
            }));
        }, 'Product', SEARCH_PERMISSIONS['Product']);
        results.push(...productResults);

        // 6. Search Vendors (requires 'vendors' permission)
        const vendorResults = await safeSearch(async () => {
            const vendors = await Vendor.findAll({
                where: {
                    [Op.or]: [
                        { vendor_name: { [Op.iLike]: searchTerm } },
                        { vendor_code: { [Op.iLike]: searchTerm } },
                        { email: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'vendor_name', 'vendor_code'],
                limit
            });
            return vendors.map(v => ({
                id: v.id,
                name: v.vendor_name,
                description: v.vendor_code || '',
                path: '/admin/vendors'
            }));
        }, 'Vendor', SEARCH_PERMISSIONS['Vendor']);
        results.push(...vendorResults);

        // 7. Search Incidents (requires 'incidents' permission)
        if (Incident) {
            const incidentResults = await safeSearch(async () => {
                const incidents = await Incident.findAll({
                    where: {
                        [Op.or]: [
                            { incidentNumber: { [Op.iLike]: searchTerm } },
                            { description: { [Op.iLike]: searchTerm } }
                        ]
                    },
                    attributes: ['id', 'incidentNumber', 'description', 'severity'],
                    limit
                });
                return incidents.map(i => ({
                    id: i.id,
                    name: i.incidentNumber,
                    description: `${i.severity || ''} - ${(i.description || '').substring(0, 50)}...`,
                    path: `/admin/sams/incidents/${i.id}`
                }));
            }, 'Incident', SEARCH_PERMISSIONS['Incident']);
            results.push(...incidentResults);
        }

        // 8. Search Managers (requires 'managers' permission)
        const managerResults = await safeSearch(async () => {
            const managers = await Manager.findAll({
                include: [{
                    model: User,
                    as: 'user',
                    where: {
                        [Op.or]: [
                            { name: { [Op.iLike]: searchTerm } },
                            { email: { [Op.iLike]: searchTerm } }
                        ]
                    },
                    attributes: ['name', 'email']
                }],
                attributes: ['id'],
                limit
            });
            return managers.map(m => ({
                id: m.id,
                name: m.user?.name || 'Manager',
                description: m.user?.email || '',
                path: '/admin/managers'
            }));
        }, 'Manager', SEARCH_PERMISSIONS['Manager']);
        results.push(...managerResults);

        // 9. Search Technicians (requires 'technicians' permission)
        const technicianResults = await safeSearch(async () => {
            const technicians = await Technician.findAll({
                include: [{
                    model: User,
                    as: 'user',
                    where: {
                        [Op.or]: [
                            { name: { [Op.iLike]: searchTerm } },
                            { email: { [Op.iLike]: searchTerm } }
                        ]
                    },
                    attributes: ['name', 'email']
                }],
                attributes: ['id'],
                limit
            });
            return technicians.map(t => ({
                id: t.id,
                name: t.user?.name || 'Technician',
                description: t.user?.email || '',
                path: '/admin/technicians'
            }));
        }, 'Technician', SEARCH_PERMISSIONS['Technician']);
        results.push(...technicianResults);

        // 10. Search Incident Types (admin-only)
        const incidentTypeResults = await safeSearch(async () => {
            const types = await IncidentType.findAll({
                where: {
                    [Op.or]: [
                        { typeName: { [Op.iLike]: searchTerm } },
                        { typeCode: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'typeName', 'typeCode'],
                limit
            });
            return types.map(t => ({
                id: t.id,
                name: t.typeName,
                description: t.typeCode || '',
                path: '/admin/sams/incident-types'
            }));
        }, 'Incident Type', SEARCH_PERMISSIONS['Incident Type']);
        results.push(...incidentTypeResults);

        // 11. Search Incident Subtypes (admin-only)
        const incidentSubtypeResults = await safeSearch(async () => {
            const subtypes = await IncidentSubtype.findAll({
                where: {
                    [Op.or]: [
                        { subtypeName: { [Op.iLike]: searchTerm } },
                        { subtypeCode: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'subtypeName', 'subtypeCode'],
                limit
            });
            return subtypes.map(s => ({
                id: s.id,
                name: s.subtypeName,
                description: s.subtypeCode || '',
                path: '/admin/sams/incident-subtypes'
            }));
        }, 'Incident Subtype', SEARCH_PERMISSIONS['Incident Subtype']);
        results.push(...incidentSubtypeResults);

        // 12. Search CAPA Step Definitions (requires 'capaSteps' permission)
        const capaStepResults = await safeSearch(async () => {
            const steps = await CapaStepDefinition.findAll({
                where: {
                    [Op.or]: [
                        { stepName: { [Op.iLike]: searchTerm } },
                        { stepCode: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'stepName', 'stepCode', 'stepNumber'],
                limit
            });
            return steps.map(s => ({
                id: s.id,
                name: s.stepName,
                description: `Step ${s.stepNumber}${s.stepCode ? ' - ' + s.stepCode : ''}`,
                path: '/admin/sams/capa-steps'
            }));
        }, 'CAPA Step', SEARCH_PERMISSIONS['CAPA Step']);
        results.push(...capaStepResults);

        // 13. Search Industries (requires 'industries' permission)
        const industryResults = await safeSearch(async () => {
            const industries = await Industry.findAll({
                where: {
                    [Op.or]: [
                        { industry_name: { [Op.iLike]: searchTerm } },
                        { industry_code: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'industry_name', 'industry_code'],
                limit
            });
            return industries.map(i => ({
                id: i.id,
                name: i.industry_name,
                description: i.industry_code || '',
                path: '/admin/industries'
            }));
        }, 'Industry', SEARCH_PERMISSIONS['Industry']);
        results.push(...industryResults);

        // 14. Search Conditions (requires 'conditions' permission)
        const conditionResults = await safeSearch(async () => {
            const conditions = await ConditionMaster.findAll({
                where: {
                    [Op.or]: [
                        { condition_name: { [Op.iLike]: searchTerm } },
                        { condition_code: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'condition_name', 'condition_code', 'severity_level'],
                limit
            });
            return conditions.map(c => ({
                id: c.id,
                name: c.condition_name,
                description: `${c.condition_code || ''} (${c.severity_level || ''})`,
                path: '/admin/master-data/conditions'
            }));
        }, 'Condition', SEARCH_PERMISSIONS['Condition']);
        results.push(...conditionResults);

        // 15. Search Tickets (requires 'tickets' permission)
        const ticketResults = await safeSearch(async () => {
            const tickets = await Ticket.findAll({
                where: {
                    [Op.or]: [
                        { ticket_code: { [Op.iLike]: searchTerm } },
                        { task_name: { [Op.iLike]: searchTerm } }
                    ]
                },
                attributes: ['id', 'ticket_code', 'task_name', 'completed_status'],
                limit
            });
            return tickets.map(t => ({
                id: t.id,
                name: t.ticket_code || t.task_name,
                description: `${t.task_name} - ${t.completed_status || ''}`,
                path: '/admin/tickets'
            }));
        }, 'Ticket', SEARCH_PERMISSIONS['Ticket']);
        results.push(...ticketResults);

        console.log(`[SearchService] Query "${query}" returned ${results.length} results (user: ${user?.name || 'Unknown'}, type: ${user?.userType || 'N/A'})`);
        return results;
    }
}

module.exports = new SearchService();
