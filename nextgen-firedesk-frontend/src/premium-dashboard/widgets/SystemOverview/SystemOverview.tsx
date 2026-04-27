/**
 * SystemOverview Widget
 * Displays KPI cards, performance comparison, and system health visualization
 */

import { useMemo, useState } from 'react';
import { Activity, ClipboardCheck, Zap, AlertCircle, TrendingUp, AlertTriangle, CheckCircle2, Flame, Award } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import MetricCard3D from '../../components/MetricCard3D';
import Card3D from '../../components/Card3D';
import ComparisonCard from './components/ComparisonCard';
import StatCardCompact from './components/StatCardCompact';
import ServiceCard from './components/ServiceCard';
import { DashboardData } from '../../types/dashboard.types';
import ChartTypeSwitcher, { ChartType } from '../../components/ChartTypeSwitcher';
import { useChartPreferences } from '../../hooks/useChartPreferences';
import { cn } from '@/lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';

type TimePeriod = 'day' | 'week' | 'month';

// Project color scheme - 5-color palette only
// Flame Orange, Sky Blue, Slate Gray, White, Platinum
const COLORS = {
  primary: 'hsl(24, 95%, 53%)',      // Flame Orange - healthy/good
  secondary: 'hsl(200, 98%, 50%)',   // Sky Blue - attention/info
  slate: 'hsl(215, 16%, 47%)',       // Slate Gray - critical/neutral
  platinum: 'hsl(0, 0%, 93%)',       // Platinum - background
  // Semantic aliases for charts
  success: 'hsl(24, 95%, 53%)',      // Use Orange for success
  warning: 'hsl(200, 98%, 50%)',     // Use Sky Blue for attention
  destructive: 'hsl(215, 16%, 47%)', // Use Slate for critical
  info: 'hsl(200, 98%, 50%)',        // Sky Blue
};

interface SystemOverviewProps {
  data: DashboardData;
  loading: boolean;
  role?: 'admin' | 'manager';
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
  widgetSize?: number; // 12=Full, 8=2/3, 6=Half, 4=1/3
  className?: string;
}

export default function SystemOverview({
  data,
  loading,
  role = 'admin',
  timePeriod = 'week',
  onTimePeriodChange,
  widgetSize = 12,
  className
}: SystemOverviewProps) {
  const { user } = useAuth();

  // Chart type preferences
  const { getChartType, setChartType } = useChartPreferences(user?.id, role);
  const [chartType, setChartTypeState] = useState<ChartType>(() => getChartType('system-overview-health'));

  const handleChartTypeChange = (type: ChartType) => {
    setChartTypeState(type);
    setChartType('system-overview-health', type);
  };

  // Map backend data to frontend format with fallbacks
  const systemHealth = useMemo(() => ({
    totalAssets: data.systemHealth?.totalAssets || 0,
    healthy: data.systemHealth?.breakdown?.healthy || 0,
    needsAttention: data.systemHealth?.breakdown?.attentionRequired || 0,
    critical: data.systemHealth?.breakdown?.notWorking || 0
  }), [data.systemHealth]);

  const criticalAlerts = data.systemHealth?.criticalAlerts || 0;

  const serviceSummary = useMemo(() => ({
    completed: data.systemHealth?.services?.completed || 0,
    PENDING: data.systemHealth?.services?.PENDING || 0,
    scheduled: data.systemHealth?.services?.scheduled || 0,
    total: data.systemHealth?.services?.total || 0
  }), [data.systemHealth]);

  const taskData = useMemo(() => ({
    taskStatus: {
      inProgress: data.tasksOverview?.statusBreakdown?.in_progress || 0,
    },
  }), [data.tasksOverview]);

  const healthPercentage = systemHealth.totalAssets > 0 ? Math.round((systemHealth.healthy / systemHealth.totalAssets) * 100) : 0;
  const efficiencyRate = data.tasksOverview?.taskCompletionEfficiency || 0;

  // Performance trend - placeholder sparkline data
  const performanceTrend = [
    { value: 85 }, { value: 87 }, { value: 86 }, { value: 89 }, { value: 91 }, { value: healthPercentage }
  ];

  // Comparison metrics (current vs previous period)
  const comparisonMetrics = useMemo(() => {
    const healthTrend = data.systemHealth?.trends?.health || 0;
    const previousHealth = healthPercentage > 0 ? Math.max(0, healthPercentage - Math.abs(healthTrend)) : 0;

    return {
      health: {
        current: healthPercentage,
        previous: previousHealth,
        change: healthTrend >= 0 ? `+${healthTrend}%` : `${healthTrend}%`,
      },
      efficiency: {
        current: efficiencyRate,
        previous: Math.max(0, efficiencyRate - 1.2),
        change: '+1.2%',
      },
      tasks: {
        current: taskData.taskStatus.inProgress,
        previous: Math.max(0, taskData.taskStatus.inProgress - 12),
        change: '+12',
      },
      alerts: {
        current: criticalAlerts,
        previous: criticalAlerts + 3,
        change: '-3',
      },
    };
  }, [healthPercentage, efficiencyRate, taskData.taskStatus.inProgress, criticalAlerts, data.systemHealth?.trends]);



  // Multi-layer radial data
  const radialHealthData = [
    { name: 'Healthy', value: healthPercentage, fill: COLORS.success },
    { name: 'Attention', value: Math.round((systemHealth.needsAttention / systemHealth.totalAssets) * 100) || 0, fill: COLORS.warning },
    { name: 'Critical', value: Math.round((systemHealth.critical / systemHealth.totalAssets) * 100) || 0, fill: COLORS.destructive },
  ];

  // Chart data for different visualizations
  const chartData = [
    { name: 'Healthy', value: systemHealth.healthy, percentage: healthPercentage, fill: COLORS.success },
    { name: 'Attention', value: systemHealth.needsAttention, percentage: Math.round((systemHealth.needsAttention / systemHealth.totalAssets) * 100) || 0, fill: COLORS.warning },
    { name: 'Critical', value: systemHealth.critical, percentage: Math.round((systemHealth.critical / systemHealth.totalAssets) * 100) || 0, fill: COLORS.destructive },
  ];

  // Render different chart types - Professional balanced styling
  const renderChart = () => {
    // Calculate max value for proper Y-axis scaling
    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const yAxisMax = Math.ceil(maxValue * 1.1); // Add 10% padding

    // Format large numbers to abbreviate (e.g., 10000 -> 10K)
    const formatYAxis = (value: number) => {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
      }
      return value.toString();
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 25, right: 30, left: 0, bottom: 5 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={true} tickLine={true} interval={0} />
              <YAxis
                tick={{ fontSize: 9 }}
                width={40}
                axisLine={true}
                tickLine={true}
                domain={[0, 'auto']}
                tickCount={5}
                allowDecimals={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="value" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={true} tickLine={true} interval={0} />
              <YAxis
                tick={{ fontSize: 9 }}
                width={40}
                axisLine={true}
                tickLine={true}
                domain={[0, 'auto']}
                tickCount={5}
                allowDecimals={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                cursor={{ fill: 'transparent' }}
              />
              <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: COLORS.primary, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const total = chartData.reduce((sum, d) => sum + d.value, 0);

        // Custom tooltip for better UX
        const CustomTooltip = ({ active, payload }: any) => {
          if (active && payload && payload.length) {
            return (
              <div className="bg-background/95 backdrop-blur-sm p-1.5 px-2.5 rounded-lg border border-border shadow-xl">
                <div className="flex items-center gap-2 text-[11px] font-black text-foreground uppercase tracking-tight">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
                  {payload[0].name}: {Math.floor(payload[0].value).toLocaleString()}
                </div>
              </div>
            );
          }
          return null;
        };

        // Custom label for pie segments
        const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }: any) => {
          const RADIAN = Math.PI / 180;
          // Position labels further out but with a smaller radius to keep them in container
          const radius = outerRadius + 15;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);

          const displayValue = Math.floor(value);

          return (
            <text
              x={x}
              y={y}
              fill={chartData[index]?.fill || COLORS.primary}
              textAnchor={x > cx ? 'start' : 'end'}
              dominantBaseline="central"
              className="text-[10px] font-black"
            >
              {displayValue.toLocaleString()} {name}
            </text>
          );
        };

        // Use a tiny value for 0 to ensure labels render
        const displayData = chartData.map(d => ({
          ...d,
          value: d.value === 0 ? 0.1 : d.value
        }));

        return (
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 15, right: 25, bottom: 15, left: 25 }}>
                <Tooltip content={<CustomTooltip />} position={{ x: 10, y: 10 }} />
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  minAngle={25}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-3xl font-black text-foreground leading-none">{total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">Assets</div>
            </div>
          </div>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis
                tick={{ fontSize: 9 }}
                width={40}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                tickCount={5}
                allowDecimals={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'stacked':
        return (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[{ name: 'Assets', healthy: systemHealth.healthy, attention: systemHealth.needsAttention, critical: systemHealth.critical }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="healthy" stackId="a" fill={COLORS.success} radius={[0, 8, 8, 0]}>
                <LabelList dataKey="healthy" position="right" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="attention" stackId="a" fill={COLORS.warning}>
                <LabelList dataKey="attention" position="right" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="critical" stackId="a" fill={COLORS.destructive}>
                <LabelList dataKey="critical" position="right" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radial':
      default:
        return (
          <div className="flex flex-col items-center justify-center p-4">
            <div className="relative" style={{ width: '200px', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="35%"
                  outerRadius="95%"
                  data={radialHealthData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={8}
                    background={{ fill: 'hsl(var(--muted))' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-3xl font-black text-foreground">{healthPercentage}%</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Overall Health</div>

                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] text-muted-foreground">Healthy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[10px] text-muted-foreground">Attention</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[10px] text-muted-foreground">Critical</span>
              </div>
            </div>
          </div>
        );
    }
  };


  if (loading) {
    return (
      <Card3D className={cn("p-4 shadow-lg border-t-2 border-t-primary border-x border-b border-border/40 min-h-[300px] flex items-center justify-center", className)}>
        <LoadingSpinner text="Loading system overview..." />
      </Card3D>
    );
  }

  return (
    <Card3D className={cn("p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60", className)}>
      {/* 3. System Health & Performance - Detailed Breakdown */}
      <div className="space-y-3">
        {/* Header - optimized for small screens */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-primary/10 shrink-0 ${widgetSize <= 6 ? 'scale-75' : ''}`}>
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className={`font-bold text-foreground leading-tight truncate ${widgetSize <= 6 ? 'text-sm' : 'text-base'}`}>System Overview</h2>
              {widgetSize > 6 && <p className="text-[10px] text-muted-foreground truncate">Real-time assets health</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={timePeriod} onValueChange={(tab) => onTimePeriodChange?.(tab as TimePeriod)}>
              <TabsList className="h-7">
                <TabsTrigger value="day" className="text-[10px] px-2 h-6">Day</TabsTrigger>
                <TabsTrigger value="week" className="text-[10px] px-2 h-6">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-[10px] px-2 h-6">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            {widgetSize > 4 && (
              <ChartTypeSwitcher
                currentType={chartType}
                onChange={handleChartTypeChange}
                availableTypes={['bar', 'line', 'pie']}
              />
            )}
          </div>
        </div>

        {/* Size-aware layout - different layouts based on widgetSize */}
        {widgetSize === 12 ? (
          // FULL WIDTH: Original side-by-side layout with chart and stats (Reverted to approved version)
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Chart Section */}
            <div className="lg:col-span-8" style={{ minHeight: '240px' }}>
              {renderChart()}
            </div>
            {/* Stats Section */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Assets Section */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block px-1">Assets Health</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="px-2 py-4 flex flex-col justify-center rounded-xl border border-border/40 bg-background shadow-sm text-center">
                    <div className="text-2xl font-black leading-tight" style={{ color: COLORS.primary }}>{systemHealth.healthy}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Healthy</div>
                  </div>
                  <div className="px-2 py-4 flex flex-col justify-center rounded-xl border border-border/40 bg-background shadow-sm text-center">
                    <div className="text-2xl font-black leading-tight" style={{ color: COLORS.secondary }}>{systemHealth.needsAttention}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Attention</div>
                  </div>
                  <div className="px-2 py-4 flex flex-col justify-center rounded-xl border border-border/40 bg-background shadow-sm text-center">
                    <div className="text-2xl font-black leading-tight" style={{ color: COLORS.slate }}>{systemHealth.critical}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Critical</div>
                  </div>
                </div>
              </div>
              {/* Services Summary */}
              <div className="p-3 rounded-xl border border-border/40 bg-muted/5 flex-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase font-bold text-muted-foreground">Services Summary</span>
                  <span className="text-sm font-black px-2.5 py-1 bg-background border border-border/20 rounded-full">{serviceSummary.total} Total</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="py-3 flex flex-col justify-center text-center rounded-lg bg-background/50 border border-border/10 shadow-sm">
                    <div className="text-xl font-black">{serviceSummary.completed}</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">Done</div>
                  </div>
                  <div className="py-3 flex flex-col justify-center text-center rounded-lg bg-background/50 border border-border/10 shadow-sm">
                    <div className="text-xl font-black" style={{ color: COLORS.secondary }}>{serviceSummary.PENDING}</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">Active</div>
                  </div>
                  <div className="py-3 flex flex-col justify-center text-center rounded-lg bg-background/50 border border-border/10 shadow-sm">
                    <div className="text-xl font-black text-muted-foreground">{serviceSummary.scheduled}</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">Later</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : widgetSize === 8 ? (
          // 2/3 WIDTH: Large chart + one row of highly compact stats
          <div className="flex flex-col gap-1.5">
            <div className="w-full" style={{ minHeight: '200px', height: '240px' }}>
              {renderChart()}
            </div>
            {/* Unified Stats Row - Consolidated with small labels */}
            <div className="flex items-stretch gap-1.5 h-11">
              {/* Assets Group */}
              <div className="flex-1 grid grid-cols-3 gap-1 relative">
                <span className="absolute -top-2 left-1 text-[7px] font-black text-muted-foreground uppercase opacity-70">Assets Health</span>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-xl font-black leading-none" style={{ color: COLORS.primary }}>{systemHealth.healthy}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Healthy</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-xl font-black leading-none" style={{ color: COLORS.secondary }}>{systemHealth.needsAttention}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Attn</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-xl font-black leading-none" style={{ color: COLORS.slate }}>{systemHealth.critical}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Crit</div>
                </div>
              </div>

              <div className="w-px h-8 bg-border/20 self-center mx-0.5" />

              {/* Services Group */}
              <div className="flex-1 grid grid-cols-4 gap-1 relative">
                <span className="absolute -top-2.5 left-1 text-[8px] font-black text-muted-foreground uppercase opacity-70">Services</span>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/20 text-center">
                  <div className="text-xl font-black leading-none">{serviceSummary.total}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Total</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center">
                  <div className="text-xl font-black leading-none">{serviceSummary.completed}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Done</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center">
                  <div className="text-xl font-black leading-none" style={{ color: COLORS.secondary }}>{serviceSummary.PENDING}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Active</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center">
                  <div className="text-xl font-black leading-none text-muted-foreground">{serviceSummary.scheduled}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Wait</div>
                </div>
              </div>
            </div>
          </div>
        ) : widgetSize === 6 ? (
          // HALF WIDTH: Maximized chart with clarified stats
          <div className="flex flex-col gap-1">
            <div className="w-full" style={{ minHeight: '160px', height: '180px' }}>
              {renderChart()}
            </div>
            {/* Clarified Assets section */}
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[8px] uppercase font-black text-muted-foreground w-12 shrink-0 text-left">Health</span>
              <div className="flex-1 grid grid-cols-3 gap-1">
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.primary }}>{systemHealth.healthy}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Healthy</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.secondary }}>{systemHealth.needsAttention}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Attn</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.slate }}>{systemHealth.critical}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Crit</span>
                </div>
              </div>
            </div>
            {/* Clarified Services section */}
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[8px] uppercase font-black text-muted-foreground w-12 shrink-0 text-left">Services</span>
              <div className="flex-1 grid grid-cols-3 gap-1">
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center overflow-hidden">
                  <span className="text-base font-black leading-none">{serviceSummary.completed}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Done</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.secondary }}>{serviceSummary.PENDING}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Active</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center overflow-hidden">
                  <span className="text-base font-black leading-none text-muted-foreground">{serviceSummary.scheduled}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Wait</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 1/3 WIDTH: Chart Only - expanded to fill space
          <div className="flex flex-col">
            <div className="w-full" style={{ minHeight: '280px', height: '320px' }}>
              {renderChart()}
            </div>
          </div>
        )}
      </div>
    </Card3D>
  );
}
