import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardService, Ticket } from '../../services/dashboard';
import { MapPin, Clock, ChevronRight, CheckCircle, AlertCircle, XCircle, Timer } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type TabType = 'all' | 'pending' | 'waiting' | 'completed' | 'rejected';

export default function TicketsScreen() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await dashboardService.getMyTickets();
            setTickets(response?.data?.tickets || response?.tickets || []);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getFilteredTickets = () => {
        switch (activeTab) {
            case 'pending':
                return tickets.filter(t => t.completedStatus?.toLowerCase() === 'pending');
            case 'waiting':
                return tickets.filter(t => t.completedStatus?.toLowerCase() === 'waiting for approval');
            case 'completed':
                return tickets.filter(t => t.completedStatus?.toLowerCase() === 'completed');
            case 'rejected':
                return tickets.filter(t => t.completedStatus?.toLowerCase() === 'rejected');
            default:
                return tickets;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return { bg: '#fff7ed', text: '#ea580c' };
            case 'completed':
                return { bg: '#dcfce7', text: '#16a34a' };
            case 'rejected':
                return { bg: '#fee2e2', text: '#dc2626' };
            case 'waiting for approval':
                return { bg: '#fef3c7', text: '#d97706' };
            default:
                return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const tabs: { key: TabType; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: tickets.length },
        { key: 'pending', label: 'Pending', count: tickets.filter(t => t.completedStatus?.toLowerCase() === 'pending').length },
        { key: 'waiting', label: 'Waiting', count: tickets.filter(t => t.completedStatus?.toLowerCase() === 'waiting for approval').length },
        { key: 'completed', label: 'Done', count: tickets.filter(t => t.completedStatus?.toLowerCase() === 'completed').length },
        { key: 'rejected', label: 'Rejected', count: tickets.filter(t => t.completedStatus?.toLowerCase() === 'rejected').length },
    ];

    const renderTicketCard = (ticket: Ticket) => {
        const statusColors = getStatusColor(ticket.completedStatus);
        const isOverdue = new Date(ticket.targetDate) < new Date() && ticket.completedStatus?.toLowerCase() === 'pending';

        return (
            <TouchableOpacity
                key={ticket.id}
                style={{
                    backgroundColor: '#ffffff',
                    padding: 16,
                    borderRadius: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}
                onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ticket.id } })}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                            {ticket.completedStatus}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={12} color={isOverdue ? '#dc2626' : '#9ca3af'} />
                        <Text style={{ color: isOverdue ? '#dc2626' : '#6b7280', fontSize: 12, marginLeft: 4 }}>
                            {new Date(ticket.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                    </View>
                </View>

                <Text style={{ color: '#1f2937', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                    {ticket.taskName}
                </Text>

                {ticket.taskDescription && (
                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }} numberOfLines={2}>
                        {ticket.taskDescription}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <MapPin size={14} color="#9ca3af" />
                    <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 4 }}>
                        {ticket.plant?.plantName || 'N/A'} • {ticket.asset?.assetId || 'N/A'}
                    </Text>
                </View>

                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>
                        {ticket.ticketId}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '600', marginRight: 4 }}>View Details</Text>
                        <ChevronRight size={16} color="#f97316" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const filteredTickets = getFilteredTickets();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <Text style={{ color: '#1f2937', fontSize: 24, fontWeight: 'bold' }}>My Tickets</Text>
                <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Manage your assigned tickets</Text>
            </View>

            {/* Stats Row */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
                <View style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                }}>
                    <View style={{ backgroundColor: '#fff7ed', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <AlertCircle size={16} color="#f97316" />
                    </View>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginTop: 6 }}>
                        {tickets.filter(t => t.completedStatus?.toLowerCase() === 'pending').length}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>Pending</Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                }}>
                    <View style={{ backgroundColor: '#fef3c7', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <Timer size={16} color="#d97706" />
                    </View>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginTop: 6 }}>
                        {tickets.filter(t => t.completedStatus?.toLowerCase() === 'waiting for approval').length}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>Waiting</Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                }}>
                    <View style={{ backgroundColor: '#dcfce7', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <CheckCircle size={16} color="#16a34a" />
                    </View>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginTop: 6 }}>
                        {tickets.filter(t => t.completedStatus?.toLowerCase() === 'completed').length}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>Done</Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                }}>
                    <View style={{ backgroundColor: '#fee2e2', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <XCircle size={16} color="#dc2626" />
                    </View>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginTop: 6 }}>
                        {tickets.filter(t => t.completedStatus?.toLowerCase() === 'rejected').length}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>Rejected</Text>
                </View>
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            backgroundColor: activeTab === tab.key ? '#f97316' : '#ffffff',
                            borderWidth: activeTab === tab.key ? 0 : 1,
                            borderColor: '#e5e7eb',
                        }}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={{ color: activeTab === tab.key ? '#ffffff' : '#6b7280', fontWeight: '600', fontSize: 13 }}>
                            {tab.label} ({tab.count})
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
                }
            >
                {loading ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator color="#f97316" size="large" />
                    </View>
                ) : filteredTickets.length > 0 ? (
                    filteredTickets.map(ticket => renderTicketCard(ticket))
                ) : (
                    <View style={{ backgroundColor: '#ffffff', padding: 40, borderRadius: 16, alignItems: 'center', marginTop: 20 }}>
                        <View style={{ backgroundColor: '#dcfce7', padding: 12, borderRadius: 999, marginBottom: 12 }}>
                            <CheckCircle size={32} color="#16a34a" />
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 16 }}>No {activeTab === 'all' ? '' : activeTab} tickets</Text>
                        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>You're all caught up!</Text>
                    </View>
                )}
                <View style={{ height: 60 + insets.bottom + 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
