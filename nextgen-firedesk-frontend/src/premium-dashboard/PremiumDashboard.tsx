/**
 * Premium Dashboard - Refactored with Modular Architecture
 * Preserves all existing UI and functionality while adding widget management
 */

import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSystemHealthData } from '@/hooks/useSystemHealthData';
import { dashboardApi } from '@/services/api/dashboardApi';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileDown,
  Filter,
  Wrench,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  MapPin,
  TrendingUp,
  TrendingDown,
  Plus,
  Settings,
  BarChart3,
  Droplet,
  Package,
  Users,
  Calendar,
  XCircle,
  Award,
  Building2,
  Layers,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  Cell,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { GenerateReportModal } from '@/components/dashboard/GenerateReportModal';

// Import modular widgets using React.lazy for code splitting
const SystemOverview = lazy(() => import('./widgets/SystemOverview/SystemOverview'));
const TaskOverview = lazy(() => import('./widgets/TaskOverview/TaskOverview'));
const HydrostaticTestOverview = lazy(() => import('./widgets/HydrostaticTestOverview/HydrostaticTestOverview'));
const RefillStatusSummary = lazy(() => import('./widgets/RefillStatusSummary/RefillStatusSummary'));
const AssetDistribution = lazy(() => import('./widgets/AssetDistribution/AssetDistribution'));
const MaintenanceOverview = lazy(() => import('./widgets/MaintenanceOverview/MaintenanceOverview'));
const TechnicianPerformance = lazy(() => import('./widgets/TechnicianPerformance/TechnicianPerformance'));

// Import components
import FilterBar from './components/FilterBar';
import AddWidgetButton from './components/AddWidgetButton';
import SortableWidget from './components/SortableWidget';

// Import hooks
import { useWidgetLayout } from './hooks/useWidgetLayout';

// Import Pump Room widgets and context
import { PumpRoomDataProvider } from './contexts/PumpRoomDataContext';
// Using lazy loading for Pump Room widgets as well
const PumpPerformanceWidget = lazy(() => import('./widgets/PumpSystemOverview/PumpPerformanceWidget'));
const SupportSystemStatusWidget = lazy(() => import('./widgets/PumpMaintenanceOverview/SupportSystemStatusWidget'));
const TrendsPerformanceWidget = lazy(() => import('./widgets/PumpTrends/TrendsPerformanceWidget'));

// Import dnd-kit
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import LoadingSpinner from './components/LoadingSpinner';
import Card3D from './components/Card3D';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Types
type TimePeriod = 'day' | 'week' | 'month';
type MaintenanceType = 'maintenance' | 'inspection' | 'testing';
type UserRole = 'admin' | 'manager';

interface PremiumDashboardProps {
  role: UserRole;
}

export default function PremiumDashboard({ role }: PremiumDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [systemOverviewTimePeriod, setSystemOverviewTimePeriod] = useState<'day' | 'week' | 'month'>('week'); // Separate state for System Overview
  const [maintenanceTab, setMaintenanceTab] = useState<MaintenanceType>('maintenance');
  const [filtersReady, setFiltersReady] = useState(false); // Track when plant and category are selected

  // Filter states
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [plantFilter, setPlantFilter] = useState(''); // Start with empty, will auto-select first plant
  const [categoryFilter, setCategoryFilter] = useState(''); // Start with empty, will auto-select first category
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('month');
  const [productFilter, setProductFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('all');

  // Data for filter dropdowns
  const [plants, setPlants] = useState<Array<{ id: string; plantName: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; categoryName: string }>>([]);
  const [buildings, setBuildings] = useState<Array<{ id: string; buildingName: string }>>([]);
  const [products, setProducts] = useState<Array<{ _id: string; productName: string }>>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [capacities, setCapacities] = useState<string[]>([]);

  // Widget layout management with persistence
  const { visibleWidgets, widgetOrder, widgetSizes, toggleWidget, reorderWidgets, updateWidgetSize } = useWidgetLayout(user?.id, role);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id as string);
      const newIndex = widgetOrder.indexOf(over.id as string);

      const newOrder = [...widgetOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);

      reorderWidgets(newOrder);
    }
  };

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch filter options based on role
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        if (role === 'admin') {
          // Admin sees ALL plants
          const plantsResponse = await api.get('/plants');
          const allPlants = (plantsResponse as any).plants || [];
          allPlants.sort((a: any, b: any) => a.plantName.localeCompare(b.plantName));
          setPlants(allPlants);
        } else {
          // Manager sees only assigned plants
          const managerResponse = await api.get('/manager');
          const managers = (managerResponse as any).allManager || [];

          // Try multiple fields where the user ID might be stored
          const currentManager = managers.find((m: any) =>
            m.userId === user?.id || m.user?.id === user?.id || m.user?._id === user?.id
          );
          let managerPlants: Array<{ id: string; plantName: string }> = [];
          if (currentManager?.plants) {
            managerPlants = currentManager.plants;
          }
          managerPlants.sort((a, b) => a.plantName.localeCompare(b.plantName));
          setPlants(managerPlants);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    if (user) {
      fetchFilterOptions();
    }
  }, [user, role]);

  // Auto-select the first plant when plants are loaded
  useEffect(() => {
    if (plants.length > 0 && !plantFilter) {
      console.log('[PremiumDashboard] Auto-selecting first plant:', plants[0].plantName);
      setPlantFilter(plants[0].id);
    }
  }, [plants]);

  // Fetch categories and buildings when plant selection changes
  useEffect(() => {
    const fetchPlantDependentFilters = async () => {
      try {
        // Skip if no plant is selected
        if (!plantFilter) return;

        const [categoriesData, buildingsRes] = await Promise.all([
          dashboardApi.getCategoriesByPlant(plantFilter),
          api.get('/buildings', { params: { plantId: plantFilter } }).catch(() => ({ data: [] }))
        ]);
        setCategories(categoriesData || []);
        setBuildings((buildingsRes as any)?.data || []);

        // Reset dependent filters when plant changes
        setCategoryFilter(''); // Reset to empty so auto-selection can happen
        setBuildingFilter('all');
        setProductFilter('all');
        setTypeFilter('all');
        setCapacityFilter('all');
        setProducts([]);
        setTypes([]);
        setCapacities([]);
      } catch (error) {
        console.error('Error fetching plant-dependent filters:', error);
      }
    };

    fetchPlantDependentFilters();
  }, [plantFilter]);

  // Auto-select the category when categories are loaded AND mark filters as ready
  useEffect(() => {
    if (categories.length > 0 && !categoryFilter) {
      // Priority: 1. URL search param, 2. First available category
      const targetCategory = categoryFromUrl && categories.some(c => c.id === categoryFromUrl)
        ? categoryFromUrl
        : categories[0].id;
      console.log('[PremiumDashboard] Auto-selecting category:', categories.find(c => c.id === targetCategory)?.categoryName);
      setCategoryFilter(targetCategory);
      // Mark filters as ready only after both plant and category are set
      setFiltersReady(true);
      console.log('[PremiumDashboard] Filters are now ready - widgets can start loading');
    }
  }, [categories, categoryFromUrl]);

  // Fetch dynamic filters (products, types, capacities) based on category
  useEffect(() => {
    const fetchDynamicFilters = async () => {
      try {
        // Skip if no plant or category is selected
        if (!plantFilter || !categoryFilter) {
          setProducts([]);
          setTypes([]);
          setCapacities([]);
          return;
        }

        const [productsData, typesData, capacitiesData] = await Promise.all([
          dashboardApi.getProductsByPlantAndCategory(plantFilter, categoryFilter),
          dashboardApi.getTypesByPlantAndCategory(plantFilter, categoryFilter),
          dashboardApi.getCapacitiesByPlantAndCategory(plantFilter, categoryFilter)
        ]);

        setProducts(productsData);
        setTypes(typesData);
        setCapacities(capacitiesData);
      } catch (error) {
        console.error('Error fetching dynamic filters:', error);
      }
    };

    fetchDynamicFilters();
  }, [plantFilter, categoryFilter]);

  // Get date range
  const getDateRange = (range: string) => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setMonth(end.getMonth() - 1);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  };

  // Build filters object
  const filters = useMemo(() => {
    const { startDate, endDate } = getDateRange(dateRangeFilter);
    // Only create filters if filtersReady to prevent premature API calls
    if (!filtersReady || !plantFilter) {
      return {};
    }
    return {
      serviceType: maintenanceTab,
      startDate,
      endDate,
      plantId: plantFilter,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      buildingId: buildingFilter !== 'all' ? buildingFilter : undefined,
      granularity: timePeriod,
      productId: productFilter !== 'all' ? productFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      capacity: capacityFilter !== 'all' ? capacityFilter : undefined,
    };
  }, [maintenanceTab, dateRangeFilter, plantFilter, categoryFilter, buildingFilter, timePeriod, productFilter, typeFilter, capacityFilter, filtersReady]);

  // Separate filters for System Overview with its own time period
  const systemOverviewFilters = useMemo(() => {
    // Only create filters if filtersReady to prevent premature API calls
    if (!filtersReady || !plantFilter) {
      return {};
    }
    return {
      plantId: plantFilter,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      buildingId: buildingFilter !== 'all' ? buildingFilter : undefined,
      productId: productFilter !== 'all' ? productFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      capacity: capacityFilter !== 'all' ? capacityFilter : undefined,
      granularity: systemOverviewTimePeriod, // Use separate time period state
    };
  }, [plantFilter, categoryFilter, buildingFilter, productFilter, typeFilter, capacityFilter, systemOverviewTimePeriod, filtersReady]);

  const { data: dashboardData, loading, loadingStates, error, refresh } = useDashboardData(filters);
  const { data: systemHealthData, loading: systemHealthLoading, refresh: refreshSystemHealth } = useSystemHealthData(systemOverviewFilters);

  // Determine if Fire Extinguisher widgets should show
  const selectedCategoryName = useMemo(() => {
    if (categoryFilter === 'all') return null;
    const category = categories.find(cat => cat.id === categoryFilter);
    return category?.categoryName || null;
  }, [categoryFilter, categories]);

  const showFireExtinguisherWidgets = useMemo(() => {
    if (categoryFilter === 'all') return true;
    if (!selectedCategoryName) return true;
    return selectedCategoryName.toLowerCase().includes('fire extinguisher');
  }, [categoryFilter, selectedCategoryName]);

  // Determine if Pump Room widgets should show
  // Matches: 'Pump Room', 'pump room', 'Fire Fighting Pumps', 'Fire Pump', 'Firefighting Pump', etc.
  const PUMP_ROOM_KEYWORDS = ['pump room', 'fire fighting pump', 'firefighting pump', 'fire pump', 'pump'];
  const showPumpRoomWidgets = useMemo(() => {
    if (categoryFilter === 'all') return false;
    if (!selectedCategoryName) return false;
    const nameLower = selectedCategoryName.toLowerCase();
    return PUMP_ROOM_KEYWORDS.some((keyword) => nameLower.includes(keyword));
  }, [categoryFilter, selectedCategoryName]);

  // System health data for header — use systemHealthData from useSystemHealthData hook
  // (not dashboardData.systemHealth which is no longer fetched in useDashboardData)
  const systemHealth = useMemo(() => ({
    totalAssets: systemHealthData?.totalAssets || 0,
    healthy: systemHealthData?.breakdown?.healthy || 0,
  }), [systemHealthData]);

  const healthPercentage = systemHealth.totalAssets > 0
    ? Math.round((systemHealth.healthy / systemHealth.totalAssets) * 100)
    : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      toast({
        title: 'Dashboard Updated',
        description: 'All data has been refreshed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="-mx-6 -my-6 min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/50">
      {/* Sleek Compact Header */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Analytical Dashboard</h1>
                  <p className="text-xs text-muted-foreground">Fire Safety Analytics & Monitoring</p>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-2 ml-8">
                <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{systemHealth.totalAssets}</span> Assets
                  </span>
                </div>

                {/* Inline Plant Filter */}
                <Select value={plantFilter} onValueChange={setPlantFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs border-dashed">
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select Plant" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id} className="text-xs">
                        {plant.plantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Inline Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs border-dashed">
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="h-3.5 w-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id} className="text-xs">
                        {category.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="h-8 border-border/50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                <span className="ml-2 hidden sm:inline text-xs">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 space-y-3">
        {/* Show loading screen while filters are being initialized */}
        {!filtersReady ? (
          <Card3D className="p-4 shadow-lg border-t-2 border-t-primary border-x border-b border-border/40 min-h-[300px] flex items-center justify-center">
            <LoadingSpinner text="Configuring dashboard filters..." />
          </Card3D>
        ) : (
          <>
            {/* Main Dashboard Grid - Only render when filters are ready */}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
                <div className="flex flex-wrap items-stretch gap-3">
                  {widgetOrder.map((widgetId) => {
                    const isHalfWidth = widgetId === 'system-overview' || widgetId === 'task-overview';
                    const colSpanClass = isHalfWidth ? 'lg:col-span-1' : 'lg:col-span-2';

                    if (widgetId === 'system-overview' && visibleWidgets['system-overview']) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <SystemOverview
                            data={{ ...dashboardData, systemHealth: systemHealthData }}
                            loading={systemHealthLoading}
                            role={role}
                            timePeriod={systemOverviewTimePeriod}
                            onTimePeriodChange={setSystemOverviewTimePeriod}
                            widgetSize={widgetSizes[widgetId]}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'task-overview' && visibleWidgets['task-overview']) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <TaskOverview
                            data={dashboardData}
                            loading={loadingStates?.global ?? loading} // TaskOverview data might not vary by widget, using global for now or generic
                            role={role}
                            plantId={plantFilter}
                            categoryId={categoryFilter}
                            widgetSize={widgetSizes[widgetId]}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'technician-performance' && visibleWidgets['technician-performance']) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <TechnicianPerformance
                            data={dashboardData}
                            loading={loadingStates?.technicianPerformance ?? loading}
                            role={role}
                            widgetSize={widgetSizes[widgetId]}
                            plantId={plantFilter}
                            categoryId={categoryFilter !== 'all' ? categoryFilter : undefined}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'hydrostatic-test' && visibleWidgets['hydrostatic-test'] && showFireExtinguisherWidgets) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <HydrostaticTestOverview
                            data={dashboardData}
                            loading={loadingStates?.hydrostaticTests ?? loading}
                            role={role}
                            plantId={plantFilter || undefined}
                            categoryId={categoryFilter !== 'all' ? categoryFilter : undefined}
                            widgetSize={widgetSizes[widgetId]}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'refill-status' && visibleWidgets['refill-status'] && showFireExtinguisherWidgets) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <RefillStatusSummary
                            data={dashboardData}
                            loading={loadingStates?.refillStatus ?? loading}
                            role={role}
                            plantId={plantFilter || undefined}
                            categoryId={categoryFilter !== 'all' ? categoryFilter : undefined}
                            widgetSize={widgetSizes[widgetId]}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'asset-distribution' && visibleWidgets['asset-distribution']) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <AssetDistribution
                            data={dashboardData}
                            loading={loadingStates?.assetDistribution ?? loading}
                            role={role}
                            plantId={plantFilter || undefined}
                            categoryId={categoryFilter !== 'all' ? categoryFilter : undefined}
                            widgetSize={widgetSizes[widgetId]}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'maintenance-overview' && visibleWidgets['maintenance-overview']) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <MaintenanceOverview
                            data={dashboardData}
                            loading={loadingStates?.maintenanceSummary ?? loading}
                            maintenanceTab={maintenanceTab}
                            onTabChange={setMaintenanceTab}
                            role={role}
                            plantId={plantFilter}
                            categoryId={categoryFilter}
                            widgetSize={widgetSizes[widgetId]}
                          />
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'pump-performance' && visibleWidgets['pump-performance'] && showPumpRoomWidgets) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <PumpRoomDataProvider selectedPlant={plantFilter} categoryId={categoryFilter}>
                            <PumpPerformanceWidget widgetSize={widgetSizes[widgetId]} />
                          </PumpRoomDataProvider>
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'pump-support-system' && visibleWidgets['pump-support-system'] && showPumpRoomWidgets) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                        >
                          <PumpRoomDataProvider selectedPlant={plantFilter} categoryId={categoryFilter}>
                            <SupportSystemStatusWidget widgetSize={widgetSizes[widgetId]} />
                          </PumpRoomDataProvider>
                        </SortableWidget>
                      );
                    }
                    if (widgetId === 'pump-trends' && visibleWidgets['pump-trends'] && showPumpRoomWidgets) {
                      return (
                        <SortableWidget
                          key={widgetId}
                          id={widgetId}
                          widgetSize={widgetSizes[widgetId]}
                          onSizeChange={(size) => updateWidgetSize(widgetId, size)}
                          allowedSizes={[12, 4]}
                        >
                          <PumpRoomDataProvider selectedPlant={plantFilter} categoryId={categoryFilter}>
                            <TrendsPerformanceWidget plantId={plantFilter} categoryId={categoryFilter} widgetSize={widgetSizes[widgetId]} />
                          </PumpRoomDataProvider>
                        </SortableWidget>
                      );
                    }
                    return null;
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Widget Button */}
            <AddWidgetButton
              visibleWidgets={visibleWidgets}
              onToggleWidget={toggleWidget}
              role={role}
              categoryName={selectedCategoryName}
            />

            {/* Export Modal */}
            <GenerateReportModal
              open={showExportModal}
              onOpenChange={setShowExportModal}
              plantId={plantFilter || undefined}
              categoryId={categoryFilter !== 'all' ? categoryFilter : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
