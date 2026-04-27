const { DataTypes } = require("sequelize");
const { sequelize } = require("../../../config/config");

/**
 * IoT Device to Asset Mapping Model
 * Maps IoT devices to specific assets with category and plant context
 * Supports data_key for multi-asset devices (e.g., AS1, AS2, AS3 for 3 pumps)
 */
const IoTDeviceAssetMap = sequelize.define(
    "IoTDeviceAssetMap",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        device_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: "IoT device identifier (matches device_id in iot_live_data_* tables)"
        },
        asset_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "Reference to assets.assetCode (unique identifier)"
        },
        category_id: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: "Category ID (Pump Room, Fire Extinguisher, Fire Hydrant)"
        },
        plant_id: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: "Plant ID where device is installed"
        },
        data_key: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "Specific data field for this asset (e.g., AS1, AS2, AS3 for pumps)"
        },
    },
    {
        tableName: "iot_device_asset_map",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            { fields: ['device_id'] },
            { fields: ['asset_code'] },
            { fields: ['category_id'] },
            { fields: ['plant_id'] },
            { unique: true, fields: ['device_id', 'asset_code', 'data_key'], name: 'iot_device_asset_data_key_unique' }
        ],
    }
);

/**
 * Define associations with other models
 * Called after all models are loaded
 */
IoTDeviceAssetMap.associate = (models) => {
    // Association with Asset model
    IoTDeviceAssetMap.belongsTo(models.Asset, {
        foreignKey: "asset_code",
        targetKey: "asset_code",
        as: "asset",
    });

    // Association with Category model
    IoTDeviceAssetMap.belongsTo(models.Category, {
        foreignKey: "category_id",
        as: "category",
    });

    // Association with Plant model
    IoTDeviceAssetMap.belongsTo(models.Plant, {
        foreignKey: "plant_id",
        as: "plant",
    });
};

module.exports = IoTDeviceAssetMap;
