import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, BellOff, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, Wrench, Ticket as TicketIcon } from 'lucide-react-native';
import { dashboardService, Service, Ticket } from '../services/dashboard';



interface Notification {
    id: string;
    type: 'service_due' | 'service_overdue' | 'ticket_assigned' | 'ticket_due' | 'service_completed' | 'general' | 'SERVICE_APPROVED' | 'SERVICE_REJECTED' | 'ALERT' | 'CRITICAL' | 'SUCCESS' | 'TICKET_ASSIGNED' | 'SERVICE_COMPLETED';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: {
        serviceId?: string;
        ticketId?: string;
        backendId?: string;
    };
}

interface BackendNotification {
    id: string;
    type: string;
    category: string;
    priority: string;
    title: string;
    message: string;
    related_entity_type: string;
    related_entity_id: string;
    action_url: string;
    is_read: boolean;
    created_at: string;
    sent_at: string;
    action_taken?: boolean;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const allNotifications: Notification[] = [];

            // 1. Load Backend Notifications
            try {
                const backendRes = await dashboardService.getNotifications(1, 50);
                if (backendRes.success && backendRes.data) {
                    const formattedBackendNotifs = backendRes.data.map((n: BackendNotification) => {
                        let type = n.type;
                        // Map GENERAL notifications to specific types based on context
                        if (type === 'GENERAL' && n.related_entity_type === 'ServiceSubmission') {
                            if (n.category === 'WARNING') {
                                type = 'SERVICE_REJECTED';
                            } else if (n.category === 'SUCCESS') {
                                if (n.title.toLowerCase().includes('completed')) {
                                    type = 'SERVICE_COMPLETED';
                                } else {
                                    type = 'SERVICE_APPROVED';
                                }
                            }
                        }

                        return {
                            id: n.id,
                            type: type,
                            title: n.title,
                            message: n.message,
                            timestamp: new Date(n.sent_at || n.created_at),
                            read: n.is_read,
                            data: {
                                serviceId: n.related_entity_type === 'ServiceSubmission' ? n.related_entity_id : undefined,
                                ticketId: n.related_entity_type === 'Ticket' ? n.related_entity_id : undefined,
                                // Store original backend ID for marking as read
                                backendId: n.id
                            }
                        };
                    });
                    allNotifications.push(...formattedBackendNotifs);
                }
            } catch (e) {
                console.log('Error loading backend notifications:', e);
            }

            // 2. Generate Local Notifications from Due Services
            try {
                const dueServicesRes = await dashboardService.getDueServices();
                const dueServices = dueServicesRes?.data || [];

                dueServices.forEach((service: Service) => {
                    const scheduledDate = new Date(service.scheduledDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    scheduledDate.setHours(0, 0, 0, 0);

                    const isOverdue = scheduledDate < today;

                    // Avoid duplicates if backend already sent a notification for this?
                    // For now, we assume backend notifications are for EVENTS (approval, rejection)
                    // and local notifications are for STATUS (due, overdue)
                    // So we keep both.

                    allNotifications.push({
                        id: `service-${service.id}`,
                        type: isOverdue ? 'service_overdue' : 'service_due',
                        title: isOverdue ? 'Overdue Service' : 'Service Due Today',
                        message: `${service.form?.serviceName || 'Service'} for asset ${service.asset?.assetId} is ${isOverdue ? 'overdue' : 'due today'}`,
                        timestamp: new Date(service.scheduledDate),
                        read: false,
                        data: { serviceId: service.id }
                    });
                });
            } catch (e) {
                console.log('Error loading due services for notifications:', e);
            }

            // 3. Generate Local Notifications from Tickets
            try {
                const ticketsRes = await dashboardService.getMyTickets();
                const tickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];

                tickets.filter((t: Ticket) => t.completedStatus?.toLowerCase() === 'pending').forEach((ticket: Ticket) => {
                    const targetDate = new Date(ticket.targetDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    targetDate.setHours(0, 0, 0, 0);

                    const isOverdue = targetDate < today;

                    allNotifications.push({
                        id: `ticket-${ticket.id}`,
                        type: isOverdue ? 'ticket_due' : 'ticket_assigned',
                        title: isOverdue ? 'Ticket Overdue' : 'Ticket Assigned',
                        message: `${ticket.taskName} - ${isOverdue ? 'Past due date' : 'Due ' + targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
                        timestamp: targetDate,
                        read: false,
                        data: { ticketId: ticket.id }
                    });
                });
            } catch (e) {
                console.log('Error loading tickets for notifications:', e);
            }

            // Sort by timestamp (most recent first)
            allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            setNotifications(allNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const handleNotificationPress = async (notification: Notification) => {
        // Mark as read if it hasn't been read and has a backend ID
        if (!notification.read && notification.data?.backendId) {
            try {
                await dashboardService.markNotificationAsRead(notification.data.backendId);
                // Update local state to reflect read status
                setNotifications(prev => prev.map(n =>
                    n.id === notification.id ? { ...n, read: true } : n
                ));
            } catch (e) {
                console.log('Error marking notification as read:', e);
            }
        }

        if (notification.data?.serviceId) {
            // Require QR verification for due/overdue services
            const requiresVerification = notification.type === 'service_due' || notification.type === 'service_overdue';
            const isReviewCtx = notification.type === 'SERVICE_APPROVED' || notification.type === 'SERVICE_REJECTED';

            router.push({
                pathname: '/service/[id]',
                params: {
                    id: notification.data.serviceId,
                    requireQRVerification: requiresVerification ? 'true' : 'false',
                    isReviewCtx: isReviewCtx ? 'true' : 'false'
                }
            });
        } else if (notification.data?.ticketId) {
            router.push({
                pathname: '/ticket/[id]',
                params: { id: notification.data.ticketId }
            });
        }
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'service_due':
                return <Clock size={20} color="#f97316" />;
            case 'service_overdue':
                return <AlertTriangle size={20} color="#dc2626" />;
            case 'ticket_assigned':
            case 'TICKET_ASSIGNED':
                return <TicketIcon size={20} color="#2563eb" />;
            case 'ticket_due':
                return <AlertCircle size={20} color="#ea580c" />;
            case 'service_completed':
            case 'SERVICE_APPROVED':
            case 'SERVICE_COMPLETED':
            case 'SUCCESS':
                return <CheckCircle size={20} color="#16a34a" />;
            case 'SERVICE_REJECTED':
            case 'ALERT':
            case 'CRITICAL':
                return <AlertCircle size={20} color="#EF4444" />;
            default:
                return <Bell size={20} color="#6b7280" />;
        }
    };

    const getNotificationBgColor = (type: Notification['type']) => {
        switch (type) {
            case 'service_due':
                return '#fff7ed';
            case 'service_overdue':
                return '#fef2f2';
            case 'ticket_assigned':
            case 'TICKET_ASSIGNED':
                return '#eff6ff';
            case 'ticket_due':
                return '#fff7ed';
            case 'service_completed':
            case 'SERVICE_APPROVED':
            case 'SERVICE_COMPLETED':
            case 'SUCCESS':
                return '#f0fdf4';
            case 'SERVICE_REJECTED':
            case 'ALERT':
            case 'CRITICAL':
                return '#fef2f2';
            default:
                return '#f9fafb';
        }
    };

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 20,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6'
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginRight: 16, padding: 4 }}
                >
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#1f2937', fontSize: 20, fontWeight: 'bold' }}>Notifications</Text>
                </View>
                <View style={{
                    backgroundColor: '#f97316',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12
                }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                        {notifications.length}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
                }
            >
                {loading ? (
                    <ActivityIndicator color="#f97316" style={{ paddingVertical: 40 }} />
                ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={{
                                backgroundColor: notification.read ? '#f9fafb' : '#ffffff',
                                padding: 16,
                                borderRadius: 16,
                                marginBottom: 12,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: notification.read ? 0.02 : 0.05,
                                shadowRadius: 8,
                                elevation: notification.read ? 1 : 2,
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                borderWidth: notification.read ? 0 : 1,
                                borderColor: notification.read ? 'transparent' : '#f3f4f6'
                            }}
                            onPress={() => handleNotificationPress(notification)}
                        >
                            <View style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: getNotificationBgColor(notification.type),
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 12
                            }}>
                                {getNotificationIcon(notification.type)}
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                    <Text style={{
                                        color: '#1f2937',
                                        fontSize: 15,
                                        fontWeight: notification.read ? '400' : '600',
                                        flex: 1
                                    }}>
                                        {notification.title}
                                    </Text>
                                    <Text style={{ color: '#9ca3af', fontSize: 11, marginLeft: 8 }}>
                                        {formatTimeAgo(notification.timestamp)}
                                    </Text>
                                </View>
                                <Text style={{ color: '#6b7280', fontSize: 13, lineHeight: 18 }}>
                                    {notification.message}
                                </Text>
                            </View>
                            {!notification.read && (
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#f97316',
                                    position: 'absolute',
                                    top: 16,
                                    right: 16
                                }} />
                            )}
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={{
                        backgroundColor: '#ffffff',
                        padding: 40,
                        borderRadius: 16,
                        alignItems: 'center',
                        marginTop: 40
                    }}>
                        <View style={{
                            backgroundColor: '#f3f4f6',
                            padding: 16,
                            borderRadius: 999,
                            marginBottom: 16
                        }}>
                            <BellOff size={40} color="#9ca3af" />
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 18, marginBottom: 8 }}>
                            No Notifications
                        </Text>
                        <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                            You're all caught up! Check back later for updates.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
