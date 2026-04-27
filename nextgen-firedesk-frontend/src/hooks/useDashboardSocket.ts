/**
 * useDashboardSocket Hook
 * 
 * React hook for dashboard WebSocket events
 */

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface DashboardUpdate {
    timestamp: Date;
    [key: string]: any;
}

export const useDashboardSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [criticalAlerts, setCriticalAlerts] = useState<DashboardUpdate | null>(null);
    const [taskUpdates, setTaskUpdates] = useState<DashboardUpdate | null>(null);
    const [serviceUpdates, setServiceUpdates] = useState<DashboardUpdate | null>(null);
    const [dashboardRefresh, setDashboardRefresh] = useState<DashboardUpdate | null>(null);

    useEffect(() => {
        // Get API URL from environment - use same as backend API
        const apiUrl = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';

        // Connect to Socket.IO server
        const socketInstance = io(apiUrl, {
            transports: ['websocket', 'polling'],
            auth: {
                token: localStorage.getItem('accessToken')
            }
        });

        socketInstance.on('connect', () => {
            console.log('📡 Dashboard WebSocket connected');
        });

        socketInstance.on('disconnect', () => {
            console.log('📡 Dashboard WebSocket disconnected');
        });

        // Listen for critical alert updates
        socketInstance.on('alert:critical', (data: DashboardUpdate) => {
            console.log('🚨 Critical alert received:', data);
            setCriticalAlerts(data);
        });

        // Listen for task updates
        socketInstance.on('task:updated', (data: DashboardUpdate) => {
            console.log('📋 Task updated:', data);
            setTaskUpdates(data);
        });

        // Listen for service completion
        socketInstance.on('service:completed', (data: DashboardUpdate) => {
            console.log('✅ Service completed:', data);
            setServiceUpdates(data);
        });

        // Listen for dashboard refresh events
        socketInstance.on('dashboard:refresh', (data: DashboardUpdate) => {
            console.log('🔄 Dashboard refresh:', data);
            setDashboardRefresh(data);
        });

        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return {
        socket,
        criticalAlerts,
        taskUpdates,
        serviceUpdates,
        dashboardRefresh,
        isConnected: socket?.connected || false
    };
};
