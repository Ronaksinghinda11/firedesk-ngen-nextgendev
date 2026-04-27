/**
 * Manager Dashboard - Enhanced Modern UI
 *
 * Beautiful dashboard for Manager users with:
 * - Gradient backgrounds and modern card designs
 * - Animated hover effects and smooth transitions
 * - Time-based greeting with emojis
 * - Real-time statistics with trending indicators
 * - System health donut chart
 * - Quick action buttons with color-coded backgrounds
 * - Responsive grid layout
 * - Shimmer loading states
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { EntityAccessGuard } from '@/components/PermissionGuard';
import { Entity } from '@/types/permissions';
import {
  Factory,
  Package,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserCog,
  FileText,
  Calendar,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Activity,
  BarChart3,
  Gauge,
} from 'lucide-react';

interface SystemStats {
  overallHealth: {
    healthy: number;
    attention: number;
    critical: number;
  };
  criticalAlerts: number;
  serviceSummary: {
    completed: number;
    PENDING: number;
    upcoming: number;
  };
}

interface DashboardStats {
  totalPlants: number;
  totalAssets: number;
  totalTickets: number;
  openTickets: number;
  totalTechnicians: number;
  totalCategories: number;
  healthyAssets: number;
  needAttentionAssets: number;
  criticalAssets: number;
}

export default function ManagerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { selectedPlantId } = usePlantFilter();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPlants: 0,
    totalAssets: 0,
    totalTickets: 0,
    openTickets: 0,
    totalTechnicians: 0,
    totalCategories: 0,
    healthyAssets: 0,
    needAttentionAssets: 0,
    criticalAssets: 0,
  });
  const [systemStats, setSystemStats] = useState<SystemStats>({
    overallHealth: { healthy: 0, attention: 0, critical: 0 },
    criticalAlerts: 0,
    serviceSummary: { completed: 0, PENDING: 0, upcoming: 0 },
  });

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user, selectedPlantId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      console.log('📊 Loading manager dashboard data...');
      console.log('👤 Current user:', user);

      // Fetch manager details
      const managerResponse = await api.get('/manager');
      console.log('📦 Manager API Response:', managerResponse);
      const managers = (managerResponse as any).allManager || [];
      console.log('📦 All managers:', managers);
      const currentManager = managers.find((m: any) => m.userId === user?.id);
      console.log('📦 Current manager found:', currentManager);

      if (currentManager) {
        const plants = currentManager.plants || [];
        console.log('🏭 Manager plants:', plants);
        const assignedPlantIds = plants.map((p: any) => p.id) || [];
        console.log('🏭 Assigned plant IDs:', assignedPlantIds);

        // Determine which plants to show based on filter
        const plantsToShow = selectedPlantId && selectedPlantId !== 'all'
          ? [selectedPlantId]
          : assignedPlantIds;
        console.log('🏭 Plants to show:', plantsToShow, 'Selected filter:', selectedPlantId);

        // Prepare plant filter param
        const plantParam = selectedPlantId && selectedPlantId !== 'all' ? selectedPlantId : undefined;

        // **PARALLEL API CALLS** - Fetch all data at once for faster loading
        console.time('⚡ Parallel data fetch');
        const [
          assetsResponse,
          categoriesResponse,
          technicianResponse,
          ticketsResponse,
          PENDINGServicesResponse,
          serviceStatsResponse
        ] = await Promise.all([
          // Assets - request with high limit to get all for health calculation, and get total count
          api.get('/assets', { params: { plantId: plantParam, limit: 1000 } }).catch(err => { console.error('❌ Assets error:', err); return { assets: [], count: 0 }; }),
          // Categories (Fixed endpoint)
          api.get('/master-data/categories', { params: { plantId: plantParam } }).catch(err => { console.error('❌ Categories error:', err); return { allCategory: [] }; }),
          // Technicians (Fixed plural endpoint)
          api.get('/technicians', { params: { plantId: plantParam } }).catch(err => { console.error('❌ Technicians error:', err); return { technicians: [] }; }),
          // Tickets
          api.get('/api/manager/tickets', { params: { plantId: plantParam } }).catch(err => { console.error('❌ Tickets error:', err); return { tickets: [] }; }),
          // Pending services (Fixed endpoint)
          api.get('/api/manager/calendar/services/PENDING-approval', { params: { plantId: plantParam } }).catch(err => { console.error('❌ Pending services error:', err); return { data: [] }; }),
          // Service statistics (Fixed endpoint)
          api.get('/api/manager/calendar/statistics', { params: { plantId: plantParam } }).catch(err => { console.error('❌ Service stats error:', err); return { statistics: {} }; })
        ]);
        console.timeEnd('⚡ Parallel data fetch');

        // Process assets - use count from API response for total
        let totalAssets = 0;
        let healthyAssets = 0;
        let needAttentionAssets = 0;
        let criticalAssets = 0;

        if (plantsToShow.length > 0) {
          // Fix: Handle standard API response structure { data: [...], pagination: { total: N } }
          const allAssets = (assetsResponse as any).data || (assetsResponse as any).assets || [];
          const apiCount = (assetsResponse as any).pagination?.total || (assetsResponse as any).count || allAssets.length;
          console.log('📦 Total assets from API count:', apiCount, 'assets in page:', allAssets.length);

          // Filter assets by selected plant(s) for health calculation
          // Handle both camelCase (plantId) and snake_case (plant_id) from backend
          const filteredAssets = allAssets.filter((asset: any) =>
            plantsToShow.includes(asset.plant_id || asset.plantId)
          );

          // Use API count for total (not filtered array length)
          totalAssets = apiCount;
          console.log('✓ Total assets:', totalAssets, 'for health calc:', filteredAssets.length);

          // Calculate health stats
          // Backend uses snake_case (health_status) with UPPERCASE values: HEALTHY, NEEDS_ATTENTION, NOT_WORKING
          // Handle both camelCase (from some transformations) and snake_case (raw DB response)
          filteredAssets.forEach((asset: any) => {
            const healthStatus = asset.health_status || asset.healthStatus;
            if (healthStatus === 'HEALTHY' || healthStatus === 'Healthy') healthyAssets++;
            else if (healthStatus === 'NEEDS_ATTENTION' || healthStatus === 'AttentionRequired') needAttentionAssets++;
            else if (healthStatus === 'NOT_WORKING' || healthStatus === 'NotWorking' || healthStatus === 'Critical') criticalAssets++;
          });
          console.log('✓ Health stats:', { healthy: healthyAssets, attention: needAttentionAssets, critical: criticalAssets });
        }

        // Process categories
        const totalCategories = (categoriesResponse as any).data?.length || (categoriesResponse as any).allCategory?.length || 0;
        console.log('✓ Loaded categories:', totalCategories);

        // Process technicians
        const totalTechnicians = (technicianResponse as any).data?.length || (technicianResponse as any).technicians?.length || 0;
        console.log('✓ Loaded technicians:', totalTechnicians);

        // Process tickets
        const tickets = (ticketsResponse as any).tickets || [];
        const totalTickets = tickets.length;
        const openTickets = tickets.filter((t: any) => t.completedStatus === 'Pending').length;
        console.log('✓ Loaded tickets:', { totalTickets, openTickets });

        // Process services
        const PENDINGData = (PENDINGServicesResponse as any).data || [];
        const PENDINGServices = PENDINGData.length;
        const stats = (serviceStatsResponse as any).statistics || {};
        const completedServices = stats.completed || 0;
        const upcomingServices = stats.due || 0;
        console.log('✓ Loaded services:', { PENDING: PENDINGServices, completed: completedServices, upcoming: upcomingServices });

        // Calculate health percentages
        const totalHealthItems = healthyAssets + needAttentionAssets + criticalAssets;
        const healthyPercent = totalHealthItems > 0 ? Math.round((healthyAssets / totalHealthItems) * 100) : 0;
        const attentionPercent = totalHealthItems > 0 ? Math.round((needAttentionAssets / totalHealthItems) * 100) : 0;
        const criticalPercent = totalHealthItems > 0 ? Math.round((criticalAssets / totalHealthItems) * 100) : 0;

        // Set stats
        setStats({
          totalPlants: plantsToShow.length,
          totalAssets,
          totalTickets,
          openTickets,
          totalTechnicians,
          totalCategories,
          healthyAssets,
          needAttentionAssets,
          criticalAssets,
        });

        // Set system stats
        setSystemStats({
          overallHealth: {
            healthy: healthyPercent,
            attention: attentionPercent,
            critical: criticalPercent,
          },
          criticalAlerts: criticalAssets,
          serviceSummary: {
            completed: completedServices,
            PENDING: PENDINGServices,
            upcoming: upcomingServices
          },
        });
      } else {
        console.error('❌ Current manager NOT FOUND! User ID:', user?.id);
        console.error('❌ Available managers:', managers);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 18) return '👋';
    return '🌙';
  };

  const getHealthPercentage = () => {
    const total = systemStats.overallHealth.healthy + systemStats.overallHealth.attention + systemStats.overallHealth.critical;
    return total > 0 ? (systemStats.overallHealth.healthy / total) * 100 : 0;
  };

  // Enhanced stat cards with gradients and animations
  const statCards = [
    {
      title: 'My Plants',
      value: stats.totalPlants,
      icon: Factory,
      description: 'Assigned plants',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
      onClick: () => navigate('/manager/plants'),
    },
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      icon: Package,
      description: 'All assets',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
      onClick: () => navigate('/manager/assets'),
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: FileText,
      description: 'Asset categories',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-purple-500',
      onClick: () => navigate('/manager/categories'),
    },
    {
      title: 'Technicians',
      value: stats.totalTechnicians,
      icon: UserCog,
      description: 'Total technicians',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-amber-500',
      onClick: () => navigate('/manager/technicians'),
    },
    {
      title: 'Open Tickets',
      value: stats.openTickets,
      icon: Ticket,
      description: 'Active tickets',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
      onClick: () => navigate('/manager/tickets'),
    },
    {
      title: 'Critical Assets',
      value: stats.criticalAssets,
      icon: AlertCircle,
      description: 'Need attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      gradientFrom: 'from-red-500',
      gradientTo: 'to-rose-500',
      onClick: () => navigate('/manager/assets'),
    },
  ];

  const quickActions = [
    {
      label: 'Create Ticket',
      icon: Ticket,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      onClick: () => navigate('/manager/tickets')
    },
    {
      label: 'View Assets',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => navigate('/manager/assets')
    },
    {
      label: 'Schedule Service',
      icon: Calendar,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      hoverColor: 'hover:bg-emerald-100',
      onClick: () => navigate('/manager/scheduler')
    },
    {
      label: 'Pump Room Summary',
      icon: Gauge,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      onClick: () => navigate('/manager/pump-room-summary')
    },

  ];

  // Enhanced shimmer loading state
  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Shimmer header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 p-8">
          <div className="space-y-3">
            <div className="h-10 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg w-64 animate-pulse"></div>
            <div className="h-5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg w-96 animate-pulse"></div>
          </div>
        </div>

        {/* Shimmer cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-20 animate-pulse"></div>
                    <div className="h-8 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-16 animate-pulse"></div>
                    <div className="h-3 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-xl animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <EntityAccessGuard
      entity={Entity.DASHBOARD}
      fallback={
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-orange-400 rounded-full blur-2xl opacity-20"></div>
              <AlertCircle className="h-20 w-20 text-rose-500 mx-auto relative" />
            </div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600">
              No Access to Dashboard
            </h2>
            <p className="text-muted-foreground max-w-md text-lg">
              You don't have permission to view the dashboard. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Enhanced Page Header with Gradient Background */}
        {/* <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 p-8 shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{getGreetingEmoji()}</span>
              <Badge variant="secondary" className="font-medium">
                <Activity className="h-3 w-3 mr-1" />
                Manager
              </Badge>
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 mb-2">
              {getGreeting()}, {user?.name}!
            </h1>
            <p className="text-slate-600 text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Overview of your assigned plants and assets
            </p>
          </div>
        </div> */}

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Operational Statistics</h1>
              <p className="text-orange-100 text-lg">Overview of your assigned plants and assets</p>
            </div>
            <div className="bg-white/20 p-4 rounded-xl">
              <BarChart3 className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid with Hover Effects and Gradients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="group relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-slate-200"
                onClick={stat.onClick}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        {stat.description}
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                    </div>
                    <div className={`p-4 rounded-2xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enhanced Quick Actions */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
            <CardDescription className="text-base">
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    className={`h-auto flex flex-col items-center gap-3 p-6 ${action.bgColor} ${action.hoverColor} border-slate-200 hover:border-slate-300 transition-all duration-300 group hover:shadow-md`}
                    onClick={action.onClick}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`p-3 rounded-xl ${action.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <span className="font-semibold text-sm text-slate-700">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </EntityAccessGuard>
  );
}
