const {
    IoTLiveDataPR,
    IoTLiveDataFE,
    IoTLiveDataFH,
    IoTDeviceAssetMap,
} = require("../models/iot");

/**
 * Helper: Determine which IoT model to use based on category key
 * @param {string} categoryKey - pr, fe, or fh
 * @returns {Model|null} - Sequelize model or null
 */
const getIoTModel = (categoryKey) => {
    switch (categoryKey) {
        case "pr":
            return IoTLiveDataPR;
        case "fe":
            return IoTLiveDataFE;
        case "fh":
            return IoTLiveDataFH;
        default:
            return null;
    }
};

/**
 * Socket.IO handler for multi-device IoT subscriptions
 * Supports category-based device subscriptions
 * 
 * Usage from frontend:
 * socket.emit("subscribe:device", { device_id: "DEVICE_PR_001", category_key: "pr" })
 */
module.exports = (io, socket) => {
    /**
     * Subscribe to device updates
     * Client sends: { device_id, category_key }
     * Server responds with latest data and joins room for live updates
     */
    socket.on("subscribe:device", async ({ device_id, category_key }) => {
        if (!device_id || !category_key) {
            return socket.emit("live-data:error", {
                message: "device_id and category_key are required",
            });
        }

        const IoTModel = getIoTModel(category_key);
        if (!IoTModel) {
            return socket.emit("live-data:error", {
                message: `Invalid category: ${category_key}. Must be 'pr', 'fe', or 'fh'`,
            });
        }

        // Join device-specific room
        socket.join(`device_${device_id}`);
        console.log(`[Socket] ${socket.id} joined device_${device_id} (category: ${category_key})`);

        try {
            // Fetch latest data from database
            const data = await IoTModel.findOne({
                where: { device_id },
                raw: true,
            });

            if (data) {
                // Truncate history for socket performance (keep last 100)
                const safeHistory = {};
                if (data.history) {
                    Object.keys(data.history).forEach(key => {
                        const arr = data.history[key];
                        if (Array.isArray(arr)) {
                            safeHistory[key] = arr.slice(-100);
                        }
                    });
                }

                // Send latest data to this socket
                socket.emit("live-data", {
                    device_id: data.device_id,
                    device_data: data.device_data,
                    history: safeHistory,
                    lastAutoStartDate: data.last_auto_start_date || null, // Flat DB column — instant
                    timestamp: data.updated_at,
                    category: category_key,
                });
                console.log(`[Socket] Sent initial data for device: ${device_id} (lastAutoStart: ${data.last_auto_start_date || 'none'})`);
            } else {
                socket.emit("live-data", {
                    message: "No data found for this device",
                    device_id,
                    category: category_key
                });
            }
        } catch (err) {
            console.error(`[Socket] Error fetching device data for ${device_id}:`, err);
            socket.emit("live-data:error", {
                message: "Failed to fetch initial device data",
                device_id,
            });
        }
    });

    /**
     * Unsubscribe from device updates
     * Client sends: { device_id }
     */
    socket.on("unsubscribe:device", ({ device_id }) => {
        if (!device_id) return;

        socket.leave(`device_${device_id}`);
        console.log(`[Socket] ${socket.id} left device_${device_id}`);
    });

    /**
     * Handle disconnect - cleanup
     */
    socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
};
