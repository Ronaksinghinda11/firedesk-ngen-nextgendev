/**
 * Frequency Service
 * Business logic for inspection frequency management
 */

const InspectionFrequency = require('../../models/service-form/InspectionFrequency');

class FrequencyService {
    /**
     * Get all inspection frequencies
     */
    async getAllFrequencies(filters = {}) {
        const where = {};

        if (filters.is_active !== undefined) {
            where.is_active = filters.is_active;
        } else {
            where.is_active = true; // Default to active only
        }

        const frequencies = await InspectionFrequency.findAll({
            where,
            order: [['interval_days', 'ASC']]
        });

        return frequencies;
    }

    /**
     * Get frequency by ID
     */
    async getFrequencyById(frequencyId) {
        const frequency = await InspectionFrequency.findByPk(frequencyId);

        if (!frequency) {
            throw new Error('Frequency not found');
        }

        return frequency;
    }

    /**
     * Get frequency by code
     */
    async getFrequencyByCode(code) {
        const frequency = await InspectionFrequency.findOne({
            where: { frequency_code: code, is_active: true }
        });

        return frequency;
    }
}

module.exports = new FrequencyService();
