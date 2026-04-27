import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardService, Service, Ticket, Statistics } from '../../services/dashboard';
import { authService } from '../../services/auth';
import { performanceReportService } from '../../services/performanceReport';
import { Calendar, MapPin, AlertCircle, CheckCircle, Clock, Ticket as TicketIcon, ChevronRight, Bell, Navigation, Package, FileBarChart, X, ChevronDown, Share2, Building2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DashboardScreen() {
    const [user, setUser] = useState<any>(null);
    const [dueServices, setDueServices] = useState<Service[]>([]);
    const [totalDueServicesCount, setTotalDueServicesCount] = useState<number>(0);
    const [upcomingServices, setUpcomingServices] = useState<Service[]>([]);
    const [totalUpcomingServicesCount, setTotalUpcomingServicesCount] = useState<number>(0);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [assignedIncidents, setAssignedIncidents] = useState<any[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [assignedAssetsCount, setAssignedAssetsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Performance Report State
    const [reportDropdownVisible, setReportDropdownVisible] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
    const [reportEndDate, setReportEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [reportPlants, setReportPlants] = useState<{ id: string; plantName: string }[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('all');
    const [pdfUri, setPdfUri] = useState<string | null>(null);

    const isServiceLapsed = (service?: Service) => {
        if (!service?.scheduledDate) return false;
        const scheduled = new Date(service.scheduledDate);
        if (isNaN(scheduled.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDay = new Date(scheduled);
        scheduledDay.setHours(0, 0, 0, 0);
        return scheduledDay < today;
    };

    const isServiceCompleted = (service?: Service) => {
        const status = service?.status?.toUpperCase();
        return status === 'COMPLETED' || status === 'SUBMITTED' || status === 'APPROVED';
    };

    const pageThroughMyServices = async (limit = 100, maxPages = 5) => {
        let page = 1;
        let hasMore = true;
        const allServices: Service[] = [];

        while (hasMore && page <= maxPages) {
            const resp = await dashboardService.getMyServices(page, limit);
            const payload = resp?.data || resp;
            const data = payload?.data || payload?.services || (Array.isArray(payload) ? payload : []);
            allServices.push(...data);
            const pagination = payload?.pagination;
            if (pagination) {
                const totalPages = Math.max(1, Math.ceil((pagination.total || data.length) / (pagination.limit || limit)));
                hasMore = page < totalPages;
            } else {
                hasMore = false;
            }
            page += 1;
        }

        return allServices;
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);

            // Fetch data separately to identify which API fails
            let dueRes, upcomingRes, ticketsRes, incidentsRes;

            try {
                // Fetch page 1 with limit 10 to get pagination metadata for total count
                dueRes = await dashboardService.getDueServices(1, 10);
            } catch (e: any) {
                console.error('Error fetching due services:', e?.response?.status, e?.response?.data || e.message);
                dueRes = { data: [], pagination: { total: 0 } };
            }

            try {
                upcomingRes = await dashboardService.getUpcomingServices(1, 10);
            } catch (e: any) {
                console.error('Error fetching upcoming services:', e?.response?.status, e?.response?.data || e.message);
                upcomingRes = { data: [], pagination: { total: 0 } };
            }

            try {
                ticketsRes = await dashboardService.getMyTickets();
            } catch (e: any) {
                console.error('Error fetching tickets:', e?.response?.status, e?.response?.data || e.message);
                ticketsRes = { tickets: [] };
            }

            try {
                incidentsRes = await dashboardService.getAssignedIncidents();
            } catch (e: any) {
                console.error('Error fetching incidents:', e?.response?.status, e?.response?.data || e.message);
                incidentsRes = { incidents: [] };
            }

            try {
                const statsRes = await dashboardService.getStatistics();
                setStatistics(statsRes?.data || null);
            } catch (e: any) {
                console.error('Error fetching statistics:', e?.message);
            }

            // Trust the API response for "Due" services as backend handles logic (Due vs Lapsed)
            const dueData = dueRes?.data || dueRes?.services || (Array.isArray(dueRes) ? dueRes : []);
            const dueTotal = dueRes?.pagination?.total ?? dueData.length;

            setDueServices(dueData);
            setTotalDueServicesCount(dueTotal);

            const upcomingData = upcomingRes?.data || upcomingRes?.services || (Array.isArray(upcomingRes) ? upcomingRes : []);
            const upcomingTotal = upcomingRes?.pagination?.total ?? upcomingData.length;

            setUpcomingServices(upcomingData);
            setTotalUpcomingServicesCount(upcomingTotal);

            setTickets(ticketsRes?.data?.tickets || ticketsRes?.tickets || []);

            // Handle various response formats: array, { data: [...] }, { incidents: [...] }
            const rawIncidents = incidentsRes?.data || incidentsRes?.incidents || incidentsRes;
            setAssignedIncidents(Array.isArray(rawIncidents) ? rawIncidents : []);

            // Fetch assigned assets count by iterating services (Matches Web App Logic)
            try {
                // Use the helper to fetch all services (up to 5 pages) to get unique assets
                const allServicesForAssets = await pageThroughMyServices(100, 5);
                const uniqueAssets = new Set<string>();

                allServicesForAssets.forEach(s => {
                    if (s.asset?.assetId) {
                        uniqueAssets.add(s.asset.assetId);
                    }
                });

                setAssignedAssetsCount(uniqueAssets.size);
            } catch (e: any) {
                console.error('Error calculating assigned assets count:', e?.message);
                setAssignedAssetsCount(0);
            }
        } catch (error: any) {
            console.error('Error loading dashboard data:', error?.response?.status, error?.response?.data || error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Performance Report Functions
    const openReportModal = async () => {
        setReportDropdownVisible(false);
        setReportModalVisible(true);
        setPdfUri(null); // Reset PDF state
        try {
            const plants = await performanceReportService.getMyPlants();
            setReportPlants(plants);
        } catch (error) {
            console.error('Failed to load plants:', error);
        }
    };

    const handleGenerateReport = async () => {
        try {
            setGeneratingReport(true);
            const startDate = reportStartDate.toISOString().split('T')[0];
            const endDate = reportEndDate.toISOString().split('T')[0];
            const plantId = selectedPlantId !== 'all' ? selectedPlantId : undefined;

            const uri = await performanceReportService.generatePDF(startDate, endDate, plantId);
            setPdfUri(uri);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to generate report');
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleSharePdf = async () => {
        if (pdfUri) {
            try {
                await performanceReportService.sharePDF(pdfUri);
            } catch (error: any) {
                Alert.alert('Error', error.message);
            }
        }
    };

    const handleViewPdf = async () => {
        if (pdfUri) {
            try {
                await performanceReportService.viewPDF(pdfUri);
            } catch (error) {
                Alert.alert('Error', 'Could not open PDF viewer');
            }
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateLong = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const getDaysBetween = () => {
        const diffTime = Math.abs(reportEndDate.getTime() - reportStartDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const applyPreset = (preset: string) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (preset) {
            case 'last7':
                start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                end = today;
                break;
            case 'last30':
                start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                end = today;
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisQuarter':
                const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
                start = new Date(today.getFullYear(), quarterMonth, 1);
                end = today;
                break;
            case 'thisYear':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
        }
        setReportStartDate(start);
        setReportEndDate(end);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return { bg: '#fef3c7', text: '#d97706' };
            case 'IN_PROGRESS':
                return { bg: '#dbeafe', text: '#2563eb' };
            case 'COMPLETED':
            case 'SUBMITTED':
                return { bg: '#dcfce7', text: '#16a34a' };
            case 'REJECTED':
                return { bg: '#fee2e2', text: '#dc2626' };
            default:
                return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const renderServiceCard = (service: Service, type: 'due' | 'upcoming') => {
        const statusColors = getStatusColor(service.status);
        const isOverdue = type === 'due' && new Date(service.scheduledDate) < new Date();

        // Handle service card press - navigate with QR verification required for all non-completed services
        const isCompleted = service.status?.toUpperCase() === 'COMPLETED' || service.status?.toUpperCase() === 'SUBMITTED';
        const handleServicePress = () => {
            router.push({
                pathname: '/service/[id]',
                params: {
                    id: service.id,
                    requireQRVerification: isCompleted ? 'false' : 'true',
                    expectedAssetId: service.asset?.assetId || ''
                }
            });
        };

        return (
            <TouchableOpacity
                key={service.id}
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
                onPress={handleServicePress}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ backgroundColor: type === 'due' ? '#fef2f2' : '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                            <Text style={{ color: type === 'due' ? '#dc2626' : '#2563eb', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                                {service.inspectionType}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                            <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '600' }}>
                                {service.status}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={{ color: '#1f2937', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                    {service.form?.serviceName || service.asset?.plant?.plantName}
                </Text>

                <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
                    Asset: {service.asset?.assetId}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={14} color="#9ca3af" />
                    <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 4 }}>
                        {/* Handle building as object (from backend) or string (interface) */}
                        {typeof service.asset?.building === 'object'
                            ? (service.asset?.building as any)?.building_name
                            : service.asset?.building}
                        {service.asset?.location ? `, ${service.asset.location}` : ''}
                    </Text>
                </View>

                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={14} color={isOverdue ? '#dc2626' : '#9ca3af'} />
                        <Text style={{ color: isOverdue ? '#dc2626' : '#6b7280', fontSize: 12, marginLeft: 4 }}>
                            {new Date(service.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                            {service.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTicketCard = (ticket: Ticket) => {
        const isOverdue = new Date(ticket.targetDate) < new Date() && ticket.completedStatus?.toLowerCase() === 'pending';

        return (
            <TouchableOpacity
                key={ticket.id}
                style={{
                    backgroundColor: '#ffffff',
                    padding: 16,
                    borderRadius: 16,
                    marginRight: 12,
                    width: 280,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}
                onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ticket.id } })}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ color: '#ea580c', fontSize: 11, fontWeight: '600' }}>
                            {ticket.completedStatus}
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#9ca3af" />
                </View>

                <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 14, marginBottom: 4 }} numberOfLines={1}>
                    {ticket.taskName}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={12} color={isOverdue ? '#dc2626' : '#9ca3af'} />
                    <Text style={{ color: isOverdue ? '#dc2626' : '#6b7280', fontSize: 12, marginLeft: 4 }}>
                        Due: {new Date(ticket.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const pendingTickets = tickets.filter(t => t.completedStatus?.toLowerCase() === 'pending');

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#f97316',
                            borderRadius: 14,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12
                        }}>
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                                {user?.name?.charAt(0)?.toUpperCase() || 'T'}
                            </Text>
                        </View>
                        <View>
                            <Text style={{ color: '#6b7280', fontSize: 13 }}>Welcome back,</Text>
                            <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>{user?.name || 'Technician'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={{ backgroundColor: '#fff7ed', padding: 10, borderRadius: 12, position: 'relative' }}
                        onPress={() => router.push('/notifications')}
                    >
                        <Bell size={22} color="#f97316" />
                        {(dueServices.length > 0 || pendingTickets.length > 0) && (
                            <View style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                width: 10,
                                height: 10,
                                backgroundColor: '#dc2626',
                                borderRadius: 5,
                                borderWidth: 2,
                                borderColor: '#fff7ed'
                            }} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 60 + insets.bottom + 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
                }
            >
                {/* Stats Cards */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push({ pathname: '/services', params: { tab: 'due' } })}
                        style={{
                            flex: 1,
                            flexBasis: '48%',
                            backgroundColor: '#ffffff',
                            padding: 16,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <View style={{ backgroundColor: '#fef2f2', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                            <AlertCircle size={20} color="#dc2626" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 24, fontWeight: 'bold' }}>{totalDueServicesCount}</Text>
                        <Text style={{ color: '#6b7280', fontSize: 12 }}>Due Tasks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push({ pathname: '/services', params: { tab: 'upcoming' } })}
                        style={{
                            flex: 1,
                            flexBasis: '48%',
                            backgroundColor: '#ffffff',
                            padding: 16,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <View style={{ backgroundColor: '#eff6ff', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                            <Clock size={20} color="#2563eb" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 24, fontWeight: 'bold' }}>{totalUpcomingServicesCount}</Text>
                        <Text style={{ color: '#6b7280', fontSize: 12 }}>Upcoming</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push('/(tabs)/tickets')}
                        style={{
                            flex: 1,
                            flexBasis: '48%',
                            backgroundColor: '#ffffff',
                            padding: 16,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                    >
                        <View style={{ backgroundColor: '#fff7ed', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                            <TicketIcon size={20} color="#f97316" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 24, fontWeight: 'bold' }}>{statistics?.ticketsPending ?? pendingTickets.length}</Text>
                        <Text style={{ color: '#6b7280', fontSize: 12 }}>Tickets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            flexBasis: '48%',
                            backgroundColor: '#ffffff',
                            padding: 16,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 2,
                        }}
                        onPress={() => router.push({ pathname: '/services', params: { tab: 'assets' } })}
                        activeOpacity={0.85}
                    >
                        <View style={{ backgroundColor: '#fdf2f8', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                            <Package size={20} color="#db2777" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 24, fontWeight: 'bold' }}>{assignedAssetsCount}</Text>
                        <Text style={{ color: '#6b7280', fontSize: 12 }}>Assigned Assets</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Actions</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {/* Assign Location Button */}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#2563eb',
                                padding: 16,
                                borderRadius: 16,
                                alignItems: 'center',
                                shadowColor: '#2563eb',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                            onPress={() => router.push('/assign-location')}
                        >
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                                <Navigation size={24} color="#ffffff" />
                            </View>
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Assign Location To Asset</Text>
                        </TouchableOpacity>

                        {/* Report Incident Button */}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#f97316',
                                padding: 16,
                                borderRadius: 16,
                                alignItems: 'center',
                                shadowColor: '#f97316',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                            onPress={() => router.push('/incident/create')}
                        >
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                                <AlertCircle size={24} color="#ffffff" />
                            </View>
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Report Incident</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Generate a Report Dropdown Button */}
                    <View style={{ marginTop: 16, position: 'relative' }}>
                        <TouchableOpacity
                            onPress={() => setReportDropdownVisible(!reportDropdownVisible)}
                            style={{
                                backgroundColor: '#eff6ff',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 16,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: '#bfdbfe'
                            }}
                        >
                            <FileBarChart size={20} color="#3b82f6" />
                            <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 16, marginLeft: 8, flex: 1 }}>Generate a report</Text>
                            <ChevronDown size={20} color="#3b82f6" style={{ transform: [{ rotate: reportDropdownVisible ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>

                        {/* Dropdown Menu */}
                        {reportDropdownVisible && (
                            <View style={{
                                marginTop: 8,
                                backgroundColor: '#ffffff',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.1,
                                shadowRadius: 12,
                                elevation: 4,
                                overflow: 'hidden'
                            }}>
                                <TouchableOpacity
                                    onPress={openReportModal}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 16,
                                        backgroundColor: '#ffffff'
                                    }}
                                >
                                    <FileBarChart size={18} color="#3b82f6" />
                                    <Text style={{ color: '#1f2937', fontSize: 15, fontWeight: '500', marginLeft: 12 }}>Generate Performance Report</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Assigned Incidents Section
                <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Assigned Incidents</Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator color="#f97316" style={{ paddingVertical: 20 }} />
                    ) : assignedIncidents.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                            {assignedIncidents.map((incident: any) => (
                                <TouchableOpacity
                                    key={incident.id}
                                    style={{
                                        backgroundColor: '#ffffff',
                                        padding: 16,
                                        borderRadius: 16,
                                        width: 280,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 8,
                                        elevation: 2,
                                    }}
                                    onPress={() => router.push({ pathname: '/incident/[id]', params: { id: incident.id } })}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                                            <Text style={{ color: '#ea580c', fontSize: 11, fontWeight: '600' }}>
                                                {incident.incidentNumber}
                                            </Text>
                                        </View>
                                        <View style={{
                                            backgroundColor: incident.status === 'Open' ? '#dcfce7' : '#f3f4f6',
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 20
                                        }}>
                                            <Text style={{
                                                color: incident.status === 'Open' ? '#16a34a' : '#6b7280',
                                                fontSize: 11,
                                                fontWeight: '600'
                                            }}>
                                                {incident.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 14, marginBottom: 4 }} numberOfLines={1}>
                                        {incident.subtype?.subtypeName || 'Incident'}
                                    </Text>
                                    <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }} numberOfLines={2}>
                                        {incident.description}
                                    </Text>

                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Building2 size={12} color="#9ca3af" />
                                        <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 4 }}>
                                            {incident.plant?.plantName}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280' }}>No assigned incidents</Text>
                        </View>
                    )}
                </View> */}

                {/* Due Services Section */}
                <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Due Services</Text>
                        {dueServices.length > 0 && (
                            <TouchableOpacity onPress={() => router.push({ pathname: '/services', params: { tab: 'due' } })}>
                                <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '600' }}>View All ({totalDueServicesCount})</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {loading ? (
                        <ActivityIndicator color="#f97316" style={{ paddingVertical: 20 }} />
                    ) : dueServices.length > 0 ? (
                        dueServices.slice(0, 3).map(service => renderServiceCard(service, 'due'))
                    ) : (
                        <View style={{ backgroundColor: '#ffffff', padding: 32, borderRadius: 16, alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#dcfce7', padding: 12, borderRadius: 999, marginBottom: 12 }}>
                                <CheckCircle size={32} color="#16a34a" />
                            </View>
                            <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 16 }}>All caught up!</Text>
                            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>No due services at the moment</Text>
                        </View>
                    )}
                </View>

                {/* Tickets Section - Horizontal Scroll */}
                {tickets.length > 0 && (
                    <View style={{ paddingTop: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 20 }}>
                            <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>My Tickets</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/tickets')}>
                                <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '600' }}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                            {tickets.slice(0, 5).map(ticket => renderTicketCard(ticket))}
                        </ScrollView>
                    </View>
                )}

                {/* Upcoming Services Section */}
                <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Upcoming Services</Text>
                        {upcomingServices.length > 0 && (
                            <TouchableOpacity onPress={() => router.push({ pathname: '/services', params: { tab: 'upcoming' } })}>
                                <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '600' }}>View All ({totalUpcomingServicesCount})</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {loading ? (
                        <ActivityIndicator color="#f97316" style={{ paddingVertical: 20 }} />
                    ) : upcomingServices.length > 0 ? (
                        upcomingServices.slice(0, 3).map(service => renderServiceCard(service, 'upcoming'))
                    ) : (
                        <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280' }}>No upcoming services</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Performance Report Modal */}
            <Modal
                visible={reportModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <ScrollView style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
                        <View style={{ padding: 24 }}>
                            {/* Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: '#eff6ff', padding: 10, borderRadius: 12 }}>
                                        <FileBarChart size={24} color="#3b82f6" />
                                    </View>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>Performance Report</Text>
                                        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Generate a PDF report of your service performance</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ padding: 4 }}>
                                    <X size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Report Period Section */}
                            <View style={{ backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Calendar size={18} color="#1f2937" />
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1f2937', marginLeft: 8 }}>Report Period</Text>
                                    </View>
                                    <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>{getDaysBetween()} days</Text>
                                    </View>
                                </View>

                                {/* Quick Select */}
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8 }}>Quick Select</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    {[
                                        { key: 'last7', label: 'Last 7 Days' },
                                        { key: 'last30', label: 'Last 30 Days' },
                                        { key: 'thisMonth', label: 'This Month' },
                                        { key: 'lastMonth', label: 'Last Month' },
                                        { key: 'thisQuarter', label: 'This Quarter' },
                                        { key: 'thisYear', label: 'This Year' }
                                    ].map((preset) => (
                                        <TouchableOpacity
                                            key={preset.key}
                                            onPress={() => applyPreset(preset.key)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingHorizontal: 12,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                backgroundColor: '#fff',
                                                borderWidth: 1,
                                                borderColor: '#e5e7eb'
                                            }}
                                        >
                                            <Clock size={14} color="#6b7280" />
                                            <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6 }}>{preset.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Date Pickers */}
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity
                                        onPress={() => setShowStartPicker(true)}
                                        style={{ flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}
                                    >
                                        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: '600' }}>Start Date</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Calendar size={16} color="#3b82f6" />
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f2937', marginLeft: 8 }}>{formatDateLong(reportStartDate)}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setShowEndPicker(true)}
                                        style={{ flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}
                                    >
                                        <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: '600' }}>End Date</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Calendar size={16} color="#3b82f6" />
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f2937', marginLeft: 8 }}>{formatDateLong(reportEndDate)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {showStartPicker && (
                                <DateTimePicker
                                    value={reportStartDate}
                                    mode="date"
                                    display="default"
                                    onChange={(event, date) => {
                                        setShowStartPicker(false);
                                        if (date) setReportStartDate(date);
                                    }}
                                />
                            )}

                            {showEndPicker && (
                                <DateTimePicker
                                    value={reportEndDate}
                                    mode="date"
                                    display="default"
                                    onChange={(event, date) => {
                                        setShowEndPicker(false);
                                        if (date) setReportEndDate(date);
                                    }}
                                />
                            )}

                            {/* Plant Filter */}
                            <View style={{ backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Building2 size={18} color="#1f2937" />
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1f2937', marginLeft: 8 }}>Filter by Plant</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity
                                        onPress={() => setSelectedPlantId('all')}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 20,
                                            backgroundColor: selectedPlantId === 'all' ? '#3b82f6' : '#fff',
                                            borderWidth: 1,
                                            borderColor: selectedPlantId === 'all' ? '#3b82f6' : '#e5e7eb',
                                            marginRight: 8
                                        }}
                                    >
                                        <Text style={{ color: selectedPlantId === 'all' ? '#fff' : '#374151', fontWeight: '600', fontSize: 13 }}>All Plants</Text>
                                    </TouchableOpacity>
                                    {reportPlants.map(plant => (
                                        <TouchableOpacity
                                            key={plant.id}
                                            onPress={() => setSelectedPlantId(plant.id)}
                                            style={{
                                                paddingHorizontal: 16,
                                                paddingVertical: 10,
                                                borderRadius: 20,
                                                backgroundColor: selectedPlantId === plant.id ? '#3b82f6' : '#fff',
                                                borderWidth: 1,
                                                borderColor: selectedPlantId === plant.id ? '#3b82f6' : '#e5e7eb',
                                                marginRight: 8
                                            }}
                                        >
                                            <Text style={{ color: selectedPlantId === plant.id ? '#fff' : '#374151', fontWeight: '600', fontSize: 13 }}>{plant.plantName}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Report Contents */}
                            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <FileBarChart size={18} color="#16a34a" />
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#166534', marginLeft: 8 }}>Report Contents</Text>
                                </View>
                                <View style={{ gap: 6 }}>
                                    <Text style={{ fontSize: 13, color: '#166534' }}>• Your technician details and contact info</Text>
                                    <Text style={{ fontSize: 13, color: '#166534' }}>• Reporting managers and assigned plants</Text>
                                    <Text style={{ fontSize: 13, color: '#166534' }}>• Tasks (Services & Tickets) completed vs. lapsed</Text>
                                    <Text style={{ fontSize: 13, color: '#166534' }}>• Detailed service and ticket log with status</Text>
                                </View>
                            </View>

                            {/* Ready to Generate */}
                            <View style={{ backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#bfdbfe' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <CheckCircle size={20} color="#3b82f6" />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e40af' }}>Ready to generate</Text>
                                        <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                                            Your PDF will include performance data from {formatDateLong(reportStartDate)} to {formatDateLong(reportEndDate)}.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={{ marginTop: 20, marginBottom: 20 }}>
                                {pdfUri ? (
                                    <View style={{ gap: 12 }}>
                                        <Text style={{ textAlign: 'center', color: '#166534', fontWeight: '600', marginBottom: 4 }}>Report Ready!</Text>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity
                                                onPress={handleViewPdf}
                                                style={{ flex: 1, backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                                            >
                                                <FileBarChart size={18} color="#3b82f6" />
                                                <Text style={{ color: '#3b82f6', fontWeight: 'bold', marginLeft: 8 }}>View</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleSharePdf}
                                                style={{ flex: 1, backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                                            >
                                                <Share2 size={18} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Share / Download</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setReportModalVisible(false)}
                                            style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
                                        >
                                            <Text style={{ color: '#374151', fontWeight: 'bold' }}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            onPress={() => setReportModalVisible(false)}
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#f3f4f6',
                                                padding: 16,
                                                borderRadius: 12,
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Text style={{ color: '#374151', fontWeight: 'bold', fontSize: 15 }}>Cancel</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={handleGenerateReport}
                                            disabled={generatingReport}
                                            style={{
                                                flex: 2,
                                                backgroundColor: generatingReport ? '#93c5fd' : '#3b82f6',
                                                padding: 16,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                flexDirection: 'row',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {generatingReport ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : (
                                                <>
                                                    <FileBarChart size={20} color="#fff" />
                                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 8 }}>Generate PDF</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}