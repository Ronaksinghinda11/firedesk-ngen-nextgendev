/**
 * Frequency Controller
 * Endpoints for inspection frequency management
 */

const Joi = require("joi");
const frequencyService = require("../../services/service-form/frequencyService");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const frequencyController = {
    /**
     * Get all inspection frequencies
     * GET /frequencies
     */
    async getAll(req, res, next) {
        try {
            const { is_active } = req.query;
            const filters = {
                ...(is_active !== undefined && { is_active: is_active === 'true' })
            };

            const frequencies = await frequencyService.getAllFrequencies(filters);

            return res.json({
                success: true,
                count: frequencies.length,
                data: frequencies
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get frequency by ID
     * GET /frequencies/:id
     */
    async getById(req, res, next) {
        const getByIdSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = getByIdSchema.validate(req.params);
        if (error) return next(error);

        try {
            const frequency = await frequencyService.getFrequencyById(req.params.id);

            return res.json({
                success: true,
                data: frequency
            });
        } catch (error) {
            if (error.message === 'Frequency not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    }
};

module.exports = frequencyController;
