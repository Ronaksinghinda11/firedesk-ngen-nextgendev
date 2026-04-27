const { DataTypes } = require("sequelize");
const { sequelize } = require("../../../config/config");

/**
 * IoT Live Data Model for Fire Extinguisher Category
 * Stores real-time IoT data for fire extinguisher devices
 */
const IoTLiveDataFE = sequelize.define(
    "IoTLiveDataFE",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        device_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: "Unique device identifier from AWS IoT/Lambda"
        },
        device_data: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: "Current IoT sensor data (PRESSURE, TEMPERATURE, STATUS, LOCATION)"
        },
        history: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: "Historical trends for each sensor"
        },
    },
    {
        tableName: "iot_live_data_fe",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            { fields: ['device_id'] },
            { fields: ['updated_at'] }
        ],
        hooks: {
            beforeSave: (instance) => {
                const deviceData = instance.device_data;
                const now = new Date();

                // Fire Extinguisher specific sensor keys (customize as needed)
                const keys = [
                    "PRESSURE",
                    "TEMPERATURE",
                    "STATUS",
                    "LOCATION",
                    "BATTERY",
                    "SEAL_STATUS"
                ];

                if (!instance.history) {
                    instance.history = {};
                }

                keys.forEach((key) => {
                    const newValue = deviceData[key];

                    if (newValue !== undefined) {
                        const historyArray = instance.history[key] || [];
                        const lastEntry = historyArray[historyArray.length - 1];

                        if (!lastEntry || lastEntry.data !== newValue) {
                            historyArray.push({ data: newValue, date: now });
                            //removed limit 
                            // if (historyArray.length > 100) {
                            //     historyArray.shift();
                            // }

                            instance.history[key] = historyArray;
                        }
                    }
                });

                instance.changed("history", true);
            },
        },
    }
);

module.exports = IoTLiveDataFE;
