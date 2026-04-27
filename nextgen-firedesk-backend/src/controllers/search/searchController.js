/**
 * Search Controller
 * Handles global search requests
 */

const searchService = require('../../services/search/searchService');

/**
 * Search across all entities
 * GET /search?query=...&limit=10
 */
const search = async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters',
                results: []
            });
        }

        const results = await searchService.search(
            query,
            parseInt(limit),
            req.user,
            req.managerPlantIds || [] // Pass manager's assigned plant IDs for filtering
        );

        return res.json({
            success: true,
            query,
            count: results.length,
            results
        });

    } catch (error) {
        console.error('[SearchController] Search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message,
            results: []
        });
    }
};

module.exports = {
    search
};
