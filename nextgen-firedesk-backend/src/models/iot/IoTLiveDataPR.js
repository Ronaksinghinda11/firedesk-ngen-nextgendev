const { DataTypes } = require("sequelize");
const { sequelize } = require("../../../config/config");

/**
 * IoT Live Data Model for Pump Room Category
 * Stores real-time IoT data for pump room devices
 */
const IoTLiveDataPR = sequelize.define(
    "IoTLiveDataPR",
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
            comment: "Current IoT sensor data (AS1-3, PS1-3, TS1-3, WLS, DLS, PLS, BAT, etc.)"
        },
        history: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: "Historical trends for each sensor (last 100 values)"
        },
        last_auto_start_date: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "Last auto-start date — updated when AS goes Auto→Manual and PS goes OFF→ON"
        },
    },
    {
        tableName: "iot_live_data_pr",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            { fields: ['device_id'] },
            { fields: ['updated_at'] }
        ],
        hooks: {
            /**
             * beforeSave hook: Maintains rolling history for each sensor key
             * Also detects auto-start transitions and updates last_auto_start_date
             */
            beforeSave: (instance) => {
                try {
                    const deviceData = instance.device_data;
                    const now = new Date();

                    // Pump Room specific sensor keys
                    const keys = [
                        "AS1", "AS2", "AS3",           // Asset Status (Pump 1, 2, 3)
                        "PS1", "PS2", "PS3",           // Power Status
                        "TS1", "TS2", "TS3",           // Trip Status
                        "BAT1", "BAT2",                // Battery Voltages
                        "BCH",                          // Battery Charger
                        "DLS",                          // Diesel Level Sensor (Liters)
                        "OPR",                          // Oil Pressure
                        "PLS",                          // Pressure Level Sensor (bar)
                        "PRS",                          // Pressure (alternative)
                        "PWR",                          // Power
                        "WLS",                          // Water Level Sensor (kL)
                        "WTP",
                        "BLVL",                         // Water Temperature
                    ];

                    // Initialize history if it doesn't exist
                    if (!instance.history) {
                        instance.history = {};
                    }

                    // Ensure history is a proper object (handle potential JSON parsing issues)
                    let historyObj = instance.history;
                    if (typeof historyObj === 'string') {
                        try { historyObj = JSON.parse(historyObj); } catch (e) { }
                    }
                    // Clone to avoid reference issues
                    historyObj = JSON.parse(JSON.stringify(historyObj));

                    let historyChanged = false;

                    // ── Auto-start detection (Diesel Engine only: AS3/PS3) ──────
                    // Auto-start = AS3 goes Auto(1) → Manual(0)  AND  PS3 goes OFF(1) → ON(0)
                    // Compare the INCOMING value with the LAST history entry
                    const newAS3 = deviceData.AS3;
                    const newPS3 = deviceData.PS3;

                    if (newAS3 !== undefined && newPS3 !== undefined) {
                        const as3History = historyObj.AS3 || [];
                        const ps3History = historyObj.PS3 || [];
                        const prevAS3 = as3History.length > 0 ? Number(as3History[as3History.length - 1].data) : undefined;
                        const prevPS3 = ps3History.length > 0 ? Number(ps3History[ps3History.length - 1].data) : undefined;

                        if (prevAS3 !== undefined && prevPS3 !== undefined &&
                            prevAS3 === 1 && Number(newAS3) === 0 &&
                            prevPS3 === 1 && Number(newPS3) === 0) {
                            instance.last_auto_start_date = now;
                            instance.changed('last_auto_start_date', true);
                            console.log(`[Model] 🚀 Auto-start detected (Diesel AS3/PS3) on device ${instance.device_id}`);
                        }
                    }

                    // ── History update ─────────────────────────────────────────
                    keys.forEach((key) => {
                        const newValue = deviceData[key];

                        if (newValue !== undefined) {
                            // Get existing history array or create empty
                            const historyArray = historyObj[key] || [];
                            const lastEntry = historyArray[historyArray.length - 1];

                            // Only add if value changed
                            if (!lastEntry || lastEntry.data !== newValue) {
                                historyArray.push({
                                    data: newValue,
                                    date: now,
                                });

                                historyObj[key] = historyArray;
                                historyChanged = true;
                            }
                        }
                    });

                    if (historyChanged) {
                        instance.history = historyObj;
                        instance.changed("history", true);
                    }
                } catch (error) {
                    console.error("[Model DEBUG] Error in beforeSave hook:", error);
                }
            },
        },
    }
);

module.exports = IoTLiveDataPR;
