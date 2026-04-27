/**
 * Dynamic Dashboard - Enhanced UI
 *
 * A flexible, modern dashboard that adapts based on the user's role and permissions.
 * Features: Gradient backgrounds, animated cards, trending indicators, and responsive design.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { EntityAccessGuard } from '@/components/PermissionGuard';
import { Entity, Action } from '@/types/permissions';
import {
  Factory,
  Package,
  Ticket,
  AlertCircle,
  Users,
  UserCog,
  FileText,
  Settings,
  LayoutDashboard,
  Shield,
  FolderArchive,
  ClipboardList,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Activity,
} from 'lucide-react';

interface DashboardCard {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  onClick: () => void;
  entity: Entity;
  requiredAction: Action;
}

export default function DynamicDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, hasAnyPermission, getAllPermissions } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const newStats: Record<string, number> = {};

      // Fetch data based on user permissions
      const promises = [];

      if (hasPermission(Entity.PLANTS, Action.READ)) {
        promises.push(
          api.get('/plant')
            .then((res) => { newStats.plants = res.allPlants?.length || 0; })
            .catch(() => { })
        );
      }

      if (hasPermission(Entity.ASSETS, Action.READ)) {
        promises.push(
          api.get('/assets')
            .then((res) => { newStats.assets = res.assets?.length || 0; })
            .catch(() => { })
        );
      }

      if (hasPermission(Entity.MANAGERS, Action.READ)) {
        promises.push(
          api.get('/manager')
            .then((res) => { newStats.managers = res.allManager?.length || 0; })
            .catch(() => { })
        );
      }

      if (hasPermission(Entity.TECHNICIANS, Action.READ)) {
        promises.push(
          api.get('/technician')
            .then((res) => { newStats.technicians = res.allTechnician?.length || 0; })
            .catch(() => { })
        );
      }

      if (hasPermission(Entity.USERS, Action.READ)) {
        promises.push(
          api.get('/users')
            .then((res) => { newStats.users = res.users?.length || 0; })
            .catch(() => { })
        );
      }

      if (hasPermission(Entity.CATEGORIES, Action.READ)) {
        promises.push(
          api.get('/category')
            .then((res) => { newStats.categories = res.allCategories?.length || 0; })
            .catch(() => { })
        );
      }

      if (hasPermission(Entity.TICKETS, Action.READ)) {
        promises.push(
          api.get('/api/manager/tickets')
            .then((res) => { newStats.tickets = res.tickets?.length || 0; })
            .catch(() => { })
        );
      }

      await Promise.all(promises);
      setStats(newStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  // Define all possible dashboard cards with enhanced styling
  const allCards: DashboardCard[] = [
    {
      title: 'Plants',
      value: stats.plants || 0,
      icon: Factory,
      description: 'Total plants',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
      onClick: () => navigate('/manager/plants'),
      entity: Entity.PLANTS,
      requiredAction: Action.READ,
    },
    {
      title: 'Assets',
      value: stats.assets || 0,
      icon: Package,
      description: 'Total assets',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
      onClick: () => navigate('/manager/assets'),
      entity: Entity.ASSETS,
      requiredAction: Action.READ,
    },
    {
      title: 'Managers',
      value: stats.managers || 0,
      icon: UserCog,
      description: 'Total managers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
      onClick: () => navigate('/admin/managers'),
      entity: Entity.MANAGERS,
      requiredAction: Action.READ,
    },
    {
      title: 'Technicians',
      value: stats.technicians || 0,
      icon: Users,
      description: 'Total technicians',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-amber-500',
      onClick: () => navigate('/admin/technicians'),
      entity: Entity.TECHNICIANS,
      requiredAction: Action.READ,
    },
    {
      title: 'Users',
      value: stats.users || 0,
      icon: Users,
      description: 'Total users',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-purple-500',
      onClick: () => navigate('/admin/users'),
      entity: Entity.USERS,
      requiredAction: Action.READ,
    },
    {
      title: 'Categories',
      value: stats.categories || 0,
      icon: FileText,
      description: 'Asset categories',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-blue-500',
      onClick: () => navigate('/admin/categories'),
      entity: Entity.CATEGORIES,
      requiredAction: Action.READ,
    },
    {
      title: 'Tickets',
      value: stats.tickets || 0,
      icon: Ticket,
      description: 'Total tickets',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      gradientFrom: 'from-rose-500',
      gradientTo: 'to-pink-500',
      onClick: () => navigate('/manager/tickets'),
      entity: Entity.TICKETS,
      requiredAction: Action.READ,
    },
  ];

  // Filter cards based on user permissions
  const visibleCards = allCards.filter((card) =>
    hasPermission(card.entity, card.requiredAction)
  );

  // Define quick actions with enhanced styling
  const quickActions = [
    {
      label: 'Manage Assets',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => navigate('/manager/assets'),
      visible: hasAnyPermission(Entity.ASSETS),
    },
    {
      label: 'View Plants',
      icon: Factory,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      hoverColor: 'hover:bg-emerald-100',
      onClick: () => navigate('/manager/plants'),
      visible: hasAnyPermission(Entity.PLANTS),
    },
    {
      label: 'Service Forms',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      onClick: () => navigate('/manager/service-forms'),
      visible: hasAnyPermission(Entity.SERVICE_FORMS),
    },
    {
      label: 'View Reports',
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      onClick: () => navigate('/manager/reports'),
      visible: hasAnyPermission(Entity.REPORTS),
    },
    {
      label: 'Manage Users',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverColor: 'hover:bg-indigo-100',
      onClick: () => navigate('/admin/users'),
      visible: hasAnyPermission(Entity.USERS),
    },
    {
      label: 'Manage Roles',
      icon: Shield,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      hoverColor: 'hover:bg-rose-100',
      onClick: () => navigate('/admin/roles'),
      visible: hasAnyPermission(Entity.ROLES),
    },
    {
      label: 'View Archive',
      icon: FolderArchive,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      hoverColor: 'hover:bg-amber-100',
      onClick: () => navigate('/manager/archive'),
      visible: hasAnyPermission(Entity.ARCHIVE),
    },
    {
      label: 'Settings',
      icon: Settings,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      hoverColor: 'hover:bg-slate-100',
      onClick: () => navigate('/admin/profile-settings'),
      visible: true,
    },
  ].filter((action) => action.visible);

  // Enhanced loading state
  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Shimmer header */}
        <div className="flex items-center justify-between">
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
            <h2 className="text-3xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600">
              No Access to Dashboard
            </h2>
            <p className="text-muted-foreground max-w-md text-lg">
              You don't have permission to view the dashboard. Please contact your administrator if
              you believe this is an error.
            </p>
            <div className="mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/admin/profile-settings')}
                className="group"
              >
                <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Go to Settings
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Enhanced Page Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{getGreetingEmoji()}</span>
              <Badge variant="secondary" className="font-medium">
                <Activity className="h-3 w-3 mr-1" />
                {user?.role?.name || 'Custom Role'}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 mb-2">
              {getGreeting()}, {user?.name}!
            </h1>
            <p className="text-slate-600 text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Overview of your accessible resources and permissions
            </p>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        {visibleCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.title}
                  className="group relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-slate-200"
                  onClick={card.onClick}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{card.title}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-bold text-foreground">{card.value}</p>
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {card.description}
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl ${card.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-8 w-8 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-slate-300 rounded-full blur-xl opacity-30"></div>
                <LayoutDashboard className="h-16 w-16 text-slate-400 mx-auto relative" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">No Data Available</h3>
              <p className="text-slate-600 max-w-md mx-auto text-lg">
                You don't have permission to view any statistics. Contact your administrator to
                request access.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Quick Actions */}
        {quickActions.length > 0 && (
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Quick Actions
              </CardTitle>
              <CardDescription className="text-base">
                Common tasks and shortcuts based on your permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        )}

        {/* Enhanced Role Information */}
        <Card className="border-slate-200 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl"></div>
          <CardHeader className="pb-4 relative">
            <CardTitle className="text-2xl flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              Your Role & Permissions
            </CardTitle>
            <CardDescription className="text-base">
              Information about your current role and access levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Role Name</p>
                <p className="text-2xl font-bold text-foreground">{user?.role?.name || 'No role assigned'}</p>
              </div>
              {user?.role?.description && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Description</p>
                  <p className="text-base text-slate-700">{user.role.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Accessible Entities
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getAllPermissions()).map(([entity, permission]: [string, any]) => {
                  if (permission.level !== 'none') {
                    return (
                      <Badge
                        key={entity}
                        variant="secondary"
                        className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all duration-300 cursor-default"
                      >
                        <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
                        {entity}
                      </Badge>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </EntityAccessGuard>
  );
}
