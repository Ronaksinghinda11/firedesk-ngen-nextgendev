const { Op } = require("sequelize");
/**
 * IoT Service
 * Business logic for IoT device data processing and storage
 */

const { IoTLiveDataPR, IoTLiveDataFE, IoTLiveDataFH, IoTDeviceAssetMap } = require('../../models/iot');
const Category = require('../../models/master-data/category');
const { Asset } = require('../../models/assets');
const { Plant, FireSafetySystem, Building } = require('../../models/plants');
const Notification = require('../../models/notifications/Notification');

/**
 * Helper: Determine which IoT model to use based on category name
 * @param {string} categoryName - Category name from database
 * @returns {Object|null} - { model, categoryKey } or null if not supported
 */
const getIoTModel = (categoryName) => {
    const normalized = categoryName.toLowerCase().replace(/[^a-z]/g, "");

    if (normalized.includes("pumproom") || normalized.includes("pump")) {
        return { model: IoTLiveDataPR, categoryKey: "pr" };
    } else if (normalized.includes("fireextinguisher") || normalized.includes("fe")) {
        return { model: IoTLiveDataFE, categoryKey: "fe" };
    } else if (normalized.includes("firehydrant") || normalized.includes("fh")) {
        return { model: IoTLiveDataFH, categoryKey: "fh" };
    }

    return null;
};

/**
 * Generate device-level Pump Room notifications (created once per device)
 * @param {Object} oldData - Previous device data
 * @param {Object} newData - New device data
 * @param {Object} plant - Plant object
 * @param {Object} category - Category object
 * @param {string} deviceId - Device ID
 * @returns {Array} - Array of notification objects
 */
const generateDeviceLevelNotifications = (oldData, newData, plant, category, deviceId) => {
    const notifications = [];
    const BATTERY_LOW_THRESHOLD = 12.0;

    console.log(`[Notifications] Device-level check for ${deviceId}:`, {
        oldData: { WLS: oldData?.WLS, DLS: oldData?.DLS, PLS: oldData?.PLS, BAT1: oldData?.BAT1 },
        newData: { WLS: newData?.WLS, DLS: newData?.DLS, PLS: newData?.PLS, BAT1: newData?.BAT1 }
    });

    const pushNotif = (title, message, type = 'ASSET_ALERT') => {
        notifications.push({
            type: type, // notification_type_enum
            category: 'ALERT', // notification_category_enum
            priority: 'CRITICAL', // notification_priority_enum
            title,
            message: `${message} - Device: ${deviceId} - Plant: ${plant.plant_name}`,
            related_entity_type: 'device',
            related_entity_id: null, // Device ID is string, not UUID - store null
            plant_id: plant.id, // Add plant_id for filtering users later
            is_actionable: true,
            notification_source: 'IOT_DEVICE',
            sent_at: new Date()
        });
        console.log(`[Notifications] 🔔 Generated: ${title} - ${message}`);
    };

    // Battery monitoring (device-level)
    if (oldData?.BAT1 > BATTERY_LOW_THRESHOLD && newData?.BAT1 <= BATTERY_LOW_THRESHOLD) {
        pushNotif("Battery Low", `BAT1 low: ${newData.BAT1}V`, 'ASSET_ALERT');
    }

    if (oldData?.BAT2 > BATTERY_LOW_THRESHOLD && newData?.BAT2 <= BATTERY_LOW_THRESHOLD) {
        pushNotif("Battery Low", `BAT2 low: ${newData.BAT2}V`, 'ASSET_ALERT');
    }

    // Engine parameters (device-level)
    if (oldData?.OPR === 1 && newData?.OPR === 0) {
        pushNotif("Engine Oil Pressure Low", `Diesel engine oil pressure is low`, 'ASSET_ALERT');
    }

    if (oldData?.WTP === 1 && newData?.WTP === 0) {
        pushNotif("Engine Water Temperature High", `Diesel engine water temperature is high`, 'ASSET_ALERT');
    }

    if (oldData?.BCH === 1 && newData?.BCH === 0) {
        pushNotif("Battery Charger Fault", `Diesel engine battery charger not working`, 'ASSET_ALERT');
    }

    // Water Level (device/pump room specific)
    if (oldData?.WLS >= 75 && newData?.WLS < 75) {
        pushNotif("Water Level Low", `Water level: ${newData.WLS}kL - take measure to refill`, 'ASSET_ALERT');
    }

    // Diesel Level (device/pump room specific)
    if (oldData?.DLS >= 75 && newData?.DLS < 75) {
        pushNotif("Diesel Level Low", `Diesel level: ${newData.DLS}L - take measure to refill`, 'ASSET_ALERT');
    }

    // Header Pressure (device-level)
    if (oldData?.PLS >= 4 && newData?.PLS < 4) {
        pushNotif("Header Pressure Low", `Header pressure: ${newData.PLS} bar - critical`, 'ASSET_ALERT');
    }

    return notifications;
};

/**
 * Generate asset-specific Pump Room notifications (created per asset)
 * @param {Object} oldData - Previous device data
 * @param {Object} newData - New device data
 * @param {Object} plant - Plant object
 * @param {Object} category - Category object
 * @param {Object} asset - Asset object
 * @param {Object} mapping - Mapping object with data_key
 * @returns {Array} - Array of notification objects
 */
const generatePumpRoomNotifications = (oldData, newData, plant, category, asset, mapping) => {
    const notifications = [];

    const pushNotif = (title, message, type = 'ASSET_ALERT') => {
        notifications.push({
            type: type, // notification_type_enum
            category: 'ALERT', // notification_category_enum
            priority: 'CRITICAL', // notification_priority_enum
            title,
            message: `${message} - Asset: ${asset.asset_code} - Plant: ${plant.plant_name}`,
            related_entity_type: 'asset',
            related_entity_id: asset.id,
            plant_id: plant.id, // Add plant_id for filtering users later
            is_actionable: true,
            notification_source: 'IOT_DEVICE',
            sent_at: new Date()
        });
        console.log(`[Notifications] 🔔 Asset notification: ${title} - ${message} (Asset: ${asset.asset_code})`);
    };

    // Use data_key to get asset-specific values (e.g., AS1, PS1, TS1)
    const dataKey = mapping.data_key; // e.g., "AS1", "AS2", "AS3"
    if (dataKey) {
        const keyNum = dataKey.slice(-1); // Get "1", "2", or "3"

        console.log(`[Notifications] Asset-level check for ${asset.asset_code} (dataKey: ${dataKey}):`, {
            oldTS: oldData?.[`TS${keyNum}`],
            newTS: newData?.[`TS${keyNum}`],
            oldPS: oldData?.[`PS${keyNum}`],
            newPS: newData?.[`PS${keyNum}`],
        });

        // Trip Status (asset-specific)
        const tsKey = `TS${keyNum}`;
        if (oldData?.[tsKey] === 1 && newData?.[tsKey] === 0) {
            pushNotif("Pump Trip", `Pump trip detected - needs immediate attention`, 'ASSET_ALERT');
        }

        // Power Status - Pump Started (asset-specific)
        const psKey = `PS${keyNum}`;
        // PS: 1=OFF, 0=ON. Detect transition from OFF (1) to ON (0)
        if (oldData?.[psKey] === 1 && newData?.[psKey] === 0) {
            const pumpType = keyNum === "1" ? "Jockey Pump" : keyNum === "2" ? "Electrical Pump" : "Diesel Engine Pump";
            pushNotif(`${pumpType} Started`, `${pumpType} started - monitoring`, 'SYSTEM_ALERT');
        }
    }

    return notifications;
};

class IoTService {
    /**
     * Process incoming IoT data from AWS Lambda/devices
     * @param {Object} payload - Request body containing topic and sensor data
     * @returns {Object} - { message, device_id, category, status, notifications, deviceData }
     */
    async receiveIoTData(payload) {
        const { topic, ...sensorData } = payload;

        // Validate required fields
        if (!topic) {
            throw new Error("topic field is required (format: CATEGORY/DEVICE_ID/info)");
        }

        // Extract category and device_id from topic
        // Format: "PR/123456AB/sensor-info" → category="PR", device_id="123456AB"
        const topicParts = topic.split('/');
        if (topicParts.length < 2) {
            throw new Error(`Invalid topic format. Expected: CATEGORY/DEVICE_ID/info, got: ${topic}`);
        }

        const categoryKey = topicParts[0].toLowerCase(); // "pr", "fe", or "fh"
        const device_id = topicParts[1]; // "123456AB"
        const device_data = sensorData; // Rest of the payload is sensor data

        console.log(`[IoT] 📥 Data received - Topic: ${topic}, Category: ${categoryKey}, Device: ${device_id}`);

        // Determine which model to use based on category
        let IoTModel;
        if (categoryKey === "pr") {
            IoTModel = IoTLiveDataPR;
        } else if (categoryKey === "fe") {
            IoTModel = IoTLiveDataFE;
        } else if (categoryKey === "fh") {
            IoTModel = IoTLiveDataFH;
        } else {
            throw new Error(`Unsupported category: ${categoryKey}. Must be PR, FE, or FH`);
        }

        // 1. ALWAYS store the data (even without mapping)
        let record = await IoTModel.findOne({ where: { device_id } });
        const oldData = record?.device_data || {};

        if (!record) {
            // Merge not needed for new record, but good practice to ensure object
            record = await IoTModel.create({ device_id, device_data });
            console.log(`[IoT] ✅ Created new record for device: ${device_id} (category: ${categoryKey})`);
        } else {
            // Merge new data with existing data to prevent data loss on partial updates
            const mergedData = { ...oldData, ...device_data };
            record.set("device_data", mergedData);
            record.changed("device_data", true);
            await record.save();
            console.log(`[IoT] ✅ Updated record for device: ${device_id}`);
        }

        // Force re-fetch to ensure we get the history generated by the beforeSave hook
        // reload() sometimes uses cached instance data, findOne is safer here
        record = await IoTModel.findOne({ where: { device_id } });

        // Safety: Ensure history doesn't exceed 100 items (self-healing for frontend performance)
        const safeHistory = {};
        if (record.history) {
            Object.keys(record.history).forEach(key => {
                const arr = record.history[key];
                if (Array.isArray(arr)) {
                    // Take last 100 items
                    safeHistory[key] = arr.slice(-100);
                }
            });
        }

        // 2. CHECK if device has asset mappings (optional)
        const mappings = await IoTDeviceAssetMap.findAll({
            where: { device_id },
            include: [
                {
                    model: Category,
                    as: "category",
                    attributes: ["id", "category_name"],
                },
                {
                    model: Plant,
                    as: "plant",
                    attributes: ["id", "plant_name", "organization_id"],
                },
                {
                    model: Asset,
                    as: "asset",
                    attributes: ["id", "asset_code", "health_status"],
                },
            ],
        });

        if (!mappings || mappings.length === 0) {
            // No mapping yet - data is stored but no notifications/socket
            console.log(`[IoT] ⚠️  Device ${device_id} is UNMAPPED. Data stored, awaiting configuration.`);

            return {
                message: "IoT data stored successfully (unmapped device)",
                device_id,
                category: categoryKey,
                status: "unmapped",
                note: "Device data is being stored. Please configure asset mapping in IoT Setup page.",
                notifications: [],
                deviceData: {
                    device_id,
                    device_data: record.device_data,
                    history: safeHistory,
                    lastAutoStartDate: record.last_auto_start_date || null,
                    timestamp: new Date().toISOString(),
                    category: categoryKey
                }
            };
        }

        // 3. Device IS mapped - generate notifications
        console.log(`[IoT] ✅ Device ${device_id} mapped to ${mappings.length} asset(s)`);

        const allNotifications = [];

        if (categoryKey === "pr" && mappings.length > 0) {
            // Generate device-level notifications ONCE (using first mapping for plant/category info)
            const firstMapping = mappings[0];
            const deviceNotifications = generateDeviceLevelNotifications(
                oldData,
                device_data,
                firstMapping.plant,
                firstMapping.category,
                device_id
            );
            allNotifications.push(...deviceNotifications);
            console.log(`[IoT] Generated ${deviceNotifications.length} device-level notifications for ${device_id}`);
        }

        for (const mapping of mappings) {
            if (categoryKey === "pr") {
                // Generate asset-specific notifications for each mapping
                const assetNotifications = generatePumpRoomNotifications(
                    oldData,
                    device_data,
                    mapping.plant,
                    mapping.category,
                    mapping.asset,
                    mapping
                );
                allNotifications.push(...assetNotifications);

                // Sync health_status to DB — only when it actually changes
                if (mapping.asset && mapping.data_key) {
                    const keyNum = mapping.data_key.slice(-1);
                    const psVal = Number(device_data[`PS${keyNum}`]);
                    const tsVal = Number(device_data[`TS${keyNum}`]);
                    const isDiesel = mapping.data_key === 'AS3';

                    const needsAttention = isDiesel
                        ? (psVal === 0 || tsVal === 0 || Number(device_data.OPR) === 0
                           || Number(device_data.WTP) === 0 || Number(device_data.BCH) === 0)
                        : (psVal === 0 || tsVal === 0);

                    const computedStatus = needsAttention ? 'NEEDS_ATTENTION' : 'HEALTHY';

                    if (mapping.asset.health_status !== computedStatus) {
                        Asset.update(
                            { health_status: computedStatus },
                            { where: { id: mapping.asset.id } }
                        ).then(() => {
                            console.log(`[IoT] health_status synced: ${mapping.asset.asset_code} → ${computedStatus}`);
                        }).catch(err => {
                            console.error('[IoT] Failed to sync asset health_status:', err);
                        });
                    }
                }
            }
            // Add FE, FH notification logic here in future
        }

        if (allNotifications.length > 0) {
            try {
                // Deduplicate notifications (safety net)
                // Distinct by: title + message + related_entity_id
                const uniqueNotifsInfo = new Set();
                const uniqueNotifications = allNotifications.filter(n => {
                    const key = `${n.title}|${n.message}|${n.related_entity_id}`;
                    if (uniqueNotifsInfo.has(key)) {
                        return false;
                    }
                    uniqueNotifsInfo.add(key);
                    return true;
                });

                if (uniqueNotifications.length < allNotifications.length) {
                    console.log(`[IoT] 🧹 Deduplicated notifications: ${allNotifications.length} -> ${uniqueNotifications.length}`);
                }

                const { get_users_for_plant } = require('../notifications/notificationService');

                // Get unique plant IDs from notifications
                const plantIds = [...new Set(uniqueNotifications.map(n => n.plant_id))];
                const userNotifications = [];

                // For each plant, get users and create notifications
                for (const plantId of plantIds) {
                    if (!plantId) continue;

                    const userIds = await get_users_for_plant(plantId);
                    const plantNotifs = uniqueNotifications.filter(n => n.plant_id === plantId);

                    // Create one notification per user per alert
                    for (const notif of plantNotifs) {
                        for (const userId of userIds) {
                            // Create clean notification object (remove helper fields like plant_id)
                            const { plant_id, ...cleanNotif } = notif;
                            userNotifications.push({
                                ...cleanNotif,
                                user_id: userId
                            });
                        }
                    }
                }

                if (userNotifications.length > 0) {
                    await Notification.bulkCreate(userNotifications);
                    console.log(`[IoT] 📬 Created ${userNotifications.length} notifications for device: ${device_id}`);
                }
            } catch (error) {
                console.error('[IoT] Error creating notifications:', error);
            }
        }

        return {
            message: "IoT data processed successfully",
            device_id,
            category: categoryKey,
            assets_mapped: mappings.length,
            notifications_created: allNotifications.length,
            status: "mapped",
            notifications: allNotifications,
            deviceData: {
                device_id,
                device_data: record.device_data, // Use MERGED data from DB record
                history: safeHistory,
                lastAutoStartDate: record.last_auto_start_date || null,
                timestamp: new Date().toISOString(),
                category: categoryKey
            }
        };
    }

    /**
     * Get all devices and their mappings for a specific plant and category
     * @param {string} plantId - Plant ID
     * @param {string} categoryId - Category ID
     * @returns {Array} - Array of mappings with asset details
     */
    async getDevicesByPlantCategory(plantId, categoryId) {
        const mappings = await IoTDeviceAssetMap.findAll({
            where: {
                plant_id: plantId,
                category_id: categoryId,
            },
            include: [
                {
                    model: Asset,
                    as: "asset",
                    attributes: ["id", "asset_code", "type", "health_status", "building_id", "location"],
                    include: [{
                        model: Building,
                        as: "building",
                        attributes: ["building_name"]
                    }]
                },
                {
                    model: Category,
                    as: "category",
                    attributes: ["id", "category_name"],
                },
            ],
            order: [["device_id", "ASC"], ["data_key", "ASC"]],
        });

        return mappings;
    }

    /**
     * Create new device-to-asset mapping
     * @param {Object} mappingData - { device_id, asset_code, category_id, plant_id, data_key }
     * @returns {Object} - Created mapping object
     */
    async createMapping(mappingData) {
        const { device_id, asset_code, category_id, plant_id, data_key } = mappingData;

        // Validate asset exists
        const asset = await Asset.findOne({
            where: { asset_code }
        });

        if (!asset) {
            throw new Error(`Asset with code ${asset_code} not found`);
        }

        // Check for duplicate mapping
        const existing = await IoTDeviceAssetMap.findOne({
            where: {
                device_id,
                asset_code,
                data_key: data_key || null
            }
        });

        if (existing) {
            throw new Error(`Mapping already exists for device ${device_id}, asset ${asset_code}, data_key ${data_key}`);
        }

        const mapping = await IoTDeviceAssetMap.create({
            device_id,
            asset_code,
            category_id,
            plant_id,
            data_key,
        });

        console.log(`[IoT] Created mapping: device ${device_id} → asset ${asset_code} (${data_key || 'N/A'})`);

        return mapping;
    }

    /**
     * Get latest IoT data for all devices in a plant/category
     * @param {string} plantId - Plant ID
     * @param {string} categoryId - Category ID
     * @returns {Object} - { devices: { device_id: data } }
     */
    async getLatestDeviceData(plantId, categoryId) {
        // Get all device mappings for this plant/category
        const mappings = await IoTDeviceAssetMap.findAll({
            where: {
                plant_id: plantId,
                category_id: categoryId,
            },
            attributes: ['device_id'],
            group: ['device_id'],
            raw: true
        });

        if (mappings.length === 0) {
            return { devices: {} };
        }

        const deviceIds = mappings.map(m => m.device_id);

        // Fetch latest data — EXCLUDE history for performance (history comes via Socket.IO)
        const latestData = await IoTLiveDataPR.findAll({
            where: { device_id: deviceIds },
            attributes: ['device_id', 'device_data', 'updated_at', 'last_auto_start_date'],
            order: [['updated_at', 'DESC']],
            limit: deviceIds.length,
            raw: true
        });

        // Transform to device-indexed object
        const devicesData = {};
        latestData.forEach(record => {
            devicesData[record.device_id] = {
                ...record.device_data,
                lastAutoStartDate: record.last_auto_start_date || null,
                timestamp: record.updated_at
            };
        });

        console.log(`[IoT] Fetched latest data for ${Object.keys(devicesData).length} devices (lightweight, no history)`);

        return { devices: devicesData };
    }

    /**
     * Calculate run hours for a specific pump
     * @param {string} deviceId - Device ID
     * @param {string} pumpKey - Pump key (PS1, PS2, or PS3)
     * @returns {number} - Run hours
     */
    async calculateRunHours(deviceId, pumpKey) {
        try {
            const record = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['device_data', 'history', 'updated_at']
            });

            if (!record) {
                console.log(`[IoT] No record found for device: ${deviceId}`);
                return 0;
            }

            const currentStatus = record.device_data?.[pumpKey];

            // If pump is OFF (1), return 0. (User Schema: 1=OFF, 0=ON)
            // Use Number() to handle string values from IoT devices
            if (Number(currentStatus) === 1 || currentStatus === undefined) {
                return 0;
            }

            // Get history for this pump's power status
            const history = record.history?.[pumpKey];

            if (!history || history.length === 0) {
                console.log(`[IoT] No history found for ${pumpKey} on device: ${deviceId}`);
                return 0;
            }

            // Find the most recent OFF → ON transition
            let lastOnTimestamp = null;

            for (let i = history.length - 1; i >= 1; i--) {
                const current = history[i];
                const previous = history[i - 1];

                // Found OFF (1) → ON (0) transition
                if (Number(previous.data) === 1 && Number(current.data) === 0) {
                    lastOnTimestamp = new Date(current.date);
                    break;
                }
            }

            // If no OFF → ON transition found, use the first ON entry
            if (!lastOnTimestamp) {
                // Check if the first entry was ON (0)
                const firstOnEntry = history.find(entry => Number(entry.data) === 0);
                if (firstOnEntry) {
                    lastOnTimestamp = new Date(firstOnEntry.date);
                } else {
                    return 0;
                }
            }

            // Calculate hours elapsed
            const now = new Date();
            const hoursElapsed = (now - lastOnTimestamp) / (1000 * 60 * 60);

            console.log(`[IoT] ${pumpKey} run hours: ${hoursElapsed.toFixed(2)} hrs (started: ${lastOnTimestamp})`);

            return Math.round(hoursElapsed * 10) / 10; // Round to 1 decimal place
        } catch (error) {
            console.error(`[IoT] Error calculating run hours for ${pumpKey}:`, error);
            return 0;
        }
    }

    /**
     * Get last auto-start timestamp across all pumps
     * @param {string} deviceId - Device ID
     * @returns {Object} - { timestamp, pumpKey }
     */
    async getLastAutoStart(deviceId) {
        try {
            const record = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['history']
            });

            if (!record || !record.history) {
                return { timestamp: null, pumpKey: null };
            }

            let lastAutoStart = null;
            let pumpKey = null;

            // Check all three pumps
            ['PS1', 'PS2', 'PS3'].forEach(key => {
                const history = record.history[key];

                if (!history || history.length === 0) return;

                // Find most recent OFF (1) → ON (0) transition (auto-start)
                for (let i = history.length - 1; i >= 1; i--) {
                    const current = history[i];
                    const previous = history[i - 1];

                    if (previous.data === 1 && current.data === 0) {
                        const startTime = new Date(current.date);

                        if (!lastAutoStart || startTime > lastAutoStart) {
                            lastAutoStart = startTime;
                            pumpKey = key;
                        }
                        break;
                    }
                }
            });

            return { timestamp: lastAutoStart, pumpKey };
        } catch (error) {
            console.error(`[IoT] Error getting last auto start:`, error);
            return { timestamp: null, pumpKey: null };
        }
    }

    /**
     * Get recent pump room notifications
     * @param {string} plantId - Plant ID
     * @param {string} deviceId - Device ID (optional)
     * @param {number} limit - Number of notifications to fetch (default: 5)
     * @returns {Array} - Array of notifications
     */
    async getPumpRoomNotifications(plantId, deviceId = null, limit = 5) {
        try {
            const whereClause = {
                notification_source: 'IOT_DEVICE',
                category: 'ALERT'
            };

            // If deviceId provided, filter by related device (we'll need to join with asset mappings)
            if (deviceId) {
                // Get all assets mapped to this device
                const mappings = await IoTDeviceAssetMap.findAll({
                    where: {
                        device_id: deviceId,
                        plant_id: plantId
                    },
                    attributes: ['asset_code']
                });

                if (mappings.length > 0) {
                    // Get asset IDs
                    const assetCodes = mappings.map(m => m.asset_code);
                    const assets = await Asset.findAll({
                        where: { asset_code: assetCodes },
                        attributes: ['id']
                    });

                    const assetIds = assets.map(a => a.id);

                    whereClause.related_entity_id = {
                        [Op.in]: assetIds
                    };
                }
            }

            const notifications = await Notification.findAll({
                where: whereClause,
                order: [['sent_at', 'DESC']],
                limit: limit,
                include: [{
                    model: Asset,
                    as: 'relatedAsset',
                    attributes: ['id', 'asset_code', 'building_id', 'location'],
                    required: false
                }]
            });

            console.log(`[IoT] Fetched ${notifications.length} pump room notifications`);

            return notifications;
        } catch (error) {
            console.error(`[IoT] Error fetching pump room notifications:`, error);
            return [];
        }
    }

    /**
     * Get comprehensive pump room summary
     * @param {string} plantId - Plant ID
     * @param {string} deviceId - Device ID
     * @returns {Object} - Comprehensive summary data
     */
    async getPumpRoomSummary(plantId, deviceId) {
        try {
            console.log(`[IoT] Fetching pump room summary for plant: ${plantId}, device: ${deviceId}`);

            // Get device mappings
            const mappings = await this.getDevicesByPlantCategory(plantId, null);
            const deviceMappings = mappings.filter(m => m.device_id === deviceId);

            // Get latest device data
            const deviceData = await IoTLiveDataPR.findOne({
                where: { device_id: deviceId },
                attributes: ['device_data', 'history', 'updated_at']
            });

            if (!deviceData) {
                throw new Error(`No data found for device: ${deviceId}`);
            }

            // Get fire safety system data
            const fireSafetyData = await FireSafetySystem.findOne({
                where: { plant_id: plantId },
                attributes: [
                    'diesel_tank_1',
                    'diesel_tank_2',
                    'prime_over_tank',
                    'terrace_tank',
                    'header_pressure_value'
                ]
            });

            // Calculate total diesel and water storage
            const fireSafety = fireSafetyData ? {
                diesel_storage: (parseFloat(fireSafetyData.diesel_tank_1) || 0) + (parseFloat(fireSafetyData.diesel_tank_2) || 0),
                main_water_storage: (parseFloat(fireSafetyData.prime_over_tank) || 0) + (parseFloat(fireSafetyData.terrace_tank) || 0),
                header_pressure: parseFloat(fireSafetyData.header_pressure_value) || 0,
                pressure_unit: 'bar' // Default unit
            } : {
                diesel_storage: 0,
                main_water_storage: 0,
                header_pressure: 0,
                pressure_unit: 'bar'
            };

            // Calculate run hours for each pump
            const runHours = {
                PS1: await this.calculateRunHours(deviceId, 'PS1'),
                PS2: await this.calculateRunHours(deviceId, 'PS2'),
                PS3: await this.calculateRunHours(deviceId, 'PS3')
            };

            // Get last auto-start
            const lastAutoStart = await this.getLastAutoStart(deviceId);

            // Get recent notifications
            const notifications = await this.getPumpRoomNotifications(plantId, deviceId, 5);

            // Calculate pump availability (how many pumps are available/not OFF)
            const pumpStatuses = [
                deviceData.device_data.AS1,
                deviceData.device_data.AS2,
                deviceData.device_data.AS3
            ];
            const availablePumps = pumpStatuses.filter(status => status !== undefined && status !== null).length;

            return {
                deviceData: deviceData.device_data,
                history: deviceData.history,
                timestamp: deviceData.updated_at,
                mappings: deviceMappings,
                fireSafety: fireSafety,
                runHours,
                lastAutoStart,
                notifications,
                pumpAvailability: {
                    available: availablePumps,
                    total: 3
                }
            };
        } catch (error) {
            console.error(`[IoT] Error fetching pump room summary:`, error);
            throw error;
        }
    }

    /**
     * Update an existing device-to-asset mapping
     * @param {string} id - Mapping ID
     * @param {Object} updateData - Fields to update
     * @returns {Object} - Updated mapping
     */
    async updateMapping(id, updateData) {
        const mapping = await IoTDeviceAssetMap.findByPk(id);

        if (!mapping) {
            throw new Error("Mapping not found");
        }

        const { device_id, asset_code, data_key } = updateData;

        // If asset_code changed, validate the new asset exists
        if (asset_code && asset_code !== mapping.asset_code) {
            const asset = await Asset.findOne({ where: { asset_code } });
            if (!asset) {
                throw new Error(`Asset with code ${asset_code} not found`);
            }
        }

        // Check for duplicate mapping (excluding current mapping)
        if (device_id || asset_code || data_key) {
            const checkDeviceId = device_id || mapping.device_id;
            const checkAssetCode = asset_code || mapping.asset_code;
            const checkDataKey = data_key || mapping.data_key;

            const existing = await IoTDeviceAssetMap.findOne({
                where: {
                    device_id: checkDeviceId,
                    asset_code: checkAssetCode,
                    data_key: checkDataKey || null,
                    id: { [Op.ne]: id }
                }
            });

            if (existing) {
                throw new Error(`Mapping already exists for device ${checkDeviceId}, asset ${checkAssetCode}, data_key ${checkDataKey}`);
            }
        }

        // Update allowed fields
        if (device_id) mapping.device_id = device_id;
        if (asset_code) mapping.asset_code = asset_code;
        if (data_key) mapping.data_key = data_key;

        await mapping.save();

        console.log(`[IoT] Updated mapping: ${id}`);

        return mapping;
    }

    /**
     * Remove device-to-asset mapping
     * @param {string} id - Mapping ID
     * @returns {Object} - { message }
     */
    async deleteMapping(id) {
        const mapping = await IoTDeviceAssetMap.findByPk(id);

        if (!mapping) {
            throw new Error("Mapping not found");
        }

        await mapping.destroy();

        console.log(`[IoT] Deleted mapping: ${id}`);

        return { message: "Mapping deleted successfully" };
    }

    /**
     * Get all plants that have pump room devices
     * @returns {Array} - Array of plants with their pump room device IDs
     */
    async getPlantsWithPumpRoom() {
        try {
            // Find ALL pump-related categories using flexible keyword matching.
            // Handles: 'Pump Room', 'pump room', 'Fire Fighting Pumps', 'Fire Pump', etc.
            const PUMP_KEYWORDS = ['pump room', 'fire fighting pump', 'firefighting pump', 'fire pump', 'pump'];

            const pumpRoomCategories = await Category.findAll({
                where: {
                    [Op.or]: PUMP_KEYWORDS.map(kw => ({
                        category_name: { [Op.iLike]: `%${kw}%` }
                    }))
                }
            });

            if (!pumpRoomCategories || pumpRoomCategories.length === 0) {
                console.log('[IoT] No pump-related categories found in database');
                return { plants: [], category_id: null, category_ids: [] };
            }

            const categoryIds = pumpRoomCategories.map(c => c.id);
            console.log(`[IoT] Found ${pumpRoomCategories.length} pump-related categories:`, pumpRoomCategories.map(c => c.category_name));

            // Get all plants that have pump room devices across all matching categories
            const mappings = await IoTDeviceAssetMap.findAll({
                where: {
                    category_id: { [Op.in]: categoryIds }
                },
                attributes: ['plant_id', 'device_id', 'category_id'],
                include: [
                    {
                        model: Plant,
                        as: 'plant',
                        attributes: ['id', 'plant_name', 'plant_code']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'category_name']
                    }
                ],
                group: ['IoTDeviceAssetMap.plant_id', 'IoTDeviceAssetMap.device_id', 'IoTDeviceAssetMap.category_id', 'plant.id', 'category.id'],
                raw: false
            });

            // Group by plant
            const plantsMap = new Map();
            for (const mapping of mappings) {
                const plantId = mapping.plant_id;
                if (!plantsMap.has(plantId)) {
                    plantsMap.set(plantId, {
                        id: mapping.plant.id,
                        plant_name: mapping.plant.plant_name,
                        plant_code: mapping.plant.plant_code,
                        devices: [],
                        category_id: mapping.category_id,
                        category_name: mapping.category?.category_name
                    });
                }
                if (!plantsMap.get(plantId).devices.includes(mapping.device_id)) {
                    plantsMap.get(plantId).devices.push(mapping.device_id);
                }
            }

            return {
                plants: Array.from(plantsMap.values()),
                category_id: categoryIds[0],   // backward compat: first matched category
                category_ids: categoryIds        // all matched category IDs
            };
        } catch (error) {
            console.error('[IoT] Error getting plants with pump room:', error);
            throw error;
        }
    }


    /**
     * Get summary of all device mappings with port usage
     * Used by IoT Setup UI to show which ports are available and warn about conflicts
     * @param {Object} filters - { plantId, categoryId }
     * @returns {Object} - { devices: [...] }
     */
    async getDeviceMappingsSummary(filters = {}) {
        const { plantId, categoryId } = filters;

        console.log(`[IoT] Fetching device mappings summary for plant: ${plantId}, category: ${categoryId}`);

        // Get all devices from IoT live data tables based on category
        let allDeviceIds = [];

        // Query all IoT tables to get unique device IDs
        const [prDevices, feDevices, fhDevices] = await Promise.all([
            IoTLiveDataPR.findAll({ attributes: ['device_id'] }),
            IoTLiveDataFE.findAll({ attributes: ['device_id'] }),
            IoTLiveDataFH.findAll({ attributes: ['device_id'] })
        ]);

        allDeviceIds = [
            ...prDevices.map(d => d.device_id),
            ...feDevices.map(d => d.device_id),
            ...fhDevices.map(d => d.device_id)
        ];

        // Remove duplicates
        const uniqueDeviceIds = [...new Set(allDeviceIds)];

        // Get all existing mappings
        const mappings = await IoTDeviceAssetMap.findAll({
            include: [{
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'building_id', 'location'],
                include: [{
                    model: Building,
                    as: 'building',
                    attributes: ['building_name']
                }]
            }]
        });

        // Group mappings by device_id
        const deviceMappingsMap = {};

        mappings.forEach(mapping => {
            const deviceId = mapping.device_id;
            if (!deviceMappingsMap[deviceId]) {
                deviceMappingsMap[deviceId] = [];
            }

            deviceMappingsMap[deviceId].push({
                data_key: mapping.data_key,
                asset_code: mapping.asset_code,
                asset_id: mapping.asset?.id,
                asset_name: mapping.asset?.building?.building_name
                    ? `${mapping.asset.building.building_name} - ${mapping.asset.location || 'N/A'}`
                    : 'Unknown',
                mapping_id: mapping.id
            });
        });

        // Build response with all devices
        const devices = uniqueDeviceIds.map(deviceId => {
            const deviceMappings = deviceMappingsMap[deviceId] || [];
            const usedKeys = deviceMappings.map(m => m.data_key);
            const allPossibleKeys = ['AS1', 'AS2', 'AS3'];
            const availableKeys = allPossibleKeys.filter(key => !usedKeys.includes(key));

            return {
                device_id: deviceId,
                mappings: deviceMappings,
                available_keys: availableKeys,
                usage_count: deviceMappings.length,
                total_ports: allPossibleKeys.length
            };
        });

        console.log(`[IoT] Found ${devices.length} devices with mappings`);

        return { devices };
    }
}

module.exports = new IoTService();
