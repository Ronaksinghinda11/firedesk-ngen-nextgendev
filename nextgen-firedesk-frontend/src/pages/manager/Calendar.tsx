/**
 * Manager Calendar Page
 * Dual-view: Gantt timeline + inline Calendar grid (toggle)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3, CalendarIcon, Clock, CheckCircle2, AlertTriangle, UserPlus, Users,
  XCircle, AlertCircle, Eye, FileCheck, CheckCircle, Package, Building, MapPin,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User,
} from 'lucide-react';
import {
  format, parseISO, addMonths, subMonths, addDays, subDays,
  startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay,
} from 'date-fns';
import { toast } from 'sonner';

import { calendarApi, type ServiceSubmission, type CalendarEvent, type ServiceStatistics } from '@/services/api/calendarApi';
import { ticketApi } from '@/services/api/ticketApi';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { TechnicianAssignmentDialog } from '@/components/manager/TechnicianAssignmentDialog';
import { useEntityPermissions } from '@/components/generic/hooks/useEntityPermissions';
import { Entity } from '@/types/permissions';
import { CalendarFilterBar, type CalendarFilters, EMPTY_FILTERS } from '@/components/calendar/CalendarFilterBar';
import { GanttChart } from '@/components/calendar/GanttChart';
import { type CalendarServiceItem, normalizeAPIService, getAssetGroups } from '@/lib/calendarDataUtils';

type ViewMode = 'gantt' | 'calendar';
type CalendarView = 'day' | 'week' | 'month';
type ServiceTab = 'completed' | 'due' | 'lapsed' | 'cancelled' | 'rejected';

const PAGE_SIZE = 10;

const ManagerCalendar = () => {
  const navigate = useNavigate();
  const { canRead, canUpdate } = useEntityPermissions({
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
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [ganttEnd, setGanttEnd] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // ─── Filters ───
  const [filters, setFilters] = useState<CalendarFilters>({ ...EMPTY_FILTERS });

  // ─── Data ───
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [statistics, setStatistics] = useState<ServiceStatistics | null>(null);

  // ─── Old-style per-tab service arrays ───
  const [completedServices, setCompletedServices] = useState<ServiceSubmission[]>([]);
  const [dueServices, setDueServices] = useState<ServiceSubmission[]>([]);
  const [lapsedServices, setLapsedServices] = useState<ServiceSubmission[]>([]);
  const [cancelledServices, setCancelledServices] = useState<ServiceSubmission[]>([]);
  const [rejectedServices, setRejectedServices] = useState<ServiceSubmission[]>([]);
  const [waitingTickets, setWaitingTickets] = useState<any[]>([]);
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
  // ─── Manager Dialogs ───
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedServiceForAssignment, setSelectedServiceForAssignment] = useState<ServiceSubmission | null>(null);
  const [isAssigningWeekly, setIsAssigningWeekly] = useState(false);
  // ─── Ticket Dialogs ───
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketDetailsDialog, setShowTicketDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Derived: Calendar services ───
  const calendarServices = useMemo<CalendarServiceItem[]>(() => {
    const services: CalendarServiceItem[] = [];
    calendarEvents.forEach((event: any) => {
      if (event.serviceDatas) {
        event.serviceDatas.forEach((s: any) => {
          services.push(normalizeAPIService(s));
        });
      }
    });
    return services;
  }, [calendarEvents]);


  // ─── Filtered services ───
  const filteredServices = useMemo(() => {
    return calendarServices.filter((s) => {
      // Exclude cancelled services from Gantt/Calendar views
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
  const fetchCalendarEvents = useCallback(async () => {
    try {
      const response = await calendarApi.getCalendarEvents(calendarMonth, calendarYear, selectedPlantId);
      if ((response as any).success) {
        setCalendarEvents((response as any).events);
      }
    } catch (error: any) {
      console.error('Failed to fetch calendar events:', error);
      toast.error(error.response?.data?.message || 'Failed to load calendar events');
    }
  }, [calendarMonth, calendarYear, selectedPlantId]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await calendarApi.getServiceStatistics(selectedPlantId);
      if ((response as any).success) {
        setStatistics((response as any).stats);
      }
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
          response = await calendarApi.getCompletedServices(selectedPlantId, page, itemsPerPage);
          if (response.success || response.services) {
            setCompletedServices(response.services || []);
            setServiceTotals(prev => ({ ...prev, completed: response.total ?? response.services?.length ?? 0 }));
            setServicePage(prev => ({ ...prev, completed: page }));
          }
          try {
            const [waiting, completed] = await Promise.all([
              ticketApi.getAll(selectedPlantId, 'Waiting for approval'),
              ticketApi.getAll(selectedPlantId, 'Completed'),
            ]);
            setWaitingTickets([...(waiting || []), ...(completed || [])]);
          } catch { /* tickets optional */ }
          break;
        case 'due':
          response = await calendarApi.getServicesDue(selectedPlantId, page, itemsPerPage);
          if (response.success || response.services) {
            setDueServices(response.services || []);
            setServiceTotals(prev => ({ ...prev, due: response.total ?? response.services?.length ?? 0 }));
            setServicePage(prev => ({ ...prev, due: page }));
          }
          break;
        case 'lapsed':
          response = await calendarApi.getLapsedServices(selectedPlantId, page, itemsPerPage);
          if (response.success || response.services) {
            setLapsedServices(response.services || []);
            setServiceTotals(prev => ({ ...prev, lapsed: response.total ?? response.services?.length ?? 0 }));
            setServicePage(prev => ({ ...prev, lapsed: page }));
          }
          break;
        case 'cancelled':
          response = await calendarApi.getCancelledServices(selectedPlantId, page, itemsPerPage);
          if (response.success || response.services) {
            setCancelledServices(response.services || []);
            setServiceTotals(prev => ({ ...prev, cancelled: response.total ?? response.services?.length ?? 0 }));
            setServicePage(prev => ({ ...prev, cancelled: page }));
          }
          break;
        case 'rejected':
          response = await calendarApi.getRejectedServices(selectedPlantId, page, itemsPerPage);
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
  useEffect(() => {
    setServicePage({ completed: 1, due: 1, lapsed: 1, cancelled: 1, rejected: 1 });
    fetchCalendarEvents();
    fetchStatistics();
    fetchServices('due');
  }, [selectedPlantId]);

  useEffect(() => { fetchCalendarEvents(); }, [calendarMonth, calendarYear]);

  useEffect(() => { fetchServices(activeTab); }, [activeTab]);

  useEffect(() => {
    setServicePage({ completed: 1, due: 1, lapsed: 1, cancelled: 1, rejected: 1 });
    fetchCalendarEvents(); fetchStatistics(); fetchServices(activeTab);
  }, [itemsPerPage]);

  // Sync date range filter → Gantt range
  useEffect(() => {
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start); start.setHours(0, 0, 0, 0);
      const end = new Date(filters.dateRange.end); end.setHours(0, 0, 0, 0);
      setGanttStart(start); setGanttEnd(end);
    } else {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      const start = new Date(d); start.setFullYear(start.getFullYear() - 1);
      const end = new Date(d); end.setFullYear(end.getFullYear() + 1);
      setGanttStart(start); setGanttEnd(end);
    }
  }, [filters.dateRange]);

  // ─── Gantt range & month handlers (kept for Gantt) ───
  const handleMonthChange = (month: number, year: number) => { setCalendarMonth(month); setCalendarYear(year); };
  const handleGanttRangeChange = (start: Date, end: Date) => {
    setGanttStart(start); setGanttEnd(end);
    const mid = new Date((start.getTime() + end.getTime()) / 2);
    setCalendarMonth(mid.getMonth() + 1); setCalendarYear(mid.getFullYear());
  };

  // ─── Assign weekly ───
  const handleAssignWeekly = async () => {
    setIsAssigningWeekly(true);
    try {
      const result = await calendarApi.assignTechniciansForWeek();
      const data = result as any;
      toast.success(data.message || `${data.assigned || 0} technicians assigned`, { description: `Assigned: ${data.assigned}, Failed: ${data.failed}` });
      fetchCalendarEvents(); fetchServices('due'); fetchServices('lapsed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign technicians');
    } finally { setIsAssigningWeekly(false); }
  };

  // ─── Client-side filter data sources ───
  const getPlantId = (plant?: { id?: string; plantId?: string }) => plant?.id || plant?.plantId || '';

  const serviceDataSources = useMemo(() => {
    const calSvcs = calendarEvents.flatMap(e => (e as any).serviceDatas || []);
    return [...calSvcs, ...completedServices, ...dueServices, ...lapsedServices, ...cancelledServices, ...rejectedServices];
  }, [calendarEvents, completedServices, dueServices, lapsedServices, cancelledServices, rejectedServices]);

  const assetOptions = useMemo(() => { const s = new Set<string>(); serviceDataSources.forEach((x: any) => { if (x.asset?.assetId) s.add(x.asset.assetId); }); return Array.from(s).map(v => ({ value: v, label: v })); }, [serviceDataSources]);
  const serviceTypeOptions = useMemo(() => { const s = new Set<string>(); serviceDataSources.forEach((x: any) => { if (x.inspectionType) s.add(x.inspectionType); }); return Array.from(s).map(v => ({ value: v, label: v })); }, [serviceDataSources]);
  const eventTypeOptions = useMemo(() => [{ value: 'service', label: 'Services' }, { value: 'ticket', label: 'Tickets' }], []);
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

  const ticketMatchesFilters = useCallback((ticket: any) => {
    const plantId = getPlantId(ticket.plant);
    if (selectedEventTypes.length > 0 && !selectedEventTypes.includes('ticket')) return false;
    if (selectedPlantFilters.length > 0 && (!plantId || !selectedPlantFilters.includes(plantId))) return false;
    return true;
  }, [selectedEventTypes, selectedPlantFilters]);

  // Filtered service counts for tabs - use server totals rather than local page length
  const filteredServiceCounts = useMemo(() => ({
    due: serviceTotals.due,
    lapsed: serviceTotals.lapsed,
    completed: serviceTotals.completed,
    cancelled: serviceTotals.cancelled,
    rejected: serviceTotals.rejected,
    completedWithTickets: serviceTotals.completed + waitingTickets.filter(ticketMatchesFilters).length,
  }), [serviceTotals, waitingTickets, selectedAssets, selectedServiceTypes, selectedFrequencies, selectedCategories, selectedEventTypes, selectedPlantFilters]);

  // ─── Ticket actions ───
  const handleApproveTicket = async () => {
    if (!selectedTicket) return;
    try {
      setIsSubmitting(true);
      await ticketApi.approve(selectedTicket.id, approveComment || undefined);
      toast.success('Ticket approved successfully');
      setShowApproveDialog(false); setApproveComment(''); setSelectedTicket(null);
      fetchServices('completed'); fetchCalendarEvents();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to approve ticket'); }
    finally { setIsSubmitting(false); }
  };

  const handleRejectTicket = async () => {
    if (!selectedTicket || !rejectComment.trim()) { toast.error('Please provide a reason for rejection'); return; }
    try {
      setIsSubmitting(true);
      await ticketApi.reject(selectedTicket.id, rejectComment);
      toast.success('Ticket rejected');
      setShowRejectDialog(false); setRejectComment(''); setSelectedTicket(null);
      fetchServices('completed'); fetchCalendarEvents();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to reject ticket'); }
    finally { setIsSubmitting(false); }
  };

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
    (dateEvents as any).tickets?.forEach((t: any) => {
      if (!ticketMatchesFilters(t)) return;
      events.push({ id: t.id, type: 'ticket', time: format(parseISO(t.targetDate || t.createdAt), 'HH:mm'), title: t.ticketId || 'N/A', inspectionType: t.taskName || 'Task', frequency: t.completedStatus || 'Pending', location: t.asset?.location, building: '', status: t.completedStatus, color: 'orange', data: t });
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
    if (currentView === 'day') return format(selectedDate, 'MMMM dd, yyyy');
    if (currentView === 'week') return `${format(startOfWeek(selectedDate), 'MMM dd')} - ${format(endOfWeek(selectedDate), 'MMM dd, yyyy')}`;
    return format(selectedDate, 'MMMM yyyy');
  };

  const renderDayView = () => {
    const ev = getEventsForDate(selectedDate);
    const svcs = ((ev as any)?.serviceDatas || []).filter(serviceMatchesFilters);
    const tkts = ((ev as any)?.tickets || []).filter(ticketMatchesFilters);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div><h3 className="text-2xl font-bold">{format(selectedDate, 'EEEE')}</h3><p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM dd, yyyy')}</p></div>
          <div className="text-right"><div className="text-3xl font-bold text-primary">{svcs.length + tkts.length}</div><div className="text-sm text-muted-foreground">Total Events</div></div>
        </div>
        {svcs.length > 0 && (<div className="space-y-2"><h4 className="font-semibold text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" />Services ({svcs.length})</h4><div className="grid gap-3">{svcs.map((s: any) => (<div key={s.id} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/manager/service-form-view/${s.id}`)}><div className="flex items-start justify-between mb-2"><div><div className="flex items-center gap-2 mb-1"><Badge variant="outline" className="text-xs">{format(parseISO(s.scheduledDate), 'HH:mm')}</Badge><span className="font-semibold">{s.asset?.assetId}</span></div><div className="text-sm text-primary font-medium">{s.inspectionType || 'Inspection'}</div><div className="text-sm text-muted-foreground">{s.frequency?.frequencyName || s.inspectionFrequency?.frequencyName} • {s.asset?.building?.buildingName || ''} - {s.asset?.location}</div></div><Badge variant={s.status === 'COMPLETED' ? 'default' : s.status === 'REJECTED' ? 'destructive' : s.status === 'SUBMITTED' ? 'outline' : 'secondary'}>{s.status}</Badge></div></div>))}</div></div>)}
        {tkts.length > 0 && (<div className="space-y-2"><h4 className="font-semibold text-lg flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-600" />Tickets ({tkts.length})</h4><div className="grid gap-3">{tkts.map((t: any) => (<div key={t.id} className="p-4 border rounded-lg bg-orange-50 hover:shadow-md transition-shadow"><div className="flex items-start justify-between"><div><div className="font-semibold mb-1">{t.ticketId}</div><div className="text-sm mb-1">{t.taskName}</div><div className="text-xs text-muted-foreground">{t.asset?.assetId} • {t.asset?.location}</div></div><Badge variant="outline">{t.completedStatus}</Badge></div></div>))}</div></div>)}
        {svcs.length === 0 && tkts.length === 0 && (<div className="text-center py-12"><CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Events Scheduled</h3><p className="text-sm text-muted-foreground">No services or tickets on {format(selectedDate, 'MMMM dd, yyyy')}</p></div>)}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const ev = getEventsForDate(day);
            const sc = ((ev as any)?.serviceDatas || []).filter(serviceMatchesFilters).length;
            const tc = ((ev as any)?.tickets || []).filter(ticketMatchesFilters).length;
            const isToday = isSameDay(day, new Date()); const isSel = isSameDay(day, selectedDate);
            return (<div key={idx} onClick={() => setSelectedDate(day)} className={`p-3 rounded-lg border cursor-pointer transition-all ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'} ${isSel ? 'ring-2 ring-primary' : ''}`}><div className="text-center mb-2"><div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div><div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</div></div>{(sc > 0 || tc > 0) && <div className="text-center space-y-0.5">{sc > 0 && <div className="text-xs font-medium text-blue-600">{sc} Service{sc !== 1 ? 's' : ''}</div>}{tc > 0 && <div className="text-xs font-medium text-orange-600">{tc} Ticket{tc !== 1 ? 's' : ''}</div>}</div>}</div>);
          })}
        </div>
        <div className="border-t pt-4"><h4 className="font-semibold text-lg mb-4">{format(selectedDate, 'EEEE, MMMM dd, yyyy')}</h4>{renderDayView()}</div>
      </div>
    );
  };

  const renderServiceTable = (services: ServiceSubmission[], type: string) => {
    const filtered = services.filter(serviceMatchesFilters);
    if (filtered.length === 0) return <div className="text-center py-8"><p className="text-sm text-gray-500">{selectedAssets.length || selectedServiceTypes.length || selectedPlantFilters.length ? 'No services match the selected filters' : `No ${type} services found`}</p></div>;
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Service #</TableHead><TableHead>Plant</TableHead><TableHead>Asset</TableHead><TableHead>Inspection Type</TableHead><TableHead>Frequency</TableHead><TableHead>Assigned Technicians</TableHead><TableHead>Completed By</TableHead><TableHead>Scheduled Date</TableHead><TableHead>Status</TableHead>{type === 'cancelled' && <TableHead>Reason</TableHead>}{type === 'rejected' && <TableHead>Rejection Remarks</TableHead>}<TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {filtered.map((service: any) => (
            <TableRow key={service.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/manager/service-form-view/${service.id}`)}>
              <TableCell className="font-medium">{service.submissionNumber}</TableCell>
              <TableCell><div className="font-medium">{service.plant?.plantName}</div><div className="text-sm text-gray-500">{service.plant?.plantId}</div></TableCell>
              <TableCell><div className="font-medium">{service.asset?.assetCode || service.asset?.assetId}</div><div className="text-sm text-gray-500">{service.asset?.building?.buildingName || ''} - {service.asset?.location}</div></TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{service.inspectionType || 'N/A'}</Badge></TableCell>
              <TableCell>{service.frequency?.frequencyName}</TableCell>
              <TableCell>
                {service.assignedTechnicians?.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">{service.assignedTechnicians.slice(0, 3).map((t: any, i: number) => (<span key={t.id || i} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border-2 border-white" title={t.name}>{t.name?.charAt(0).toUpperCase() || '?'}</span>))}</div>
                    <span className="text-sm text-gray-600">{service.assignedTechnicians.length} assigned</span>
                  </div>
                ) : <span className="text-sm text-gray-400 italic">Not assigned</span>}
              </TableCell>
              <TableCell>
                {service.submitter?.user?.name || service.submitter?.name ? (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                      {(service.submitter?.user?.name || service.submitter?.name)?.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm">{service.submitter?.user?.name || service.submitter?.name}</span>
                  </div>
                ) : <span className="text-sm text-gray-400 italic">Not completed</span>}
              </TableCell>
              <TableCell>{format(parseISO(service.scheduledDate), 'MMM dd, yyyy')}</TableCell>
              <TableCell><Badge variant={service.status === 'COMPLETED' ? 'default' : service.status === 'REJECTED' ? 'destructive' : service.status === 'PENDING' ? 'secondary' : 'outline'}>{service.status}</Badge></TableCell>
              {type === 'cancelled' && <TableCell className="text-sm text-gray-500 max-w-xs truncate">{service.cancelledReason || 'N/A'}</TableCell>}
              {type === 'rejected' && <TableCell className="text-sm text-red-600 max-w-xs truncate">{service.approvalRemarks || 'N/A'}</TableCell>}
              <TableCell onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/manager/service-form-view/${service.id}`)}><Eye className="h-3.5 w-3.5 mr-1.5" />View</Button>
                {canUpdate && ['pending', 'draft', 'in_progress'].includes(service.status?.toLowerCase()) && (
                  <Button size="sm" variant="outline" className="ml-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={e => { e.stopPropagation(); setSelectedServiceForAssignment(service); setAssignmentDialogOpen(true); }}><UserPlus className="h-3.5 w-3.5 mr-1.5" />{service.assignedTechnicians?.length > 0 ? 'Add Tech' : 'Assign'}</Button>
                )}
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
    const combined = [
      ...completedServices.filter(serviceMatchesFilters).map((s: any) => ({ ...s, itemType: 'service' })),
      ...waitingTickets.filter(ticketMatchesFilters).map((t: any) => ({ ...t, itemType: 'ticket' })),
    ];
    if (combined.length === 0) return <div className="text-center py-8"><p className="text-sm text-gray-500">No completed services or tickets found</p></div>;
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Service #</TableHead><TableHead>Plant</TableHead><TableHead>Asset</TableHead><TableHead>Inspection Type</TableHead><TableHead>Completed By</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {combined.map((item: any) => (
            <TableRow key={`${item.itemType}-${item.id}`} className="cursor-pointer hover:bg-gray-50" onClick={() => { if (item.itemType === 'service') { navigate(`/manager/service-form-view/${item.id}`); } else { setSelectedTicket(item); setShowTicketDetailsDialog(true); } }}>
              <TableCell><Badge variant={item.itemType === 'service' ? 'default' : 'secondary'}>{item.itemType === 'service' ? 'Service' : 'Ticket'}</Badge></TableCell>
              <TableCell className="font-medium">{item.itemType === 'service' ? item.submissionNumber : item.ticketId}</TableCell>
              <TableCell><div className="font-medium">{item.plant?.plantName}</div><div className="text-sm text-gray-500">{item.plant?.plantId}</div></TableCell>
              <TableCell><div className="font-medium">{item.asset?.assetCode || item.asset?.assetId}</div><div className="text-sm text-gray-500">{item.asset?.location}</div></TableCell>
              <TableCell>{item.itemType === 'service' ? <Badge variant="outline" className="capitalize">{item.inspectionType || 'N/A'}</Badge> : <span className="text-sm">{item.taskName}</span>}</TableCell>
              <TableCell>
                {item.itemType === 'service' && (item.submitter?.user?.name || item.submitter?.name) ? (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                      {(item.submitter?.user?.name || item.submitter?.name)?.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm">{item.submitter?.user?.name || item.submitter?.name}</span>
                  </div>
                ) : <span className="text-sm text-gray-400 italic">N/A</span>}
              </TableCell>
              <TableCell>{format(parseISO(item.scheduledDate || item.targetDate), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'COMPLETED' || item.completedStatus === 'Completed' ? 'default' : item.status === 'SUBMITTED' || item.completedStatus === 'Waiting for approval' ? 'secondary' : 'outline'} className={item.completedStatus === 'Waiting for approval' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}>
                  {item.itemType === 'service' ? item.status : item.completedStatus}
                </Badge>
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                {(item.status === 'SUBMITTED' || item.completedStatus === 'Waiting for approval') && <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { if (item.itemType === 'service') { navigate(`/manager/service-form-view/${item.id}`); } else { setSelectedTicket(item); setShowTicketDetailsDialog(true); } }}><Eye className="h-3.5 w-3.5 mr-1.5" />Review</Button>}
                {(item.status === 'COMPLETED' || item.completedStatus === 'Completed') && <Button size="sm" variant="outline" onClick={() => { if (item.itemType === 'service') { navigate(`/manager/service-form-view/${item.id}`); } else { setSelectedTicket(item); setShowTicketDetailsDialog(true); } }}><Eye className="h-3.5 w-3.5 mr-1.5" />View</Button>}
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
                <p className="text-[11px] text-gray-500">Manage service schedules across your plants</p>
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

            <div className="flex items-center gap-2">
              {/* Assign Weekly Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleAssignWeekly}
                disabled={isAssigningWeekly}
              >
                <Users className="h-3 w-3" />
                {isAssigningWeekly ? 'Assigning...' : 'Assign Weekly'}
              </Button>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                <button
                  className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${viewMode === 'gantt'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  onClick={() => setViewMode('gantt')}
                >
                  <BarChart3 className="h-3 w-3" />
                  Gantt
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${viewMode === 'calendar'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarIcon className="h-3 w-3" />
                  Calendar
                </button>
              </div>
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
        <GanttChart
          assetGroups={assetGroups}
          rangeStart={ganttStart}
          rangeEnd={ganttEnd}
          onRangeChange={handleGanttRangeChange}
        />
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
                      <div key={ev.id} className={`p-2 rounded border-l-4 ${ev.color === 'blue' ? 'border-blue-400 bg-blue-50' : 'border-orange-400 bg-orange-50'} cursor-pointer hover:shadow-sm`} onClick={() => ev.type === 'service' ? navigate(`/manager/service-form-view/${ev.id}`) : undefined}>
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
                          const tc = ((ev as any)?.tickets || []).filter(ticketMatchesFilters).length;
                          const isToday = isSameDay(day, new Date());
                          const isSel = isSameDay(day, selectedDate);
                          return (
                            <div key={idx} onClick={() => setSelectedDate(day)} className={`h-16 p-1 rounded-lg border cursor-pointer transition-all ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50 border-gray-100'} ${isSel ? 'ring-2 ring-orange-400' : ''}`}>
                              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day.getDate()}</div>
                              {sc > 0 && <div className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 truncate mb-0.5">{sc}s</div>}
                              {tc > 0 && <div className="text-[10px] bg-orange-100 text-orange-700 rounded px-1 truncate">{tc}t</div>}
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
                  {filteredServiceCounts.completedWithTickets > 0 && <Badge className="ml-1 h-4 min-w-4 text-[10px] px-1 bg-green-100 text-green-700">{filteredServiceCounts.completedWithTickets}</Badge>}
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
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" />Services Due</h3>
                  <p className="text-xs text-gray-500">Upcoming services scheduled for completion</p>
                </div>
                {serviceLoading.due ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(dueServices, 'due')}{renderPagination('due')}</>}
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" />Completed</h3>
                  <p className="text-xs text-gray-500">Services that have been successfully completed</p>
                </div>
                {serviceLoading.completed ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderCompletedTable()}{renderPagination('completed')}</>}
              </TabsContent>
              <TabsContent value="lapsed" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" />Lapsed</h3>
                  <p className="text-xs text-gray-500">Services that missed their scheduled completion date</p>
                </div>
                {serviceLoading.lapsed ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(lapsedServices, 'lapsed')}{renderPagination('lapsed')}</>}
              </TabsContent>
              <TabsContent value="cancelled" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><XCircle className="h-4 w-4 text-gray-600" />Cancelled</h3>
                  <p className="text-xs text-gray-500">Services that were manually cancelled</p>
                </div>
                {serviceLoading.cancelled ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(cancelledServices, 'cancelled')}{renderPagination('cancelled')}</>}
              </TabsContent>
              <TabsContent value="rejected" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-800" />Rejected</h3>
                  <p className="text-xs text-gray-500">Services that failed approval and require attention</p>
                </div>
                {serviceLoading.rejected ? <div className="text-center py-8 text-sm text-gray-500">Loading...</div> : <>{renderServiceTable(rejectedServices, 'rejected')}{renderPagination('rejected')}</>}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* ─── Technician Assignment Dialog ─── */}
      {selectedServiceForAssignment && (
        <TechnicianAssignmentDialog
          service={selectedServiceForAssignment}
          open={assignmentDialogOpen}
          onOpenChange={(open) => {
            if (!open) { setAssignmentDialogOpen(false); setSelectedServiceForAssignment(null); }
          }}
          onSuccess={() => {
            setAssignmentDialogOpen(false);
            setSelectedServiceForAssignment(null);
            toast.success('Technician assigned successfully');
            fetchServices('due');
          }}
        />
      )}

      {/* ─── Ticket Details Dialog ─── */}
      <Dialog open={showTicketDetailsDialog} onOpenChange={setShowTicketDetailsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
          {selectedTicket && (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Ticket ID:</span> {selectedTicket.ticketId}</div>
              <div><span className="font-medium">Task:</span> {selectedTicket.taskName}</div>
              <div><span className="font-medium">Asset:</span> {selectedTicket.asset?.assetId} – {selectedTicket.asset?.location}</div>
              <div><span className="font-medium">Status:</span> {selectedTicket.completedStatus}</div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTicketDetailsDialog(false)}>Close</Button>
            {selectedTicket?.completedStatus === 'Waiting for approval' && (
              <><Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowTicketDetailsDialog(false); setShowApproveDialog(true); }}>Approve</Button>
                <Button variant="destructive" onClick={() => { setShowTicketDetailsDialog(false); setShowRejectDialog(true); }}>Reject</Button></>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Approve Dialog ─── */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Approve Ticket</DialogTitle><DialogDescription>Optionally add a comment before approving.</DialogDescription></DialogHeader>
          <Textarea placeholder="Comment (optional)..." value={approveComment} onChange={e => setApproveComment(e.target.value)} className="min-h-[80px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveTicket} disabled={isSubmitting}>{isSubmitting ? 'Approving...' : 'Approve'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ─── */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Ticket</DialogTitle><DialogDescription>Please provide a reason for rejection.</DialogDescription></DialogHeader>
          <Textarea placeholder="Reason for rejection (required)..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} className="min-h-[80px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectComment(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectTicket} disabled={isSubmitting || !rejectComment.trim()}>{isSubmitting ? 'Rejecting...' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

export default ManagerCalendar;
