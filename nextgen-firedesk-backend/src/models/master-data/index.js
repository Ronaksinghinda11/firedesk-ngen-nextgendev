/**
 * Master Data Models Index
 * Exports all master data models
 */

const Category = require('./category');
const CategoryFile = require('./CategoryFile');
const Product = require('./product');
const Vendor = require('./Vendor');
const Industry = require('./Industry');

const ConditionMaster = require('./ConditionMaster');
const SpecDefinition = require('./spec_definition');

// NOTE: Country, State, City data is now handled by react-country-state-city library on frontend

module.exports = {
    Category,
    CategoryFile,
    Product,
    Vendor,
    Industry,

    ConditionMaster,
    Condition: ConditionMaster, // Alias for consistency
    SpecDefinition
};