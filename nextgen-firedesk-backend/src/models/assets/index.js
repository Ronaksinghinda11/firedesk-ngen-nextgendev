/**
 * Assets Models Index
 * Exports all asset-related models with associations
 */

const Asset = require('./Asset');
const AssetStatusHistory = require('./asset_status_history');
const AssetFloorplanPosition = require('./asset_floorplan_position');
const AssetTestingSchedule = require('./asset_testing_schedule');
const AssetMetadata = require('./asset_metadata');
const AssetDocument = require('./asset_document');
const AssetSpecValue = require('./asset_spec_value');
const AssetLocationHistory = require('./asset_location_history');
const AssetActiveCondition = require('./AssetActiveCondition');
const Manufacturer = require('./Manufacturer');

/**
 * Setup all asset-related associations
 * This function should be called after all models are loaded
 * @param {Object} models - All models from the main index
 */
const setupAssetAssociations = (models) => {
    const { Plant, Building, Floor, Wing, Category, Product, User, SpecDefinition, Condition, Question, ServiceSubmission } = models;

    // ============================================
    // ASSET -> LOCATION ASSOCIATIONS
    // ============================================

    // Asset -> Plant
    Asset.belongsTo(Plant, {
        foreignKey: 'plant_id',
        as: 'plant'
    });
    Plant.hasMany(Asset, {
        foreignKey: 'plant_id',
        as: 'assets'
    });

    // Asset -> Building
    Asset.belongsTo(Building, {
        foreignKey: 'building_id',
        as: 'building'
    });
    Building.hasMany(Asset, {
        foreignKey: 'building_id',
        as: 'assets'
    });

    // Asset -> Floor
    Asset.belongsTo(Floor, {
        foreignKey: 'floor_id',
        as: 'floor'
    });
    Floor.hasMany(Asset, {
        foreignKey: 'floor_id',
        as: 'assets'
    });

    // Asset -> Wing
    Asset.belongsTo(Wing, {
        foreignKey: 'wing_id',
        as: 'wing'
    });
    Wing.hasMany(Asset, {
        foreignKey: 'wing_id',
        as: 'assets'
    });

    // ============================================
    // ASSET -> PRODUCT ASSOCIATIONS
    // ============================================

    // Asset -> Category
    Asset.belongsTo(Category, {
        foreignKey: 'category_id',
        as: 'category'
    });
    Category.hasMany(Asset, {
        foreignKey: 'category_id',
        as: 'assets'
    });

    // Asset -> Product
    Asset.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });
    Product.hasMany(Asset, {
        foreignKey: 'product_id',
        as: 'assets'
    });

    // Asset -> Manufacturer
    Asset.belongsTo(Manufacturer, {
        foreignKey: 'manufacturer_id',
        as: 'manufacturer'
    });
    Manufacturer.hasMany(Asset, {
        foreignKey: 'manufacturer_id',
        as: 'assets'
    });

    // ============================================
    // ASSET -> USER ASSOCIATIONS
    // ============================================

    // Asset -> User (creator)
    Asset.belongsTo(User, {
        foreignKey: 'created_by',
        as: 'creator'
    });
    User.hasMany(Asset, {
        foreignKey: 'created_by',
        as: 'created_assets'
    });

    // ============================================
    // ASSET -> RELATED DATA (ONE-TO-ONE)
    // ============================================

    // Asset -> AssetMetadata
    Asset.hasOne(AssetMetadata, {
        foreignKey: 'asset_id',
        as: 'metadata'
    });
    AssetMetadata.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });

    // Asset -> AssetTestingSchedule
    Asset.hasOne(AssetTestingSchedule, {
        foreignKey: 'asset_id',
        as: 'testing_schedule'
    });
    AssetTestingSchedule.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });

    // Asset -> AssetFloorplanPosition
    Asset.hasOne(AssetFloorplanPosition, {
        foreignKey: 'asset_id',
        as: 'floorplan_position'
    });
    AssetFloorplanPosition.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });
    AssetFloorplanPosition.belongsTo(Floor, {
        foreignKey: 'floor_id',
        as: 'floor'
    });

    // ============================================
    // ASSET -> RELATED DATA (ONE-TO-MANY)
    // ============================================

    // Asset -> AssetDocument
    Asset.hasMany(AssetDocument, {
        foreignKey: 'asset_id',
        as: 'documents'
    });
    AssetDocument.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });

    // Asset -> AssetSpecValue
    Asset.hasMany(AssetSpecValue, {
        foreignKey: 'asset_id',
        as: 'spec_values'
    });
    AssetSpecValue.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });

    // AssetSpecValue -> SpecDefinition
    AssetSpecValue.belongsTo(SpecDefinition, {
        foreignKey: 'spec_definition_id',
        as: 'spec_definition'
    });
    SpecDefinition.hasMany(AssetSpecValue, {
        foreignKey: 'spec_definition_id',
        as: 'spec_values'
    });

    // Asset -> AssetStatusHistory
    Asset.hasMany(AssetStatusHistory, {
        foreignKey: 'asset_id',
        as: 'status_history'
    });
    AssetStatusHistory.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });
    AssetStatusHistory.belongsTo(User, {
        foreignKey: 'changed_by',
        as: 'changed_by_user'
    });

    // Asset -> AssetLocationHistory
    Asset.hasMany(AssetLocationHistory, {
        foreignKey: 'asset_id',
        as: 'location_history'
    });
    AssetLocationHistory.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });
    AssetLocationHistory.belongsTo(User, {
        foreignKey: 'recorded_by',
        as: 'recorded_by_user'
    });

    // ============================================
    // ASSET ACTIVE CONDITIONS
    // ============================================

    // Asset -> AssetActiveCondition
    Asset.hasMany(AssetActiveCondition, {
        foreignKey: 'asset_id',
        as: 'active_conditions'
    });
    AssetActiveCondition.belongsTo(Asset, {
        foreignKey: 'asset_id',
        as: 'asset'
    });

    // AssetActiveCondition -> Condition
    AssetActiveCondition.belongsTo(Condition, {
        foreignKey: 'condition_id',
        as: 'condition'
    });
    Condition.hasMany(AssetActiveCondition, {
        foreignKey: 'condition_id',
        as: 'asset_active_conditions'
    });

    // AssetActiveCondition -> Question
    AssetActiveCondition.belongsTo(Question, {
        foreignKey: 'question_id',
        as: 'question'
    });
    Question.hasMany(AssetActiveCondition, {
        foreignKey: 'question_id',
        as: 'asset_active_conditions'
    });

    // AssetActiveCondition -> ServiceSubmission (optional)
    AssetActiveCondition.belongsTo(ServiceSubmission, {
        foreignKey: 'last_submission_id',
        as: 'last_submission'
    });
};

module.exports = {
    Asset,
    AssetStatusHistory,
    AssetFloorplanPosition,
    AssetTestingSchedule,
    AssetMetadata,
    AssetDocument,
    AssetSpecValue,
    AssetLocationHistory,
    AssetActiveCondition,
    Manufacturer,
    setupAssetAssociations
};
