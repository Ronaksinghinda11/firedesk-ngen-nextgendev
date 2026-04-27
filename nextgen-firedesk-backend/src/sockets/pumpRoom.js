const { IoTLiveDataPR } = require("../models/iot");

module.exports = (io, socket) => {
    // Subscribe client to a device-specific room and send latest data immediately
    socket.on("subscribe:device", async ({ device_id }) => {
        if (!device_id) return;

        // Join the device room
        socket.join(`device_${device_id}`);
        console.log(`Socket ${socket.id} joined room device_${device_id}`);

        try {
            // Fetch the latest stored data from DB using Sequelize
            const data = await IoTLiveDataPR.findOne({
                where: { device_id },
                raw: true  // Returns plain object like Mongoose's .lean()
            });

            // Emit it directly to this socket (not to the whole room)
            if (data) {
                socket.emit("live-data", {
                    device_id: data.device_id,
                    device_data: data.device_data,
                    timestamp: data.updatedAt,
                });
            } else {
                socket.emit("live-data", { message: "No Live Data Found" });
            }
        } catch (err) {
            console.error("Failed to fetch device data:", err);
            socket.emit("live-data:error", {
                message: "Failed to fetch initial device data",
            });
        }
    });

    socket.on("unsubscribe:device", ({ device_id }) => {
        if (!device_id) return;
        socket.leave(`device_${device_id}`);
        console.log(`Socket ${socket.id} left room device_${device_id}`);
    });
};
