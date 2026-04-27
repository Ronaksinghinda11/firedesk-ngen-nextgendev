import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import PumpPerformance from "./components/PumpPerformance";
import SupportSystemStatus from "./components/SupportSystemStatus";
import TrendsPerformance from "./components/TrendsPerformance";




// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface PumpRoomProps {
    selectedPlant: string;
    categoryId: string;
}

interface PumpIotData {
    WLS?: number;
    DLS?: number;
    PLS?: number;
    [key: string]: any;
}

interface Asset {
    _id: string;
    id: string;
    product: {
        productName: string;
        variants: Array<{
            type: string;
            image: string;
        }>;
    };
    assetId: string;
    building: string;
    location: string;
    healthStatus: string;
    type: string;
    [key: string]: any;
}

interface PumpData {
    [key: string]: any;
}

interface LiveDataPayload {
    device_id: string;
    device_data: PumpIotData;
    timestamp: string;
}

interface SocketEvents {
    connect: () => void;
    disconnect: () => void;
    "live-data": (data: LiveDataPayload) => void;
    "live-data:error": (error: { message: string }) => void;
}

interface SocketEmitEvents {
    "subscribe:device": (payload: { device_id: string }) => void;
    "unsubscribe:device": (payload: { device_id: string }) => void;
}
// -----------------------------------------------------
// COMPONENT
// -----------------------------------------------------

const PumpRoom: React.FC<PumpRoomProps> = ({ selectedPlant, categoryId }) => {
    const [pumpIotData, setPumpIotData] = useState<PumpIotData>({});
    const [timestamp, setTimestamp] = useState<string>("");
    const [pumpData, setPumpData] = useState<PumpData>({});
    const [assets, setAssets] = useState<Asset[]>([]);
    const [pumpIotDeviceId, setPumpIotDeviceId] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // -----------------------------------------------------
    // 1) FETCH ALL INITIAL DATA (DEVICE ID + DASHBOARD DATA)
    // -----------------------------------------------------
    useEffect(() => {
        const fetchInitialData = async () => {
            // Only fetch if both plantId and categoryId are present
            if (!selectedPlant || !categoryId) {
                console.log('⏸️ Waiting for plant and category selection...');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Fetch device ID and dashboard data in parallel
                const [deviceResponse, dashboardResponse] = await Promise.all([
                    pumpRoomApi.getPumpIotDeviceIdByPlant(selectedPlant),
                    pumpRoomApi.getPumpDashboardData({ plantId: selectedPlant }),
                ]);

                // Set device ID
                if (deviceResponse.success && deviceResponse.data.pumpIotDeviceId) {
                    setPumpIotDeviceId(deviceResponse.data.pumpIotDeviceId);
                } else {
                    console.warn("No IoT device configured for this plant");
                }

                // Set dashboard data
                if (dashboardResponse.status === 200) {
                    setPumpData(dashboardResponse.data?.plantData || {});
                    setAssets(dashboardResponse.data?.assets || []);
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
                setError(error instanceof Error ? error.message : "Failed to load data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [selectedPlant]);

    // -----------------------------------------------------
    // 2) SOCKET.IO CONNECTION (AFTER DEVICE ID EXISTS)
    // -----------------------------------------------------
    useEffect(() => {
        if (!pumpIotDeviceId) {
            console.log("⏳ Waiting for device ID...");
            return;
        }

        console.log("✅ Device ID ready:", pumpIotDeviceId);

        const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
        const socket: Socket<SocketEvents, SocketEmitEvents> = io(socketUrl, {
            path: "/socket.io/",
            transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
            console.log("🔌 Socket connected:", socket.id);
            console.log("📡 Subscribing to:", pumpIotDeviceId);

            socket.emit("subscribe:device", { device_id: pumpIotDeviceId });
        });

        socket.on("live-data", (data: LiveDataPayload) => {
            console.log("📥 LIVE DATA:", data);
            setPumpIotData(data?.device_data || {});
            setTimestamp(data?.timestamp || "");
        });

        socket.on("disconnect", () => {
            console.log("🔌 Socket disconnected");
        });

        socket.on("live-data:error", (error) => {
            console.error("❌ Socket error:", error.message);
        });

        return () => {
            console.log("🧹 Cleaning up socket connection");
            socket.disconnect();
        };
    }, [pumpIotDeviceId]);

    // -----------------------------------------------------
    // RENDER
    // -----------------------------------------------------

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading pump room data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PumpPerformance
                timestamp={timestamp}
                assets={assets}
                pumpIotData={pumpIotData}
            />
            <SupportSystemStatus
                timestamp={timestamp}
                pumpIotData={pumpIotData}
                pumpData={pumpData}
            />
            <TrendsPerformance
                lastWaterLevel={pumpIotData?.WLS}
                lastDieselLevel={pumpIotData?.DLS}
                lastHeaderPressureLevel={pumpIotData?.PLS}
                timestamp={timestamp}
                plantId={selectedPlant}
                categoryId={categoryId}
            />
        </div>
    );
};

export default PumpRoom;