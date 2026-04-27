/**
 * Assets Services Index
 * Exports all asset-related services
 */

const asset_service = require('./asset_service');
const spec_definition_service = require('./spec_definition_service');
const asset_pdf_service = require('./asset_pdf_service');
const bulk_qr_print_service = require('./bulk_qr_print_service');
const complianceScoreService = require('./complianceScoreService');

module.exports = {
    asset_service,
    spec_definition_service,
    asset_pdf_service,
    bulk_qr_print_service,
    complianceScoreService
};
