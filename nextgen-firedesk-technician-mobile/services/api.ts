import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const getBaseUrl = () => {
    // TEMP: Force local backend for testing performance report
    // Comment out these 2 lines and uncomment the block below for production
    // console.log('[API] Using local URL: http://10.198.196.243:3001/api');
    // return 'http://10.198.196.243:3001/api';

    // PRODUCTION CONFIG - Uncomment this for production
    if (process.env.EXPO_PUBLIC_API_URL) {
        console.log('[API] Using EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
        return process.env.EXPO_PUBLIC_API_URL;
    }
    console.log('[API] Using production URL: https://nextgenfiredeskdev.atvisai.in/api');
    return 'https://nextgenfiredeskdev.atvisai.in/api';

};

const BASE_URL = getBaseUrl();
console.log('[API] Final BASE_URL:', BASE_URL);

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('[API Request]', config.method?.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            // TODO: Implement refresh token logic here
        }
        return Promise.reject(error);
    }
);

// Geolocation types
export interface GeolocationUpdateResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        assetId: string;
        assetName: string;
        lat: string;
        long: string;
        latLongRemark: string | null;
        previousLocations: number;
        isFirstCapture: boolean;
        previousLat: string | null;
        previousLong: string | null;
    };
}

export interface DisplacementIncidentRequest {
    assetId: string;
    assetName: string;
    previousLat: string;
    previousLong: string;
    currentLat: string;
    currentLong: string;
    distance: number;
    plantId: string;
    buildingId?: string;
    floorId?: string;
    technicianId: string;
    technicianName: string;
}

export interface DisplacementIncidentResponse {
    success: boolean;
    message: string;
    data: {
        incidentId: string;
        incidentNumber: string;
        severity: string;
        assetId: string;
        distance: number;
    };
}

// Geolocation service methods
export const geolocationService = {
    /**
     * Update asset geolocation when QR is scanned
     */
    async updateAssetGeolocation(assetUUID: string, lat: string, long: string, remark?: string): Promise<GeolocationUpdateResponse> {
        console.log('[GeolocationService] Updating geolocation for asset:', assetUUID);
        console.log('[GeolocationService] Coordinates:', { lat, long, remark });
        try {
            const response = await api.put(`/technician/update-location`, {
                assetId: assetUUID,
                lat: parseFloat(lat),
                long: parseFloat(long),
                remark
            });
            console.log('[GeolocationService] Update success:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[GeolocationService] Update failed:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Create displacement incident when asset has moved >5m
     */
    async createDisplacementIncident(data: DisplacementIncidentRequest): Promise<DisplacementIncidentResponse> {
        console.log('[GeolocationService] Creating displacement incident:', data);
        try {
            const response = await api.post('/technician/displacement-incident', data);
            console.log('[GeolocationService] Incident created:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[GeolocationService] Incident creation failed:', error.response?.data || error.message);
            throw error;
        }
    }
};
