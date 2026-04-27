/**
 * API Module Index
 * Export all API references for frontend
 */
const endpoints = require('./endpoints');
const types = require('./types');

module.exports = {
    ...endpoints,
    types
};
