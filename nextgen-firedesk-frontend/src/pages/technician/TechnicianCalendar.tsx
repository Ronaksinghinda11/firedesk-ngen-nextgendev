/**
 * Technician Calendar Page
 * 
 * Displays calendar view with services and tickets assigned to the logged-in technician
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Wrench,
  FileBarChart,
  Calendar as CalendarIconLucide,
  TrendingDown,
  TrendingUp,
  Activity,
  Star,
  AlertTriangle,
  ArrowRight,
  MapPin
} from 'lucide-react';
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay
} from 'date-fns';
import { toast } from 'sonner';
import { technicianCalendarApi, type CalendarDate, type ServiceSubmission, type TicketSubmission, type CalendarStatistics } from '@/services/api/technicianCalendarApi';
import { technicianServicesApi } from '@/services/api/technicianServicesApi';
import { technicianTicketApi } from '@/services/api/technicianTicketApi';
import { PerformanceReportModal } from '@/components/technician/PerformanceReportModal';
import { TechnicianLayout } from '@/components/TechnicianLayout';

const TechnicianCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDate[]>([]);
  const [statistics, setStatistics] = useState<CalendarStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'due' | 'lapsed' | 'done' | null>(null);
  const [filteredServices, setFilteredServices] = useState<(ServiceSubmission | any)[]>([]);
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('');
  const [plantFilter, setPlantFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showPerformanceReportModal, setShowPerformanceReportModal] = useState(false);
  const FILTER_PAGE_SIZE = 10;

  // Fetch calendar events for the current month
  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();

      const data = await technicianCalendarApi.getCalendarEvents(month, year);
      setCalendarData(data);
    } catch (error: any) {
      console.error('Failed to fetch calendar events:', error);
      toast.error(error.response?.data?.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedFilter(null);
    setFilteredServices([]);
    setAssetFilter('');
    setServiceTypeFilter('');
    setPlantFilter('');
    setPage(1);
    setFilterError(null);
  };

  const fetchServicesForFilter = async (filter: 'due' | 'lapsed' | 'done') => {
    const PAGE_SIZE_API = 100;
    const MAX_PAGES = 5;
    const results: (ServiceSubmission | any)[] = [];
    let current = 1;
    let hasMore = true;

    const pageThrough = async (fetcher: (p: number, l: number) => Promise<any>) => {
      while (hasMore && current <= MAX_PAGES) {
        const res = await fetcher(current, PAGE_SIZE_API);
        const data = res?.data || [];
        results.push(...data);
        const pagination = res?.pagination;
        if (pagination) {
          const totalPages = Math.max(1, Math.ceil((pagination.total || data.length) / (pagination.limit || PAGE_SIZE_API)));
          hasMore = current < totalPages;
        } else {
          hasMore = false;
        }
        current += 1;
      }
    };

    switch (filter) {
      case 'due':
        await pageThrough((p, l) => technicianServicesApi.getMyServicesDue(p, l));
        break;
      case 'lapsed':
        // lapsed might not paginate; fetch once
        {
          const res = await technicianServicesApi.getMyLapsedServices(1, PAGE_SIZE_API);
          results.push(...(res?.data || []));
        }
        break;
      case 'done':
        await pageThrough((p, l) => technicianServicesApi.getMyCompletedServices(p, l));
        try {
          const ticketsRes = await technicianTicketApi.getMyTickets();
          const completedTickets = ticketsRes?.data?.tickets?.filter((t: any) => t.completedStatus === 'Completed') || [];
          // Add type property to distinguish
          const typedTickets = completedTickets.map((t: any) => ({ ...t, type: 'ticket' }));
          results.push(...typedTickets);
        } catch (e) {
          console.error('Failed to fetch completed tickets', e);
        }
        break;
      default:
        break;
    }

    return results;
  };

  const handleFilterSelect = async (filter: 'due' | 'lapsed' | 'done') => {
    // toggle off
    if (selectedFilter === filter) {
      clearFilters();
      return;
    }

    setSelectedFilter(filter);
    setFilterLoading(true);
    setFilterError(null);
    setPage(1);

    try {
      const services = await fetchServicesForFilter(filter);
      setFilteredServices(services);
    } catch (err: any) {
      console.error('Failed to fetch filtered services', err);
      setFilteredServices([]);
      setFilterError(err?.response?.data?.message || 'Unable to load services');
    } finally {
      setFilterLoading(false);
    }
  };

  const filteredOptions = (() => {
    const assets = Array.from(new Set(filteredServices.map(s => s.asset?.assetId).filter(Boolean))) as string[];
    const serviceTypes = Array.from(new Set(filteredServices.map(s => s.inspectionType).filter(Boolean))) as string[];
    const plants = Array.from(new Set(filteredServices.map(s => s.asset?.plant?.plantName).filter(Boolean))) as string[];
    return { assets, serviceTypes, plants };
  })();

  const filteredList = filteredServices.filter(s => {
    const assetOk = assetFilter ? s.asset?.assetId === assetFilter : true;
    const typeOk = serviceTypeFilter ? s.inspectionType === serviceTypeFilter : true;
    const plantOk = plantFilter ? s.asset?.plant?.plantName === plantFilter : true;
    return assetOk && typeOk && plantOk;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / FILTER_PAGE_SIZE));
  const pagedFiltered = filteredList.slice((page - 1) * FILTER_PAGE_SIZE, page * FILTER_PAGE_SIZE);

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const data = await technicianCalendarApi.getStatistics();
      setStatistics(data);
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
    fetchStatistics();
  }, [currentMonth]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarDate | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData.find(d => d.date === dateStr);
  };

  // Get events for selected date
  const getSelectedDateEvents = (): { services: ServiceSubmission[]; tickets: TicketSubmission[] } => {
    const events = getEventsForDate(selectedDate);
    return {
      services: events?.serviceDatas || [],
      tickets: events?.tickets || []
    };
  };

  // Navigate months
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDayOfWeek = getDay(monthStart);
    const emptyDays = Array(startDayOfWeek).fill(null);

    return (
      <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                <CalendarIconLucide className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
                className="h-9 w-9 p-0 hover:bg-slate-100 border-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="px-4 font-semibold hover:bg-slate-100 border-slate-300"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                className="h-9 w-9 p-0 hover:bg-slate-100 border-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-3 mb-3">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-3">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square opacity-20" />
            ))}
            {days.map(day => {
              const events = getEventsForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isSameDay(day, new Date());
              const serviceCount = events?.serviceDatas.length || 0;
              const ticketCount = events?.tickets.length || 0;

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative group aspect-square p-2 rounded-xl border-2 transition-all duration-300
                    ${isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-105 z-10'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                    ${isTodayDay && !isSelected ? 'border-orange-200 bg-orange-50/30' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                      {format(day, 'd')}
                    </span>
                    {isTodayDay && (
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    )}
                  </div>

                  <div className="mt-auto flex flex-col gap-1">
                    {serviceCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase">{serviceCount}</span>
                      </div>
                    )}
                    {ticketCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-bold text-rose-700 uppercase">{ticketCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Tooltip-like effect on hover */}
                  {!isSelected && (serviceCount > 0 || ticketCount > 0) && (
                    <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render selected date events
  const renderSelectedDateEvents = () => {
    const { services, tickets } = getSelectedDateEvents();

    return (
      <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm h-full">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50/50 border-b border-slate-200">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-indigo-600" />
            </div>
            {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            {services.length + tickets.length} {services.length + tickets.length === 1 ? 'task' : 'tasks'} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {services.length === 0 && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-slate-100 p-6 rounded-full mb-4">
                <CheckCircle2 className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No tasks scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Services */}
              {services.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" />
                    Services
                  </h3>
                  <div className="space-y-3">
                    {services.map(service => (
                      <div
                        key={service.id}
                        className="group relative p-4 rounded-xl border border-blue-100 bg-blue-50/20 hover:bg-blue-50/40 hover:border-blue-200 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 text-sm">
                              {service.asset.assetId}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 font-medium">
                              {service.form.serviceName}
                            </div>
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <Badge variant="outline" className="text-[10px] bg-white border-blue-200 text-blue-700 py-0.5 px-2">
                                {service.inspectionType}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0.5 px-2 bg-white ${service.status === 'COMPLETED' ? 'border-emerald-200 text-emerald-700' :
                                  service.status === 'IN_PROGRESS' ? 'border-amber-200 text-amber-700' :
                                    'border-slate-200 text-slate-600'
                                  }`}
                              >
                                {service.status}
                              </Badge>
                            </div>
                          </div>
                          <Link to={`/technician/service/${service.id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 group-hover:bg-blue-100">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tickets */}
              {tickets.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Tickets
                  </h3>
                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <Link to={`/technician/tickets/${ticket.id}`} key={ticket.id} className="block group">
                        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 group-hover:bg-rose-50/40 group-hover:border-rose-200 transition-all duration-300">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-bold text-slate-900 text-sm">
                                {ticket.ticketCode}
                              </div>
                              <div className="text-xs text-slate-600 mt-1 font-medium">
                                {ticket.taskName}
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0.5 px-2 bg-white ${ticket.completedStatus === 'Completed'
                                    ? 'border-emerald-200 text-emerald-700'
                                    : 'border-rose-200 text-rose-700'
                                    }`}
                                >
                                  {ticket.completedStatus}
                                </Badge>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 group-hover:bg-rose-100">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <CalendarIconLucide className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">My Calendar</h1>
          </div>
          <p className="text-slate-600 text-base">
            Track and manage all your assigned services and tickets
          </p>
        </div>
        <Button
          onClick={() => setShowPerformanceReportModal(true)}
          className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold py-6 px-6"
        >
          <FileBarChart className="mr-2 h-5 w-5" />
          Performance Report
        </Button>
      </div>

      {/* Performance Report Modal */}
      <PerformanceReportModal
        open={showPerformanceReportModal}
        onOpenChange={setShowPerformanceReportModal}
      />

      {/* Enhanced Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.services.due}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Service Due</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <TrendingDown className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.services.lapsed}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Lapsed</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <Star className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.services.completed}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Completed</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <Activity className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.services.cancelled}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Cancelled</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Wrench className="h-4 w-4 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.services.total}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Total Services</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <AlertTriangle className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.tickets.PENDING}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Tickets Pending</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <Star className="h-4 w-4 text-white/60" />
              </div>
              <div className="text-2xl font-bold">{statistics.tickets.completed}</div>
              <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Tickets Done</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and List in Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Calendar and Filters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Card */}
          {loading ? (
            <div className="flex justify-center items-center h-80 bg-white/50 rounded-2xl border border-slate-200">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : (
            renderCalendarGrid()
          )}

          {/* Filter Card */}
          <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-900">Search & Filter</CardTitle>
              <CardDescription className="text-slate-600 font-medium">Narrow down services by status, asset, or plant</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={selectedFilter === 'due' ? 'default' : 'outline'}
                  onClick={() => handleFilterSelect('due')}
                  className={`rounded-xl font-bold px-6 ${selectedFilter === 'due' ? 'bg-rose-500 hover:bg-rose-600 border-0' : 'border-slate-300'}`}
                >
                  Due
                </Button>
                <Button
                  variant={selectedFilter === 'lapsed' ? 'default' : 'outline'}
                  onClick={() => handleFilterSelect('lapsed')}
                  className={`rounded-xl font-bold px-6 ${selectedFilter === 'lapsed' ? 'bg-orange-500 hover:bg-orange-600 border-0' : 'border-slate-300'}`}
                >
                  Lapsed
                </Button>
                <Button
                  variant={selectedFilter === 'done' ? 'default' : 'outline'}
                  onClick={() => handleFilterSelect('done')}
                  className={`rounded-xl font-bold px-6 ${selectedFilter === 'done' ? 'bg-emerald-500 hover:bg-emerald-600 border-0' : 'border-slate-300'}`}
                >
                  Done
                </Button>
                {selectedFilter && (
                  <Button variant="ghost" onClick={clearFilters} className="text-rose-600 hover:text-rose-700 font-bold">
                    Clear Filters
                  </Button>
                )}
              </div>

              {selectedFilter && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Asset ID</label>
                    <select
                      value={assetFilter}
                      onChange={(e) => { setAssetFilter(e.target.value); setPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">All Assets</option>
                      {filteredOptions.assets.map(assetId => (
                        <option key={assetId} value={assetId}>{assetId}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Service Type</label>
                    <select
                      value={serviceTypeFilter}
                      onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">All Types</option>
                      {filteredOptions.serviceTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  {/* <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Plant Name</label>
                    <select
                      value={plantFilter}
                      onChange={(e) => { setPlantFilter(e.target.value); setPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">All Plants</option>
                      {filteredOptions.plants.map(plant => (
                        <option key={plant} value={plant}>{plant}</option>
                      ))}
                    </select>
                  </div> */}
                </div>
              )}

              {selectedFilter && (
                <div className="pt-4 border-t border-slate-100">
                  {filterLoading ? (
                    <div className="flex items-center gap-3 text-slate-400 font-medium py-4">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500"></div>
                      Loading filtered results...
                    </div>
                  ) : filterError ? (
                    <div className="flex items-center gap-2 text-rose-600 font-medium py-4">
                      <AlertCircle className="h-4 w-4" />
                      {filterError}
                    </div>
                  ) : pagedFiltered.length === 0 ? (
                    <div className="text-slate-500 font-medium py-8 text-center italic">
                      No services found matching your current filters.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pagedFiltered.map((item: any) => {
                          const isTicket = item.type === 'ticket' || item.ticketId;

                          if (isTicket) {
                            return (
                              <Link to={`/technician/tickets/${item.id}`} key={item.id} className="block group">
                                <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 group-hover:bg-rose-50/40 group-hover:border-rose-200 transition-all duration-300">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                                        {item.taskName || 'Ticket'}
                                      </div>
                                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                                        {item.ticketId} • {item.ticketCategory}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-3">
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                        <span className="text-xs text-slate-600 font-medium">{item.asset?.plant?.plantName || 'Plant'}</span>
                                      </div>
                                    </div>
                                    <Badge className="bg-emerald-500 text-white border-0 text-[10px] uppercase font-bold px-2 py-0.5">
                                      {item.completedStatus}
                                    </Badge>
                                  </div>
                                </div>
                              </Link>
                            );
                          }

                          return (
                            <div key={item.id} className="p-4 rounded-xl border border-blue-100 bg-white group hover:shadow-md transition-all duration-300">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                    {item.form?.serviceName || 'Service'}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                                    {item.asset?.assetId} • {item.inspectionType}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-3">
                                    <MapPin className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs text-slate-600 font-medium">{item.asset?.plant?.plantName || 'Plant'}</span>
                                  </div>
                                </div>
                                <Badge variant="outline" className="border-blue-200 text-blue-700 text-[10px] uppercase font-bold">
                                  {item.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50">
                                <CalendarIconLucide className="h-3 w-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  {format(parseISO(item.scheduledDate), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="rounded-xl font-bold border-slate-200"
                          >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Prev
                          </Button>
                          <div className="hidden sm:flex items-center gap-1">
                            {/* Simple pagination numbers */}
                            <span className="text-sm font-bold text-slate-500 mx-4">
                              Page <span className="text-indigo-600">{page}</span> of {totalPages}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="rounded-xl font-bold border-slate-200"
                          >
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Day Details */}
        <div className="lg:col-span-1">
          {renderSelectedDateEvents()}
        </div>
      </div>
    </div>
  );
};

export default TechnicianCalendar;
