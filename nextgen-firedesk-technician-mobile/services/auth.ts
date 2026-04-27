import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const authService = {
    async setTokens(accessToken: string, refreshToken: string) {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    },

    async clearTokens() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
    },

    async getAccessToken() {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    async isAuthenticated() {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        return !!token;
    },

    async setUser(user: any) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    },

    async getUser() {
        const user = await SecureStore.getItemAsync(USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    // API Calls
    async sendOtp(contactNo: string) {
        return api.post('/technician/registerCheck', { contactNo });
    },

    async login(contactNo: string, otp: string, deviceToken?: string) {
        return api.post('/technician/login', { contactNo, otp, deviceToken });
    }
};
