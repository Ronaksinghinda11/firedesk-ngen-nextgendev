/**
 * RefillStatusSummary Widget
 * Displays refill status with urgent vs standard breakdown
 * Supports comprehensive filtering including Location, Sub-Type, Refill Status
 */

import { useState, useMemo, useEffect } from 'react';
import { Package, FileDown, X, Calendar as CalendarIcon, Filter, CheckCircle2, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
  LineChart,
  AreaChart,
  LabelList,
} from 'recharts';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import Card3D from '../../components/Card3D';
import { DashboardData, RefillStatusData } from '../../types/dashboard.types';
import { dashboardApi } from '@/services/api/dashboardApi';
import ChartTypeSwitcher, { ChartType } from '../../components/ChartTypeSwitcher';
import { useChartPreferences } from '../../hooks/useChartPreferences';
import { PremiumReportModal } from '../../components/PremiumReportModal';
import { api } from '@/lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

// Project color scheme
const COLORS = {
  destructive: 'hsl(0, 84.2%, 60.2%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(142, 76%, 36%)', // Changed from blue to green
  primary: 'hsl(24, 95%, 53%)',
};

// Distinct color palette for pie chart slices — paired (completed=solid, scheduled=lighter) per building
const PIE_BUILDING_COLORS = [
  { completed: 'hsl(142, 76%, 36%)', scheduled: 'hsl(142, 76%, 65%)' },   // Green
  { completed: 'hsl(217, 91%, 50%)', scheduled: 'hsl(217, 91%, 75%)' },   // Blue
  { completed: 'hsl(24, 95%, 53%)',  scheduled: 'hsl(24, 95%, 78%)' },    // Orange
  { completed: 'hsl(280, 65%, 50%)', scheduled: 'hsl(280, 65%, 75%)' },   // Purple
  { completed: 'hsl(38, 92%, 50%)',  scheduled: 'hsl(38, 92%, 75%)' },    // Amber
  { completed: 'hsl(0, 84%, 55%)',   scheduled: 'hsl(0, 84%, 78%)' },     // Red
  { completed: 'hsl(170, 75%, 38%)', scheduled: 'hsl(170, 75%, 65%)' },   // Teal
  { completed: 'hsl(330, 81%, 55%)', scheduled: 'hsl(330, 81%, 78%)' },   // Pink
];

interface RefillStatusSummaryProps {
  data: DashboardData;
  loading: boolean;
  role?: 'admin' | 'manager';
  plantId?: string;
  categoryId?: string;
  onLocalFiltersChange?: (filters: {
    buildingId?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  widgetSize?: number;
  className?: string;
}

export default function RefillStatusSummary({
  data,
  loading: initialLoading,
  role = 'admin',
  plantId,
  categoryId,
  onLocalFiltersChange,
  widgetSize = 12,
  className
}: RefillStatusSummaryProps) {
  const { user } = useAuth();

  const { getChartType, setChartType } = useChartPreferences(user?.id, role);
  const [chartType, setChartTypeState] = useState<ChartType>(() => getChartType('refill-status-summary'));

  const handleChartTypeChange = (type: ChartType) => {
    setChartTypeState(type);
    setChartType('refill-status-summary', type);
  };

  // State for fetching data
  const [refillData, setRefillData] = useState<RefillStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState<RefillStatusData['filterOptions']>();

  // Local filter states
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [subTypeFilter, setSubTypeFilter] = useState<string>('all');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [capacityFilter, setCapacityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 1), // January 1, 2026
    to: new Date(2026, 11, 31)  // December 31, 2026
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Determine which dimension to group by based on active filters
  const determineGroupBy = (): 'building' | 'location' | 'product' | 'type' | 'subType' | 'refillStatus' | 'month' => {
    // Drill down based on what's already filtered
    if (subTypeFilter !== 'all') return 'month'; // Show timeline when subType is selected
    if (typeFilter !== 'all') return 'subType'; // Show sub-types
    if (productFilter !== 'all') return 'type'; // Show types
    if (locationFilter !== 'all') return 'product'; // Show products
    if (buildingFilter !== 'all') return 'location'; // Show locations
    return 'building'; // Default: group by buildings
  };

  const groupBy = determineGroupBy();

  // Initial load from props
  useEffect(() => {
    if (data?.refillStatus && !refillData) {
      // Optional: Set initial data if needed, or just let the fetch happen
    }
  }, [data]);

  // Fetch data when filters change OR use prop data if using defaults
  useEffect(() => {
    // Don't fetch if minimal params aren't met
    if (!plantId || plantId === 'all') return;

    // Check if all filters are at default values
    const isUsingDefaultFilters =
      buildingFilter === 'all' &&
      locationFilter === 'all' &&
      productFilter === 'all' &&
      typeFilter === 'all' &&
      subTypeFilter === 'all' &&
      manufacturerFilter === 'all' &&
      capacityFilter === 'all' &&
      dateRange?.from?.getFullYear() === 2026 &&
      dateRange?.from?.getMonth() === 0 &&
      dateRange?.from?.getDate() === 1 &&
      dateRange?.to?.getFullYear() === 2026 &&
      dateRange?.to?.getMonth() === 11 &&
      dateRange?.to?.getDate() === 31;

    console.log('[Refill] Effect triggered:', {
      isUsingDefaultFilters,
      hasPropData: !!data?.refillStatus,
      plantId,
      categoryId
    });

    // If using default filters and we have prop data, use it (skip API call)
    if (isUsingDefaultFilters && data?.refillStatus) {
      console.log('[Refill] ✅ Using prop data (no API call needed)');
      setRefillData(data.refillStatus as unknown as RefillStatusData);
      if (data.refillStatus.filterOptions) {
        setFilterOptions(data.refillStatus.filterOptions);
      }
      setIsLoading(false);
      return;
    }

    // User has changed local filters - make API call
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const filters = {
          plantId,
          categoryId,
          building_id: buildingFilter !== 'all' ? buildingFilter : undefined,
          location: locationFilter !== 'all' ? locationFilter : undefined,
          productId: productFilter !== 'all' ? productFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          subType: subTypeFilter !== 'all' ? subTypeFilter : undefined,
          manufacturerId: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
          capacity: capacityFilter !== 'all' ? capacityFilter : undefined,
          startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
          endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          groupBy: groupBy as any,
          granularity: (dateRange?.from ? 'day' : 'month') as 'day' | 'week' | 'month'
        };

        console.log('[Refill] 🔄 Making API call (local filters active) - GroupBy:', groupBy, 'Filters:', filters);
        const result = await dashboardApi.getRefillStatus(filters);
        console.log('[Refill] API Result:', result);
        setRefillData(result);

        // Only update filter options if no drilled-down filters are active
        // This prevents options from disappearing when a user makes a selection
        const isBaseState =
          buildingFilter === 'all' &&
          locationFilter === 'all' &&
          productFilter === 'all' &&
          typeFilter === 'all' &&
          subTypeFilter === 'all' &&
          manufacturerFilter === 'all' &&
          capacityFilter === 'all';

        // Check if filterOptions format has changed to objects
        const hasFormatChanged = filterOptions?.buildings?.length > 0 &&
          typeof filterOptions.buildings[0] === 'string';

        if (isBaseState || !filterOptions || hasFormatChanged) {
          setFilterOptions(result.filterOptions);
        }

        if (onLocalFiltersChange) {
          onLocalFiltersChange({
            buildingId: (filters as any).building_id,
            startDate: filters.startDate,
            endDate: filters.endDate
          });
        }
      } catch (error) {
        console.error("Failed to fetch Refill Status data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId, categoryId, buildingFilter, locationFilter, productFilter, typeFilter, subTypeFilter, manufacturerFilter, capacityFilter, dateRange]);




  const handleClearFilters = () => {
    setBuildingFilter('all');
    setLocationFilter('all');
    setProductFilter('all');
    setTypeFilter('all');
    setSubTypeFilter('all');
    setManufacturerFilter('all');
    setCapacityFilter('all');
    setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) });
  };

  // Chart data calculation
  const chartData = useMemo(() => {
    const raw = refillData?.chartData || [];
    return raw.map((item: any) => {
      const name = item.displayMonth || item.month || item.name || 'Unknown';
      // Use actual scheduled value from backend, NOT total
      const scheduled = item.scheduled || 0;
      const completed = item.completed || 0;
      const total = scheduled + completed + (item.overdue || 0);
      return {
        ...item,
        name,
        scheduled,
        completed,
        PENDING: item.PENDING || 0,
        efficiency: (total > 0) ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [refillData]);

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
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index, fill }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={fill}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[10px] font-black"
      >
        {Math.floor(value).toLocaleString()} {name}
      </text>
    );
  };

  const renderChart = () => {
    if (!refillData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No refill data available for selected filters
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 5 }} barCategoryGap="15%">
              <defs>
                <linearGradient id="scheduledGradRefill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="completedGradRefill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} axisLine={true} tickLine={true} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="scheduled" fill="url(#scheduledGradRefill)" radius={[4, 4, 0, 0]} name="Scheduled" maxBarSize={60}>
                <LabelList dataKey="scheduled" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="completed" fill="url(#completedGradRefill)" radius={[4, 4, 0, 0]} name="Completed" maxBarSize={60}>
                <LabelList dataKey="completed" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} axisLine={true} tickLine={true} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="scheduled" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: COLORS.primary, stroke: '#fff' }} name="Scheduled" />
              <Line type="monotone" dataKey="completed" stroke={COLORS.success} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: COLORS.success, stroke: '#fff' }} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        // Build pie slices: each building gets 2 slices (completed + scheduled) in paired colors
        const pieData: { name: string; value: number; fill: string; buildingIndex: number }[] = [];
        chartData.forEach((item, idx) => {
          const colors = PIE_BUILDING_COLORS[idx % PIE_BUILDING_COLORS.length];
          if ((item.completed || 0) > 0) {
            pieData.push({ name: `${item.name} (Completed)`, value: item.completed, fill: colors.completed, buildingIndex: idx });
          }
          if ((item.scheduled || 0) > 0) {
            pieData.push({ name: `${item.name} (Scheduled)`, value: item.scheduled, fill: colors.scheduled, buildingIndex: idx });
          }
        });

        const pieTotal = pieData.reduce((acc, d) => acc + d.value, 0);

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
              <div className="text-3xl font-black text-foreground leading-none">{pieTotal.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">Total Refills</div>
            </div>
          </div>
        );

      case 'area':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="refillScheduledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="refillCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="scheduled" stroke={COLORS.primary} fill="url(#refillScheduledGrad)" name="Scheduled" />
              <Area type="monotone" dataKey="completed" stroke={COLORS.success} fill="url(#refillCompletedGrad)" name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  const isDefaultDateRange = dateRange?.from?.getFullYear() === 2026 && dateRange?.to?.getFullYear() === 2026 && dateRange?.from?.getMonth() === 0 && dateRange?.from?.getDate() === 1 && dateRange?.to?.getMonth() === 11 && dateRange?.to?.getDate() === 31;
  const isFilterActive = buildingFilter !== 'all' || locationFilter !== 'all' || productFilter !== 'all' || typeFilter !== 'all' || subTypeFilter !== 'all' || manufacturerFilter !== 'all' || capacityFilter !== 'all' || !isDefaultDateRange;

  return (
    <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Refill Status Summary</h2>
            <p className="text-[9px] text-muted-foreground">Comprehensive refill performance metrics</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setReportModalOpen(true)}
            size="sm"
            className="h-8 gradient-orange text-white text-[10px]"
          >
            <FileDown className="h-3.5 w-3.5" />
          </Button>
          <ChartTypeSwitcher
            currentType={chartType}
            onChange={handleChartTypeChange}
            availableTypes={['bar', 'line', 'pie', 'area']}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 p-1.5 bg-muted/20 rounded-xl border border-border/40">
        <div className="flex items-center gap-1.5 px-2 border-r border-border/40 mr-1 text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-wider">Filters</span>
        </div>

        {/* Date Range - Compact version */}
        <Popover open={datePickerOpen} onOpenChange={(open) => {
          setDatePickerOpen(open);
          if (open) setTempDateRange(dateRange);
        }}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-7 text-[10px] px-2 font-bold bg-background/50 border-border/40 hover:bg-background">
              <CalendarIcon className="mr-1.5 h-3 w-3 text-primary/70" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>{format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, y')}</>
                ) : (format(dateRange.from, 'MMM dd, y'))
              ) : (<span>Date Range</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from || dateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
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

        {/* Filters in a row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Building</span>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {filterOptions?.buildings?.map((b: any) => (<SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)) || []}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Location</span>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {filterOptions?.locations?.map((l: any) => (<SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)) || []}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Product</span>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {filterOptions?.products?.map((p: any, idx: number) => (
                  <SelectItem key={`${p.id || p}-${idx}`} value={p.id || p} className="text-xs">{p.name || p}</SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Type</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {filterOptions?.types?.map((t: any) => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)) || []}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Sub Type</span>
            <Select value={subTypeFilter} onValueChange={setSubTypeFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Sub Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub Types</SelectItem>
                {filterOptions?.subTypes?.map((st: any) => (<SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>)) || []}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Manufacturer</span>
            <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[160px] bg-background/50 font-medium">
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {filterOptions?.manufacturers?.map((m: any) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Capacity</span>
            <Select value={capacityFilter} onValueChange={setCapacityFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Capacity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Capacities</SelectItem>
                {filterOptions?.capacities?.map((c: any) => (
                  <SelectItem key={c} value={String(c)} className="text-xs">{c}</SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          {isFilterActive && (
            <Button onClick={handleClearFilters} variant="ghost" size="sm" className="h-7 text-[9px] px-2 text-primary font-black uppercase hover:bg-primary/5">
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>


      </div>

      <div className="h-64 w-full flex flex-col mt-0.5">
        {isLoading ? (
          <div className="flex-1 w-full flex items-center justify-center bg-muted/5 backdrop-blur-[1px] rounded-lg">
            <LoadingSpinner size="sm" text="Updating refill data..." />
          </div>
        ) : (
          <>
            <div className="flex-1 w-full overflow-hidden">
              {renderChart()}
            </div>
            <div className="shrink-0 flex items-center justify-center gap-3 py-1 flex-wrap">
              {chartType === 'pie' ? (
                chartData.filter(item => (item.scheduled || 0) + (item.completed || 0) > 0).map((item, idx) => {
                  const colors = PIE_BUILDING_COLORS[idx % PIE_BUILDING_COLORS.length];
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors.completed }}></div>
                        <span className="text-[8px] font-bold text-muted-foreground tracking-tight">{item.name} Done</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors.scheduled }}></div>
                        <span className="text-[8px] font-bold text-muted-foreground tracking-tight">Sched</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary }}></div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Scheduled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.success }}></div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Completed</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <PremiumReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="refill"
        plantId={plantId}
        categoryId={categoryId}
      />
    </Card3D>
  );
}
