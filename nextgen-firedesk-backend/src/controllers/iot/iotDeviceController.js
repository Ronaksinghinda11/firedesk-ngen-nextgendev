const iotService = require("../../services/iot/iotService");

const iotDeviceController = {
    /**
     * POST /api/iot/data
     * Receives IoT data from AWS Lambda/devices
     * 
     * Expected payload format:
     * {
     *   "topic": "PR/123456AB/sensor-info",  // Category/Device_ID/info
     *   "AS1": 1, "WLS": 70, ...            // Sensor data
     * }
     * 
     * IMPORTANT: Data is ALWAYS stored, even without asset mapping
     */
    async receiveIoTData(req, res, next) {
        try {
            // Handle valid 'device_data' or typo 'device_date' from incoming payload
            const payload = req.body.device_data;
            const result = await iotService.receiveIoTData(payload);

            // Controller handles Socket.IO emission (requires req.io)
            if (req.io && result.deviceData) {
                req.io.to(`device_${result.device_id}`).emit("live-data", result.deviceData);
                console.log(`[IoT] 📡 Emitted socket event for device: ${result.device_id}`);
            }

            return res.json({
                message: result.message,
                device_id: result.device_id,
                category: result.category,
                status: result.status,
                ...(result.status === "unmapped" && { note: result.note }),
                ...(result.status === "mapped" && {
                    assets_mapped: result.assets_mapped,
                    notifications_created: result.notifications_created
                })
            });
        } catch (error) {
            console.error("[IoT] ❌ Error processing data:", error);
            return next(error);
        }
    },

    /**
     * GET /api/iot/devices/by-plant/:plantId/:categoryId
     * Get all devices and their mappings for a specific plant and category
     */
    async getDevicesByPlantCategory(req, res, next) {
        const { plantId, categoryId } = req.params;

        try {
            const mappings = await iotService.getDevicesByPlantCategory(plantId, categoryId);
            return res.json(mappings);
        } catch (error) {
            console.error("[IoT] Error fetching devices:", error);
            return next(error);
        }
    },

    /**
     * POST /api/iot/mapping
     * Create new device-to-asset mapping
     * Frontend IoT Setup page uses this
     */
    async createMapping(req, res, next) {
        try {
            const mapping = await iotService.createMapping(req.body);

            return res.json({
                message: "Mapping created successfully",
                mapping,
            });
        } catch (error) {
            if (error.message.includes("not found")) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes("already exists")) {
                return res.status(409).json({ error: error.message });
            }
            console.error("[IoT] Error creating mapping:", error);
            return next(error);
        }
    },

    /**
     * GET /api/iot/devices/latest/:plantId/:categoryId
     * Get latest IoT data for all devices in a plant/category
     */
    async getLatestDeviceData(req, res, next) {
        const { plantId, categoryId } = req.params;

        try {
            const result = await iotService.getLatestDeviceData(plantId, categoryId);
            return res.json(result);
        } catch (error) {
            console.error('[IoT] Error fetching latest device data:', error);
            return next(error);
        }
    },

    /**
     * PUT /api/iot/mapping/:id
     * Update an existing device-to-asset mapping
     */
    async updateMapping(req, res, next) {
        const { id } = req.params;

        try {
            const mapping = await iotService.updateMapping(id, req.body);

            return res.json({
                message: "Mapping updated successfully",
                mapping,
            });
        } catch (error) {
            if (error.message.includes("not found")) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes("already exists")) {
                return res.status(409).json({ error: error.message });
            }
            console.error("[IoT] Error updating mapping:", error);
            return next(error);
        }
    },

    /**
     * DELETE /api/iot/mapping/:id
     * Remove device-to-asset mapping
     */
    async deleteMapping(req, res, next) {
        const { id } = req.params;

        try {
            const result = await iotService.deleteMapping(id);
            return res.json(result);
        } catch (error) {
            if (error.message === "Mapping not found") {
                return res.status(404).json({ error: error.message });
            }
            console.error("[IoT] Error deleting mapping:", error);
            return next(error);
        }
    },

    /**
     * GET /api/iot/device-mappings-summary
     * Get summary of all device mappings with port usage
     * Used by IoT Setup UI to show which ports are available and warn about conflicts
     */
    async getDeviceMappingsSummary(req, res, next) {
        try {
            const result = await iotService.getDeviceMappingsSummary(req.query);
            return res.json(result);
        } catch (error) {
            console.error('[IoT] Error fetching device mappings summary:', error);
            return next(error);
        }
    },

    /**
     * GET /api/iot/pump-room-summary/:plantId/:deviceId
     * Get comprehensive pump room summary
     */
    async getPumpRoomSummary(req, res, next) {
        const { plantId, deviceId } = req.params;

        try {
            const result = await iotService.getPumpRoomSummary(plantId, deviceId);
            return res.json(result);
        } catch (error) {
            console.error('[IoT] Error fetching pump room summary:', error);
            if (error.message.includes('No data found')) {
                return res.status(404).json({ error: error.message });
            }
            return next(error);
        }
    },

    /**
     * GET /api/iot/pump-room-notifications/:plantId/:deviceId
     * Get recent pump room notifications
     */
    async getPumpRoomNotifications(req, res, next) {
        const { plantId, deviceId } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        try {
            const notifications = await iotService.getPumpRoomNotifications(plantId, deviceId, limit);
            return res.json({ notifications });
        } catch (error) {
            console.error('[IoT] Error fetching pump room notifications:', error);
            return next(error);
        }
    },

    /**
     * GET /api/iot/plants-with-pump-room
     * Get all plants that have pump room devices
     */
    async getPlantsWithPumpRoom(req, res, next) {
        try {
            const result = await iotService.getPlantsWithPumpRoom();
            return res.json(result); // Returns { plants: [...], category_id: '...' }
        } catch (error) {
            console.error('[Controller] Error getting plants with pump room:', error);
            next(error);
        }
    },
};

module.exports = iotDeviceController;
