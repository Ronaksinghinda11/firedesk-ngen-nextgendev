/**
 * MaintenanceOverview Widget
 * Displays maintenance summary with month-over-month comparison
 */

import { useMemo, useState, useEffect } from 'react';
import { Wrench, FileDown, CheckCircle2, Clock, AlertTriangle, AlertCircle, CalendarIcon, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  LabelList,
} from 'recharts';
import Card3D from '../../components/Card3D';
import StatusCardCompact from '../../components/StatusCardCompact';
import { DashboardData, MaintenanceSummaryData } from '../../types/dashboard.types';
import ChartTypeSwitcher, { ChartType } from '../../components/ChartTypeSwitcher';
import { useChartPreferences } from '../../hooks/useChartPreferences';
import { dashboardApi } from '@/services/api/dashboardApi';
import { PremiumReportModal } from '../../components/PremiumReportModal';
import LoadingSpinner from '../../components/LoadingSpinner';


// Project color scheme - Matched SystemOverview
const COLORS = {
  primary: 'hsl(24, 95%, 53%)',      // Flame Orange - healthy/good
  info: 'hsl(200, 98%, 50%)',        // Sky Blue - active/PENDING
  warning: 'hsl(200, 98%, 50%)',     // Sky Blue - active/PENDING (mapped to info for consistency)
  destructive: 'hsl(215, 16%, 47%)', // Slate Gray - overdue/critical
  success: 'hsl(24, 95%, 53%)',      // Flame Orange
};

type MaintenanceType = 'maintenance' | 'inspection' | 'testing';

interface MaintenanceOverviewProps {
  data: DashboardData;
  loading: boolean;
  maintenanceTab: MaintenanceType;
  onTabChange: (tab: MaintenanceType) => void;
  role?: 'admin' | 'manager';
  plantId?: string;
  categoryId?: string;
  widgetSize?: number; // 12=Full, 8=2/3, 6=Half, 4=1/3
}

export default function MaintenanceOverview({
  data,
  loading,
  maintenanceTab,
  onTabChange,
  role = 'admin',
  plantId,
  categoryId,
  widgetSize = 12
}: MaintenanceOverviewProps) {
  const { user } = useAuth();
  // ... existing hooks ...
  const { getChartType, setChartType } = useChartPreferences(user?.id, role);
  const [chartType, setChartTypeState] = useState<ChartType>(() => getChartType('maintenance-overview'));
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Date range filter state - default to 2026
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 1), // January 1, 2026
    to: new Date(2026, 11, 31)  // December 31, 2026
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceDataState, setMaintenanceDataState] = useState(data.maintenanceSummary || null);

  const handleChartTypeChange = (type: ChartType) => {
    setChartTypeState(type);
    setChartType('maintenance-overview', type);
  };

  // Fetch maintenance data when filters change (debounced)
  useEffect(() => {
    console.log('[MaintenanceOverview] useEffect triggered');

    if (!plantId) {
      console.log('[MaintenanceOverview] Skipping fetch - no plantId');
      return;
    }

    // Debounce API calls to prevent rapid-fire requests
    const debounceTimer = setTimeout(() => {
      const fetchMaintenanceData = async () => {
        setIsLoading(true);
        try {
          console.log('[MaintenanceOverview] Fetching maintenance summary');
          const result = await dashboardApi.getMaintenanceSummary({
            plantId,
            categoryId,
            serviceType: maintenanceTab, // Pass the current tab as serviceType
            startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          });
          console.log('[MaintenanceOverview] Maintenance data fetched:', result);
          setMaintenanceDataState(result);
        } catch (error) {
          console.error('[MaintenanceOverview] Error fetching maintenance data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMaintenanceData();
    }, 300); // 300ms debounce

    // Cleanup function to cancel the timer if dependencies change before timeout
    return () => clearTimeout(debounceTimer);
  }, [plantId, categoryId, maintenanceTab, dateRange]);

  // Maintenance data from API
  const maintenanceData = useMemo(() => ({
    completedTasks: maintenanceDataState?.completedMaintenance || 0,
    // scheduledMaintenance = all non-completed/non-rejected tasks; subtract in_progress to avoid overlap with 'Active'
    PENDINGTasks: Math.max(0,
      (maintenanceDataState?.scheduledMaintenance || 0) -
      (maintenanceDataState?.inProgressMaintenance || 0)
    ),
    inProgressTasks: maintenanceDataState?.inProgressMaintenance || 0,
    overdueTasks: maintenanceDataState?.overdueTasks || 0,
    overdueTimeline: maintenanceDataState?.overdueTimeline || [
      { date: 'Week 1', count: 0, thisMonth: 0, lastMonth: 0 },
      { date: 'Week 2', count: 0, thisMonth: 0, lastMonth: 0 },
      { date: 'Week 3', count: 0, thisMonth: 0, lastMonth: 0 },
      { date: 'Week 4', count: 0, thisMonth: 0, lastMonth: 0 },
    ],
    // totalMaintenance = ALL tasks (including rejected/cancelled) in the date range
    totalMaintenance: maintenanceDataState?.totalMaintenance || 0,
    maintenanceEfficiency: maintenanceDataState?.maintenanceEfficiency || 0,
    categoryBreakdown: maintenanceDataState?.categoryBreakdown || [],
  }), [maintenanceDataState]);

  // Custom label formatter to hide zero values and prevent overlap
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;

    return (
      <text
        x={(x as number) + (width as number) / 2}
        y={(y as number) - 10}
        fill="hsl(var(--foreground))"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[10px] font-bold"
      >
        {value}
      </text>
    );
  };

  // Custom tooltip for better UX
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm p-2 rounded-lg border border-border shadow-xl">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-[11px] font-medium text-foreground uppercase tracking-tight">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}: {Math.floor(entry.value).toLocaleString()}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label for pie segments
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={index === 0 ? COLORS.primary : COLORS.info}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[10px] font-black"
      >
        {Math.floor(value).toLocaleString()} {name}
      </text>
    );
  };

  // Render different chart types
  const renderChart = () => {
    const chartData = maintenanceData.overdueTimeline;

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No maintenance data available
        </div>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="thisMonth" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: COLORS.primary, stroke: '#fff' }} name="This Month" />
              <Line type="monotone" dataKey="lastMonth" stroke={COLORS.info} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: COLORS.info, stroke: '#fff' }} name="Last Month" />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const thisMonthTotal = chartData.reduce((sum, item) => sum + item.thisMonth, 0);
        const lastMonthTotal = chartData.reduce((sum, item) => sum + item.lastMonth, 0);
        const totalTasks = thisMonthTotal + lastMonthTotal;
        const pieData = [
          { name: 'This Month', value: thisMonthTotal, fill: COLORS.primary },
          { name: 'Last Month', value: lastMonthTotal, fill: COLORS.info },
        ];

        return (
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 15, right: 25, bottom: 15, left: 25 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-3xl font-black text-foreground leading-none">{totalTasks.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">Tasks Overview</div>
            </div>
          </div>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="thisMonthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="lastMonthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.info} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="thisMonth" stroke={COLORS.primary} fill="url(#thisMonthAreaGrad)" name="This Month" strokeWidth={2} />
              <Area type="monotone" dataKey="lastMonth" stroke={COLORS.info} fill="url(#lastMonthAreaGrad)" name="Last Month" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'radial':
        const avgThisMonth = chartData.reduce((sum, item) => sum + item.thisMonth, 0) / chartData.length || 0;
        const radialData = [{ name: 'This Month Avg', value: avgThisMonth, fill: COLORS.primary }];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={10} fill={COLORS.primary} background={{ fill: 'hsl(var(--muted))' }} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold text-2xl">
                {avgThisMonth.toFixed(0)}
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
                Avg Tasks
              </text>
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      case 'stacked':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="thisMonth" stackId="a" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="This Month">
                <LabelList dataKey="thisMonth" content={renderCustomLabel} />
              </Bar>
              <Bar dataKey="lastMonth" stackId="a" fill={COLORS.info} radius={[4, 4, 0, 0]} name="Last Month">
                <LabelList dataKey="lastMonth" content={renderCustomLabel} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 5 }} maxBarSize={60}>
              <defs>
                <linearGradient id="thisMonthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="lastMonthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.info} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} width={45} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="thisMonth" stackId="a" fill="url(#thisMonthGrad)" radius={[4, 4, 0, 0]} name="This Month">
                <LabelList dataKey="thisMonth" content={renderCustomLabel} />
              </Bar>
              <Bar dataKey="lastMonth" stackId="a" fill="url(#lastMonthGrad)" radius={[4, 4, 0, 0]} name="Last Month">
                <LabelList dataKey="lastMonth" content={renderCustomLabel} />
              </Bar>
              <Line
                type="monotone"
                dataKey="thisMonth"
                stroke={COLORS.primary}
                strokeWidth={2}
                dot={{ fill: COLORS.primary, r: 3, strokeWidth: 2, stroke: '#fff' }}
                name="Trend"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return (
      <Card3D className="p-4 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60 min-h-[300px] flex items-center justify-center">
        <LoadingSpinner text="Loading maintenance overview..." />
      </Card3D>
    );
  }

  return (
    <>
      <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-orange-500/10 ${widgetSize <= 6 ? 'scale-75' : ''}`}>
              <Wrench className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h2 className={`font-bold text-foreground truncate ${widgetSize <= 6 ? 'text-sm' : 'text-base'}`}>Maintenance Overview</h2>
              {widgetSize > 6 && <p className="text-[10px] text-muted-foreground truncate">Month-over-month comparison</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {widgetSize > 4 && (
              <ChartTypeSwitcher
                currentType={chartType}
                onChange={handleChartTypeChange}
                availableTypes={['bar', 'line', 'pie']}
              />
            )}

            {/* Date Range Filter */}

            <Tabs value={maintenanceTab} onValueChange={(v) => onTabChange(v as MaintenanceType)}>
              <TabsList className="h-8">
                <TabsTrigger value="inspection" className="text-[10px] px-2.5">
                  {widgetSize <= 6 ? 'Insp' : 'Inspection'}
                </TabsTrigger>
                <TabsTrigger value="testing" className="text-[10px] px-2.5">
                  {widgetSize <= 6 ? 'Test' : 'Testing'}
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="text-[10px] px-2.5">
                  {widgetSize <= 6 ? 'Maint' : 'Maintenance'}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              onClick={() => setReportModalOpen(true)}
              size="sm"
              className={`h-8 gradient-orange text-white text-[10px] ${widgetSize <= 6 ? 'px-2' : ''}`}
            >
              <FileDown className="h-3.5 w-3.5" />
              {widgetSize <= 6 ? '' : ''}
            </Button>
          </div>
        </div>

        <div className={`mb-2 flex flex-wrap items-center p-2 bg-muted/20 rounded-xl border border-border/40 ${widgetSize <= 6 ? 'gap-1' : 'gap-2'}`}>
          <div className={`flex items-center border-r border-border/40 text-muted-foreground ${widgetSize <= 6 ? 'px-1 mr-0.5' : 'px-2 mr-1 gap-1.5'}`}>
            <Filter className="h-3 w-3" />
            {widgetSize > 6 && <span className="text-[10px] font-black uppercase tracking-wider">Filters</span>}
          </div>
          <Popover open={datePickerOpen} onOpenChange={(open) => {
            setDatePickerOpen(open);
            if (open) setTempDateRange(dateRange);
          }}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`h-7 text-[10px] justify-start text-left font-normal bg-background/50 font-medium ${widgetSize <= 6 ? 'w-auto flex-1' : 'w-full max-w-[230px]'}`}>
                <CalendarIcon className="mr-2 h-3 w-3" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, widgetSize <= 6 ? 'MMM dd' : 'LLL dd, y')} - {format(dateRange.to, widgetSize <= 6 ? 'MMM dd' : 'LLL dd, y')}</>
                  ) : format(dateRange.from, 'LLL dd, y')
                ) : <span>Pick a date range</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
              />
              <div className="flex items-center justify-end gap-2 p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempDateRange(dateRange);
                    setDatePickerOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDateRange(tempDateRange);
                    setDatePickerOpen(false);
                  }}
                  disabled={!tempDateRange?.from || !tempDateRange?.to}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filter Button */}
          {dateRange && (dateRange.from?.getFullYear() !== 2026 || dateRange.to?.getFullYear() !== 2026) && (
            <Button
              onClick={() => setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) })}
              variant="ghost"
              size="sm"
              className={`h-7 text-[9px] text-primary font-black uppercase hover:bg-primary/5 ${widgetSize <= 6 ? 'px-1' : 'px-2'}`}
            >
              <X className="h-3 w-3 mr-1" /> {widgetSize <= 6 ? '' : 'Reset'}
            </Button>
          )}

        </div>

        {widgetSize === 12 ? (
          // FULL WIDTH: Original side-by-side layout
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-8 overflow-visible">
              <div className="flex items-center mb-2 px-1">
                <h3 className="text-[11px] uppercase font-bold text-muted-foreground">Maintenance Activity</h3>
              </div>
              <div className="h-60 relative flex flex-col">
                {isLoading && (
                  <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                    <LoadingSpinner size="sm" text="Updating..." />
                  </div>
                )}
                <div className="flex-1 w-full overflow-hidden">
                  {renderChart()}
                </div>
                <div className="shrink-0 flex items-center justify-center gap-3 py-1 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary }}></div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">This Month</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.info }}></div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Last Month</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-2 py-0.5">
              {/* Task Summary */}
              <div className="p-2 rounded-xl border border-border/40 bg-muted/5">
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Task Summary</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-background border border-border/20 rounded-full">
                    {maintenanceData.totalMaintenance.toLocaleString()} Total
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.success }}>{maintenanceData.completedTasks}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Done</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.info }}>{maintenanceData.inProgressTasks}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Active</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.warning }}>{maintenanceData.PENDINGTasks}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Pending</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.destructive }}>{maintenanceData.overdueTasks}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Overdue</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : widgetSize === 8 ? (
          // 2/3 WIDTH: Compact chart + one row of highly compact stats
          <div className="flex flex-col gap-2">
            <div className="w-full" style={{ minHeight: '180px', height: '220px' }}>
              {renderChart()}
            </div>
            {/* Unified Maintenance Stats Row */}
            <div className="flex items-stretch gap-2 h-12">
              <div className="flex-1 grid grid-cols-4 gap-1 relative">
                <span className="absolute -top-2.5 left-1 text-[8px] font-black text-muted-foreground uppercase opacity-70">Task Summary</span>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.success }}>{maintenanceData.completedTasks}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Done</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.info }}>{maintenanceData.inProgressTasks}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Active</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.warning }}>{maintenanceData.PENDINGTasks}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Wait</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.destructive }}>{maintenanceData.overdueTasks}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Overdue</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary }}></div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase">This Month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.info }}></div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Last Month</span>
              </div>
            </div>
          </div>
        ) : widgetSize === 6 ? (
          // HALF WIDTH: Maximized chart with clarified stats
          <div className="flex flex-col gap-1.5">
            <div className="w-full" style={{ minHeight: '160px', height: '180px' }}>
              {renderChart()}
            </div>
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[8px] uppercase font-black text-muted-foreground w-12 shrink-0">Summary</span>
              <div className="flex-1 grid grid-cols-4 gap-1">
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.success }}>{maintenanceData.completedTasks}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Done</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.info }}>{maintenanceData.inProgressTasks}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Active</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.warning }}>{maintenanceData.PENDINGTasks}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">Wait</span>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center overflow-hidden">
                  <span className="text-base font-black leading-none" style={{ color: COLORS.destructive }}>{maintenanceData.overdueTasks}</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-black truncate mt-1">OD</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2.5 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: COLORS.primary }}></div>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">This</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: COLORS.info }}></div>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Last</span>
              </div>
            </div>
          </div>
        ) : (
          // 1/3 WIDTH: Chart Only
          <div className="flex flex-col">
            <div className="w-full h-64 flex flex-col">
              <div className="flex-1 w-full">
                {renderChart()}
              </div>
              <div className="shrink-0 flex items-center justify-center gap-3 py-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary }}></div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">This Month</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.info }}></div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Last Month</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card3D>

      <PremiumReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="service"
        serviceType={maintenanceTab === 'maintenance' ? 'Maintenance' : maintenanceTab === 'inspection' ? 'Inspection' : 'Testing'}
        plantId={plantId}
        categoryId={categoryId}
      />
    </>
  );
}
