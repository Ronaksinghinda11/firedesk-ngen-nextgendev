import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Clock, AlertCircle, CheckCircle, Calendar, ClipboardList, ChevronRight, Package, X } from 'lucide-react-native';
import { dashboardService, Service } from '../services/dashboard';
import { AssignedAsset } from '../services/asset';
import { Pagination } from '../components/ui/Pagination';

type TabType = 'due' | 'lapsed' | 'upcoming' | 'completed' | 'rejected' | 'all' | 'assets';

const PAGE_SIZE = 10;
const SERVICE_FETCH_PAGE_SIZE = 50;
const SERVICE_FETCH_MAX_PAGES = 10; // safety cap to avoid unbounded calls

type TabState = {
    services: Service[];
    assets?: AssignedAsset[];
    allAssets?: AssignedAsset[];
    page: number;
    total: number;
    allServices?: Service[];
    useClientPaging?: boolean;
    hasMore?: boolean;
};

const initialTabState: Record<TabType, TabState> = {
    due: { services: [], page: 1, total: 0, hasMore: false },
    lapsed: { services: [], page: 1, total: 0, hasMore: false },
    upcoming: { services: [], page: 1, total: 0, hasMore: false },
    completed: { services: [], page: 1, total: 0, hasMore: false },
    rejected: { services: [], page: 1, total: 0, hasMore: false },
    all: { services: [], page: 1, total: 0, hasMore: false },
    assets: { services: [], assets: [], allAssets: [], page: 1, total: 0, hasMore: false },
};

export default function ServicesScreen() {
    const params = useLocalSearchParams();
    const initialTabParam = params.tab as TabType;
    const initialTab: TabType = initialTabParam && ['due', 'lapsed', 'upcoming', 'completed', 'rejected', 'all', 'assets'].includes(initialTabParam)
        ? initialTabParam
        : 'due';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [tabState, setTabState] = useState<Record<TabType, TabState>>(initialTabState);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    useEffect(() => {
        setTabState(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], page: 1 },
        }));
        loadServices(activeTab, 1, { forceRefresh: true });
    }, [activeTab]);

    const loadServices = async (tab: TabType, page: number = 1, options: { forceRefresh?: boolean } = {}) => {
        try {
            setLoading(true);

            if (tab === 'assets') {
                // Fetch all services to derive unique assets and compute dates, matching Web Dashboard logic
                let allServices: Service[] = [];
                let p = 1;
                let more = true;

                // Fetch up to 5 pages
                while (more && p <= 5) {
                    const res = await dashboardService.getMyServices(p, 50);
                    const data = res?.data || res?.services || (Array.isArray(res) ? res : []);
                    if (data.length === 0) {
                        more = false;
                    } else {
                        allServices.push(...data);
                        if (!res?.pagination || p >= (res.pagination.totalPages || 1)) {
                            more = false;
                        } else {
                            p++;
                        }
                    }
                }

                // Group by asset and compute dates
                const assetMap = new Map<string, any>();

                allServices.forEach(s => {
                    if (!s.asset?.id) return;

                    if (!assetMap.has(s.asset.id)) {
                        assetMap.set(s.asset.id, {
                            ...s.asset,
                            id: s.asset.id, // ensure ID is preserved
                            plant: s.asset.plant, // ensure plant structure
                            services: []
                        });
                    }
                    assetMap.get(s.asset.id).services.push(s);
                });

                const assets = Array.from(assetMap.values()).map(asset => {
                    const services = asset.services as Service[];
                    const now = new Date();

                    // Helper to parse date safely
                    const getDate = (d: string) => {
                        const date = new Date(d);
                        return isNaN(date.getTime()) ? null : date;
                    };

                    // Sort services by date
                    services.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                    const futureServices = services.filter(s => {
                        const d = getDate(s.scheduledDate);
                        return d && d > now && s.status !== 'COMPLETED' && s.status !== 'SUBMITTED';
                    });

                    const pastServices = services.filter(s => {
                        const d = getDate(s.scheduledDate);
                        return d && d <= now && (s.status === 'COMPLETED' || s.status === 'SUBMITTED');
                    });

                    // Find next dates by type
                    const getNextDate = (type: string) => {
                        const s = futureServices.find(fs => fs.inspectionType === type);
                        return s ? s.scheduledDate : null;
                    };

                    // Find last dates by type (reverse pastServices to find most recent)
                    const getLastDate = (type: string) => {
                        const s = [...pastServices].reverse().find(ps => ps.inspectionType === type);
                        return s ? s.scheduledDate : null;
                    };

                    return {
                        ...asset,
                        serviceDates: {
                            nextServiceDates: {
                                inspection: getNextDate('Inspection'),
                                testing: getNextDate('Testing'),
                                maintenance: getNextDate('Maintenance')
                            },
                            lastServiceDates: {
                                inspection: getLastDate('Inspection'),
                                testing: getLastDate('Testing'),
                                maintenance: getLastDate('Maintenance')
                            }
                        }
                    };
                });

                setTabState(prev => ({
                    ...prev,
                    [tab]: {
                        ...prev[tab],
                        assets: [], // We use client side paging on allAssets
                        allAssets: assets,
                        services: [],
                        page: 1,
                        total: assets.length,
                        useClientPaging: true,
                        hasMore: assets.length > PAGE_SIZE,
                    },
                }));

                // Trigger client side pagination for first page
                const pagedAssets = assets.slice(0, PAGE_SIZE);
                setTabState(prev => ({
                    ...prev,
                    [tab]: {
                        ...prev[tab],
                        assets: pagedAssets
                    }
                }));

                return;
            }

            let response;

            switch (tab) {
                case 'due':
                    response = await dashboardService.getDueServices(page, PAGE_SIZE);
                    break;
                case 'lapsed':
                    response = await dashboardService.getLapsedServices(page, PAGE_SIZE);
                    break;
                case 'upcoming':
                    response = await dashboardService.getUpcomingServices(page, PAGE_SIZE);
                    break;
                case 'completed':
                    response = await dashboardService.getCompletedServices(page, PAGE_SIZE);
                    break;
                case 'rejected':
                    response = await dashboardService.getRejectedServices(page, PAGE_SIZE);
                    break;
                case 'all':
                    response = await dashboardService.getMyServices(page, PAGE_SIZE);
                    break;
                default:
                    response = { data: [], pagination: { page: 1, limit: PAGE_SIZE, total: 0 } };
            }

            let newServices = response?.data || response?.services || (Array.isArray(response) ? response : []);
            const pagination = response?.pagination;

            // Backend now handles strict partitioning of Due vs Lapsed vs Upcoming
            // So we trust the API response without client-side strict filtering (which causes timezone issues)

            setTabState(prev => {
                const existing = prev[tab];

                if (pagination) {
                    const nextPage = pagination.page || page;
                    const totalFromApi = typeof pagination.total === 'number'
                        ? pagination.total
                        : 0;
                    const hasMore = typeof pagination.hasMore === 'boolean'
                        ? pagination.hasMore
                        : totalFromApi > nextPage * PAGE_SIZE;

                    // If we got no services but there are items, reset to page 1
                    if (newServices.length === 0 && totalFromApi > 0 && nextPage > 1) {
                        // Trigger a reload to page 1
                        setTimeout(() => loadServices(tab, 1, { forceRefresh: true }), 0);
                        return prev; // Don't update state yet, wait for page 1 reload
                    }

                    return {
                        ...prev,
                        [tab]: {
                            services: newServices,
                            page: nextPage,
                            total: totalFromApi,
                            hasMore,
                        },
                    };
                }

                // Fallback for APIs that return full list without pagination metadata
                const allServices = options.forceRefresh || !existing.allServices ? newServices : (existing.allServices || []);
                const total = allServices.length;
                const start = (page - 1) * PAGE_SIZE;
                const pagedServices = allServices.slice(start, start + PAGE_SIZE);

                return {
                    ...prev,
                    [tab]: {
                        services: pagedServices,
                        page,
                        total,
                        allServices,
                        useClientPaging: true,
                        hasMore: total > page * PAGE_SIZE,
                    },
                };
            });
        } catch (error: any) {
            console.error('Error loading services:', error?.response?.status, error?.response?.data || error.message);
            setTabState(prev => ({
                ...prev,
                [tab]: { ...prev[tab], services: [], assets: [], total: 0 },
            }));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setTabState(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], page: 1 },
        }));
        loadServices(activeTab, 1, { forceRefresh: true });
    };

    const changePage = (nextPage: number) => {
        const current = tabState[activeTab];
        const totalPages = Math.max(1, Math.ceil(Math.max(current.total, 0) / PAGE_SIZE) || 1);
        const safePage = Math.min(Math.max(nextPage, 1), totalPages);

        if (current.useClientPaging) {
            const start = (safePage - 1) * PAGE_SIZE;

            if (activeTab === 'assets' && current.allAssets) {
                const pagedAssets = current.allAssets.slice(start, start + PAGE_SIZE);
                setTabState(prev => ({
                    ...prev,
                    [activeTab]: {
                        ...prev[activeTab],
                        page: safePage,
                        assets: pagedAssets,
                    },
                }));
                return;
            }

            if (current.allServices) {
                const pagedServices = current.allServices.slice(start, start + PAGE_SIZE);
                setTabState(prev => ({
                    ...prev,
                    [activeTab]: {
                        ...prev[activeTab],
                        page: safePage,
                        services: pagedServices,
                    },
                }));
                return;
            }
        }

        if (safePage !== current.page) {
            loadServices(activeTab, safePage);
        }
    };

    // Page numbers calculation using useMemo for consistency
    const getPageNumbers = useMemo(() =>
        (currentPage: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
            if (totalPages <= 5) {
                return Array.from({ length: totalPages }, (_, idx) => idx + 1);
            }

            const start = Math.max(1, currentPage - 1);
            const end = Math.min(totalPages, currentPage + 1);
            const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

            if (start > 1) pages.push(1);
            if (start > 2) pages.push('ellipsis-start');

            for (let i = start; i <= end; i++) pages.push(i);

            if (end < totalPages - 1) pages.push('ellipsis-end');
            if (end < totalPages) pages.push(totalPages);

            return pages;
        }, []);

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return { bg: '#fef3c7', text: '#d97706' };
            case 'IN_PROGRESS':
                return { bg: '#dbeafe', text: '#2563eb' };
            case 'COMPLETED':
            case 'SUBMITTED':
            case 'APPROVED':
                return { bg: '#dcfce7', text: '#16a34a' };
            case 'REJECTED':
                return { bg: '#fee2e2', text: '#dc2626' };
            default:
                return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const handleServicePress = (service: Service) => {
        const isCompletedTab = activeTab === 'completed';
        router.push({
            pathname: '/service/[id]',
            params: {
                id: service.id,
                requireQRVerification: activeTab === 'due' ? 'true' : 'false',
                expectedAssetId: service.asset?.assetId || ''
            }
        });
    };

    const renderServiceCard = (service: Service) => {
        const statusColors = getStatusColor(service.status);
        const scheduledDate = new Date(service.scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        const isOverdue = scheduledDate < today && service.status === 'PENDING';
        const isCompleted = ['SUBMITTED', 'COMPLETED'].includes(service.status?.toUpperCase()) || activeTab === 'completed';

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
                onPress={() => handleServicePress(service)}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                        <View style={{ backgroundColor: isOverdue ? '#fef2f2' : '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                            <Text style={{ color: isOverdue ? '#dc2626' : '#2563eb', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                                {service.inspectionType}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                            <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '600' }}>
                                {service.status}
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color="#9ca3af" />
                </View>

                <Text style={{ color: '#1f2937', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                    {service.form?.serviceName || 'Service'}
                </Text>

                <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
                    Asset: {service.asset?.assetId || (service.asset as any)?.asset_code || 'Unknown'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MapPin size={14} color="#9ca3af" />
                    <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                        {(typeof service.asset?.building === 'object' ? (service.asset?.building as any)?.building_name : service.asset?.building) || ''}{service.asset?.location ? `, ${service.asset.location}` : ''}
                    </Text>
                </View>

                <View style={{
                    marginTop: 8,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f3f4f6',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={14} color={isOverdue ? '#dc2626' : '#9ca3af'} />
                        <Text style={{ color: isOverdue ? '#dc2626' : '#6b7280', fontSize: 12, marginLeft: 4 }}>
                            {isOverdue ? 'Overdue: ' : ''}{scheduledDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                    {!isCompleted && (
                        <View style={{ backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                                {service.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                            </Text>
                        </View>
                    )}
                    {isCompleted && (
                        <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                            <Text style={{ color: '#16a34a', fontWeight: '600', fontSize: 12 }}>
                                View Details
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity >
        );
    };

    const renderAssetCard = (asset: AssignedAsset) => {
        const plantName = asset.plant?.plantName || asset.plantId?.plantName || 'Unknown Plant';
        const building = (typeof asset.building === 'object' ? (asset.building as any)?.building_name : asset.building) || '';
        const location = asset.location || '';
        const status = asset.healthStatus || asset.status || 'Unknown';

        const formatDate = (value?: string | null) => {
            if (!value) return null;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return null;
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        };

        const nextServiceDates = asset.serviceDates?.nextServiceDates;
        const lastServiceDates = asset.serviceDates?.lastServiceDates;

        const nextInspection = formatDate(nextServiceDates?.inspection);
        const nextTesting = formatDate(nextServiceDates?.testing);
        const nextMaintenance = formatDate(nextServiceDates?.maintenance);

        const lastInspection = formatDate(lastServiceDates?.inspection);
        const lastTesting = formatDate(lastServiceDates?.testing);
        const lastMaintenance = formatDate(lastServiceDates?.maintenance);

        const primaryId = asset.assetId || asset.asset_code || 'Asset';

        const navigateToDetails = () => {
            const targetId = asset.id || asset._id || asset.assetId;
            if (!targetId) return;
            router.push({
                pathname: '/asset/[id]',
                params: { id: targetId }
            });
        };

        const getHealthStatusColor = (status: string) => {
            switch (status?.toUpperCase()) {
                case 'HEALTHY':
                    return { bg: '#dcfce7', text: '#16a34a' }; // Green
                case 'NEEDS_ATTENTION':
                case 'NEEDS ATTENTION':
                    return { bg: '#fefce8', text: '#ca8a04' }; // Yellow
                case 'NOT_WORKING':
                case 'NOT WORKING':
                    return { bg: '#fee2e2', text: '#dc2626' }; // Red
                case 'INVENTORY':
                    return { bg: '#eff6ff', text: '#2563eb' }; // Blue
                case 'OBSOLETE':
                    return { bg: '#f3f4f6', text: '#6b7280' }; // Gray
                default:
                    return { bg: '#f3f4f6', text: '#6b7280' };
            }
        };

        const healthColor = getHealthStatusColor(status);

        return (
            <TouchableOpacity
                key={asset.id || asset._id || asset.assetId}
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
                onPress={navigateToDetails}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ backgroundColor: '#fff7ed', padding: 10, borderRadius: 12 }}>
                            <Package size={18} color="#f97316" />
                        </View>
                        <View>
                            <Text style={{ color: '#1f2937', fontWeight: 'bold', fontSize: 16 }}>
                                {primaryId}
                            </Text>
                            <Text style={{ color: '#6b7280', fontSize: 13 }}>
                                {plantName}
                            </Text>
                        </View>
                    </View>
                    <View style={{ backgroundColor: healthColor.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <Text style={{ color: healthColor.text, fontWeight: '600', fontSize: 12 }}>
                            {status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MapPin size={14} color="#9ca3af" />
                    <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                        {[building, location].filter(Boolean).join(', ') || 'Location not set'}
                    </Text>
                </View>

                {(nextInspection || nextTesting || nextMaintenance || lastInspection || lastTesting || lastMaintenance) && (
                    <View style={{ marginTop: 12, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 }}>
                        <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
                            Service Dates
                        </Text>

                        {/* Header Row */}
                        <View style={{ flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                            <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: '#9ca3af' }}>TYPE</Text>
                            <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: '#9ca3af', textAlign: 'right' }}>NEXT</Text>
                        </View>

                        {/* Data Rows */}
                        {[
                            { label: 'Inspection', next: nextInspection },
                            { label: 'Testing', next: nextTesting },
                            { label: 'Maintenance', next: nextMaintenance }
                        ].map((item, index) => (
                            <View key={item.label} style={{
                                flexDirection: 'row',
                                paddingVertical: 6,
                                borderBottomWidth: index !== 2 ? 1 : 0,
                                borderBottomColor: '#f3f4f6'
                            }}>
                                <Text style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' }}>{item.label}</Text>
                                <Text style={{ flex: 1, fontSize: 13, color: item.next ? '#1f2937' : '#9ca3af', textAlign: 'right', fontWeight: item.next ? '600' : '400' }}>
                                    {item.next || '-'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ClipboardList size={14} color="#f97316" />
                        <Text style={{ color: '#f97316', fontWeight: '600', fontSize: 12, marginLeft: 6 }}>
                            View Asset Details
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#9ca3af" />
                </View>
            </TouchableOpacity>
        );
    };

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: 'due', label: 'Due', icon: <AlertCircle size={16} color={activeTab === 'due' ? '#fff' : '#6b7280'} /> },
        { key: 'lapsed', label: 'Lapsed', icon: <AlertCircle size={16} color={activeTab === 'lapsed' ? '#fff' : '#6b7280'} /> },
        { key: 'upcoming', label: 'Upcoming', icon: <Calendar size={16} color={activeTab === 'upcoming' ? '#fff' : '#6b7280'} /> },
        { key: 'completed', label: 'Done', icon: <CheckCircle size={16} color={activeTab === 'completed' ? '#fff' : '#6b7280'} /> },
        { key: 'rejected', label: 'Rejected', icon: <X size={16} color={activeTab === 'rejected' ? '#fff' : '#6b7280'} /> },
        { key: 'all', label: 'All', icon: <ClipboardList size={16} color={activeTab === 'all' ? '#fff' : '#6b7280'} /> },
        { key: 'assets', label: 'Assigned Assets', icon: <Package size={16} color={activeTab === 'assets' ? '#fff' : '#6b7280'} /> },
    ];

    const getEmptyMessage = () => {
        switch (activeTab) {
            case 'due':
                return { title: 'No Due Services', message: 'You have no services due at the moment.' };
            case 'lapsed':
                return { title: 'No Lapsed Services', message: 'You have no overdue services.' };
            case 'upcoming':
                return { title: 'No Upcoming Services', message: 'You have no upcoming services scheduled.' };
            case 'completed':
                return { title: 'No Completed Services', message: 'You haven\'t completed any services yet.' };
            case 'rejected':
                return { title: 'No Rejected Services', message: 'You have no rejected services.' };
            case 'all':
                return { title: 'No Services', message: 'You have no services assigned.' };
            case 'assets':
                return { title: 'No Assigned Assets', message: 'You have no assets assigned.' };
            default:
                return { title: 'No Services', message: 'No services found.' };
        }
    };

    const emptyMsg = getEmptyMessage();

    const currentTabData = tabState[activeTab];
    const isAssetsTab = activeTab === 'assets';
    const currentItems = isAssetsTab
        ? (currentTabData?.assets || [])
        : (currentTabData?.services || []);
    const currentPage = currentTabData?.page || 1;
    const totalItems = currentTabData?.total || 0;
    const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 0) / PAGE_SIZE) || 1);
    const pageNumbers = getPageNumbers(currentPage, totalPages);
    const itemLabel = isAssetsTab ? 'asset' : 'service';

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
                <Text style={{ color: '#1f2937', fontSize: 20, fontWeight: 'bold', flex: 1 }}>My Services</Text>
            </View>

            {/* Tabs */}
            <View style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6'
            }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: activeTab === tab.key ? '#f97316' : '#f3f4f6',
                                gap: 6
                            }}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            {tab.icon}
                            <Text style={{
                                color: activeTab === tab.key ? '#fff' : '#6b7280',
                                fontWeight: '600',
                                fontSize: 14
                            }}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Services List */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 60 + insets.bottom + 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
                }
            >
                {/* Results count */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>
                        {loading
                            ? 'Loading...'
                            : `Showing ${currentItems.length} of ${totalItems} ${itemLabel}${totalItems !== 1 ? 's' : ''}`}
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator color="#f97316" style={{ paddingVertical: 40 }} />
                ) : currentItems.length > 0 ? (
                    <>
                        {isAssetsTab
                            ? currentItems.map(asset => renderAssetCard(asset as AssignedAsset))
                            : currentItems.map(service => renderServiceCard(service as Service))}

                        {/* Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            pageSize={PAGE_SIZE}
                            currentItemsCount={currentItems.length}
                            itemLabel={itemLabel}
                            onPageChange={changePage}
                            loading={loading}
                            showPageNumbers={true}
                            pageNumbers={pageNumbers}
                        />
                    </>
                ) : (
                    <View style={{
                        backgroundColor: '#ffffff',
                        padding: 40,
                        borderRadius: 16,
                        alignItems: 'center',
                        marginTop: 20
                    }}>
                        <View style={{
                            backgroundColor: activeTab === 'completed' ? '#dcfce7' : '#f3f4f6',
                            padding: 16,
                            borderRadius: 999,
                            marginBottom: 16
                        }}>
                            {activeTab === 'completed' ? (
                                <CheckCircle size={40} color="#16a34a" />
                            ) : (
                                <ClipboardList size={40} color="#9ca3af" />
                            )}
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 18, marginBottom: 8 }}>
                            {emptyMsg.title}
                        </Text>
                        <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                            {emptyMsg.message}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
