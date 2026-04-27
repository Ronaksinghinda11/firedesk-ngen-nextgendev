const express = require('express');
const router = express.Router();

// Import controllers
// NOTE: Country, State, City data is now handled by react-country-state-city library
// Keeping controllers/models/services for future use if needed
// const countryController = require('../controllers/master-data/countryController');
// const stateController = require('../controllers/master-data/stateController');
// const cityController = require('../controllers/master-data/cityController');
const categoryController = require('../controllers/master-data/categoryController');
const productController = require('../controllers/master-data/productController');
const vendorController = require('../controllers/master-data/vendorController');
const industryController = require('../controllers/master-data/industryController');
const conditionController = require('../controllers/master-data/conditionMasterController');
const categoryFileController = require('../controllers/master-data/categoryFileController');

// Import middleware
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission_check');
const { ENTITIES, ACTIONS } = require('../utils/permission_constants');

// ============================================
// LOCATION ROUTES (COMMENTED OUT - USING REACT LIBRARY)
// ============================================
// Countries, States, and Cities are now handled by react-country-state-city library
// If you need to reactivate these routes, uncomment below and update migration

// // COUNTRY ROUTES
// router.get('/countries', auth, countryController.getAllCountries);
// router.get('/countries/:id', auth, countryController.getCountryById);
// router.post('/countries', auth, adminAuth, countryController.createCountry);
// router.put('/countries/:id', auth, adminAuth, countryController.updateCountry);
// router.delete('/countries/:id', auth, adminAuth, countryController.deleteCountry);
// router.delete('/countries/:id/permanent', auth, adminAuth, countryController.hardDeleteCountry);

// // STATE ROUTES
// router.get('/states', auth, stateController.getAllStates);
// router.get('/states/:id', auth, stateController.getStateById);
// router.post('/states', auth, adminAuth, stateController.createState);
// router.put('/states/:id', auth, adminAuth, stateController.updateState);
// router.delete('/states/:id', auth, adminAuth, stateController.deleteState);
// router.delete('/states/:id/permanent', auth, adminAuth, stateController.hardDeleteState);

// // CITY ROUTES
// router.get('/cities', auth, cityController.getAllCities);
// router.get('/cities/:id', auth, cityController.getCityById);
// router.get('/cities/state/:stateId', auth, cityController.getCitiesByState);
// router.post('/cities', auth, adminAuth, cityController.createCity);
// router.put('/cities/:id', auth, adminAuth, cityController.updateCity);
// router.delete('/cities/:id', auth, adminAuth, cityController.deleteCity);
// router.delete('/cities/:id/permanent', auth, adminAuth, cityController.hardDeleteCity);


// ============================================
// CATEGORY ROUTES
// ============================================
router.get('/categories', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), categoryController.getAll);
router.get('/categories/active', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), categoryController.getActiveCategories);
router.get('/categories/:id', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), categoryController.getById);
router.post('/categories', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.CREATE), categoryController.create);
router.put('/categories/:id', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.UPDATE), categoryController.update);
router.delete('/categories/:id', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.DELETE), categoryController.delete);
router.post('/categories/bulk-import', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.CREATE), categoryController.bulkImport);

// ============================================
// SPEC DEFINITION ROUTES (under categories)
// ============================================
const specDefinitionController = require('../controllers/assets/spec_definition_controller');

// Get all specs (with optional category_id filter in query params)
router.get('/specs', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), specDefinitionController.get_all);

// Get unique ITM parameters for autocomplete
router.get('/specs/itm-parameters', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), specDefinitionController.get_itm_parameters);

// Get specs for a category
router.get('/categories/:category_id/specs', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), specDefinitionController.get_by_category);

// CRUD for individual specs
router.get('/specs/:id', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.READ), specDefinitionController.get_by_id);
router.post('/specs', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.CREATE), specDefinitionController.create);
router.post('/specs/bulk', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.CREATE), specDefinitionController.bulk_create);
router.put('/specs/:id', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.UPDATE), specDefinitionController.update);
router.delete('/specs/:id', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.DELETE), specDefinitionController.delete);

// Compatibility routes for frontend (returns active categories)
router.get('/category/active', auth, async (req, res) => {
    try {
        const result = await require('../services/master-data/categoryService').getAllCategories({ isActive: true });
        res.status(200).json({
            success: true,
            activeCategories: result.categories || []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// CATEGORY FILE ROUTES
// ============================================
router.post('/category-files/upload/:id', auth, categoryFileController.uploadForCategory);
router.get('/category-files/list/:id', auth, categoryFileController.listForCategory);
router.delete('/category-files/:id/file/:fileId', auth, requirePermission(ENTITIES.CATEGORIES, ACTIONS.DELETE), categoryFileController.deleteForCategory);

// ============================================
// PRODUCT ROUTES (merged)
// ============================================
router.get('/products', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.READ), productController.getAll);
router.get('/products/types-subtypes', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.READ), productController.getTypesSubtypes);
router.get('/products/:productId/types-subtypes', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.READ), productController.getTypesSubtypesByProductId);
router.get('/products/:productId/variants', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.READ), productController.getVariantsByProductId);
router.get('/products/category/:categoryId', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.READ), productController.getByCategory);
router.get('/products/:id', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.READ), productController.getById);
router.post('/products', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.CREATE), productController.create);
router.post('/products/bulk', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.CREATE), productController.bulkCreate);
router.post('/products/bulk-import', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.CREATE), productController.bulkCreate);
router.put('/products/:id', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.UPDATE), productController.update);
router.delete('/products/:id', auth, requirePermission(ENTITIES.PRODUCTS, ACTIONS.DELETE), productController.delete);

// ============================================
// VENDOR ROUTES
// ============================================
// Vendor Routes
router.get('/vendors', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.READ), vendorController.getAll);
router.get('/vendors/active', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.READ), vendorController.getAllActive);
router.get('/vendors/:id', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.READ), vendorController.getById);
router.post('/vendors', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.CREATE), vendorController.create);
router.post('/vendors/bulk-import', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.CREATE), vendorController.bulkImport);
router.put('/vendors/:id', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.UPDATE), vendorController.update);
router.delete('/vendors/:id', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.DELETE), vendorController.hardDelete);
// Restore
router.post('/vendors/:id/restore', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.UPDATE), vendorController.restore);

// Permanent Delete (Redundant now, but keeping for compatibility if needed, or removing)
// router.delete('/vendors/:id/permanent', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.DELETE), vendorController.hardDelete);

// Compatibility route for frontend (returns active vendors)
router.get('/vendor/active', auth, requirePermission(ENTITIES.VENDORS, ACTIONS.READ), async (req, res) => {
    try {
        const result = await require('../services/master-data/vendorService').getAllVendors({ isActive: true });
        res.status(200).json({
            success: true,
            activeVendors: result.vendors || []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// INDUSTRY ROUTES
// ============================================
// INDUSTRY ROUTES
// ============================================
router.get('/industries', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.READ), industryController.getAll);
router.get('/industries/active', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.READ), industryController.getAllActive);
router.get('/industries/:id', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.READ), industryController.getById);
router.post('/industries', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.CREATE), industryController.create);
router.post('/industries/bulk-import', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.CREATE), industryController.bulkImport);
router.put('/industries/:id', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.UPDATE), industryController.update);
router.delete('/industries/:id', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.DELETE), industryController.hardDelete);
// Restore
router.post('/industries/:id/restore', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.UPDATE), industryController.restore);

// Permanent Delete
// router.delete('/industries/:id/permanent', auth, requirePermission(ENTITIES.INDUSTRIES, ACTIONS.DELETE), industryController.hardDelete);

// ============================================
// CONDITION ROUTES (merged)
// ============================================
// CONDITION ROUTES (merged)
// ============================================
router.get('/conditions', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.READ), conditionController.getAll);
router.get('/conditions/active', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.READ), conditionController.getAllActive);
router.get('/conditions/severity/:severity', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.READ), conditionController.getBySeverity);
router.get('/conditions/:id', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.READ), conditionController.getById);
router.post('/conditions', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.CREATE), conditionController.create);
router.post('/conditions/bulk', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.CREATE), conditionController.bulkCreate);
router.post('/conditions/bulk-import', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.CREATE), conditionController.bulkCreate);
router.put('/conditions/:id', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.UPDATE), conditionController.update);
router.delete('/conditions/:id', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.DELETE), conditionController.hardDelete);
// Restore
router.post('/conditions/:id/restore', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.UPDATE), conditionController.restore);

// Permanent Delete
// router.delete('/conditions/:id/permanent', auth, requirePermission(ENTITIES.CONDITIONS, ACTIONS.DELETE), conditionController.hardDelete);

module.exports = router;
