/**
 * Admin Calendar Page
 *
 * Dual-view: Gantt timeline + inline Calendar grid (toggle)
 * Service tabs below: Due, Completed, Lapsed, Cancelled, Rejected (read-only)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
    BarChart3, CalendarIcon, Clock, CheckCircle2, AlertTriangle,
    XCircle, Eye, CheckCircle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User,
} from 'lucide-react';
import {
    format, parseISO, subMonths, addMonths, subDays, addDays,
    startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay,
} from 'date-fns';
import { toast } from 'sonner';

import { adminCalendarApi, type ServiceSubmission, type CalendarEvent, type ServiceStatistics } from '@/services/api/adminCalendarApi';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { useEntityPermissions } from '@/components/generic/hooks/useEntityPermissions';
import { Entity } from '@/types/permissions';
import { CalendarFilterBar, type CalendarFilters, EMPTY_FILTERS } from '@/components/calendar/CalendarFilterBar';
import { GanttChart } from '@/components/calendar/GanttChart';
import { type CalendarServiceItem, normalizeAPIService, getAssetGroups } from '@/lib/calendarDataUtils';

// ─── Calendar helpers (module-level, no deps) ───
function getMonthsInRange(start: Date, end: Date): { month: number; year: number }[] {
    const months: { month: number; year: number }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
        months.push({ month: cur.getMonth() + 1, year: cur.getFullYear() });
        cur.setMonth(cur.getMonth() + 1);
    }
    return months;
}

function mergeCalendarEvents(existing: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
    const map = new Map<string, CalendarEvent>();
    existing.forEach(e => map.set(e.date, { ...e, serviceDatas: [...e.serviceDatas], tickets: [...(e.tickets || [])] }));
    incoming.forEach(e => {
        if (!map.has(e.date)) {
            map.set(e.date, { ...e });
        } else {
            const ex = map.get(e.date)!;
            const existingIds = new Set(ex.serviceDatas.map((s: any) => s.id));
            (e.serviceDatas || []).forEach((s: any) => { if (!existingIds.has(s.id)) ex.serviceDatas.push(s); });
            const existingTicketIds = new Set((ex.tickets || []).map((t: any) => t.id));
            (e.tickets || []).forEach((t: any) => { if (!existingTicketIds.has(t.id)) ex.tickets.push(t); });
        }
    });
    return Array.from(map.values());
}

type ViewMode = 'gantt' | 'calendar';
type CalendarView = 'day' | 'week' | 'month';
type ServiceTab = 'completed' | 'due' | 'lapsed' | 'cancelled' | 'rejected';

const AdminCalendar = () => {
    const navigate = useNavigate();
    const { canRead } = useEntityPermissions({
        permissionEntity: Entity.CALENDAR,
        enforcePermissions: true,
    });
    const { selectedPlantId } = usePlantFilter();

    // ─── View State ───
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const stored = sessionStorage.getItem('calendarViewMode');
        return (stored === 'calendar' || stored === 'gantt') ? stored : 'gantt';
    });

    // Persist viewMode to sessionStorage when it changes
    useEffect(() => {
        sessionStorage.setItem('calendarViewMode', viewMode);
    }, [viewMode]);
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

    const [ganttStart, setGanttStart] = useState<Date>(() => {
        const d = new Date(); d.setFullYear(d.getFullYear() - 1); d.setHours(0, 0, 0, 0); return d;
    });
    const [ganttEnd, setGanttEnd] = useState<Date>(() => {
        const d = new Date(); d.setFullYear(d.getFullYear() + 1); d.setHours(0, 0, 0, 0); return d;
    });

    // ─── Filters ───
    const [filters, setFilters] = useState<CalendarFilters>({ ...EMPTY_FILTERS });

    // ─── Data ───
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [statistics, setStatistics] = useState<ServiceStatistics | null>(null);
    const [ganttLoading, setGanttLoading] = useState(false);
    const ganttAbortRef = useRef<AbortController | null>(null);

    // ─── Old-style per-tab service arrays ───
    const [completedServices, setCompletedServices] = useState<ServiceSubmission[]>([]);
    const [dueServices, setDueServices] = useState<ServiceSubmission[]>([]);
    const [lapsedServices, setLapsedServices] = useState<ServiceSubmission[]>([]);
    const [cancelledServices, setCancelledServices] = useState<ServiceSubmission[]>([]);
    const [rejectedServices, setRejectedServices] = useState<ServiceSubmission[]>([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeTab, setActiveTab] = useState<ServiceTab>('due');
    const [servicePage, setServicePage] = useState<Record<ServiceTab, number>>({ completed: 1, due: 1, lapsed: 1, cancelled: 1, rejected: 1 });
    const [serviceTotals, setServiceTotals] = useState<Record<ServiceTab, number>>({ completed: 0, due: 0, lapsed: 0, cancelled: 0, rejected: 0 });
    const [serviceLoading, setServiceLoading] = useState<Record<ServiceTab, boolean>>({ completed: false, due: false, lapsed: false, cancelled: false, rejected: false });

    // ─── Calendar view state ───
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentView, setCurrentView] = useState<CalendarView>('month');

    // ─── Client-side filter selections ───
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
    const [selectedPlantFilters, setSelectedPlantFilters] = useState<string[]>([]);
    const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
    const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // ─── Derived: Calendar services ───
    const calendarServices = useMemo<CalendarServiceItem[]>(() => {
        const services: CalendarServiceItem[] = [];
        calendarEvents.forEach((event: any) => {
            if (event.serviceDatas) {
                event.serviceDatas.forEach((s: any) => { services.push(normalizeAPIService(s)); });
            }
        });
        return services;
    }, [calendarEvents]);

    // ─── Filtered services ───
    const filteredServices = useMemo(() => {
        return calendarServices.filter((s) => {
            if (s.status?.toLowerCase().includes('cancel')) return false;
            if (filters.categories.length > 0 && !filters.categories.includes(s.categoryId)) return false;
            if (filters.products.length > 0 && !filters.products.includes(s.productName || '')) return false;
            // Product variant type filter
            if (filters.types.length > 0) {
                const hasMatch = (s.productTypes || []).some(t => filters.types.includes(t));
                if (!hasMatch) return false;
            }
            // Product variant sub-type filter
            if (filters.subTypes.length > 0) {
                const hasMatch = (s.productSubTypes || []).some(st => filters.subTypes.includes(st));
                if (!hasMatch) return false;
            }
            if (filters.serviceTypes.length > 0 && !filters.serviceTypes.includes(s.type)) return false;
            if (filters.frequencies.length > 0 && !filters.frequencies.includes(s.frequency)) return false;
            if (filters.dateRange) {
                const d = new Date(s.scheduledDate);
                const start = new Date(filters.dateRange.start);
                const end = new Date(filters.dateRange.end);
                if (d < start || d > end) return false;
            }
            return true;
        });
    }, [calendarServices, filters]);

    const assetGroups = useMemo(() => getAssetGroups(filteredServices), [filteredServices]);

    // ─── API Calls ───

    // Helper: extract events from a batch of settled promises
    const extractEventsFromResults = (results: PromiseSettledResult<any>[]) =>
        results.flatMap((r) =>
            r.status === 'fulfilled' && (r.value as any)?.success && Array.isArray((r.value as any).events)
                ? (r.value as any).events
                : []
        );

    // Progressive fetch: loads 3 priority months around today first for instant
    // display, then background-loads the remaining months in batches of 4.
    const fetchGanttRangeEvents = useCallback(async (start: Date, end: Date) => {
        // Abort any previous background fetch
        if (ganttAbortRef.current) ganttAbortRef.current.abort();
        const controller = new AbortController();
        ganttAbortRef.current = controller;

        try {
            const allMonths = getMonthsInRange(start, end);
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            // Split into priority (current ±1 month) and remaining
            const priorityMonths: typeof allMonths = [];
            const remainingMonths: typeof allMonths = [];
            allMonths.forEach(m => {
                const diff = (m.year - currentYear) * 12 + (m.month - currentMonth);
                if (Math.abs(diff) <= 1) priorityMonths.push(m);
                else remainingMonths.push(m);
            });

            // Wave 1: fetch priority months immediately
            setGanttLoading(true);
            const priorityResults = await Promise.allSettled(
                priorityMonths.map(({ month, year }) =>
                    adminCalendarApi.getCalendarEvents(month, year, selectedPlantId)
                )
            );
            if (controller.signal.aborted) return;
            const priorityEvents = extractEventsFromResults(priorityResults);
            setCalendarEvents(mergeCalendarEvents([], priorityEvents));

            // Wave 2: background-load remaining months in batches of 4
            const BATCH_SIZE = 4;
            for (let i = 0; i < remainingMonths.length; i += BATCH_SIZE) {
                if (controller.signal.aborted) return;
                const batch = remainingMonths.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.allSettled(
                    batch.map(({ month, year }) =>
                        adminCalendarApi.getCalendarEvents(month, year, selectedPlantId)
                    )
                );
                if (controller.signal.aborted) return;
                const batchEvents = extractEventsFromResults(batchResults);
                if (batchEvents.length > 0) {
                    setCalendarEvents(prev => mergeCalendarEvents(prev, batchEvents));
                }
            }
        } catch (error: any) {
            if (controller.signal.aborted) return;
            console.error('Failed to fetch gantt range events:', error);
            toast.error(error.response?.data?.message || 'Failed to load calendar events');
        } finally {
            if (!controller.signal.aborted) setGanttLoading(false);
        }
    }, [selectedPlantId]);

    // Lightweight patch: fetches a single month and merges it in without
    // wiping existing data – used when navigating the Calendar grid.
    const patchCalendarMonth = useCallback(async (month: number, year: number) => {
        try {
            const response = await adminCalendarApi.getCalendarEvents(month, year, selectedPlantId);
            if ((response as any).success) {
                setCalendarEvents(prev => mergeCalendarEvents(prev, (response as any).events || []));
            }
        } catch (error: any) {
            console.error('Failed to patch calendar month:', error);
        }
    }, [selectedPlantId]);

    const fetchStatistics = useCallback(async () => {
        try {
            const response = await adminCalendarApi.getServiceStatistics(selectedPlantId);
            if ((response as any).success) setStatistics((response as any).stats);
        } catch (error: any) {
            console.error('Failed to fetch statistics:', error);
        }
    }, [selectedPlantId]);

    const fetchServices = useCallback(async (type: ServiceTab, page = 1) => {
        setServiceLoading(prev => ({ ...prev, [type]: true }));
        try {
            let response: any;
            switch (type) {
                case 'completed':
                    response = await adminCalendarApi.getCompletedServices(selectedPlantId, page, itemsPerPage);
                    if (response.success || response.services) {
                        setCompletedServices(response.services || []);
                        setServiceTotals(prev => ({ ...prev, completed: response.total ?? response.services?.length ?? 0 }));
                        setServicePage(prev => ({ ...prev, completed: page }));
                    }
                    break;
                case 'due':
                    response = await adminCalendarApi.getServicesDue(selectedPlantId, page, itemsPerPage);
                    if (response.success || response.services) {
                        setDueServices(response.services || []);
                        setServiceTotals(prev => ({ ...prev, due: response.total ?? response.services?.length ?? 0 }));
                        setServicePage(prev => ({ ...prev, due: page }));
                    }
                    break;
                case 'lapsed':
                    response = await adminCalendarApi.getLapsedServices(selectedPlantId, page, itemsPerPage);
                    if (response.success || response.services) {
                        setLapsedServices(response.services || []);
                        setServiceTotals(prev => ({ ...prev, lapsed: response.total ?? response.services?.length ?? 0 }));
                        setServicePage(prev => ({ ...prev, lapsed: page }));
                    }
                    break;
                case 'cancelled':
                    response = await adminCalendarApi.getCancelledServices(selectedPlantId, page, itemsPerPage);
                    if (response.success || response.services) {
                        setCancelledServices(response.services || []);
                        setServiceTotals(prev => ({ ...prev, cancelled: response.total ?? response.services?.length ?? 0 }));
                        setServicePage(prev => ({ ...prev, cancelled: page }));
                    }
                    break;
                case 'rejected':
                    response = await adminCalendarApi.getRejectedServices(selectedPlantId, page, itemsPerPage);
                    if (response.success || response.services) {
                        setRejectedServices(response.services || []);
                        setServiceTotals(prev => ({ ...prev, rejected: response.total ?? response.services?.length ?? 0 }));
                        setServicePage(prev => ({ ...prev, rejected: page }));
                    }
                    break;
            }
        } catch (error: any) {
            console.error(`Failed to fetch ${type} services:`, error);
            toast.error(error.response?.data?.message || `Failed to load ${type} services`);
        } finally {
            setServiceLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [selectedPlantId, itemsPerPage]);

    // ─── Effects ───

    // On mount / plant change: fetch the full Gantt range (2 years) so
    // backdated services are included.
    useEffect(() => {
        setServicePage({ completed: 1, due: 1, lapsed: 1, cancelled: 1, rejected: 1 });
        fetchGanttRangeEvents(ganttStart, ganttEnd); fetchStatistics(); fetchServices('due');
    }, [selectedPlantId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Patch in a new month's events when the Calendar grid is navigated.
    useEffect(() => { patchCalendarMonth(calendarMonth, calendarYear); }, [calendarMonth, calendarYear]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { fetchServices(activeTab); }, [activeTab]);
    useEffect(() => {
        setServicePage({ completed: 1, due: 1, lapsed: 1, cancelled: 1, rejected: 1 });
        fetchGanttRangeEvents(ganttStart, ganttEnd); fetchStatistics(); fetchServices(activeTab);
    }, [itemsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (filters.dateRange) {
            const start = new Date(filters.dateRange.start); start.setHours(0, 0, 0, 0);
            const end = new Date(filters.dateRange.end); end.setHours(0, 0, 0, 0);
            setGanttStart(start); setGanttEnd(end);
            fetchGanttRangeEvents(start, end);
        } else {
            const d = new Date(); d.setHours(0, 0, 0, 0);
            const start = new Date(d); start.setFullYear(start.getFullYear() - 1);
            const end = new Date(d); end.setFullYear(end.getFullYear() + 1);
            setGanttStart(start); setGanttEnd(end);
            fetchGanttRangeEvents(start, end);
        }
    }, [filters.dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Gantt range & month handlers ───
    const handleMonthChange = (month: number, year: number) => { setCalendarMonth(month); setCalendarYear(year); };
    const handleGanttRangeChange = (start: Date, end: Date) => {
        setGanttStart(start); setGanttEnd(end);
        const mid = new Date((start.getTime() + end.getTime()) / 2);
        setCalendarMonth(mid.getMonth() + 1); setCalendarYear(mid.getFullYear());
    };

    // ─── Client-side filter data sources ───
    const getPlantId = (plant?: { id?: string; plantId?: string }) => plant?.id || plant?.plantId || '';

    const serviceDataSources = useMemo(() => {
        const calSvcs = calendarEvents.flatMap(e => (e as any).serviceDatas || []);
        return [...calSvcs, ...completedServices, ...dueServices, ...lapsedServices, ...cancelledServices, ...rejectedServices];
    }, [calendarEvents, completedServices, dueServices, lapsedServices, cancelledServices, rejectedServices]);

    const assetOptions = useMemo(() => { const s = new Set<string>(); serviceDataSources.forEach((x: any) => { if (x.asset?.assetId) s.add(x.asset.assetId); }); return Array.from(s).map(v => ({ value: v, label: v })); }, [serviceDataSources]);
    const serviceTypeOptions = useMemo(() => { const s = new Set<string>(); serviceDataSources.forEach((x: any) => { if (x.inspectionType) s.add(x.inspectionType); }); return Array.from(s).map(v => ({ value: v, label: v })); }, [serviceDataSources]);
    const eventTypeOptions = useMemo(() => [{ value: 'service', label: 'Services' }], []);
    const frequencyOptions = useMemo(() => { const s = new Set<string>(); serviceDataSources.forEach((x: any) => { const f = x.frequency?.frequencyName || x.inspectionFrequency?.frequencyName; if (f) s.add(f); }); return Array.from(s).map(v => ({ value: v, label: v })); }, [serviceDataSources]);
    const categoryOptions = useMemo(() => { const m = new Map<string, string>(); serviceDataSources.forEach((x: any) => { const id = x.asset?.category?.id; const n = x.asset?.category?.categoryName || x.asset?.category?.category_name; if (id && n && !m.has(id)) m.set(id, n); }); return Array.from(m.entries()).map(([value, label]) => ({ value, label })); }, [serviceDataSources]);

    const toggleSelection = (value: string, setter: (fn: (prev: string[]) => string[]) => void) =>
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    const clearAllFilters = () => { setSelectedAssets([]); setSelectedServiceTypes([]); setSelectedPlantFilters([]); setSelectedEventTypes([]); setSelectedFrequencies([]); setSelectedCategories([]); };

    const serviceMatchesFilters = useCallback((service: any) => {
        const plantId = getPlantId(service.plant);
        const assetId = service.asset?.assetCode || service.asset?.assetId;
        const freqName = service.frequency?.frequencyName || service.inspectionFrequency?.frequencyName;
        if (selectedEventTypes.length > 0 && !selectedEventTypes.includes('service')) return false;
        if (selectedPlantFilters.length > 0 && (!plantId || !selectedPlantFilters.includes(plantId))) return false;
        if (selectedAssets.length > 0 && (!assetId || !selectedAssets.includes(assetId))) return false;
        if (selectedServiceTypes.length > 0 && (!service.inspectionType || !selectedServiceTypes.includes(service.inspectionType))) return false;
        if (selectedFrequencies.length > 0 && (!freqName || !selectedFrequencies.includes(freqName))) return false;
        if (selectedCategories.length > 0 && (!service.asset?.category?.id || !selectedCategories.includes(service.asset.category.id))) return false;

        // ─── CalendarFilterBar filters ───
        if (filters.categories.length > 0 && (!service.asset?.category?.id || !filters.categories.includes(service.asset.category.id))) return false;
        if (filters.products.length > 0) {
            const prodName = service.asset?.product?.productName || service.asset?.product?.product_name || '';
            if (!prodName || !filters.products.includes(prodName)) return false;
        }
        if (filters.types.length > 0) {
            const variants: any[] = service.asset?.product?.variants || [];
            const productTypes = variants.map((v: any) => v.type).filter(Boolean);
            if (!productTypes.some((t: string) => filters.types.includes(t))) return false;
        }
        if (filters.subTypes.length > 0) {
            const variants: any[] = service.asset?.product?.variants || [];
            const productSubTypes = variants.flatMap((v: any) => v.subType || []).filter(Boolean);
            if (!productSubTypes.some((st: string) => filters.subTypes.includes(st))) return false;
        }
        if (filters.serviceTypes.length > 0) {
            const svcType = service.inspectionType || '';
            const normalizedType = svcType.toLowerCase().includes('maint') ? 'Maintenance' : svcType.toLowerCase().includes('test') ? 'Testing' : 'Inspection';
            if (!filters.serviceTypes.includes(normalizedType)) return false;
        }
        if (filters.frequencies.length > 0) {
            if (!freqName || !filters.frequencies.includes(freqName)) return false;
        }
        if (filters.dateRange) {
            const scheduledDate = service.scheduledDate || service.scheduled_date;
            if (scheduledDate) {
                const d = new Date(scheduledDate);
                const start = new Date(filters.dateRange.start);
                const end = new Date(filters.dateRange.end);
                if (d < start || d > end) return false;
            }
        }
        return true;
    }, [selectedEventTypes, selectedPlantFilters, selectedAssets, selectedServiceTypes, selectedFrequencies, selectedCategories, filters]);

    // Filtered service counts for tabs - use server totals rather than local page length
    const filteredServiceCounts = useMemo(() => ({
        due: serviceTotals.due,
        lapsed: serviceTotals.lapsed,
        completed: serviceTotals.completed,
        cancelled: serviceTotals.cancelled,
        rejected: serviceTotals.rejected,
    }), [serviceTotals, selectedAssets, selectedServiceTypes, selectedFrequencies, selectedCategories, selectedEventTypes]);

    // ─── Render helpers ───
    const renderFilterDropdown = (label: string, options: { value: string; label: string }[], selected: string[], setter: (fn: (prev: string[]) => string[]) => void) => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px] justify-between">
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">{selected.length ? `${selected.length} selected` : 'All'}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{label}</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setter(() => [])}>Clear</Button>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {options.length === 0 && <p className="text-xs text-muted-foreground">No options</p>}
                    {options.map(o => (
                        <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => toggleSelection(o.value, setter)}>
                            <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => toggleSelection(o.value, setter)} className="h-4 w-4" />
                            <span className="truncate">{o.label}</span>
                        </label>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );

    const getEventsForDate = (date: Date) => calendarEvents.find(e => e.date === format(date, 'yyyy-MM-dd'));

    const getSelectedDateEvents = () => {
        const events: any[] = [];
        const dateEvents = getEventsForDate(selectedDate);
        if (!dateEvents) return [];
        (dateEvents as any).serviceDatas?.forEach((s: any) => {
            if (!serviceMatchesFilters(s)) return;
            events.push({ id: s.id, type: 'service', time: format(parseISO(s.scheduledDate), 'HH:mm'), title: s.asset?.assetId || 'N/A', inspectionType: s.inspectionType || 'Inspection', frequency: s.frequency?.frequencyName || s.inspectionFrequency?.frequencyName || 'N/A', location: s.asset?.location, building: s.asset?.building?.buildingName || '', status: s.status, color: 'blue', technicianName: s.technician?.user?.name || s.technician?.name, data: s });
        });
        return events.sort((a, b) => a.time.localeCompare(b.time));
    };

    const selectedDateEventsList = getSelectedDateEvents();

    const handlePrevious = () => {
        if (currentView === 'day') { setSelectedDate(subDays(selectedDate, 1)); }
        else if (currentView === 'week') { setSelectedDate(subWeeks(selectedDate, 1)); }
        else { const d = subMonths(selectedDate, 1); setSelectedDate(d); setCalendarMonth(d.getMonth() + 1); setCalendarYear(d.getFullYear()); }
    };
    const handleNext = () => {
        if (currentView === 'day') { setSelectedDate(addDays(selectedDate, 1)); }
        else if (currentView === 'week') { setSelectedDate(addWeeks(selectedDate, 1)); }
        else { const d = addMonths(selectedDate, 1); setSelectedDate(d); setCalendarMonth(d.getMonth() + 1); setCalendarYear(d.getFullYear()); }
    };

    const getViewTitle = () => {
        if (currentView === 'day') return format(selectedDate, 'EEEE, MMMM d, yyyy');
        if (currentView === 'week') {
            const start = startOfWeek(selectedDate); const end = endOfWeek(selectedDate);
            return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
        }
        return format(selectedDate, 'MMMM yyyy');
    };

    const renderWeekView = () => {
        const weekStart = startOfWeek(selectedDate);
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        return (
            <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                    const ev = getEventsForDate(day);
                    const sc = ((ev as any)?.serviceDatas || []).filter(serviceMatchesFilters).length;
                    const isToday = isSameDay(day, new Date());
                    const isSel = isSameDay(day, selectedDate);
                    return (
                        <div key={day.toISOString()} onClick={() => setSelectedDate(day)} className={`min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50 border-gray-100'} ${isSel ? 'ring-2 ring-orange-400' : ''}`}>
                            <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>{format(day, 'EEE d')}</div>
                            {sc > 0 && <div className="text-[10px] bg-blue-100 text-blue-700 rounded px-1">{sc} service{sc > 1 ? 's' : ''}</div>}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const events = selectedDateEventsList;
        return (
            <div className="space-y-2 min-h-[200px]">
                {events.length === 0 ? (
                    <div className="text-center py-8"><CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No events for {format(selectedDate, 'MMMM d, yyyy')}</p></div>
                ) : events.map(ev => (
                    <div key={ev.id} className={`p-3 rounded-lg border-l-4 ${ev.color === 'blue' ? 'border-blue-400 bg-blue-50' : 'border-orange-400 bg-orange-50'} cursor-pointer hover:shadow-sm`} onClick={() => ev.type === 'service' ? navigate(`/admin/service-submissions/${ev.id}`) : undefined}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm font-semibold">{ev.title}</div>
                                <div className="text-xs text-gray-600">{ev.inspectionType} · {ev.frequency}</div>
                                {ev.technicianName && <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><User className="h-3 w-3" />{ev.technicianName}</div>}
                            </div>
                            <Badge variant="outline" className="text-xs">{ev.time}</Badge>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderServiceTable = (services: ServiceSubmission[], type: ServiceTab) => {
        const filtered = services.filter(serviceMatchesFilters);
        if (filtered.length === 0) return <div className="text-center py-8"><p className="text-sm text-gray-500">No {type} services found</p></div>;
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Submission #</TableHead>
                        <TableHead>Plant</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Status</TableHead>
                        {type === 'cancelled' && <TableHead>Reason</TableHead>}
                        {type === 'rejected' && <TableHead>Remarks</TableHead>}
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map((service: any) => (
                        <TableRow key={service.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/admin/service-submissions/${service.id}`)}>
                            <TableCell className="font-medium">{service.submissionNumber || 'N/A'}</TableCell>
                            <TableCell><div className="font-medium">{service.plant?.plantName}</div><div className="text-sm text-gray-500">{service.plant?.plantId}</div></TableCell>
                            <TableCell><div className="font-medium">{service.asset?.assetCode || service.asset?.assetId}</div><div className="text-sm text-gray-500">{service.asset?.location}</div></TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{service.inspectionType || 'N/A'}</Badge></TableCell>
                            <TableCell className="text-sm">{service.frequency?.frequencyName || service.inspectionFrequency?.frequencyName || 'N/A'}</TableCell>
                            <TableCell className="text-sm">{service.scheduledDate ? format(parseISO(service.scheduledDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                            <TableCell><Badge variant={service.status === 'COMPLETED' ? 'default' : service.status === 'REJECTED' ? 'destructive' : service.status === 'PENDING' ? 'secondary' : 'outline'}>{service.status}</Badge></TableCell>
                            {type === 'cancelled' && <TableCell className="text-sm text-gray-500 max-w-xs truncate">{service.cancelledReason || 'N/A'}</TableCell>}
                            {type === 'rejected' && <TableCell className="text-sm text-red-600 max-w-xs truncate">{service.approvalRemarks || 'N/A'}</TableCell>}
                            <TableCell onClick={e => e.stopPropagation()}>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/service-submissions/${service.id}`)}><Eye className="h-3.5 w-3.5 mr-1.5" />View</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    const renderPagination = (type: ServiceTab) => {
        const page = servicePage[type];
        const total = serviceTotals[type] || 0;
        const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
        let currentServices: any[] = [];
        switch (type) { case 'due': currentServices = dueServices; break; case 'lapsed': currentServices = lapsedServices; break; case 'completed': currentServices = completedServices; break; case 'cancelled': currentServices = cancelledServices; break; case 'rejected': currentServices = rejectedServices; break; }
        const visibleCount = currentServices.length;
        if (total <= 0 && visibleCount === 0) return null;
        const startIndex = (page - 1) * itemsPerPage;
        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-1.5 bg-white border-t mt-4 rounded-md">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="hidden md:block">Showing <span className="text-gray-700 font-semibold">{visibleCount > 0 ? startIndex + 1 : 0}</span> to <span className="text-gray-700 font-semibold">{startIndex + visibleCount}</span> of <span className="text-gray-700 font-semibold">{total}</span></div>
                    <div className="flex items-center gap-2 border-l pl-4">
                        <span className="hidden lg:inline text-[10px] uppercase font-bold tracking-wider text-gray-400">Rows/page</span>
                        <Select value={String(itemsPerPage)} onValueChange={v => setItemsPerPage(Number(v))}>
                            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchServices(type, 1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchServices(type, Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i; return pg <= totalPages ? <Button key={pg} variant={page === pg ? 'default' : 'ghost'} size="sm" onClick={() => fetchServices(type, pg)} className={`h-8 w-8 text-xs ${page === pg ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}>{pg}</Button> : null; })}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchServices(type, Math.min(totalPages, page + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchServices(type, totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
            </div>
        );
    };

    const renderCompletedTable = () => {
        const filtered = completedServices.filter(serviceMatchesFilters);
        if (filtered.length === 0) return <div className="text-center py-8"><p className="text-sm text-gray-500">No completed services found</p></div>;
        return (
            <Table>
                <TableHeader><TableRow><TableHead>Submission #</TableHead><TableHead>Plant</TableHead><TableHead>Asset</TableHead><TableHead>Service Type</TableHead><TableHead>Scheduled Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {filtered.map((service: any) => (
                        <TableRow key={service.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/admin/service-submissions/${service.id}`)}>
                            <TableCell className="font-medium">{service.submissionNumber || 'N/A'}</TableCell>
                            <TableCell><div className="font-medium">{service.plant?.plantName}</div><div className="text-sm text-gray-500">{service.plant?.plantId}</div></TableCell>
                            <TableCell><div className="font-medium">{service.asset?.assetCode || service.asset?.assetId}</div><div className="text-sm text-gray-500">{service.asset?.location}</div></TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{service.inspectionType || 'N/A'}</Badge></TableCell>
                            <TableCell className="text-sm">{service.scheduledDate ? format(parseISO(service.scheduledDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                            <TableCell><Badge variant="default">{service.status}</Badge></TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/service-submissions/${service.id}`)}><Eye className="h-3.5 w-3.5 mr-1.5" />View</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <div className="flex flex-col gap-3 overflow-hidden min-w-0">
            {/* ─── Header ─── */}
            <Card className="border-gray-200 shadow-sm rounded-lg bg-white overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-orange-500 rounded-full" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-semibold text-gray-900">Calendar</h1>
                                    {statistics && (
                                        <Badge variant="secondary" className="font-normal text-xs bg-orange-50 text-orange-700">
                                            {(statistics.services?.completed || 0) + (statistics.services?.due || 0) + (statistics.services?.lapsed || 0)} Services
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-500">Service schedule overview across all plants</p>
                            </div>
                        </div>

                        {/* Stats */}
                        {statistics && (
                            <div className="flex items-center gap-4 text-sm">
                                <StatBadge icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />} label="Completed" value={statistics.services?.completed || 0} color="green" />
                                <div className="w-px h-4 bg-gray-200" />
                                <StatBadge icon={<Clock className="h-3.5 w-3.5 text-orange-500" />} label="Due" value={statistics.services?.due || 0} color="orange" />
                                <div className="w-px h-4 bg-gray-200" />
                                <StatBadge icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />} label="Lapsed" value={statistics.services?.lapsed || 0} color="red" />
                            </div>
                        )}

                        {/* View Toggle */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                            <button className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${viewMode === 'gantt' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} onClick={() => setViewMode('gantt')}>
                                <BarChart3 className="h-3 w-3" />Gantt
                            </button>
                            <button className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${viewMode === 'calendar' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} onClick={() => setViewMode('calendar')}>
                                <CalendarIcon className="h-3 w-3" />Calendar
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Filters ─── */}
            <CalendarFilterBar
                filters={filters}
                onFiltersChange={setFilters}
                services={calendarServices}
            />

            {/* ─── Main View ─── */}
            {viewMode === 'gantt' ? (
                <div className="relative">
                    <GanttChart
                        assetGroups={assetGroups}
                        rangeStart={ganttStart}
                        rangeEnd={ganttEnd}
                        onRangeChange={handleGanttRangeChange}
                    />
                    {ganttLoading && (
                        <div className="absolute top-1 right-2 flex items-center gap-1.5 bg-white/90 border border-gray-200 rounded-md px-2 py-1 shadow-sm z-30">
                            <div className="h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] text-gray-500 font-medium">Loading data…</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left panel: selected-date events */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-sm">{format(selectedDate, 'MMM dd, yyyy')}</h3>
                                    <Badge variant="secondary">{selectedDateEventsList.length} events</Badge>
                                </div>
                                {selectedDateEventsList.length === 0 ? (
                                    <div className="text-center py-6"><CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" /><p className="text-xs text-gray-500">No events</p></div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {selectedDateEventsList.map(ev => (
                                            <div key={ev.id} className={`p-2 rounded border-l-4 ${ev.color === 'blue' ? 'border-blue-400 bg-blue-50' : 'border-orange-400 bg-orange-50'} cursor-pointer hover:shadow-sm`} onClick={() => ev.type === 'service' ? navigate(`/admin/service-submissions/${ev.id}`) : undefined}>
                                                <div className="flex items-start justify-between">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-semibold truncate">{ev.title}</div>
                                                        <div className="text-xs text-gray-600 truncate">{ev.inspectionType}</div>
                                                        {ev.technicianName && <div className="text-xs text-gray-500 truncate flex items-center gap-1"><User className="h-3 w-3" />{ev.technicianName}</div>}
                                                    </div>
                                                    <Badge variant="outline" className="text-xs ml-1 shrink-0">{ev.time}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    {/* Right panel: calendar grid */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-4">
                                {/* View controls */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious}><ChevronLeft className="h-4 w-4" /></Button>
                                        <h2 className="text-base font-semibold min-w-[180px] text-center">{getViewTitle()}</h2>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="flex bg-gray-100 rounded-md p-0.5 gap-0.5">
                                        {(['month', 'week', 'day'] as CalendarView[]).map(v => (
                                            <button key={v} onClick={() => setCurrentView(v)} className={`px-3 py-1 text-xs rounded capitalize transition-colors ${currentView === v ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>{v}</button>
                                        ))}
                                    </div>
                                </div>
                                {/* Calendar body */}
                                {currentView === 'month' && (() => {
                                    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                                    const startPad = firstDay.getDay();
                                    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                                    const cells: (Date | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1))];
                                    while (cells.length % 7 !== 0) cells.push(null);
                                    return (
                                        <div>
                                            <div className="grid grid-cols-7 gap-1 mb-2">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>)}</div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {cells.map((day, idx) => {
                                                    if (!day) return <div key={idx} className="h-16" />;
                                                    const ev = getEventsForDate(day);
                                                    const sc = ((ev as any)?.serviceDatas || []).filter(serviceMatchesFilters).length;
                                                    const isToday = isSameDay(day, new Date());
                                                    const isSel = isSameDay(day, selectedDate);
                                                    return (
                                                        <div key={idx} onClick={() => setSelectedDate(day)} className={`h-16 p-1 rounded-lg border cursor-pointer transition-all ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50 border-gray-100'} ${isSel ? 'ring-2 ring-orange-400' : ''}`}>
                                                            <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day.getDate()}</div>
                                                            {sc > 0 && <div className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 truncate">{sc}s</div>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                                {currentView === 'week' && renderWeekView()}
                                {currentView === 'day' && renderDayView()}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ─── Service Management Tabs ─── */}
            <Card className="mt-2">
                <CardContent className="p-0">
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ServiceTab)}>
                        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
                            <TabsList className="h-9 p-1 gap-1 w-full">
                                <TabsTrigger value="due" className="flex-1 text-xs h-7 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                                    <Clock className="h-3 w-3 mr-1" />Due
                                    {filteredServiceCounts.due > 0 && <Badge className="ml-1 h-4 min-w-4 text-[10px] px-1 bg-orange-100 text-orange-700">{filteredServiceCounts.due}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="completed" className="flex-1 text-xs h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                    <CheckCircle className="h-3 w-3 mr-1" />Completed
                                    {filteredServiceCounts.completed > 0 && <Badge className="ml-1 h-4 min-w-4 text-[10px] px-1 bg-green-100 text-green-700">{filteredServiceCounts.completed}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="lapsed" className="flex-1 text-xs h-7 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                                    <AlertTriangle className="h-3 w-3 mr-1" />Lapsed
                                    {filteredServiceCounts.lapsed > 0 && <Badge className="ml-1 h-4 min-w-4 text-[10px] px-1 bg-red-100 text-red-700">{filteredServiceCounts.lapsed}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="cancelled" className="flex-1 text-xs h-7 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
                                    <XCircle className="h-3 w-3 mr-1" />Cancelled
                                    {filteredServiceCounts.cancelled > 0 && <Badge className="ml-1 h-4 min-w-4 text-[10px] px-1">{filteredServiceCounts.cancelled}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="rejected" className="flex-1 text-xs h-7 data-[state=active]:bg-red-800 data-[state=active]:text-white">
                                    <XCircle className="h-3 w-3 mr-1" />Rejected
                                    {filteredServiceCounts.rejected > 0 && <Badge className="ml-1 h-4 min-w-4 text-[10px] px-1">{filteredServiceCounts.rejected}</Badge>}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="p-4">
                            <TabsContent value="due" className="mt-0">
                                {serviceLoading.due ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(dueServices, 'due')}{renderPagination('due')}</>}
                            </TabsContent>
                            <TabsContent value="completed" className="mt-0">
                                {serviceLoading.completed ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderCompletedTable()}{renderPagination('completed')}</>}
                            </TabsContent>
                            <TabsContent value="lapsed" className="mt-0">
                                {serviceLoading.lapsed ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(lapsedServices, 'lapsed')}{renderPagination('lapsed')}</>}
                            </TabsContent>
                            <TabsContent value="cancelled" className="mt-0">
                                {serviceLoading.cancelled ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(cancelledServices, 'cancelled')}{renderPagination('cancelled')}</>}
                            </TabsContent>
                            <TabsContent value="rejected" className="mt-0">
                                {serviceLoading.rejected ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(rejectedServices, 'rejected')}{renderPagination('rejected')}</>}
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

// ─── Helper Components ───

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-gray-500">{label}:</span>
            <span className={`font-semibold text-${color}-600`}>{value}</span>
        </div>
    );
}

export default AdminCalendar;