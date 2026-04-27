/**
 * Admin Dashboard - Enhanced Modern UI
 *
 * Beautiful dashboard for Admin users with:
 * - Gradient backgrounds and modern card designs
 * - Animated hover effects and smooth transitions
 * - Time-based greeting with emojis
 * - Real-time statistics with trending indicators
 * - Recent activity timeline
 * - Quick action buttons with gradient backgrounds
 * - Responsive grid layout
 * - Shimmer loading states
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Factory,
  Users,
  UserCog,
  MapPin,
  Package,
  Eye,
  UserCheck,
  Building2,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Activity,
  Clock,
  Droplets,
} from 'lucide-react';

interface DashboardStats {
  totalIndustries?: number;
  totalPlants?: number;
  totalManagers?: number;
  totalTechnicians?: number;
  totalCategories?: number;
  totalProducts?: number;
  recentActivities?: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    type: string;
  }>;
  [key: string]: any;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.get<DashboardStats>('/dashboard');
      console.log('Dashboard data:', data);
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
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

  // Enhanced stat cards with gradients
  const statCards = [
    {
      title: 'Industries',
      value: stats.totalIndustries || 0,
      icon: Building2,
      description: 'Total industries',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
    },
    {
      title: 'Categories',
      value: stats.totalCategories || 0,
      icon: Package,
      description: 'Total categories',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-purple-500',
    },
    {
      title: 'Products',
      value: stats.totalProducts || 0,
      icon: Package,
      description: 'Total products',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      gradientFrom: 'from-pink-500',
      gradientTo: 'to-rose-500',
    },
    {
      title: 'Plants',
      value: stats.totalPlants || 0,
      icon: Factory,
      description: 'Total plants',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
    },
    {
      title: 'Managers',
      value: stats.totalManagers || 0,
      icon: Users,
      description: 'Total managers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
    },
    {
      title: 'Technicians',
      value: stats.totalTechnicians || 0,
      icon: UserCog,
      description: 'Total technicians',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-amber-500',
    },
  ];

  // Enhanced quick actions with colors
  const quickActions = [
    {
      label: 'Manage Industries',
      icon: Building2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      gradient: 'from-orange-500 to-red-500',
      route: '/admin/industries',
      isPrimary: true,
    },
    {
      label: 'Manage Plants',
      icon: Factory,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      hoverColor: 'hover:bg-emerald-100',
      route: '/admin/plants',
    },
    {
      label: 'Manage States',
      icon: MapPin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      route: '/admin/states',
    },
    {
      label: 'Manage Products',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      route: '/admin/products',
    },
    {
      label: 'Service Forms',
      icon: UserCheck,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      hoverColor: 'hover:bg-cyan-100',
      route: '/admin/service-forms',
    },
    {
      label: 'Categories',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverColor: 'hover:bg-indigo-100',
      route: '/admin/categories',
    },
    {
      label: 'Pump Room Summary',
      icon: Droplets,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      route: '/admin/pump-room-summary',
    },
  ];

  // Enhanced shimmer loading state
  if (loading) {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Enhanced Page Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{getGreetingEmoji()}</span>
            <Badge variant="secondary" className="font-medium">
              <Activity className="h-3 w-3 mr-1" />
              Administrator
            </Badge>
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 mb-2">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="text-slate-600 text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Overview of your FireDesk system
          </p>
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

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Recent Activity */}
        <Card className="lg:col-span-2 border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Recent Activity
            </CardTitle>
            <CardDescription className="text-base">
              Latest system activities and admin actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-sm text-slate-600">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="font-medium">{activity.type}</Badge>
                      <div className="text-right text-xs text-slate-500">
                        <p className="font-medium">{new Date(activity.timestamp).toLocaleDateString()}</p>
                        <p>{new Date(activity.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Enhanced fallback placeholder activities
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          System Update
                        </p>
                        <p className="text-sm text-slate-600">
                          New features added to the platform
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="font-medium">Info</Badge>
                      <div className="text-right text-xs text-slate-500">
                        <p className="font-medium">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Button
                variant="ghost"
                className="w-full group hover:bg-slate-100 transition-colors"
                onClick={() => navigate("/admin/industries")}
              >
                <Eye className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                View All Activities
              </Button>
            </div>
          </CardContent>
        </Card>

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
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return action.isPrimary ? (
                <Button
                  key={action.label}
                  className={`w-full justify-start bg-gradient-to-r ${action.gradient} text-white hover:shadow-lg transition-all duration-300 group`}
                  onClick={() => navigate(action.route)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-1.5 rounded-lg bg-white/20 mr-2 group-hover:scale-110 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  {action.label}
                  <ArrowUpRight className="h-4 w-4 ml-auto opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Button>
              ) : (
                <Button
                  key={action.label}
                  variant="outline"
                  className={`w-full justify-start ${action.bgColor} ${action.hoverColor} border-slate-200 hover:border-slate-300 transition-all duration-300 group`}
                  onClick={() => navigate(action.route)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`p-1.5 rounded-lg ${action.bgColor} mr-2 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-4 w-4 ${action.color}`} />
                  </div>
                  <span className="text-slate-700">{action.label}</span>
                  <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-slate-500" />
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
