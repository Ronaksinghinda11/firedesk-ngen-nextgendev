import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardService, Service, Ticket, CalendarEvent, Statistics } from '../../services/dashboard';
import { ChevronLeft, ChevronRight, AlertCircle, Calendar as CalendarIcon, Filter, X, Check, Clock, AlertTriangle, Briefcase, MapPin, Ticket as TicketIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SimplePagination } from '../../components/ui/Pagination';

const { width } = Dimensions.get('window');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type FilterType = 'due' | 'lapsed' | 'done' | 'rejected' | 'tickets' | null;
const FILTER_PAGE_SIZE = 100;
const FILTER_MAX_PAGES = 5;
const FILTER_DISPLAY_PAGE_SIZE = 10;

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

export default function CalendarScreen() {
    const insets = useSafeAreaInsets();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>(null);
    const [filteredServices, setFilteredServices] = useState<(Service | Ticket)[]>([]);
    const [assetFilter, setAssetFilter] = useState<string | null>(null);
    const [serviceTypeFilter, setServiceTypeFilter] = useState<string | null>(null);
    const [plantFilter, setPlantFilter] = useState<string | null>(null);

    const [filterLoading, setFilterLoading] = useState(false);
    const [filterError, setFilterError] = useState<string | null>(null);
    const [filteredPage, setFilteredPage] = useState(1);
    const router = useRouter();

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            const [eventsRes, statsRes, dueRes, completedRes, ticketsRes, rejectedRes] = await Promise.all([
                dashboardService.getCalendarEvents(month, year),
                dashboardService.getStatistics(),
                dashboardService.getDueServices(1, 10),
                dashboardService.getCompletedServices(1, 10),
                dashboardService.getMyTickets(),
                dashboardService.getRejectedServices(1, 10),
            ]);

            const fetchedEvents = eventsRes?.data || [];
            setEvents(fetchedEvents);

            const apiStats = statsRes?.data || {};

            const dueTotal = dueRes?.pagination?.total ?? (Array.isArray(dueRes?.data) ? dueRes.data.length : 0);
            const completedServicesTotal = completedRes?.pagination?.total ?? (Array.isArray(completedRes?.data) ? completedRes.data.length : 0);
            const rejectedTotal = rejectedRes?.pagination?.total ?? (Array.isArray(rejectedRes?.data) ? rejectedRes.data.length : 0);

            const tickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];
            const completedTicketsCount = tickets.filter((t: Ticket) => {
                const status = t.completedStatus?.toUpperCase();
                return status === 'COMPLETED' || status === 'APPROVED';
            }).length;
            const pendingTicketsCount = tickets.filter((t: Ticket) => {
                const status = t.completedStatus?.toUpperCase();
                return status !== 'COMPLETED' && status !== 'APPROVED';
            }).length;

            setStatistics({
                serviceDue: dueTotal,
                serviceLapsed: apiStats.serviceLapsed ?? 0,
                serviceUpcoming: apiStats.serviceUpcoming ?? 0,
                serviceCompleted: completedServicesTotal + completedTicketsCount,
                serviceCancelled: apiStats.serviceCancelled ?? 0,
                serviceRejected: rejectedTotal,
                totalServices: apiStats.totalServices ?? 0,
                ticketsPending: pendingTicketsCount,
                ticketsCompleted: completedTicketsCount,
            });
        } catch (error) {
            console.error('Error loading calendar data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        return { daysInMonth, startingDay };
    };

    const getEventsForDate = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.find(e => e.date === dateStr);
    };

    const goToPrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const handleFilterSelect = async (filter: FilterType) => {
        setSelectedDate(null);
        setFilterError(null);

        if (selectedFilter === filter) {
            setSelectedFilter(null);
            setFilteredServices([]);
            setAssetFilter(null);
            setServiceTypeFilter(null);
            setPlantFilter(null);
            return;
        }

        setSelectedFilter(filter);
        setFilterLoading(true);

        try {
            const services = await fetchServicesForFilter(filter);
            setFilteredServices(services);
            setFilterError(null);
            setAssetFilter(null);
            setServiceTypeFilter(null);
            setPlantFilter(null);
            setFilteredPage(1);
        } catch (error: any) {
            console.log('Filter fetch issue:', error?.message || 'Unknown error');
            setFilteredServices([]);
            setFilterError('Unable to load services. Please try again.');
        } finally {
            setFilterLoading(false);
        }
    };

    const clearFilter = () => {
        setSelectedFilter(null);
        setFilteredServices([]);
        setAssetFilter(null);
        setServiceTypeFilter(null);
        setPlantFilter(null);
        setFilterError(null);
        setFilteredPage(1);
    };

    const pageThroughServices = async (fetcher: (page: number, limit: number) => Promise<any>) => {
        const results: Service[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= FILTER_MAX_PAGES) {
            const res = await fetcher(page, FILTER_PAGE_SIZE);
            const data = res?.data || [];
            results.push(...data);
            const pagination = res?.pagination;
            if (pagination) {
                const totalPages = Math.max(
                    1,
                    Math.ceil((pagination.total || data.length) / (pagination.limit || FILTER_PAGE_SIZE))
                );
                hasMore = page < totalPages;
            } else {
                hasMore = false;
            }
            page += 1;
        }
        return results;
    };

    const fetchServicesForFilter = async (filter: FilterType): Promise<(Service | Ticket)[]> => {
        if (!filter) return [];

        switch (filter) {
            case 'due':
                return (await pageThroughServices((p, l) => dashboardService.getDueServices(p, l))).filter(s => !isServiceLapsed(s));
            case 'done': {
                const services = await pageThroughServices((p, l) => dashboardService.getCompletedServices(p, l));
                try {
                    const ticketsRes = await dashboardService.getMyTickets();
                    const tickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];
                    const completedTickets = tickets.filter((t: Ticket) => {
                        const status = t.completedStatus?.toUpperCase();
                        return status === 'COMPLETED' || status === 'APPROVED';
                    });
                    const typedTickets = completedTickets.map((t: Ticket) => ({ ...t, isTicket: true }));
                    return [...services, ...typedTickets];
                } catch (e) {
                    console.error('Failed to fetch tickets for done filter', e);
                    return services;
                }
            }
            case 'lapsed': {
                const res = await dashboardService.getLapsedServices();
                return (res?.data || res?.services || (Array.isArray(res) ? res : [])) as Service[];
            }
            case 'rejected': {
                return await pageThroughServices((p, l) => dashboardService.getRejectedServices(p, l));
            }
            case 'tickets': {
                try {
                    const ticketsRes = await dashboardService.getMyTickets();
                    const tickets = ticketsRes?.data?.tickets || ticketsRes?.tickets || [];
                    const pendingTickets = tickets.filter((t: Ticket) => {
                        const status = t.completedStatus?.toUpperCase();
                        return status !== 'COMPLETED' && status !== 'APPROVED';
                    });
                    // Assign isTicket true
                    return pendingTickets.map((t: Ticket) => ({ ...t, isTicket: true }));
                } catch (e) {
                    console.error('Failed to fetch tickets', e);
                    return [];
                }
            }
            default:
                return [];
        }
    };

    const subFilterOptions = React.useMemo(() => {
        const assets = new Set<string>();
        const serviceTypes = new Set<string>();
        const plants = new Set<string>();

        filteredServices.forEach((item: any) => {
            if (item.asset?.assetId) assets.add(item.asset.assetId);
            if (item.inspectionType) serviceTypes.add(item.inspectionType);
            else if (item.isTicket) serviceTypes.add('Ticket');

            const pName = item.asset?.plant?.plantName || item.plant?.plantName;
            if (pName) plants.add(pName);
        });
        return {
            assets: Array.from(assets),
            serviceTypes: Array.from(serviceTypes),
            plants: Array.from(plants),
        };
    }, [filteredServices]);

    const filteredServicesWithSubfilters = React.useMemo(() => {
        return filteredServices.filter((s: any) => {
            const itemAssetId = s.asset?.assetId;
            const itemType = s.inspectionType || (s.isTicket ? 'Ticket' : undefined);
            const itemPlant = s.asset?.plant?.plantName || s.plant?.plantName;

            const assetOk = assetFilter ? itemAssetId === assetFilter : true;
            const serviceTypeOk = serviceTypeFilter ? itemType === serviceTypeFilter : true;
            const plantOk = plantFilter ? itemPlant === plantFilter : true;
            return assetOk && serviceTypeOk && plantOk;
        });
    }, [filteredServices, assetFilter, serviceTypeFilter, plantFilter]);

    useEffect(() => {
        setFilteredPage(1);
    }, [assetFilter, serviceTypeFilter, plantFilter]);

    const totalFilteredPages = Math.max(
        1,
        Math.ceil((filteredServicesWithSubfilters.length || 0) / FILTER_DISPLAY_PAGE_SIZE)
    );

    const pagedFilteredServices = React.useMemo(() => {
        const start = (filteredPage - 1) * FILTER_DISPLAY_PAGE_SIZE;
        return filteredServicesWithSubfilters.slice(start, start + FILTER_DISPLAY_PAGE_SIZE);
    }, [filteredServicesWithSubfilters, filteredPage]);

    const changeFilteredPage = (next: number) => {
        const safe = Math.min(Math.max(next, 1), totalFilteredPages);
        if (safe !== filteredPage) setFilteredPage(safe);
    };

    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const calendarDays = [];
    for (let i = 0; i < startingDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    const selectedDateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : null;
    const selectedEvents = selectedDateStr ? events.find(e => e.date === selectedDateStr) : null;

    const renderFilterPill = (label: string, count: number, type: FilterType, activeColor: string, icon: React.ReactNode) => {
        const isActive = selectedFilter === type;
        return (
            <TouchableOpacity
                onPress={() => handleFilterSelect(type)}
                style={[
                    styles.filterPill,
                    isActive && { backgroundColor: activeColor, borderColor: activeColor, shadowColor: activeColor, shadowOpacity: 0.3 }
                ]}
            >
                <View style={[styles.filterIconContainer, isActive && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    {icon}
                </View>
                <View>
                    <Text style={[styles.filterLabel, isActive && { color: 'rgba(255,255,255,0.9)' }]}>{label}</Text>
                    <Text style={[styles.filterCount, isActive && { color: '#ffffff' }]}>{count}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Schedule</Text>
                    <Text style={styles.headerSubtitle}>
                        {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                </View>
                <TouchableOpacity style={styles.calendarIconBtn}>
                    <CalendarIcon size={20} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
                showsVerticalScrollIndicator={false}
            >
                {/* Grid Status Filters */}
                {statistics && (
                    <View style={styles.filterGridContainer}>
                        {/* {renderFilterPill('Upcoming', statistics.serviceDue, 'due', '#dc2626', <Briefcase size={14} color={selectedFilter === 'due' ? '#fff' : '#6b7280'} />)} */}
                        {renderFilterPill('Overdue', statistics.serviceLapsed, 'lapsed', '#f97316', <AlertTriangle size={14} color={selectedFilter === 'lapsed' ? '#fff' : '#6b7280'} />)}
                        {renderFilterPill('Pending Tickets', statistics.ticketsPending, 'tickets', '#a855f7', <TicketIcon size={14} color={selectedFilter === 'tickets' ? '#fff' : '#6b7280'} />)}
                        {renderFilterPill('Rejected', statistics.serviceRejected, 'rejected', '#e11d48', <X size={14} color={selectedFilter === 'rejected' ? '#fff' : '#6b7280'} />)}
                        {renderFilterPill('Completed', statistics.serviceCompleted, 'done', '#16a34a', <Check size={14} color={selectedFilter === 'done' ? '#fff' : '#6b7280'} />)}
                    </View>
                )}

                {/* Calendar Section - ALWAYS VISIBLE */}
                <View style={styles.calendarCard}>
                    {/* Month Nav */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                            <ChevronLeft size={20} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                            <ChevronRight size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* Days Header */}
                    <View style={styles.daysHeader}>
                        {DAYS.map(day => (
                            <Text key={day} style={styles.dayText}>{day.charAt(0)}</Text>
                        ))}
                    </View>

                    {/* Grid */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#f97316" style={{ marginVertical: 32 }} />
                    ) : (
                        <View style={styles.grid}>
                            {calendarDays.map((day, idx) => {
                                if (!day) return <View key={idx} style={styles.dayCell} />;

                                const dayEvents = getEventsForDate(day);
                                const hasServices = dayEvents?.serviceDatas?.length > 0;
                                const hasTickets = dayEvents?.tickets?.length > 0;
                                const hasRejected = dayEvents?.serviceDatas?.some((s: any) => s.status?.toUpperCase() === 'REJECTED');

                                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth();
                                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.selectedDayCell,
                                            !isSelected && isToday && styles.todayCell
                                        ]}
                                        onPress={() => {
                                            setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                                            setSelectedFilter(null);
                                            setFilteredServices([]);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dayNum,
                                            isSelected && styles.selectedDayNum,
                                            !isSelected && isToday && styles.todayDayNum
                                        ]}>
                                            {day}
                                        </Text>
                                        <View style={styles.dotsContainer}>
                                            {hasRejected && <View style={[styles.dot, { backgroundColor: '#e11d48' }]} />}
                                            {hasServices && !hasRejected && <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />}
                                            {hasTickets && <View style={[styles.dot, { backgroundColor: '#f97316' }]} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Sub-Filters (Chips) */}
                {selectedFilter && filteredServices.length > 0 && (
                    <View style={styles.subFilterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                            {subFilterOptions.plants.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPlantFilter(plantFilter === p ? null : p)}
                                    style={[styles.chip, plantFilter === p && styles.activeChip]}
                                >
                                    <Text style={[styles.chipText, plantFilter === p && styles.activeChipText]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                            {subFilterOptions.serviceTypes.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setServiceTypeFilter(serviceTypeFilter === t ? null : t)}
                                    style={[styles.chip, serviceTypeFilter === t && styles.activeChip]}
                                >
                                    <Text style={[styles.chipText, serviceTypeFilter === t && styles.activeChipText]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                            {(plantFilter || serviceTypeFilter) && (
                                <TouchableOpacity onPress={() => { setPlantFilter(null); setServiceTypeFilter(null); }} style={styles.clearChip}>
                                    <X size={14} color="#6b7280" />
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* Content List */}
                <View style={styles.listContainer}>
                    {/* Header for list */}
                    {(selectedDate || selectedFilter) && (
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>
                                {selectedFilter
                                    ? selectedFilter === 'tickets' ? 'Pending Tickets' : `${selectedFilter === 'due' ? 'Upcoming' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Services`
                                    : selectedDate?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
                                }
                            </Text>
                            {selectedFilter && (
                                <TouchableOpacity onPress={clearFilter}>
                                    <Text style={styles.clearText}>Clear Filter</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Filter Loading / Error */}
                    {filterLoading && <ActivityIndicator size="small" color="#f97316" style={{ marginTop: 20 }} />}
                    {filterError && <Text style={styles.errorText}>{filterError}</Text>}

                    {/* Filtered Services List */}
                    {selectedFilter ? (
                        filteredServicesWithSubfilters.length > 0 ? (
                            pagedFilteredServices.map((item: any) => (
                                <ServiceCard key={item.id} item={item} router={router} />
                            ))
                        ) : !filterLoading && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No items found matching filters.</Text>
                            </View>
                        )
                    ) : selectedDate ? (
                        /* Selected Date Events */
                        selectedEvents && (selectedEvents.serviceDatas?.length > 0 || selectedEvents.tickets?.length > 0) ? (
                            <>
                                {selectedEvents.serviceDatas?.map(s => <ServiceCard key={s.id} item={s} router={router} />)}
                                {selectedEvents.tickets?.map(t => <ServiceCard key={t.id} item={{ ...t, isTicket: true }} router={router} />)}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No events scheduled for this day.</Text>
                            </View>
                        )
                    ) : null}

                    {/* Pagination for filters */}
                    {selectedFilter && filteredServicesWithSubfilters.length > 0 && (
                        <SimplePagination
                            currentPage={filteredPage}
                            totalPages={totalFilteredPages}
                            onPageChange={changeFilteredPage}
                            loading={filterLoading}
                        />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const ServiceCard = ({ item, router }: { item: any, router: any }) => {
    const isTicket = item.isTicket || item.ticketId;
    const isRejected = item.status?.toUpperCase() === 'REJECTED';

    return (
        <TouchableOpacity
            style={[styles.card, isRejected && styles.rejectedCard]}
            onPress={() => router.push({ pathname: isTicket ? '/ticket/[id]' : '/service/[id]', params: { id: item.id } })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.tagContainer}>
                    <View style={[styles.tag, { backgroundColor: isTicket ? '#fff7ed' : '#eff6ff' }]}>
                        <Text style={[styles.tagText, { color: isTicket ? '#c2410c' : '#1d4ed8' }]}>
                            {isTicket ? 'TICKET' : item.inspectionType || 'SERVICE'}
                        </Text>
                    </View>
                    {isRejected && (
                        <View style={[styles.tag, { backgroundColor: '#fee2e2', marginLeft: 6 }]}>
                            <Text style={[styles.tagText, { color: '#b91c1c' }]}>REJECTED</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.dateText}>
                    {new Date(item.scheduledDate || item.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
            </View>

            <Text style={styles.cardTitle}>{isTicket ? item.taskName : (item.form?.serviceName || 'Service Request')}</Text>

            <View style={styles.cardRow}>
                <MapPin size={14} color="#6b7280" />
                <Text style={styles.cardDetail} numberOfLines={1}>
                    {item.plant?.plantName || item.asset?.plant?.plantName || 'Unknown Site'}
                </Text>
            </View>

            <View style={[styles.cardRow, { marginTop: 4 }]}>
                <Briefcase size={14} color="#6b7280" />
                <Text style={styles.cardDetail}>
                    {isTicket ? item.ticketId : item.asset?.assetId}
                </Text>
            </View>

            {isRejected && item.approvalRemarks && (
                <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionText}>Note: {item.approvalRemarks}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
    headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    calendarIconBtn: { padding: 10, backgroundColor: '#f3f4f6', borderRadius: 12 },
    scrollView: { flex: 1 },

    // Updated Grid Layout for Filter Container
    filterGridContainer: {
        paddingHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between'
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        width: '48%', // Grid column width
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 4 // Space for shadow
    },
    filterIconContainer: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10, marginRight: 10 },
    filterLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
    filterCount: { fontSize: 16, fontWeight: '700', color: '#1f2937' },

    calendarCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3
    },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    navBtn: { padding: 8, backgroundColor: '#f9fafb', borderRadius: 10 },
    monthTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    daysHeader: { flexDirection: 'row', marginBottom: 12, justifyContent: 'space-around' },
    dayText: { width: 32, textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
        width: (width - 72) / 7,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4
    },
    selectedDayCell: { backgroundColor: '#f97316', borderRadius: 12 },
    todayCell: { backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
    dayNum: { fontSize: 14, fontWeight: '500', color: '#374151' },
    selectedDayNum: { color: '#fff', fontWeight: '700' },
    todayDayNum: { color: '#f97316', fontWeight: '700' },
    dotsContainer: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 6 },
    dot: { width: 4, height: 4, borderRadius: 2 },

    subFilterContainer: { marginBottom: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 },
    activeChip: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    chipText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
    activeChipText: { color: '#2563eb' },
    clearChip: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 20 },

    listContainer: { paddingHorizontal: 20 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    listTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    clearText: { fontSize: 12, color: '#f97316', fontWeight: '600' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#9ca3af', fontSize: 14 },
    errorText: { color: '#dc2626', textAlign: 'center', marginTop: 20 },

    card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' },
    rejectedCard: { borderColor: '#fecaca', backgroundColor: '#fff9f9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    tagContainer: { flexDirection: 'row' },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 10, fontWeight: '700' },
    dateText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    cardDetail: { fontSize: 13, color: '#4b5563', flex: 1 },
    rejectionBox: { marginTop: 10, padding: 10, backgroundColor: '#fff1f2', borderRadius: 8 },
    rejectionText: { color: '#be123c', fontSize: 12, fontStyle: 'italic' }
});
