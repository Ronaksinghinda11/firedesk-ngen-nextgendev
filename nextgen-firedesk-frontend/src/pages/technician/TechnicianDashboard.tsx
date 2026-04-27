import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { technicianServicesApi, ServiceSubmission } from '@/services/api/technicianServicesApi';
import { TechnicianLayout } from '@/components/TechnicianLayout';
import {
  Building2,
  Package,
  Wrench,
  MapPin,
  AlertCircle,
  CheckCircle,
  Activity,
  Calendar as CalendarIcon,
  ArrowRight,
  AlertTriangle,
  ListChecks,
  ClipboardList,
  User,
  Clock,
  LayoutDashboard
} from 'lucide-react';

interface Plant {
  id: string;
  plantId: string;
  plantName: string;
  addressLine1: string;
  city?: string;
  state?: string;
}

interface Category {
  id: string;
  categoryName: string;
  status: string;
}

interface Asset {
  id: string;
  assetId: string;
  assetName?: string;
  location?: string;
  healthStatus: string;
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  plant: Plant;
  category: Category;
  product?: {
    productName: string;
  };
}

interface TechnicianData {
  technician: {
    id: string;
    technicianId: string;
    plants: Plant[];
    categories: Category[];
    technicianType: string;
  };
}

interface AssignedTicket {
  id: string;
  ticketId: string;
  taskName: string;
  taskDescription?: string;
  targetDate: string;
  completedStatus: string;
  plant?: {
    id: string;
    plantName: string;
  };
  asset?: {
    id: string;
    assetId: string;
  };
  category?: {
    id: string;
    categoryName: string;
  };
}

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [technicianData, setTechnicianData] = useState<TechnicianData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [tickets, setTickets] = useState<AssignedTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize] = useState(9);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize] = useState(6);
  // const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [incidentStats, setIncidentStats] = useState({
    total: 0,
    inProgress: 0,
    PENDINGApproval: 0,
  });
  const [assignedIncidents, setAssignedIncidents] = useState<any[]>([]);
  const [loadingAssignedIncidents, setLoadingAssignedIncidents] = useState(false);

  useEffect(() => {
    fetchTechnicianData();
    fetchAssets();
    fetchTickets();
    fetchAssignedIncidents();
    checkTeamLeaderStatus();
  }, []);

  const fetchTechnicianData = async () => {
    try {
      const data = await api.get<TechnicianData>('/technician/my-assigned-plant');
      setTechnicianData(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch technician data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      // Derive assigned assets strictly from technician services (no category fallback)
      const PAGE_SIZE = 100;
      const MAX_PAGES = 5;
      const services: ServiceSubmission[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= MAX_PAGES) {
        try {
          const res = await technicianServicesApi.getMyAssignedServices(page, PAGE_SIZE);
          const data = res.data || [];
          services.push(...data);
          const pagination = res.pagination;
          if (pagination) {
            const totalPages = Math.max(1, Math.ceil((pagination.total || data.length) / (pagination.limit || PAGE_SIZE)));
            hasMore = page < totalPages;
          } else {
            hasMore = false;
          }
          page += 1;
        } catch (err: any) {
          console.error('Error fetching services page for assets:', err?.response?.status, err?.response?.data || err?.message);
          hasMore = false;
        }
      }

      const assetMap = new Map<string, Asset>();
      services.forEach(s => {
        const a: any = s.asset;
        if (!a?.assetId) return;
        if (assetMap.has(a.assetId)) return;
        assetMap.set(a.assetId, {
          id: a.id || a.assetId,
          assetId: a.assetId,
          assetName: a.assetId,
          location: a.location || '',
          healthStatus: a?.healthStatus || 'Unknown',
          lastInspectionDate: a?.lastInspectionDate,
          nextInspectionDue: a?.nextInspectionDue,
          plant: a.plant || { id: '', plantId: '', plantName: 'N/A', addressLine1: '' },
          category: { id: '', categoryName: a?.categoryName || 'Asset', status: '' },
          product: { productName: s.form?.serviceName || a.assetId },
        });
      });

      setAssets(Array.from(assetMap.values()));
      setAssetPage(1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch assigned assets from services',
        variant: 'destructive',
      });
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await api.get<{ tickets: AssignedTicket[] }>(
        '/technician/my-assigned-tickets'
      );
      setTickets(data.tickets || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch tickets',
        variant: 'destructive',
      });
      setLoadingTickets(false);
    }
  };

  const fetchAssignedIncidents = async () => {
    setLoadingAssignedIncidents(true);
    try {
      const response = await api.get<any>('/sams/technician/my-assigned-incidents');
      // Handle various response formats: array, { data: [...] }, { incidents: [...] }
      const incidents = Array.isArray(response)
        ? response
        : (response.data || response.incidents || []);

      setAssignedIncidents(Array.isArray(incidents) ? incidents : []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch assigned incidents',
        variant: 'destructive',
      });
      setAssignedIncidents([]);
    } finally {
      setLoadingAssignedIncidents(false);
    }
  };

  // pagination helpers
  const totalAssetPages = Math.max(1, Math.ceil((assets.length || 0) / assetPageSize));
  const pagedAssets = assets.slice((assetPage - 1) * assetPageSize, assetPage * assetPageSize);
  const totalTicketPages = Math.max(1, Math.ceil((tickets.length || 0) / ticketPageSize));
  const pagedTickets = tickets.slice((ticketPage - 1) * ticketPageSize, ticketPage * ticketPageSize);

  useEffect(() => {
    if (assetPage > totalAssetPages) setAssetPage(totalAssetPages);
  }, [assets.length, totalAssetPages, assetPage]);

  useEffect(() => {
    if (ticketPage > totalTicketPages) setTicketPage(totalTicketPages);
  }, [tickets.length, totalTicketPages, ticketPage]);

  const checkTeamLeaderStatus = async () => {
    try {
      const response = await api.get<any>(
        '/sams/user/is-team-leader'
      );

      // API returns { success: true, data: { isTeamLeader: ..., incidents: [...] } }
      const data = response.data || response;
      const isLeader = data.isTeamLeader || false;
      const incidents = data.incidents || [];

      setIsTeamLeader(isLeader);

      if (isLeader && incidents.length > 0) {
        const inProgressCount = incidents.filter(
          (inc: any) => inc.status === 'In CAPA' || inc.status === 'Assigned'
        ).length;
        const PENDINGCount = incidents.filter(
          (inc: any) => inc.status === 'Pending Approval'
        ).length;

        setIncidentStats({
          total: incidents.length,
          inProgress: inProgressCount,
          PENDINGApproval: PENDINGCount,
        });
      }
    } catch (error: any) {
      // Silently fail - it's okay if user is not a team leader
      console.error('Failed to check team leader status:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500';
      case 'Need Attention': return 'bg-amber-500';
      case 'Not Working': return 'bg-rose-500';
      case 'Critical': return 'bg-rose-700';
      default: return 'bg-slate-500';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'Need Attention': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'Not Working':
      case 'Critical': return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default: return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">
          Synchronizing Systems...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Welcome back, {user?.name?.split(' ')[0] || 'Technician'}
          </h1>
          <p className="text-slate-500 mt-1">Here's your overview for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span>{technicianData?.technician.technicianType || 'General Technician'}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Statistics Card */}
        <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="h-24 w-24" />
          </div>
          <CardContent className="p-6">
            <p className="text-indigo-100 text-sm font-medium mb-1">Total Assets</p>
            <h3 className="text-3xl font-bold">{assets.length}</h3>
            <div className="mt-4 flex items-center text-xs text-indigo-100 bg-white/10 w-fit px-2 py-1 rounded">
              <span className="font-medium">Assigned to you</span>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Plants */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Assigned Plants</CardTitle>
          </CardHeader>
          <CardContent>
            {technicianData?.technician.plants && technicianData.technician.plants.length > 0 ? (
              <div className="space-y-3">
                {technicianData.technician.plants.slice(0, 2).map((plant) => (
                  <div key={plant.id} className="flex items-start gap-3">
                    <div className="bg-blue-50 p-2 rounded-md">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm line-clamp-1">{plant.plantName}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{plant.addressLine1}</p>
                    </div>
                  </div>
                ))}
                {technicianData.technician.plants.length > 2 && (
                  <p className="text-xs text-slate-400 pl-11">+{technicianData.technician.plants.length - 2} more</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                <Building2 className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No plants assigned</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Categories */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {technicianData?.technician.categories && technicianData.technician.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {technicianData.technician.categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                  >
                    {category.categoryName}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                <Package className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No categories</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card className="bg-slate-900 text-white border-0 shadow-lg">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-bold text-lg mb-1">Quick Actions</h3>
              <p className="text-slate-400 text-sm">Common tasks for you</p>
            </div>
            <div className="space-y-2 mt-4">
              <Button
                onClick={() => navigate('/technician/calendar')}
                className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-left border border-slate-700"
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-indigo-400" />
                Check Schedule
              </Button>
              <Button
                onClick={() => navigate('/technician/my-services')}
                className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-left"
              >
                <Wrench className="h-4 w-4 mr-2 text-white" />
                Start Service
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Actions Grid */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4 px-1">Navigation & Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

        {/* Services Card */}
        <div
          onClick={() => navigate('/technician/my-services')}
          className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ClipboardList className="h-24 w-24 text-amber-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-amber-100 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ClipboardList className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-amber-600 transition-colors">My Services</h3>
              <p className="text-slate-500 text-sm">Manage your tasks</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 mr-2 text-amber-500" />
              <span>View scheduled services</span>
            </div>
            <div className="flex items-center text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 mr-2 text-amber-500" />
              <span>Submit service forms</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-amber-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
            Go to Services <ArrowRight className="h-4 w-4 ml-2" />
          </div>
        </div>

        {/* Safety Incidents Card */}
        <div
          onClick={() => navigate('/technician/sams/incidents/create')}
          className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-rose-600" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-rose-100 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-rose-600 transition-colors">Report Incident</h3>
              <p className="text-slate-500 text-sm">Safety safety first</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 mr-2 text-rose-500" />
              <span>Report accidents/hazards</span>
            </div>
            <div className="flex items-center text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 mr-2 text-rose-500" />
              <span>Track resolution status</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-rose-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
            Report Now <ArrowRight className="h-4 w-4 ml-2" />
          </div>
        </div>

        {/* Team Leader Card (Conditional) */}
        {isTeamLeader && (
          <div
            onClick={() => navigate('/technician/sams/incidents')}
            className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ListChecks className="h-24 w-24 text-purple-600" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <ListChecks className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-purple-600 transition-colors">Team Leader</h3>
                <p className="text-slate-500 text-sm">Incident management</p>
              </div>
            </div>
            <div className="flex justify-between items-center bg-purple-50 rounded-lg p-3 mb-3">
              <div className="text-center">
                <span className="block text-lg font-bold text-purple-700">{incidentStats.total}</span>
                <span className="text-xs text-purple-600/80">Total</span>
              </div>
              <div className="w-px h-8 bg-purple-200"></div>
              <div className="text-center">
                <span className="block text-lg font-bold text-orange-600">{incidentStats.inProgress}</span>
                <span className="text-xs text-purple-600/80">Active</span>
              </div>
              <div className="w-px h-8 bg-purple-200"></div>
              <div className="text-center">
                <span className="block text-lg font-bold text-yellow-600">{incidentStats.PENDINGApproval}</span>
                <span className="text-xs text-purple-600/80">Pending</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-purple-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Manage Incidents <ArrowRight className="h-4 w-4 ml-2" />
            </div>
          </div>
        )}
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Assets List */}

        {/* Assigned Incidents List (NEW) */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-semibold text-slate-900">Assigned Incidents</h2>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {loadingAssignedIncidents ? (
                <div className="p-8 text-center text-slate-400">Loading incidents...</div>
              ) : assignedIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No assigned incidents</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {assignedIncidents.map((incident: any) => (
                    <div key={incident.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="border-slate-200 text-slate-600">
                          {incident.incidentNumber}
                        </Badge>
                        <Badge className={`${incident.status === 'Open' ? 'bg-emerald-100 text-emerald-700' :
                          incident.status === 'Closed' ? 'bg-slate-100 text-slate-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                          {incident.status}
                        </Badge>
                      </div>

                      <h4 className="font-medium text-slate-900 mb-1 line-clamp-1">
                        {incident.subtype?.subtypeName || 'Incident'}
                      </h4>
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                        {incident.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                        <Building2 className="h-3 w-3" />
                        <span>{incident.plant?.plantName}</span>
                        <span className="mx-1">•</span>
                        <CalendarIcon className="h-3 w-3" />
                        <span>{new Date(incident.createdAt || incident.created_at).toLocaleDateString()}</span>
                      </div>

                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        size="sm"
                        onClick={() => navigate(`/technician/sams/incidents/${incident.id}`)}
                      >
                        Fill CAPA
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assets List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-semibold text-slate-900">Assigned Assets</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={assetPage === 1}
                onClick={() => setAssetPage(p => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={assetPage >= totalAssetPages}
                onClick={() => setAssetPage(p => Math.min(totalAssetPages, p + 1))}
                className="h-8 w-8 p-0"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Package className="h-12 w-12 mb-3 stroke-1" />
                  <p>No assets found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pagedAssets.map((asset) => (
                    <div key={asset.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500`}>
                          {getHealthStatusIcon(asset.healthStatus)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{asset.assetId}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {asset.location || 'No location'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${getHealthStatusColor(asset.healthStatus)} bg-opacity-10 text-slate-700 border-0`}>
                          {asset.healthStatus}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/technician/asset/${asset.id}/service`)}>
                          Service
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-semibold text-slate-900">Recent Tickets</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={ticketPage === 1}
                onClick={() => setTicketPage(p => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={ticketPage >= totalTicketPages}
                onClick={() => setTicketPage(p => Math.min(totalTicketPages, p + 1))}
                className="h-8 w-8 p-0"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-slate-400">
                  <p>No tickets assigned</p>
                </CardContent>
              </Card>
            ) : (
              pagedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/technician/tickets/${ticket.id}`)}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                      {ticket.ticketId}
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.targetDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{ticket.taskName}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{ticket.taskDescription || 'No description provided'}</p>

                  <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ticket.completedStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                      }`}>
                      {ticket.completedStatus}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
