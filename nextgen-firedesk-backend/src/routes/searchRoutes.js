/**
 * Search Routes
 * Global search endpoint
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { managerPlantFilter } = require('../middleware/managerPlantFilter');
const searchController = require('../controllers/search/searchController');

// GET /search?query=...&limit=10
// Apply auth and manager plant filter to scope results
router.get('/', auth, managerPlantFilter, searchController.search);

module.exports = router;
