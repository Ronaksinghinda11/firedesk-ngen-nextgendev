import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Calendar,
  MapPin,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ArrowRight,
  RefreshCw,
  Package,
  Zap,
  Activity,
  Star,
  FileEdit,
  Play,
  Search,
  ChevronRight,
  Timer
} from 'lucide-react';
import { technicianServicesApi, ServiceSubmission } from '@/services/api/technicianServicesApi';
import { format, differenceInDays } from 'date-fns';

export default function MyServices() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('due');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceSubmission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const [stats, setStats] = useState({
    due: 0,
    upcoming: 0,
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    loadServices(activeTab);
    loadStats();
  }, []);

  useEffect(() => {
    setPage(1);
    loadServices(activeTab);
  }, [activeTab]);

  useEffect(() => {
    loadServices(activeTab);
  }, [page]);

  const loadServices = async (tab: string) => {
    try {
      setLoading(true);
      let data: ServiceSubmission[] = [];
      let total: number = 0;

      let response;

      switch (tab) {
        case 'due':
          response = await technicianServicesApi.getMyServicesDue(page, ITEMS_PER_PAGE);
          break;
        case 'upcoming':
          response = await technicianServicesApi.getMyUpcomingServices(page, ITEMS_PER_PAGE);
          break;
        case 'completed':
          response = await technicianServicesApi.getMyCompletedServices(page, ITEMS_PER_PAGE);
          break;
        case 'all':
          response = await technicianServicesApi.getMyAssignedServices(page, ITEMS_PER_PAGE);
          break;
        default:
          response = await technicianServicesApi.getMyServicesDue(page, ITEMS_PER_PAGE); // Default fallback
      }

      if (response) {
        data = response.data;
        total = response.pagination?.total || data.length;
      }

      setServices(data);
      setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)));

    } catch (error: any) {
      console.error('Failed to load services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const allProp = await technicianServicesApi.getMyAssignedServices(1, 1);
      const dueProp = await technicianServicesApi.getMyServicesDue(1, 1);
      const upcomingProp = await technicianServicesApi.getMyUpcomingServices(1, 1);
      const completedProp = await technicianServicesApi.getMyCompletedServices(1, 1);

      setStats({
        due: dueProp.pagination?.total || dueProp.data.length,
        upcoming: upcomingProp.pagination?.total || upcomingProp.data.length,
        completed: completedProp.pagination?.total || completedProp.data.length,
        total: allProp.pagination?.total || allProp.data.length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    loadServices(activeTab);
    loadStats();
  };

  const handleServiceClick = (serviceId: string) => {
    navigate(`/technician/service/${serviceId}`);
  };

  // Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { color: string; label: string; icon: any }> = {
      PENDING: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Pending', icon: Clock },
      IN_PROGRESS: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'In Progress', icon: Activity },
      SUBMITTED: { color: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Submitted', icon: FileText },
      COMPLETED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed', icon: CheckCircle2 },
      REJECTED: { color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected', icon: AlertCircle },
      APPROVED: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Approved', icon: Star },
    };

    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  // Inspection Type Badge
  const InspectionTypeBadge = ({ type }: { type: string }) => {
    const configs: Record<string, { color: string; icon: any }> = {
      Inspection: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Search },
      Testing: { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Zap },
      Maintenance: { color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Wrench },
    };

    const config = configs[type] || { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: Wrench };
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`gap-1 px-2 py-0.5 h-6 font-medium border ${config.color}`}>
        <Icon className="h-3 w-3" />
        {type}
      </Badge>
    );
  };

  // Due Date Component
  const DueDateDisplay = ({ date }: { date: string }) => {
    if (!date) return <span className="text-slate-400 text-sm">No date scheduled</span>;

    const scheduledDate = new Date(date);
    if (isNaN(scheduledDate.getTime())) return <span className="text-slate-400 text-sm">Invalid date</span>;

    const days = differenceInDays(scheduledDate, new Date());
    let colorClass = "text-slate-600 bg-slate-100";
    let icon = Calendar;
    let text = format(scheduledDate, 'MMM dd, yyyy');

    if (days < 0) {
      colorClass = "text-rose-700 bg-rose-50 border-rose-100";
      icon = AlertCircle;
      text = `${Math.abs(days)} days overdue`;
    } else if (days === 0) {
      colorClass = "text-amber-700 bg-amber-50 border-amber-100";
      icon = Timer;
      text = "Due Today";
    } else if (days <= 3) {
      colorClass = "text-orange-700 bg-orange-50 border-orange-100";
      icon = Clock;
      text = `Due in ${days} days`;
    }

    const Icon = icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} w-fit`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{text}</span>
      </div>
    );
  };

  const renderServiceCard = (service: ServiceSubmission) => {
    return (
      <div
        key={service.id}
        onClick={() => handleServiceClick(service.id)}
        className="group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:border-blue-300/50 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        {/* Hover Highlight */}
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100 group-hover:scale-110 transition-transform duration-300">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {service.asset?.assetId || 'Unknown Asset'}
                </h3>
                {service.inspectionType && <InspectionTypeBadge type={service.inspectionType} />}
              </div>
              <p className="text-sm text-slate-500 font-medium">{service.form?.serviceName || 'Service Task'}</p>
            </div>
          </div>
          <StatusBadge status={service.status} />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-5 text-sm">
          {service.asset?.location && (
            <div className="col-span-2 flex items-start gap-2.5 text-slate-600 bg-slate-50/50 p-2 rounded-lg">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <span className="line-clamp-2 leading-snug">{service.asset.location}</span>
            </div>
          )}

          {service.asset?.plant?.plantName && (
            <div className="col-span-2 flex items-center gap-2.5 text-slate-600 pl-2">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate">{service.asset.plant.plantName}</span>
            </div>
          )}

          <div className="col-span-2 pl-2">
            <DueDateDisplay date={service.scheduledDate} />
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
          {service.status === 'PENDING' ? (
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/technician/service-form/${service.id}`);
              }}
            >
              <Play className="h-4 w-4 mr-2" /> Start Service
            </Button>
          ) : service.status === 'IN_PROGRESS' || service.status === 'REJECTED' ? (
            <Button
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-200"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/technician/service-form/${service.id}`);
              }}
            >
              <FileEdit className="h-4 w-4 mr-2" /> {service.status === 'REJECTED' ? 'Resubmit' : 'Continue'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                handleServiceClick(service.id);
              }}
            >
              View Details <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = (icon: any, title: string, description: string) => {
    const Icon = icon;
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-50 p-6 rounded-full mb-6 relative">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
          <Icon className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-sm mx-auto mb-6">{description}</p>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh Data
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">My Services</h1>
            <p className="text-slate-500 text-lg">Manage and track your assigned service tasks efficiently.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm bg-white" onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center bg-white rounded-full border border-slate-200 shadow-sm px-4 py-2 gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" />
              {format(new Date(), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Services Due', value: stats.due, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            { label: 'Upcoming', value: stats.upcoming, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Total Active', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          ].map((stat, i) => (
            <Card key={i} className={`border ${stat.border} shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group`}>
              <div className={`absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon className={`h-24 w-24 ${stat.color}`} />
              </div>
              <CardContent className="p-6">
                <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="relative z-10">
                  <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <TabsList className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm w-full sm:w-auto grid grid-cols-4 sm:flex h-auto">
                {[
                  { id: 'due', label: 'Due', count: stats.due },
                  { id: 'upcoming', label: 'Upcoming', count: stats.upcoming },
                  { id: 'completed', label: 'History', count: stats.completed },
                  { id: 'all', label: 'All', count: stats.total },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all"
                  >
                    {tab.label}
                    <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Loading service data...</p>
              </div>
            ) : (
              <div className="min-h-[400px]">
                {/* Content for each tab */}
                <TabsContent value="due" className="mt-0">
                  {services.length === 0 ? renderEmptyState(CheckCircle2, 'All Caught Up!', "You don't have any overdue services. Great job!") : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                      {services.map(renderServiceCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upcoming" className="mt-0">
                  {services.length === 0 ? renderEmptyState(Calendar, 'No Upcoming Services', "You're clear for now. Check back later for new assignments.") : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                      {services.map(renderServiceCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  {services.length === 0 ? renderEmptyState(Clock, 'No History Yet', "Completed services will appear here for your reference.") : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                      {services.map(renderServiceCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="mt-0">
                  {services.length === 0 ? renderEmptyState(Package, 'No Services Assigned', "You currently don't have any services assigned to you.") : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                      {services.map(renderServiceCard)}
                    </div>
                  )}
                </TabsContent>

                {/* Pagination Controls */}
                {!loading && services.length > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                      <span className="sr-only">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(page - p) <= 1)
                        .map((p, i, arr) => (
                          <div key={p} className="flex items-center">
                            {i > 0 && arr[i - 1] !== p - 1 && (
                              <span className="text-slate-400 px-1">...</span>
                            )}
                            <Button
                              variant={p === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(p)}
                              className={`w-9 h-9 ${p === page ? 'bg-slate-900 border-slate-900 text-white' : 'text-slate-600'}`}
                            >
                              {p}
                            </Button>
                          </div>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span className="sr-only">Next</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
