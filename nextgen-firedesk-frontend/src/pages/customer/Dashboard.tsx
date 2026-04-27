/**
 * Customer Dashboard
 *
 * Features:
 * - Customer greeting
 * - System Overview (Overall Health, Critical Alerts, Service Summary)
 * - Filter by Day/Week/Month
 * - Monthly Calendar with service dates and ticket dates
 * - Event list on date click
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Package, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    overallHealth: { healthy: 0, attention: 0, critical: 0 },
    criticalAlerts: 0,
    serviceSummary: { completed: 0, PENDING: 0, upcoming: 0 },
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [timeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Load real data from API
      // Placeholder data
      setStats({
        overallHealth: { healthy: 75, attention: 20, critical: 5 },
        criticalAlerts: 3,
        serviceSummary: { completed: 45, PENDING: 8, upcoming: 12 },
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthPercentage = () => {
    const total = stats.overallHealth.healthy + stats.overallHealth.attention + stats.overallHealth.critical;
    return total > 0 ? (stats.overallHealth.healthy / total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name}!
        </h1>
        <p className="text-gray-500 mt-1">Here's your system overview for today.</p>
      </div>

      {/* Time Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by:</span>
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overall System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Donut Chart Placeholder */}
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="transform -rotate-90" viewBox="0 0 100 100">
                    {/* Healthy (Green) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="12"
                      strokeDasharray={`${(stats.overallHealth.healthy / 100) * 251.2} 251.2`}
                      strokeDashoffset="0"
                    />
                    {/* Attention (Yellow) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="12"
                      strokeDasharray={`${(stats.overallHealth.attention / 100) * 251.2} 251.2`}
                      strokeDashoffset={`-${(stats.overallHealth.healthy / 100) * 251.2}`}
                    />
                    {/* Critical (Red) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="12"
                      strokeDasharray={`${(stats.overallHealth.critical / 100) * 251.2} 251.2`}
                      strokeDashoffset={`-${((stats.overallHealth.healthy + stats.overallHealth.attention) / 100) * 251.2}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{Math.round(getHealthPercentage())}%</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Healthy</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.overallHealth.healthy}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Attention Required</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.overallHealth.attention}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Critical</span>
                  </div>
                  <span className="text-sm font-semibold">{stats.overallHealth.critical}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-destructive">{stats.criticalAlerts}</div>
                <p className="text-sm text-muted-foreground mt-2">Requires immediate attention</p>
              </div>
              <Button variant="destructive" className="w-full">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Service Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Service Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <span className="text-lg font-bold text-green-600">{stats.serviceSummary.completed}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{stats.serviceSummary.PENDING}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Upcoming</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{stats.serviceSummary.upcoming}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
          <CardDescription>Service dates and ticket dates with color indication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="md:col-span-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Service Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Ticket Date</span>
                </div>
              </div>
            </div>

            {/* Events on Selected Date */}
            <div>
              <h3 className="font-semibold mb-4">
                Events on {selectedDate?.toLocaleDateString()}
              </h3>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">Maintenance Service</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Fire Extinguisher - Building A</p>
                  <p className="text-xs text-muted-foreground mt-1">10:00 AM</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium">Ticket #TKT001</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Sprinkler System Issue</p>
                  <p className="text-xs text-muted-foreground mt-1">2:30 PM</p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Add Service / Ticket
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
