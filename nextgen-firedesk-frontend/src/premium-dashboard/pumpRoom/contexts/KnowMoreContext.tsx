import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Dayjs } from "dayjs";
import { pumpRoomApi } from "@/services/api/dashboardApi";

// Type Definitions
export interface Product {
    product_name: string;  // Changed from productName
    variants: Array<{
        type: string;
        image: string;
    }>;
}

export interface Asset {
    _id: string;
    id: string;
    product: Product;
    productId?: Product;
    asset_code: string;  // Changed from assetId
    building: string;
    location: string;
    type: string;
    healthStatus: string;
}

export interface PumpIotData {
    AS1?: number;
    AS2?: number;
    AS3?: number;
    TS1?: number;
    TS2?: number;
    TS3?: number;
    PS1?: number;
    PS2?: number;
    PS3?: number;
    [key: string]: any;
}

export interface AssetIoTData {
    assetId: string;
    deviceId: string;
    dataKey: string;
    liveData: {
        status: number;
        powerStatus: number;
        tripStatus: number;
        waterLevel?: number;
        dieselLevel?: number;
        batteryVoltage?: number;
        headerPressure?: number;
        batteryChargeHealth?: number;
    };
}

export interface KnowMoreData {
    ageString?: string;
    totalOnHours?: string;
    lastServiceActivity?: any;
    PENDINGByRange?: any;
    completedStatusCount?: any;
    serviceTypeCount?: any;
    lastFiveServiceActivity?: any[];
}

interface KnowMoreContextValue {
    // Asset Selection
    assets: Asset[];
    selectedAsset: string;
    selectedAssetData: Asset | undefined;
    setSelectedAsset: (id: string) => void;

    // IOT Data
    pumpIotData: PumpIotData;
    iotNumber: number;
    AS: string;
    PS: string;

    // Timeline & Filtering
    timeline: string;
    customStartDate: Dayjs;
    customEndDate: Dayjs;
    xAxis: string;
    setTimeline: (timeline: string) => void;
    setCustomStartDate: (date: Dayjs) => void;
    setCustomEndDate: (date: Dayjs) => void;
    setXAxis: (axis: string) => void;

    // API Data
    data: KnowMoreData;
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
}

interface KnowMoreProviderProps {
    children: ReactNode;
    assets: Asset[];
    assetData: AssetIoTData[];
    customStartDate: Dayjs;
    customEndDate: Dayjs;
}

const KnowMoreContext = createContext<KnowMoreContextValue | undefined>(undefined);

export const KnowMoreProvider: React.FC<KnowMoreProviderProps> = ({
    children,
    assets,
    assetData,
    customStartDate: initialStartDate,
    customEndDate: initialEndDate,
}) => {
    const [selectedAsset, setSelectedAsset] = useState<string>(assets[0]?.id || "");
    const [iotNumber, setIotNumber] = useState<number>(1);
    const [AS, setAS] = useState<string>("AS1");
    const [PS, setPS] = useState<string>("PS1");

    const [timeline, setTimeline] = useState<string>("today");
    const [customStartDate, setCustomStartDate] = useState<Dayjs>(initialStartDate);
    const [customEndDate, setCustomEndDate] = useState<Dayjs>(initialEndDate);
    const [xAxis, setXAxis] = useState<string>("days");

    const [data, setData] = useState<KnowMoreData>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const selectedAssetData = assets.find((asset) => asset.id === selectedAsset);
    const pumpType = selectedAssetData?.product?.product_name || selectedAssetData?.productId?.product_name;

    // Determine iotNumber, AS, PS from actual device mapping
    useEffect(() => {
        console.log('[KnowMore] Finding mapping for asset:', selectedAsset);
        console.log('[KnowMore] Selected asset data:', selectedAssetData);
        console.log('[KnowMore] Available assetData:', assetData);

        const mapping = assetData.find(a => a.assetId === selectedAssetData?.asset_code);  // Use asset code, not DB ID
        console.log('[KnowMore] Found mapping:', mapping);

        if (mapping && mapping.dataKey) {
            const dataKey = mapping.dataKey;  // e.g., "AS1", "AS2", "AS3"
            setAS(dataKey);
            setPS(dataKey.replace('AS', 'PS'));  // AS1 → PS1, AS2 → PS2

            // Extract number from dataKey (AS1 → 1, AS2 → 2, AS3 → 3)
            const num = parseInt(dataKey.replace('AS', '')) || 1;
            setIotNumber(num);

            console.log('[KnowMore] ✅ Set from mapping:', { dataKey, AS: dataKey, PS: dataKey.replace('AS', 'PS'), iotNumber: num });
        } else {
            // Fallback to pump type logic if no mapping found
            console.warn('[KnowMore] ⚠️ No mapping found for asset, using fallback pump type logic');
            const name = pumpType?.toUpperCase() || "";
            let newIotNumber = 1;

            if (name.includes("ELECTRIC DRIVEN")) newIotNumber = 2;
            else if (name.includes("JOCKEY PUMP")) newIotNumber = 1;
            else if (name.includes("DIESEL DRIVEN")) newIotNumber = 3;

            setIotNumber(newIotNumber);

            if (newIotNumber === 2) {
                setAS("AS2");
                setPS("PS2");
            } else if (newIotNumber === 3) {
                setAS("AS3");
                setPS("PS3");
            } else {
                setAS("AS1");
                setPS("PS1");
            }
        }
    }, [selectedAsset, assetData, pumpType]);

    // Fetch KnowMore data
    const fetchKnowMoreData = async () => {
        console.log("=== fetchKnowMoreData START ===");
        console.log("selectedAsset", selectedAsset);
        console.log("iotNumber", iotNumber);

        if (!selectedAsset || !iotNumber) {
            console.log("Early return: selectedAsset or iotNumber is falsy");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const payload: any = {
                asset_code: selectedAssetData?.asset_code,  // Backend expects asset_code, not assetId
                pumpType,
                timeline,
                xAxis,
            };

            if (timeline === "custom") {
                payload.fromDate = customStartDate.format("YYYY-MM-DD");
                payload.toDate = customEndDate.format("YYYY-MM-DD");
            }

            console.log("📤 API Payload:", payload);
            console.log("Calling pumpRoomApi.getPumpKnowMoreData...");

            const response = await pumpRoomApi.getPumpKnowMoreData(payload);

            console.log("✅ API Response received:", response);
            // The API returns the data directly, not wrapped in a status object
            setData(response || {});
        } catch (err) {
            console.error("❌ ERROR in fetchKnowMoreData:", err);
            console.error("Error type:", typeof err);
            console.error("Error details:", {
                message: err instanceof Error ? err.message : "Unknown error",
                stack: err instanceof Error ? err.stack : undefined,
                fullError: err
            });
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
            console.log("=== fetchKnowMoreData END ===");
        }
    };

    useEffect(() => {
        fetchKnowMoreData();
    }, [selectedAsset, timeline, xAxis, customStartDate, customEndDate]);

    const value: KnowMoreContextValue = {
        assets,
        selectedAsset,
        selectedAssetData,
        setSelectedAsset,
        pumpIotData: (() => {
            // Get live IoT data for the selected asset from assetData
            if (!assetData || !Array.isArray(assetData) || !selectedAssetData?.asset_code) {
                return {}; // Return empty if no assetData
            }
            const mapping = assetData.find(a => a.assetId === selectedAssetData?.asset_code);  // Use asset code
            if (mapping?.liveData) {
                // Map the live data to the expected pumpIotData format
                const liveData = mapping.liveData;
                return {
                    [AS]: liveData.powerStatus,
                    [PS]: liveData.status,
                    [AS.replace('AS', 'TS')]: liveData.tripStatus,
                    WLS: liveData.waterLevel,
                    DLS: liveData.dieselLevel,
                    PLS: liveData.headerPressure,
                    BAT: liveData.batteryVoltage,
                    BCH: liveData.batteryChargeHealth,
                };
            }
            return {}; // Fallback to empty if no mapping
        })(),
        iotNumber,
        AS,
        PS,
        timeline,
        customStartDate,
        customEndDate,
        xAxis,
        setTimeline,
        setCustomStartDate,
        setCustomEndDate,
        setXAxis,
        data,
        isLoading,
        error,
        refreshData: fetchKnowMoreData,
    };

    return (
        <KnowMoreContext.Provider value={value}>
            {children}
        </KnowMoreContext.Provider>
    );
};

export const useKnowMore = (): KnowMoreContextValue => {
    const context = useContext(KnowMoreContext);
    if (context === undefined) {
        throw new Error("useKnowMore must be used within a KnowMoreProvider");
    }
    console.log("context", context);
    return context;
};
