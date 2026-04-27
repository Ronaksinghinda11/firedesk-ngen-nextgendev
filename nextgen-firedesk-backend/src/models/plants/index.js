/**
 * Plants Module Models Index
 * Exports all plant-related models with associations
 */

// Import models
const Plant = require('./Plant');
const Building = require('./Building');
const Floor = require('./Floor');
const Layout = require('./Layout');
const Wing = require('./Wing');
const Entrance = require('./Entrance');
const DieselGenerator = require('./DieselGenerator');
const Staircase = require('./Staircase');
const Lift = require('./Lift');
const FireSafetySystem = require('./FireSafetySystem');
const ComplianceRecord = require('./ComplianceRecord');
const PlantManager = require('./PlantManager');
const PlantCategory = require('./PlantCategory');
const Organization = require('./Organization');
const Scheduler = require('./Scheduler');
const Industry = require('../master-data/Industry');
const Vendor = require('../master-data/Vendor');
const Category = require('../master-data/category');

// ============================================
// DEFINE ASSOCIATIONS
// ============================================

// Plant -> Organization
Plant.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
});
Organization.hasMany(Plant, {
    foreignKey: 'organization_id',
    as: 'plants'
});

// Plant -> Industry
Plant.belongsTo(Industry, {
    foreignKey: 'industry_id',
    as: 'industry'
});
Industry.hasMany(Plant, {
    foreignKey: 'industry_id',
    as: 'plants'
});

// FireSafetySystem -> Vendor (AMC Vendor)
FireSafetySystem.belongsTo(Vendor, {
    foreignKey: 'amc_vendor_id',
    as: 'amcVendor'
});
Vendor.hasMany(FireSafetySystem, {
    foreignKey: 'amc_vendor_id',
    as: 'fireSafetySystems'
});

// Plant -> Buildings
Plant.hasMany(Building, {
    foreignKey: 'plant_id',
    as: 'buildings',
    onDelete: 'CASCADE'
});
Building.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Building -> Floors
Building.hasMany(Floor, {
    foreignKey: 'building_id',
    as: 'floors',
    onDelete: 'CASCADE'
});
Floor.belongsTo(Building, {
    foreignKey: 'building_id',
    as: 'building'
});

// Floor -> Wings
Floor.hasMany(Wing, {
    foreignKey: 'floor_id',
    as: 'wings',
    onDelete: 'CASCADE'
});
Wing.belongsTo(Floor, {
    foreignKey: 'floor_id',
    as: 'floor'
});

// Floor -> Layout (One-to-One)
Floor.hasOne(Layout, {
    foreignKey: 'floor_id',
    as: 'layout',
    onDelete: 'CASCADE'
});
Layout.belongsTo(Floor, {
    foreignKey: 'floor_id',
    as: 'floor'
});

// Layout -> Building
Layout.belongsTo(Building, {
    foreignKey: 'building_id',
    as: 'building'
});

// Layout -> Plant
Layout.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Layout -> Wing
Layout.belongsTo(Wing, {
    foreignKey: 'wing_id',
    as: 'wing'
});

// Building -> Staircases
Building.hasMany(Staircase, {
    foreignKey: 'building_id',
    as: 'staircases',
    onDelete: 'CASCADE'
});
Staircase.belongsTo(Building, {
    foreignKey: 'building_id',
    as: 'building'
});

// Building -> Lifts
Building.hasMany(Lift, {
    foreignKey: 'building_id',
    as: 'lifts',
    onDelete: 'CASCADE'
});
Lift.belongsTo(Building, {
    foreignKey: 'building_id',
    as: 'building'
});

// Plant -> Entrances
Plant.hasMany(Entrance, {
    foreignKey: 'plant_id',
    as: 'entrances',
    onDelete: 'CASCADE'
});
Entrance.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Plant -> DieselGenerators
Plant.hasMany(DieselGenerator, {
    foreignKey: 'plant_id',
    as: 'dieselGenerators',
    onDelete: 'CASCADE'
});
DieselGenerator.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Plant -> FireSafetySystem (One-to-One)
Plant.hasOne(FireSafetySystem, {
    foreignKey: 'plant_id',
    as: 'fireSafetySystem',
    onDelete: 'CASCADE'
});
FireSafetySystem.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Plant -> ComplianceRecords
Plant.hasMany(ComplianceRecord, {
    foreignKey: 'plant_id',
    as: 'complianceRecords',
    onDelete: 'CASCADE'
});
ComplianceRecord.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Plant <-> Manager (Many-to-Many via PlantManager)
Plant.belongsToMany(require('../user-management/manager'), {
    through: PlantManager,
    foreignKey: 'plant_id',
    otherKey: 'manager_id',
    as: 'managers'
});
require('../user-management/manager').belongsToMany(Plant, {
    through: PlantManager,
    foreignKey: 'manager_id',
    otherKey: 'plant_id',
    as: 'plants'
});

// PlantManager direct associations (needed for includes with 'as: plant')
PlantManager.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});
Plant.hasMany(PlantManager, {
    foreignKey: 'plant_id',
    as: 'plant_managers'
});

// Plant <-> Category (Many-to-Many via PlantCategory)
Plant.belongsToMany(require('../master-data/category'), {
    through: PlantCategory,
    foreignKey: 'plant_id',
    otherKey: 'category_id',
    as: 'categories'
});
require('../master-data/category').belongsToMany(Plant, {
    through: PlantCategory,
    foreignKey: 'category_id',
    otherKey: 'plant_id',
    as: 'plants'
});

// Plant -> Schedulers (One-to-Many)
Plant.hasMany(Scheduler, {
    foreignKey: 'plant_id',
    as: 'schedulers',
    onDelete: 'CASCADE'
});
Scheduler.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// Scheduler -> Category
Scheduler.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'category'
});
Category.hasMany(Scheduler, {
    foreignKey: 'category_id',
    as: 'schedulers'
});

// ============================================
// EXPORT ALL MODELS
// ============================================

module.exports = {
    Plant,
    Building,
    Floor,
    Layout,
    Wing,
    Entrance,
    DieselGenerator,
    Staircase,
    Lift,
    FireSafetySystem,
    ComplianceRecord,
    PlantManager,
    PlantCategory,
    Organization,
    Industry,
    Vendor,
    Scheduler,
    Manager: require('../user-management/manager')
};
