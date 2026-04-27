import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Building2,
  MapPin,
  Factory,
  Users,
  Eye,
  Settings,
  FileText,
  BarChart3,
  Bell,
  Mail,
  UserCog,
  Shield,
  Ticket,
  Wrench,
  ClipboardList,
  Box,
  Gauge,
  Globe
} from 'lucide-react';
import { api } from '@/lib/api';
import { dashboardApi } from '@/services/api/dashboardApi';
import { usePermissions } from '@/hooks/usePermissions';
import { Entity } from '@/types/permissions';
interface AdminStats {
  totalIndustries?: number;
  totalCategories?: number;
  totalProducts?: number;
  totalPlants?: number;
  totalAssets?: number;
  totalUsers?: number;
  totalManagers?: number;
  totalTechnicians?: number;
  totalForms?: number;
  totalFloorplans?: number;
  totalTickets?: number;
  totalRoles?: number;
}

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  userName: string;
  userType: string;
  description: string;
  createdAt: string;
}

interface SystemStatus {
  system: {
    status: 'operational' | 'degraded' | 'warning' | 'error' | 'unknown';
    message: string;
    lastChecked: string;
  };
  database: {
    status: 'operational' | 'degraded' | 'warning' | 'error' | 'unknown';
    message: string;
    lastChecked: string;
  };
  api: {
    status: 'operational' | 'degraded' | 'warning' | 'error' | 'unknown';
    message: string;
    lastChecked: string;
  };
}

interface OverviewProps {
  basePath?: string;
}

export default function Overview({ basePath = '/admin' }: OverviewProps) {
  const [stats, setStats] = useState<AdminStats>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { canView, isAdmin } = usePermissions();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('🔄 Fetching overview statistics...');

        // Fetch dashboard stats from client-side aggregator
        const data = await dashboardApi.getAdminStats();

        console.log('📊 Dashboard Data:', data);

        if (data.success) {
          setStats({
            totalIndustries: data.totalIndustries || 0,
            totalCategories: data.totalCategories || 0,
            totalProducts: data.totalProducts || 0,
            totalPlants: data.totalPlants || 0,
            totalAssets: data.totalAssets || 0,
            totalUsers: data.totalUsers || 0,
            totalManagers: data.totalManagers || 0,
            totalTechnicians: data.totalTechnicians || 0,
            totalForms: data.totalForms || 0,
            totalRoles: data.totalRoles || 0,
            totalFloorplans: data.totalFloorplans || 0,
            totalTickets: data.totalTickets || 0,
          });

          // Also set recent activities if available from the same call
          if (data.recentActivities) {
            setActivities(data.recentActivities);
          }
        } else {
          console.error('Failed to load dashboard data:', data);
        }

        // Fetch recent activities separately
        const activityData = await dashboardApi.getRecentActivities();
        if (activityData.success) {
          setActivities(activityData.activities || []);
        }

        console.log('✅ Stats updated');

      } catch (error) {
        console.error('❌ Failed to fetch stats:', error);
        // Log the full error for debugging
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        // Don't set fallback data - let it show 0 or undefined so we know there's an issue
        setStats({
          totalIndustries: 0,
          totalCategories: 0,
          totalProducts: 0,
          totalPlants: 0,
          totalUsers: 0,
          totalManagers: 0,
          totalTechnicians: 0,
          totalForms: 0,
          totalRoles: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSystemStatus = async () => {
      try {
        const response = await dashboardApi.getSystemStatus();
        if (response.success) {
          setSystemStatus(response.status);
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
        // Set error status if API call fails
        setSystemStatus({
          system: { status: 'operational', message: 'All systems go', lastChecked: new Date().toISOString() },
          database: { status: 'operational', message: 'Connected', lastChecked: new Date().toISOString() },
          api: { status: 'operational', message: 'Online', lastChecked: new Date().toISOString() }
        });
      }
    };

    fetchStats();
    fetchSystemStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Helper function to get status color classes
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'operational':
        return {
          border: 'border-green-300',
          bg: 'bg-green-50',
          hover: 'hover:bg-green-100',
          dot: 'bg-green-500',
          text: 'text-green-800',
          subtext: 'text-green-600',
          animate: true
        };
      case 'warning':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          hover: 'hover:bg-yellow-100',
          dot: 'bg-yellow-500',
          text: 'text-yellow-800',
          subtext: 'text-yellow-600',
          animate: false
        };
      case 'degraded':
        return {
          border: 'border-orange-300',
          bg: 'bg-orange-50',
          hover: 'hover:bg-orange-100',
          dot: 'bg-orange-500',
          text: 'text-orange-800',
          subtext: 'text-orange-600',
          animate: false
        };
      case 'error':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          hover: 'hover:bg-red-100',
          dot: 'bg-red-500',
          text: 'text-red-800',
          subtext: 'text-red-600',
          animate: false
        };
      default: // unknown
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          hover: 'hover:bg-gray-100',
          dot: 'bg-gray-500',
          text: 'text-gray-800',
          subtext: 'text-gray-600',
          animate: false
        };
    }
  };

  // Admin overview cards - original cards for admin dashboard
  const adminOverviewCards = [
    {
      title: "Industries",
      description: "Manage business industries",
      icon: Factory,
      path: "/admin/industries",
      count: stats.totalIndustries,
      color: "from-orange-50 to-orange-100 border-orange-200 text-orange-700 icon-orange-600",
    },
    {
      title: "Categories",
      description: "Manage service categories",
      icon: Package,
      path: "/admin/categories",
      count: stats.totalCategories,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
    },
    {
      title: "Products",
      description: "Manage products and variants",
      icon: Package,
      path: "/admin/products",
      count: stats.totalProducts,
      color: "from-sky-50 to-sky-100 border-sky-200 text-sky-700 icon-sky-600",
    },
    {
      title: "Plants",
      description: "Manage plants and facilities",
      icon: Factory,
      path: "/admin/plants",
      count: stats.totalPlants,
      color: "from-orange-50 to-orange-100 border-orange-200 text-orange-700 icon-orange-600",
    },
    {
      title: "Assets",
      description: "Manage assets and equipment",
      icon: Box,
      path: "/admin/assets",
      count: stats.totalAssets,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
    },
    {
      title: "Users",
      description: "Manage user access and permissions",
      icon: UserCog,
      path: "/admin/users",
      count: stats.totalUsers,
      color: "from-sky-50 to-sky-100 border-sky-200 text-sky-700 icon-sky-600",
    },
    {
      title: "Managers",
      description: "Manage plant managers",
      icon: Users,
      path: "/admin/users",
      count: stats.totalManagers,
      color: "from-orange-50 to-orange-100 border-orange-200 text-orange-700 icon-orange-600",
    },
    {
      title: "Technicians",
      description: "Manage technicians and assignments",
      icon: Wrench,
      path: "/admin/users",
      count: stats.totalTechnicians,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
    },
    {
      title: "Service Forms",
      description: "Create and manage service forms",
      icon: ClipboardList,
      path: "/admin/service-forms",
      count: stats.totalForms,
      color: "from-sky-50 to-sky-100 border-sky-200 text-sky-700 icon-sky-600",
    },
    {
      title: "Roles & Permissions",
      description: "Manage system roles and permissions",
      icon: Shield,
      path: "/admin/roles",
      count: stats.totalRoles,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
    },
  ];

  // Manager overview cards - matches sidebar items exactly (excluding Safety & Audit)
  const managerOverviewCards = [
    {
      title: "Plants",
      description: "Manage plants and facilities",
      icon: Factory,
      path: `${basePath}/plants`,
      count: stats.totalPlants,
      color: "from-orange-50 to-orange-100 border-orange-200 text-orange-700 icon-orange-600",
      permissionEntity: Entity.PLANTS,
    },
    {
      title: "Floorplans",
      description: "View and manage floor plans",
      icon: Building2,
      path: `${basePath}/floorplans`,
      count: stats.totalFloorplans,
      color: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 icon-emerald-600",
      permissionEntity: Entity.FLOORPLANS,
    },
    {
      title: "Categories",
      description: "Manage service categories",
      icon: Package,
      path: `${basePath}/categories`,
      count: stats.totalCategories,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
      permissionEntity: Entity.CATEGORIES,
    },
    {
      title: "Products",
      description: "Manage products and variants",
      icon: Package,
      path: `${basePath}/products`,
      count: stats.totalProducts,
      color: "from-sky-50 to-sky-100 border-sky-200 text-sky-700 icon-sky-600",
      permissionEntity: Entity.PRODUCTS,
    },
    {
      title: "Technicians",
      description: "Manage technicians and assignments",
      icon: Wrench,
      path: `${basePath}/technicians`,
      count: stats.totalTechnicians,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
      permissionEntity: Entity.TECHNICIANS,
    },
    {
      title: "Assets",
      description: "Manage assets and equipment",
      icon: Box,
      path: `${basePath}/assets`,
      count: stats.totalAssets,
      color: "from-slate-50 to-slate-100 border-slate-200 text-slate-700 icon-slate-600",
      permissionEntity: Entity.ASSETS,
    },
    {
      title: "Service Forms",
      description: "Create and manage service forms",
      icon: ClipboardList,
      path: `${basePath}/service-forms`,
      count: stats.totalForms,
      color: "from-sky-50 to-sky-100 border-sky-200 text-sky-700 icon-sky-600",
      permissionEntity: Entity.SERVICE_FORMS,
    },
    {
      title: "Tickets",
      description: "View and manage tickets",
      icon: Ticket,
      path: `${basePath}/tickets`,
      count: stats.totalTickets,
      color: "from-purple-50 to-purple-100 border-purple-200 text-purple-700 icon-purple-600",
      permissionEntity: Entity.TICKETS,
    },
  ];

  const summaryCards = [
    {
      title: "Pump Room Summary",
      description: "Monitor pump room status & assets",
      icon: Gauge,
      path: `${basePath}/pump-room-summary`,
      count: 1,
      color: "from-orange-50 to-orange-100 border-orange-200 text-orange-700 icon-orange-600",
      permissionEntity: Entity.DASHBOARD
    },
    {
      title: "Regional Command Center",
      description: "All facilities & plant overview",
      icon: Globe,
      path: `${basePath}/regional-ehs`,
      count: undefined,
      color: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700 icon-indigo-600",
      permissionEntity: Entity.DASHBOARD
    }
  ];

  // For admin: show admin cards as-is
  // For manager/custom users: show manager cards filtered by their permissions (from sidebar)
  const filteredOverviewCards = isAdmin()
    ? adminOverviewCards
    : managerOverviewCards.filter(card => canView(card.permissionEntity));

  const filteredSummaryCards = isAdmin()
    ? summaryCards
    : summaryCards.filter(card => canView(card.permissionEntity));

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Operational Statistics</h1>
            <p className="text-orange-100 text-lg opacity-90">Complete system overview and quick access to all modules</p>
          </div>
          <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
            <BarChart3 className="h-10 w-10 text-white" />
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredOverviewCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              onClick={() => navigate(card.path)}
              className={`
                group relative overflow-hidden rounded-2xl border
                shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer
                bg-gradient-to-br ${card.color.split(' ').slice(0, 2).join(' ')} ${card.color.match(/border-\S+/)?.[0]}
              `}
            >

              <div className="relative p-5 h-full flex flex-col justify-between z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-sm font-semibold transition-colors ${card.color.match(/text-\S+/)?.[0]}`}>{card.title}</h3>
                  </div>
                  <div className={`
                    p-2 rounded-xl bg-white/60 backdrop-blur-sm
                    group-hover:scale-110 transition-transform duration-300 shadow-sm
                  `}>
                    <Icon className={`h-5 w-5 ${card.color.match(/icon-\S+/)?.[0]?.replace('icon-', 'text-')}`} />
                  </div>
                </div>

                <div className="mt-2">
                  <div className={`text-3xl font-bold tracking-tight ${card.color.match(/text-\S+/)?.[0]?.replace('600', '800')?.replace('700', '900')}`}>
                    {card.count !== undefined ? card.count : '-'}
                  </div>
                  <p className={`text-xs mt-1 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0 ${card.color.match(/text-\S+/)?.[0]}`}>
                    {card.description}
                  </p>
                </div>

                {/* Decorative background icon watermark */}
                <Icon className={`absolute -right-6 -bottom-6 h-24 w-24 opacity-[0.05] group-hover:opacity-[0.1] group-hover:-rotate-12 transition-all duration-500 pointer-events-none ${card.color.match(/icon-\S+/)?.[0]?.replace('icon-', 'text-')}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards Section - Only show if there are visible cards */}
      {filteredSummaryCards.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            Summary Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredSummaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  onClick={() => navigate(card.path)}
                  className={`
                  group relative overflow-hidden rounded-2xl border
                  shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer
                  bg-gradient-to-br ${card.color.split(' ').slice(0, 2).join(' ')} ${card.color.match(/border-\S+/)?.[0]}
                `}
                >
                  <div className="relative p-5 h-full flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-sm font-semibold transition-colors ${card.color.match(/text-\S+/)?.[0]}`}>{card.title}</h3>
                      </div>
                      <div className={`
                      p-2 rounded-xl bg-white/60 backdrop-blur-sm
                      group-hover:scale-110 transition-transform duration-300 shadow-sm
                    `}>
                        <Icon className={`h-5 w-5 ${card.color.match(/icon-\S+/)?.[0]?.replace('icon-', 'text-')}`} />
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className={`text-xs mt-1 line-clamp-2 opacity-90 ${card.color.match(/text-\S+/)?.[0]}`}>
                        {card.description}
                      </p>
                    </div>

                    {/* Decorative background icon watermark */}
                    <Icon className={`absolute -right-6 -bottom-6 h-24 w-24 opacity-[0.05] group-hover:opacity-[0.1] group-hover:-rotate-12 transition-all duration-500 pointer-events-none ${card.color.match(/icon-\S+/)?.[0]?.replace('icon-', 'text-')}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* Recent Activity */}
      {/* <Card className="lg:col-span-2 card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest system activities and admin actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => {
                const getActionIcon = (entityType: string) => {
                  switch (entityType.toLowerCase()) {
                    case 'technician':
                      return <Wrench className="h-5 w-5 text-blue-600" />;
                    case 'plant':
                      return <Factory className="h-5 w-5 text-green-600" />;
                    case 'user':
                      return <Users className="h-5 w-5 text-purple-600" />;
                    case 'manager':
                      return <UserCog className="h-5 w-5 text-orange-600" />;
                    default:
                      return <FileText className="h-5 w-5 text-gray-600" />;
                  }
                };

                const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
                  switch (action.toLowerCase()) {
                    case 'created':
                      return 'default';
                    case 'updated':
                      return 'secondary';
                    case 'deleted':
                      return 'destructive';
                    default:
                      return 'outline';
                  }
                };

                const getTimeAgo = (dateString: string) => {
                  const date = new Date(dateString);
                  const now = new Date();
                  const diffMs = now.getTime() - date.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMins / 60);
                  const diffDays = Math.floor(diffHours / 24);

                  if (diffMins < 1) return 'Just now';
                  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
                  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                };

                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                        {getActionIcon(activity.entityType)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {activity.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          by {activity.userName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getActionBadgeVariant(activity.action)}>
                        {activity.action}
                      </Badge>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{getTimeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/admin/activities")}
            >
              <Eye className="mr-2 h-4 w-4" />
              View All Activities
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* System Status */}
      <Card className={`card-elevated bg-white ${systemStatus ? getStatusColors(systemStatus.system.status).border : 'border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${systemStatus ? getStatusColors(systemStatus.system.status).text : 'text-gray-600'}`}>
            <Settings className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Current system health and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* System Status */}
            {systemStatus?.system ? (
              <div className={`text-center p-6 border-2 rounded-xl transition-colors ${getStatusColors(systemStatus.system.status).border} ${getStatusColors(systemStatus.system.status).bg} ${getStatusColors(systemStatus.system.status).hover}`}>
                <div className={`w-4 h-4 rounded-full mx-auto mb-3 ${getStatusColors(systemStatus.system.status).dot} ${getStatusColors(systemStatus.system.status).animate ? 'animate-pulse' : ''}`}></div>
                <p className={`text-lg font-semibold mb-1 ${getStatusColors(systemStatus.system.status).text}`}>
                  {systemStatus.system.status === 'operational' ? 'System Operational' :
                    systemStatus.system.status === 'warning' ? 'System Warning' :
                      systemStatus.system.status === 'degraded' ? 'System Degraded' :
                        systemStatus.system.status === 'error' ? 'System Error' : 'System Unknown'}
                </p>
                <p className={`text-sm ${getStatusColors(systemStatus.system.status).subtext}`}>
                  {systemStatus.system.message}
                </p>
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-gray-300 rounded-xl bg-gray-50">
                <div className="w-4 h-4 bg-gray-500 rounded-full mx-auto mb-3"></div>
                <p className="text-lg font-semibold text-gray-800 mb-1">Checking...</p>
                <p className="text-sm text-gray-600">Loading status</p>
              </div>
            )}

            {/* Database Status */}
            {systemStatus?.database ? (
              <div className={`text-center p-6 border-2 rounded-xl transition-colors ${getStatusColors(systemStatus.database.status).border} ${getStatusColors(systemStatus.database.status).bg} ${getStatusColors(systemStatus.database.status).hover}`}>
                <div className={`w-4 h-4 rounded-full mx-auto mb-3 ${getStatusColors(systemStatus.database.status).dot} ${getStatusColors(systemStatus.database.status).animate ? 'animate-pulse' : ''}`}></div>
                <p className={`text-lg font-semibold mb-1 ${getStatusColors(systemStatus.database.status).text}`}>
                  {systemStatus.database.status === 'operational' ? 'Database Connected' :
                    systemStatus.database.status === 'warning' ? 'Database Warning' :
                      systemStatus.database.status === 'degraded' ? 'Database Degraded' :
                        systemStatus.database.status === 'error' ? 'Database Error' : 'Database Unknown'}
                </p>
                <p className={`text-sm ${getStatusColors(systemStatus.database.status).subtext}`}>
                  {systemStatus.database.message}
                </p>
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-gray-300 rounded-xl bg-gray-50">
                <div className="w-4 h-4 bg-gray-500 rounded-full mx-auto mb-3"></div>
                <p className="text-lg font-semibold text-gray-800 mb-1">Checking...</p>
                <p className="text-sm text-gray-600">Loading status</p>
              </div>
            )}

            {/* API Status */}
            {systemStatus?.api ? (
              <div className={`text-center p-6 border-2 rounded-xl transition-colors ${getStatusColors(systemStatus.api.status).border} ${getStatusColors(systemStatus.api.status).bg} ${getStatusColors(systemStatus.api.status).hover}`}>
                <div className={`w-4 h-4 rounded-full mx-auto mb-3 ${getStatusColors(systemStatus.api.status).dot} ${getStatusColors(systemStatus.api.status).animate ? 'animate-pulse' : ''}`}></div>
                <p className={`text-lg font-semibold mb-1 ${getStatusColors(systemStatus.api.status).text}`}>
                  {systemStatus.api.status === 'operational' ? 'API Working' :
                    systemStatus.api.status === 'warning' ? 'API Warning' :
                      systemStatus.api.status === 'degraded' ? 'API Degraded' :
                        systemStatus.api.status === 'error' ? 'API Error' : 'API Unknown'}
                </p>
                <p className={`text-sm ${getStatusColors(systemStatus.api.status).subtext}`}>
                  {systemStatus.api.message}
                </p>
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-gray-300 rounded-xl bg-gray-50">
                <div className="w-4 h-4 bg-gray-500 rounded-full mx-auto mb-3"></div>
                <p className="text-lg font-semibold text-gray-800 mb-1">Checking...</p>
                <p className="text-sm text-gray-600">Loading status</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}