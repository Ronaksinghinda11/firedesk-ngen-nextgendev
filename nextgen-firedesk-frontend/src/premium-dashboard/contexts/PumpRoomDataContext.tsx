import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { pumpRoomApi } from "@/services/api/dashboardApi";
import { iotApi, IoTDeviceMapping } from "@/services/api/iotApi";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

export interface PumpIotData {
    WLS?: number;
    DLS?: number;
    PLS?: number;
    AS1?: number;
    AS2?: number;
    AS3?: number;
    TS1?: number;
    TS2?: number;
    TS3?: number;
    PS1?: number;
    PS2?: number;
    PS3?: number;
    WTP?: number;
    OPR?: number;
    BCH?: number;
    BAT1?: number;
    BAT2?: number;
    PWR?: number;
    [key: string]: any;
}

// Device-indexed raw data from Socket.IO
interface DeviceData {
    [deviceId: string]: PumpIotData;
}

// Asset-indexed computed data for components
interface AssetIoTData {
    assetId: string;
    deviceId: string;
    dataKey: string;
    liveData: {
        // Asset-specific sensors (from data_key)
        status: number;
        powerStatus: number;
        tripStatus: number;

        // Shared pump room sensors (device-level)
        waterLevel?: number;
        dieselLevel?: number;
        headerPressure?: number;
        batteryVoltage1?: number;
        batteryVoltage2?: number;
        oilPressure?: number;
        waterTemperature?: number;
        batteryCharger?: number;
        powerConsumption?: number;
    };
    timestamp: string;
}

interface AssetDataMap {
    [assetId: string]: AssetIoTData;
}

export interface Asset {
    _id?: string;
    id: string;
    product: {
        product_name: string;  // Changed from productName to match backend
        variants: Array<{
            type: string;
            image: string;
        }>;
    };
    asset_code: string;  // Changed from assetId
    building: string;
    location: string;
    healthStatus: string;
    type: string;
    [key: string]: any;
}

export interface PumpData {
    dieselStorage?: number;
    mainWaterStorage?: number;
    headerPressure?: number;
    pressureUnit?: string;
    assetCapacities?: Record<string, number>; // Maps asset codes to capacities
    dataKeyToAssetCode?: Record<string, string>; // Maps data_key (e.g. 'AS1') to asset_code
    [key: string]: any;
}

interface LiveDataPayload {
    device_id: string;
    device_data: PumpIotData;
    timestamp: string;
    category?: string;
}

interface SocketEvents {
    connect: () => void;
    disconnect: () => void;
    "live-data": (data: LiveDataPayload) => void;
    "live-data:error": (error: { message: string }) => void;
}

interface SocketEmitEvents {
    "subscribe:device": (payload: { device_id: string; category_key: string }) => void;
    "unsubscribe:device": (payload: { device_id: string }) => void;
}

export interface PumpRoomContextValue {
    // New multi-device fields
    deviceData: DeviceData;
    assetData: AssetDataMap;
    deviceMappings: IoTDeviceMapping[];
    deviceIds: string[];

    // Legacy single-device fields (backward compatibility)
    pumpIotData: PumpIotData;
    timestamp: string;
    pumpIotDeviceId: string;

    // Common fields
    pumpData: PumpData;
    assets: Asset[];
    isLoading: boolean;
    error: string | null;
    selectedPlant: string;
    categoryId: string;
    refreshData: () => Promise<void>;
    refreshMappings: () => Promise<void>;
    refetchPumpDataForDevice: (deviceId: string) => Promise<void>; // New: refetch pump data for specific device
}

interface PumpRoomDataProviderProps {
    children: ReactNode;
    selectedPlant: string;
    categoryId: string;
}

// -----------------------------------------------------
// CONTEXT
// -----------------------------------------------------

const PumpRoomDataContext = createContext<PumpRoomContextValue | undefined>(undefined);

// -----------------------------------------------------
// PROVIDER COMPONENT
// -----------------------------------------------------

export const PumpRoomDataProvider: React.FC<PumpRoomDataProviderProps> = ({
    children,
    selectedPlant,
    categoryId,
}) => {
    // New multi-device state
    const [deviceData, setDeviceData] = useState<DeviceData>({});
    const [deviceMappings, setDeviceMappings] = useState<IoTDeviceMapping[]>([]);
    const [deviceIds, setDeviceIds] = useState<string[]>([]);

    // Legacy single-device state (backward compatibility)
    const [pumpIotData, setPumpIotData] = useState<PumpIotData>({});
    const [timestamp, setTimestamp] = useState<string>("");
    const [pumpIotDeviceId, setPumpIotDeviceId] = useState<string>("");

    // Common state
    const [pumpData, setPumpData] = useState<PumpData>({});
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // -----------------------------------------------------
    // FETCH DEVICE MAPPINGS
    // -----------------------------------------------------
    const fetchDeviceMappings = async () => {
        if (!selectedPlant || !categoryId) {
            console.log("⏸️ Waiting for plant and category selection...");
            return;
        }

        try {
            console.log(`[Context] Fetching device mappings for plant: ${selectedPlant}, category: ${categoryId}`);

            const mappings = await iotApi.getDevicesByPlantCategory(selectedPlant, categoryId);
            setDeviceMappings(mappings || []);

            // Extract unique device IDs
            const uniqueDeviceIds = [...new Set((mappings || []).map(m => m.device_id))];
            setDeviceIds(uniqueDeviceIds);

            // Set legacy device ID (first device for backward compatibility)
            if (uniqueDeviceIds.length > 0) {
                setPumpIotDeviceId(uniqueDeviceIds[0]);
            }

            console.log(`[Context] ✅ Loaded ${mappings?.length || 0} mappings for ${uniqueDeviceIds.length} devices`);

            // **FETCH INITIAL DATA FROM DATABASE**
            if (uniqueDeviceIds.length > 0) {
                console.log('[Context] 📦 Fetching initial device data from database...');
                const initialData = await iotApi.getLatestDeviceData(selectedPlant, categoryId);

                if (initialData && Object.keys(initialData).length > 0) {
                    setDeviceData(prev => {
                        const merged = { ...prev };
                        Object.keys(initialData).forEach(deviceId => {
                            merged[deviceId] = {
                                ...initialData[deviceId],
                                // Preserve lastAutoStartDate if we already have a good value
                                // (API may return null for uncached records; socket may arrive later with correct value)
                                lastAutoStartDate: initialData[deviceId].lastAutoStartDate
                                    || prev[deviceId]?.lastAutoStartDate
                                    || null,
                                // Preserve history from socket if API no longer sends it
                                history: initialData[deviceId].history
                                    || prev[deviceId]?.history
                                    || undefined,
                            };
                        });
                        return merged;
                    });
                    console.log(`[Context] ✅ Loaded initial data for ${Object.keys(initialData).length} devices`);

                    // Set legacy pumpIotData for first device
                    if (uniqueDeviceIds[0] && initialData[uniqueDeviceIds[0]]) {
                        setPumpIotData(initialData[uniqueDeviceIds[0]]);
                        setTimestamp(initialData[uniqueDeviceIds[0]].timestamp || new Date().toISOString());
                    }
                } else {
                    console.log('[Context] ⚠️ No initial data found in database');
                }
            }
        } catch (error) {
            console.warn('[Context] ⚠️ No device mappings found (this is OK if using old monitoring system):', error);
            // Don't set error state - just continue with empty mappings
            setDeviceMappings([]);
            setDeviceIds([]);
        }
    };

    // -----------------------------------------------------
    // FETCH INITIAL DATA
    // -----------------------------------------------------
    const fetchInitialData = async (deviceCode?: string) => {
        if (!selectedPlant || !categoryId) {
            console.log("⏸️ Waiting for plant and category selection...");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            console.log(`[Context] Fetching data for plant: ${selectedPlant}, category: ${categoryId}, device: ${deviceCode || 'all'}`);

            const response = await pumpRoomApi.getPumpRoomData(selectedPlant, categoryId, deviceCode);

            console.log('[Context] 📦 API Response:', response);

            // The response structure is { status: 200, data: { pumpData, assets, ... } }
            if (response.status === 200 && response.data) {
                const { pumpData, assets } = response.data;

                console.log('[Context] 🔧 Setting pumpData from fire safety form:', pumpData);
                console.log('[Context] 📊 Setting assets:', assets);

                setPumpData(pumpData || {});
                setAssets(assets || []);
                console.log(`[Context] ✅ Loaded ${assets?.length || 0} assets`);
            } else {
                console.warn('[Context] ⚠️ Unexpected response structure:', response);
            }
        } catch (error) {
            console.error("[Context] ❌ Error fetching initial data:", error);
            setError(error instanceof Error ? error.message : "Failed to load pump room data");
        } finally {
            setIsLoading(false);
        }
    };

    // Refetch pumpData when deviceIds change (to get device-specific capacities)
    useEffect(() => {
        if (deviceIds.length > 0) {
            console.log(`[Context] 🔄 Refetching pumpData for device: ${deviceIds[0]}`);
            console.log('[Context] Current deviceIds:', deviceIds);
            fetchInitialData(deviceIds[0]);
        }
    }, [deviceIds]); // Re-fetch when device list changes

    // Fetch mappings on mount/plant change
    useEffect(() => {
        fetchDeviceMappings();
    }, [selectedPlant, categoryId]);

    // NOTE: fetchInitialData is called via the deviceIds useEffect above (line 266)
    // when fetchDeviceMappings completes and updates deviceIds — no need to call it twice

    // -----------------------------------------------------
    // SOCKET.IO - MULTI-DEVICE SUBSCRIPTION
    // -----------------------------------------------------
    useEffect(() => {
        if (deviceIds.length === 0) {
            console.log("[Context] ⏸️ No devices to subscribe to");
            return;
        }

        const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
        console.log(`[Context] 🔌 Connecting to Socket.IO: ${socketUrl}`);

        const socket: Socket<SocketEvents, SocketEmitEvents> = io(socketUrl, {
            path: "/socket.io/",
            transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
            console.log(`[Context] ✅ Socket connected: ${socket.id}`);

            // Subscribe to all devices
            deviceIds.forEach(deviceId => {
                socket.emit("subscribe:device", {
                    device_id: deviceId,
                    category_key: "pr"
                });
                console.log(`[Context] 📡 Subscribed to device: ${deviceId}`);
            });
        });

        socket.on("live-data", (data: LiveDataPayload) => {
            console.log(`[Context] 📥 Live data received for device: ${data.device_id}`);
            console.log(`[Context] History included:`, !!data.device_data?.history);

            // Update device data with complete payload (backend now includes history)
            setDeviceData(prev => ({
                ...prev,
                [data.device_id]: {
                    ...data.device_data,
                    history: (data as any).history, // Map history from payload
                    // Preserve existing lastAutoStartDate if socket sends null
                    // (socket only has a value when auto-start was just detected)
                    lastAutoStartDate: (data as any).lastAutoStartDate
                        || prev[data.device_id]?.lastAutoStartDate
                        || null,
                    timestamp: data.timestamp
                }
            }));

            // Update legacy state (backward compatibility - use first device)
            if (data.device_id === deviceIds[0]) {
                setPumpIotData(data.device_data || {});
                setTimestamp(data.timestamp || "");
            }
        });

        socket.on("disconnect", () => {
            console.log("[Context] 🔌 Socket disconnected");
        });

        socket.on("live-data:error", (error) => {
            console.error("[Context] ❌ Socket error:", error.message);
            setError(error.message);
        });

        return () => {
            console.log("[Context] 🧹 Unsubscribing from all devices");
            deviceIds.forEach(deviceId => {
                socket.emit("unsubscribe:device", { device_id: deviceId });
            });
            socket.disconnect();
        };
    }, [deviceIds]);

    // -----------------------------------------------------
    // POLLING FALLBACK - Ensures data updates even if Socket.IO fails
    // -----------------------------------------------------
    useEffect(() => {
        if (deviceIds.length === 0 || !selectedPlant || !categoryId) {
            return;
        }

        console.log('[Context] 🔄 Starting polling fallback (30s interval)');

        const interval = setInterval(async () => {
            try {
                console.log('[Context] 📡 Polling for latest data from DB...');
                const latestData = await iotApi.getLatestDeviceData(selectedPlant, categoryId);

                if (latestData && Object.keys(latestData).length > 0) {
                    console.log(`[Context] ✅ Polling received data for ${Object.keys(latestData).length} devices`);

                    // Merge with existing data (Socket.IO has priority if timestamps are newer)
                    setDeviceData(prev => {
                        const merged = { ...prev };

                        Object.keys(latestData).forEach(deviceId => {
                            const polledData = latestData[deviceId];
                            const existingData = prev[deviceId];

                            // If no existing data, use polled data
                            if (!existingData) {
                                merged[deviceId] = polledData;
                                return;
                            }

                            // If polled data has newer timestamp, update
                            const polledTime = new Date(polledData.timestamp || 0).getTime();
                            const existingTime = new Date(existingData.timestamp || 0).getTime();

                            if (polledTime > existingTime) {
                                console.log(`[Context] 🔄 Updating ${deviceId} with newer polled data`);
                                merged[deviceId] = {
                                    ...polledData,
                                    history: existingData.history || polledData.history, // Preserve history
                                    lastAutoStartDate: existingData.lastAutoStartDate || polledData.lastAutoStartDate // Preserve auto-start
                                };
                            }
                        });

                        return merged;
                    });
                } else {
                    console.log('[Context] ⏸️ No data from polling');
                }
            } catch (error) {
                console.error('[Context] ⚠️ Polling error (non-critical):', error);
                // Don't set error state - polling failures are non-critical
            }
        }, 30000); // Poll every 30 seconds

        return () => {
            console.log('[Context] 🛑 Stopping polling fallback');
            clearInterval(interval);
        };
    }, [deviceIds, selectedPlant, categoryId]);

    // -----------------------------------------------------
    // COMPUTE ASSET DATA (useMemo)
    // -----------------------------------------------------
    const assetData = useMemo(() => {
        const result: AssetDataMap = {};

        deviceMappings.forEach(mapping => {
            const device = deviceData[mapping.device_id];

            // Skip if device hasn't sent data yet
            if (!device) {
                console.log(`[Context] ⏸️ No data yet for device: ${mapping.device_id}`);
                return;
            }

            // Skip if no data_key
            if (!mapping.data_key) {
                console.warn(`[Context] ⚠️ No data_key for mapping:`, mapping);
                return;
            }

            const keyNum = mapping.data_key.slice(-1); // "1", "2", or "3"

            // Debug: Log the extraction for this asset
            console.log(`[AssetData] Extracting for ${mapping.asset_code} (dataKey: ${mapping.data_key}):`, {
                keyNum,
                device_keys: Object.keys(device),
                PS: device[`PS${keyNum}`],
                AS: device[`AS${keyNum}`],
                TS: device[`TS${keyNum}`],
            });

            // Use asset_code as the key (this matches with asset.assetId from the old system)
            result[mapping.asset_code] = {
                assetId: mapping.asset_code,
                deviceId: mapping.device_id,
                dataKey: mapping.data_key,
                liveData: {
                    // Asset-specific sensors (from data_key)
                    // PS = Power Status: 1 = OFF, 0 = ON
                    status: device[`PS${keyNum}`] ?? 0,
                    // AS = Auto/Manual Switch: 1 = Auto, 0 = Manual
                    powerStatus: device[`AS${keyNum}`] ?? 0,
                    // TS = Trip Status: 1 = Normal, 0 = Tripped
                    tripStatus: device[`TS${keyNum}`] ?? 1,

                    // Shared pump room sensors (device-level, same for all pumps in this device)
                    waterLevel: device.WLS,
                    dieselLevel: device.DLS,
                    headerPressure: device.PLS,
                    batteryVoltage1: device.BAT1,
                    batteryVoltage2: device.BAT2,
                    oilPressure: device.OPR,
                    waterTemperature: device.WTP,
                    batteryCharger: device.BCH,
                    powerConsumption: device.PWR,
                },
                timestamp: new Date().toISOString(),
            };
        });

        console.log(`[Context] ✅ Computed asset data for ${Object.keys(result).length} assets`, result);
        return result;
    }, [deviceData, deviceMappings]);

    // -----------------------------------------------------
    // CONTEXT VALUE
    // -----------------------------------------------------
    const value: PumpRoomContextValue = {
        // New multi-device fields
        deviceData,
        assetData,
        deviceMappings,
        deviceIds,

        // Legacy single-device fields (backward compatibility)
        pumpIotData,
        timestamp,
        pumpIotDeviceId,

        // Common fields
        pumpData,
        assets,
        isLoading,
        error,
        selectedPlant,
        categoryId,
        refreshData: fetchInitialData,
        refreshMappings: fetchDeviceMappings,
        refetchPumpDataForDevice: (deviceId: string) => fetchInitialData(deviceId),
    };

    return (
        <PumpRoomDataContext.Provider value={value}>
            {children}
        </PumpRoomDataContext.Provider>
    );
};

// -----------------------------------------------------
// CUSTOM HOOK
// -----------------------------------------------------

export const usePumpRoomData = (): PumpRoomContextValue => {
    const context = useContext(PumpRoomDataContext);
    if (context === undefined) {
        throw new Error("usePumpRoomData must be used within a PumpRoomDataProvider");
    }
    return context;
};
