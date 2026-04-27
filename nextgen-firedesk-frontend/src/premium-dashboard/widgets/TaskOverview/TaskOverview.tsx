/**
 * TaskOverview Widget
 * Displays task distribution, status, technician performance, and upcoming events
 */

import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, PauseCircle, Users, ClipboardCheck, CalendarIcon, Filter, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  LabelList,
} from 'recharts';
import { History, LayoutPanelLeft } from 'lucide-react';
import Card3D from '../../components/Card3D';
import TaskTypeCard from './components/TaskTypeCard';
import TaskStatusBar from './components/TaskStatusBar';
import OverdueCard from './components/OverdueCard';
import TechnicianCard from './components/TechnicianCard';
import StatusBadge from './components/StatusBadge';
import { DashboardData } from '../../types/dashboard.types';
import ChartTypeSwitcher, { ChartType } from '../../components/ChartTypeSwitcher';
import { useChartPreferences } from '../../hooks/useChartPreferences';
import { dashboardApi } from '@/services/api/dashboardApi';
import { cn } from '@/lib/utils';
import LoadingSpinner from '../../components/LoadingSpinner';

// Project color scheme - 5-color palette only
// Flame Orange, Sky Blue, Slate Gray, White, Platinum
const COLORS = {
  primary: 'hsl(24, 95%, 53%)',      // Flame Orange
  info: 'hsl(200, 98%, 50%)',        // Sky Blue
  slate: 'hsl(215, 16%, 47%)',       // Slate Gray
  warning: 'hsl(24, 95%, 53%)',      // Use Orange for accents
};

const PIE_COLORS = [COLORS.info, COLORS.slate, COLORS.primary];

interface TaskOverviewProps {
  data: DashboardData;
  loading: boolean;
  role?: 'admin' | 'manager';
  plantId?: string;
  categoryId?: string;
  widgetSize?: number; // 12=Full, 8=2/3, 6=Half, 4=1/3
  className?: string;
}

export default function TaskOverview({ data, loading, role = 'admin', plantId, categoryId, widgetSize = 12, className }: TaskOverviewProps) {
  const { user } = useAuth();

  // Chart type preferences
  const { getChartType, setChartType } = useChartPreferences(user?.id, role);
  const [chartType, setChartTypeState] = useState<ChartType>(() => getChartType('task-overview-distribution'));

  // Date range filter state - default to 2026
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 1), // January 1, 2026
    to: new Date(2026, 11, 31)  // December 31, 2026
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [taskData, setTaskData] = useState(null);

  const handleChartTypeChange = (type: ChartType) => {
    setChartTypeState(type);
    setChartType('task-overview-distribution', type);
  };



  // Fetch tasks data with date filter when date range changes (debounced)
  useEffect(() => {
    console.log('[TaskOverview] useEffect triggered - plantId:', plantId, 'categoryId:', categoryId, 'dateRange:', dateRange);

    if (!plantId) {
      console.log('[TaskOverview] Skipping fetch - no plantId');
      return;
    }

    // Debounce API calls to prevent rapid-fire requests
    const debounceTimer = setTimeout(() => {
      const fetchTasksData = async () => {
        setIsLoading(true);
        try {
          console.log('[TaskOverview] Fetching task distribution with:', { plantId, categoryId, startDate: dateRange?.from, endDate: dateRange?.to });
          const result = await dashboardApi.getTaskDistribution({
            plantId,
            categoryId,
            startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          });
          console.log('[TaskOverview] Fetched data with date filter:', result);
          setTaskData(result);
        } catch (error) {
          console.error('[TaskOverview] Error fetching tasks data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTasksData();
    }, 300); // 300ms debounce

    // Cleanup function to cancel the timer if dependencies change before timeout
    return () => clearTimeout(debounceTimer);
  }, [plantId, categoryId, dateRange]);

  // Task data processing
  const taskTypes = {
    inspection: taskData?.serviceTypeBreakdown?.inspection || 0,
    testing: taskData?.serviceTypeBreakdown?.testing || 0,
    maintenance: taskData?.serviceTypeBreakdown?.maintenance || 0,
  };

  const taskStatus = {
    completed: taskData?.completedTasks || 0,
    inProgress: taskData?.inProgressTasks || 0,
    PENDING: taskData?.PENDINGTasks || 0,
    lapsed: taskData?.lapsedTasks || 0,
    waitingApproval: taskData?.waitingApprovalTasks || 0,
    rejected: taskData?.rejectedTasks || 0,
  };

  const overdueTasks = {
    last3Days: taskData?.overdueTaskBuckets?.last3Days || 0,
    last4to7Days: taskData?.overdueTaskBuckets?.last4to7Days || 0,
    moreThan7Days: taskData?.overdueTaskBuckets?.moreThan7Days || 0,
  };

  const totalTasks = taskData?.totalTasks || 0;

  // Chart data for task types
  const taskTypeChartData = [
    { name: 'Inspection', value: taskTypes.inspection, fill: COLORS.info },
    { name: 'Testing', value: taskTypes.testing, fill: COLORS.warning },
    { name: 'Maintenance', value: taskTypes.maintenance, fill: COLORS.primary },
  ];

  // Render task chart with Professional balanced styling (matching SystemOverview)
  const renderTaskChart = () => {
    // Calculate max value for proper Y-axis scaling
    const maxValue = Math.max(...taskTypeChartData.map(d => d.value), 1);
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
            <BarChart data={taskTypeChartData} margin={{ top: 25, right: 30, left: 0, bottom: 0 }} barCategoryGap="20%">
              <defs>
                <linearGradient id="taskInspectionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={COLORS.info} stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="taskTestingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.slate} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={COLORS.slate} stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="taskMaintenanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.5} />
                </linearGradient>
              </defs>
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
                {taskTypeChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? 'url(#taskInspectionGrad)' : index === 1 ? 'url(#taskTestingGrad)' : 'url(#taskMaintenanceGrad)'}
                  />
                ))}
                <LabelList dataKey="value" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={taskTypeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: COLORS.primary, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      default:
        const totalTasks = taskTypeChartData.reduce((sum, d) => sum + d.value, 0);

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
        const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }: any) => {
          const RADIAN = Math.PI / 180;
          const radius = outerRadius + 15;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);

          const displayValue = Math.floor(value);

          return (
            <text
              x={x}
              y={y}
              fill={PIE_COLORS[index]}
              textAnchor={x > cx ? 'start' : 'end'}
              dominantBaseline="central"
              className="text-[10px] font-black"
            >
              {displayValue.toLocaleString()} {name}
            </text>
          );
        };

        const displayData = taskTypeChartData.map(d => ({
          ...d,
          value: d.value === 0 ? 0.1 : d.value
        }));

        return (
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie margin={{ top: 15, right: 25, bottom: 15, left: 25 }}>
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
                  label={renderCustomLabel}
                  labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }}
                >
                  {PIE_COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-3xl font-black text-foreground leading-none">{totalTasks.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">Total Tasks</div>
            </div>
          </div>
        );
    }
  };

  // Technician performance data
  const techPerformance = useMemo(() => {
    return data.tasksOverview?.technicianPerformance?.map((tech: any) => {
      // Generate a simple trend based on efficiency (simulate  historical data)
      const baseTrend = tech.efficiency || tech.performanceScore || 50;
      const trend = Array.from({ length: 6 }, (_, i) => {
        const variance = Math.sin(i) * 5; // Small variance for visual effect
        return Math.max(0, Math.min(100, baseTrend + variance));
      });

      return {
        technicianName: tech.name || 'Unknown',
        avatar: (tech.name || 'U').substring(0, 2).toUpperCase(),
        efficiency: tech.efficiency || tech.performanceScore || 0,
        rating: tech.rating || 0,
        completed: tech.completedTasks || 0,
        waiting: tech.PENDINGTasks || 0,
        overdue: tech.overdueTasks || 0,
        trend: trend,
      };
    }) || [];
  }, [data.tasksOverview]);

  // Filter and format upcoming events
  const upcomingEvents = useMemo(() => {
    const activities = data.tasksOverview?.recentActivity || data.tasksOverview?.recentActivities || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activities
      .map((activity: any) => {
        const eventDate = activity.scheduledDate ? new Date(activity.scheduledDate) : (activity.dueDate ? new Date(activity.dueDate) : null);
        return {
          id: activity.id || Math.random().toString(),
          asset: activity.assetId || activity.assetName || '-',
          task: activity.serviceType || activity.taskType || '-',
          technician: activity.technician || activity.technicianName || '-',
          dateObj: eventDate,
          date: eventDate ? eventDate.toLocaleDateString() : '-',
          status: activity.status ? activity.status.toLowerCase().replace(' ', '_') : 'PENDING',
        };
      })
      .filter(event => event.dateObj && event.dateObj >= today)
      .sort((a, b) => (a.dateObj?.getTime() || 0) - (b.dateObj?.getTime() || 0))
      .slice(0, 20);
  }, [data.tasksOverview]);

  if (loading) {
    return (
      <Card3D className={cn("p-4 shadow-lg border-t-2 border-t-primary border-x border-b border-border/40 min-h-[300px] flex items-center justify-center", className)}>
        <LoadingSpinner text="Loading task overview..." />
      </Card3D>
    );
  }

  return (
    <Card3D className={cn("p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60", className)}>
      <div className="space-y-3">
        {/* Task Distribution */}
        {/* Header - optimized for small screens */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-primary/10 shrink-0 ${widgetSize <= 6 ? 'scale-75' : ''}`}>
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className={`font-bold text-foreground leading-tight truncate ${widgetSize <= 6 ? 'text-sm' : 'text-base'}`}>Task Overview</h2>
              {widgetSize > 6 && <p className="text-[10px] text-muted-foreground leading-tight truncate">Comprehensive task distribution</p>}
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
          </div>
        </div>

        <div className={`mb-4 flex flex-wrap items-center p-2 bg-muted/20 rounded-xl border border-border/40 ${widgetSize <= 6 ? 'gap-1' : 'gap-2'}`}>
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

        {/* Size-aware layout - different layouts based on widgetSize */}
        {widgetSize === 12 ? (
          // FULL WIDTH: Original side-by-side layout
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-8" style={{ minHeight: '240px' }}>
              {renderTaskChart()}
            </div>
            <div className="lg:col-span-4 flex flex-col gap-2">
              <div className="p-2 rounded-xl border border-border/40 bg-muted/5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Task Status</span>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.info }}>{taskStatus.completed}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Completed</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.slate }}>{taskStatus.inProgress}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">In Progress</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.primary }}>{taskStatus.PENDING}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Pending</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.slate }}>{taskStatus.lapsed}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Lapsed</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.info }}>{taskStatus.waitingApproval}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Waiting</div>
                  </div>
                  <div className="text-center py-1.5 rounded-md bg-background border border-border/20">
                    <div className="text-lg font-black leading-none" style={{ color: COLORS.primary }}>{taskStatus.rejected}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mt-0.5">Rejected</div>
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-xl border border-border/40 bg-muted/5 flex-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Overdue Tasks</span>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center px-2 py-1 rounded-md bg-background border border-border/10">
                    <span className="text-muted-foreground font-bold uppercase text-[9px]">Last 3 Days</span>
                    <span className="text-sm font-black">{overdueTasks.last3Days}</span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 rounded-md bg-background border border-border/10">
                    <span className="text-muted-foreground font-bold uppercase text-[9px]">4 to 7 Days</span>
                    <span className="text-sm font-black">{overdueTasks.last4to7Days}</span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 rounded-md bg-background border border-border/10">
                    <span className="text-muted-foreground font-bold uppercase text-[9px]">Over 7 Days</span>
                    <span className="text-sm font-black">{overdueTasks.moreThan7Days}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : widgetSize === 8 ? (
          // 2/3 WIDTH: Compact chart + one row of highly compact stats (Showing all 9 metrics)
          <div className="flex flex-col gap-2">
            <div className="w-full" style={{ minHeight: '180px', height: '220px' }}>
              {renderTaskChart()}
            </div>
            {/* Unified Task Stats Row - All 9 stats */}
            <div className="flex items-stretch gap-2 h-12">
              {/* Status Group (6 stats) */}
              <div className="flex-[2.5] grid grid-cols-6 gap-1 relative">
                <span className="absolute -top-2.5 left-1 text-[8px] font-black text-muted-foreground uppercase opacity-70">Task Status</span>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.info }}>{taskStatus.completed}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Done</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.slate }}>{taskStatus.inProgress}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Active</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.primary }}>{taskStatus.PENDING}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Wait</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none text-muted-foreground">{taskStatus.lapsed}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Lapse</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.info }}>{taskStatus.waitingApproval}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Appr</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-background shadow-sm text-center">
                  <div className="text-lg font-black leading-none" style={{ color: COLORS.primary }}>{taskStatus.rejected}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">Rej</div>
                </div>
              </div>

              <div className="w-px h-8 bg-border/20 self-center mx-0.5" />

              {/* Overdue Group (3 stats) */}
              <div className="flex-1 grid grid-cols-3 gap-1 relative">
                <span className="absolute -top-2.5 left-1 text-[8px] font-black text-muted-foreground uppercase opacity-70">Overdue</span>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center">
                  <div className="text-lg font-black">{overdueTasks.last3Days}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">3d</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center">
                  <div className="text-lg font-black">{overdueTasks.last4to7Days}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">7d</div>
                </div>
                <div className="px-1 py-1 flex flex-col justify-center rounded-lg border border-border/40 bg-muted/5 text-center">
                  <div className="text-lg font-black text-muted-foreground">{overdueTasks.moreThan7Days}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black mt-1">7d+</div>
                </div>
              </div>
            </div>
          </div>
        ) : widgetSize === 6 ? (
          // HALF WIDTH: Maximized chart with clarified stats (Full 9 metric set)
          <div className="flex flex-col gap-1">
            <div className="w-full" style={{ minHeight: '160px', height: '180px' }}>
              {renderTaskChart()}
            </div>
            {/* Status section (6 stats in 2 rows) */}
            <div className="flex items-start gap-2 px-0.5">
              <span className="text-[8px] uppercase font-black text-muted-foreground w-14 shrink-0 mt-2">Status</span>
              <div className="flex-1 grid grid-cols-3 gap-1">
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-background shadow-sm overflow-hidden">
                  <span className="text-sm font-black leading-none" style={{ color: COLORS.info }}>{taskStatus.completed}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">Done</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-background shadow-sm overflow-hidden">
                  <span className="text-sm font-black leading-none" style={{ color: COLORS.slate }}>{taskStatus.inProgress}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">Active</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-background shadow-sm overflow-hidden">
                  <span className="text-sm font-black leading-none" style={{ color: COLORS.primary }}>{taskStatus.PENDING}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">Wait</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-background shadow-sm overflow-hidden">
                  <span className="text-sm font-black leading-none text-muted-foreground">{taskStatus.lapsed}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">Lapse</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-background shadow-sm overflow-hidden">
                  <span className="text-sm font-black leading-none" style={{ color: COLORS.info }}>{taskStatus.waitingApproval}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">Appr</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-background shadow-sm overflow-hidden">
                  <span className="text-sm font-black leading-none" style={{ color: COLORS.primary }}>{taskStatus.rejected}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">Rej</span>
                </div>
              </div>
            </div>
            {/* Overdue section */}
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[8px] uppercase font-black text-muted-foreground w-14 shrink-0">Overdue</span>
              <div className="flex-1 grid grid-cols-3 gap-1">
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-muted/5 overflow-hidden">
                  <span className="text-sm font-black leading-none">{overdueTasks.last3Days}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">3d</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-muted/5 overflow-hidden">
                  <span className="text-sm font-black leading-none">{overdueTasks.last4to7Days}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">7d</span>
                </div>
                <div className="px-1.5 py-1 flex items-center justify-between rounded border border-border/40 bg-muted/5 overflow-hidden">
                  <span className="text-sm font-black leading-none text-muted-foreground">{overdueTasks.moreThan7Days}</span>
                  <span className="text-[7px] text-muted-foreground uppercase font-bold truncate">7d+</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 1/3 WIDTH: Chart Only - expanded to fill space
          <div className="flex flex-col">
            <div className="w-full" style={{ minHeight: '220px', height: '260px' }}>
              {renderTaskChart()}
            </div>
          </div>
        )}
      </div>
    </Card3D >
  );
}