import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:5000/api';

export interface PumpRoomSummaryData {
    deviceData: {
        AS1?: number;
        AS2?: number;
        AS3?: number;
        PS1?: number;
        PS2?: number;
        PS3?: number;
        TS1?: number;
        TS2?: number;
        TS3?: number;
        WLS?: number;
        DLS?: number;
        PLS?: number;
        PRS?: number;
        BAT1?: number;
        BAT2?: number;
        BCH?: number;
        OPR?: number;
        WTP?: number;
        PWR?: number;
    };
    history: Record<string, Array<{ data: number; date: string }>>;
    timestamp: string;
    mappings: any[];
    fireSafety: {
        diesel_storage?: number;
        main_water_storage?: number;
        header_pressure?: number;
        pressure_unit?: string;
    };
    runHours: {
        PS1: number;
        PS2: number;
        PS3: number;
    };
    lastAutoStart: {
        timestamp: string | null;
        pumpKey: string | null;
    };
    notifications: any[];
    pumpAvailability: {
        available: number;
        total: number;
    };
}

export interface PumpRoomNotification {
    id: string;
    title: string;
    message: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    sent_at: string;
    is_read?: boolean;
}

/**
 * Fetch comprehensive pump room summary data
 * @param plantId - Plant ID
 * @param deviceId - Device ID
 * @returns Promise<PumpRoomSummaryData>
 */
export const getPumpRoomSummary = async (
    plantId: string,
    deviceId: string
): Promise<PumpRoomSummaryData> => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/iot/pump-room-summary/${plantId}/${deviceId}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('[API] Error fetching pump room summary:', error);
        throw error;
    }
};

/**
 * Fetch recent pump room notifications
 * @param plantId - Plant ID
 * @param deviceId - Device ID
 * @param limit - Number of notifications to fetch (default: 5)
 * @returns Promise<PumpRoomNotification[]>
 */
export const getPumpRoomNotifications = async (
    plantId: string,
    deviceId: string,
    limit: number = 5
): Promise<{ notifications: PumpRoomNotification[] }> => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/iot/pump-room-notifications/${plantId}/${deviceId}?limit=${limit}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('[API] Error fetching pump room notifications:', error);
        throw error;
    }
};

/**
 * Fetch plants that have pump room devices
 * @returns Promise with plants array and category_id
 */
export const getPlantsWithPumpRoom = async (): Promise<{
    plants: Array<{
        id: string;
        plant_name: string;
        plant_code: string;
        devices: string[];
    }>;
    category_id: string | null;
}> => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/iot/plants-with-pump-room`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
            }
        );
        return response.data; // Backend returns { plants: [...], category_id: '...' }
    } catch (error) {
        console.error('[API] Error fetching plants with pump room:', error);
        throw error;
    }
};
