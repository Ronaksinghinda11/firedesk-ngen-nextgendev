/**
 * AssetDistribution Widget
 * Displays asset distribution by type with operational vs maintenance breakdown
 */

import { useMemo, useState, useEffect } from 'react';
import { Filter, X, Package, ShieldCheck, AlertTriangle, Activity, Database, CheckCircle2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  LabelList,
} from 'recharts';
import Card3D from '../../components/Card3D';
import { DashboardData } from '../../types/dashboard.types';
import ChartTypeSwitcher, { ChartType } from '../../components/ChartTypeSwitcher';
import { useChartPreferences } from '../../hooks/useChartPreferences';
import { dashboardApi } from '@/services/api/dashboardApi';
import { api } from '@/lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const COLORS = {
  primary: 'hsl(24, 95%, 53%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(217, 91%, 60%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
};

// Spec name synonym mappings - handles different naming conventions
const SPEC_SYNONYMS = {
  operatingPressure: [
    'Operating Pressure',
    'Pressure',
    'Working Pressure',
    'Op Pressure',
    'Operating Press',
    'Work Pressure',
    'Operational Pressure',
  ],
  size: [
    'Size',
    'Diameter',
    'Pipe Size',
    'Pipe Diameter',
    'Hose Size',
  ],
  fireRating: [
    'Fire Rating',
    'Fire Class',
    'Rating',
    'Class',
    'Fire Type',
    'Extinguisher Rating',
    'Extinguisher Class',
  ],
  capacity: [
    'Capacity',
    'Volume',
    'Tank Capacity',
    'Storage Capacity',
    'Water Capacity',
  ],
};

// Helper function to get spec value from asset using synonym matching
const getSpecValue = (asset: any, specType: keyof typeof SPEC_SYNONYMS): string | null => {
  if (!asset.specValues) return null;

  const synonyms = SPEC_SYNONYMS[specType];
  for (const synonym of synonyms) {
    // Try exact match first
    if (asset.specValues[synonym]) {
      return String(asset.specValues[synonym]);
    }
    // Try case-insensitive match
    const key = Object.keys(asset.specValues).find(
      k => k.toLowerCase() === synonym.toLowerCase()
    );
    if (key && asset.specValues[key]) {
      return String(asset.specValues[key]);
    }
  }
  return null;
};

// Helper function to check if asset has a specific spec type
const hasSpecValue = (asset: any, specType: keyof typeof SPEC_SYNONYMS): boolean => {
  return getSpecValue(asset, specType) !== null;
};


interface AssetDistributionProps {
  data: DashboardData;
  loading: boolean;
  role?: 'admin' | 'manager';
  plantId?: string;
  categoryId?: string;
  widgetSize?: number;
  className?: string;
  onLocalFiltersChange?: (filters: {
    buildingId?: string;
    productId?: string;
    type?: string;
    capacity?: string;
    healthStatus?: string;
    locationId?: string;
    subType?: string;
    manufacturer?: string;
    serviceStatus?: string;
    ageRangeMin?: number;
    ageRangeMax?: number;
  }) => void;
}

export default function AssetDistribution({
  data,
  loading,
  role = 'admin',
  plantId,
  categoryId,
  onLocalFiltersChange,
  widgetSize = 12,
  className
}: AssetDistributionProps) {
  const { user } = useAuth();

  const { getChartType, setChartType } = useChartPreferences(user?.id, role);
  const [chartType, setChartTypeState] = useState<ChartType>(() => getChartType('asset-distribution'));

  // Local filter states
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [subTypeFilter, setSubTypeFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [ageRangeFilter, setAgeRangeFilter] = useState('all');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [operatingPressureFilter, setOperatingPressureFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [fireRatingFilter, setFireRatingFilter] = useState('all');  // For Fire Extinguisher

  // Category name for conditional rendering
  const [categoryName, setCategoryName] = useState<string | null>(null);

  // Age range options
  const ageRangeOptions = [
    { label: 'Less than 1 year', value: '0-1', min: 0, max: 1 },
    { label: '1-3 years', value: '1-3', min: 1, max: 3 },
    { label: '3-5 years', value: '3-5', min: 3, max: 5 },
    { label: '5-10 years', value: '5-10', min: 5, max: 10 },
    { label: 'More than 10 years', value: '10+', min: 10, max: undefined }
  ];

  // Fetch ALL assets once when plant/category changes (client-side cascading)
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);

  useEffect(() => {
    const fetchAllAssets = async () => {
      if (!plantId || plantId === 'all' || !categoryId || categoryId === 'all') {
        setAllAssets([]);
        setCategoryName(null);
        setFetchingAssets(false);
        return;
      }

      setFetchingAssets(true);
      console.log('[AssetDistribution] Fetching ALL assets for cascading filters');

      try {
        const response = await dashboardApi.getAllAssetsForFiltering(plantId, categoryId);
        console.log('[AssetDistribution] Response:', response);
        console.log('[AssetDistribution] All assets fetched:', response.assets.length, 'assets');
        console.log('[AssetDistribution] Category name:', response.categoryName);
        console.log('[AssetDistribution] Category name (lowercase):', response.categoryName?.toLowerCase());
        console.log('[AssetDistribution] Is Fire Extinguisher?', response.categoryName?.toLowerCase() === 'fire extinguisher' || response.categoryName?.toLowerCase() === 'fire extinguishers');
        setAllAssets(response.assets || []);
        setCategoryName(response.categoryName);
      } catch (error) {
        console.error('[AssetDistribution] Error fetching all assets:', error);
        setAllAssets([]);
        setCategoryName(null);
      } finally {
        setFetchingAssets(false);
      }
    };

    fetchAllAssets();
  }, [plantId, categoryId]);

  // Extract unique buildings from ALL assets
  const buildings = useMemo(() => {
    console.log('[AssetDistribution] Extracting buildings from', allAssets.length, 'assets');
    if (allAssets.length > 0) {
      console.log('[AssetDistribution] Sample asset:', allAssets[0]);
      console.log('[AssetDistribution] Sample manufacturer:', allAssets[0].manufacturer);
      console.log('[AssetDistribution] Sample lastService:', allAssets[0].lastService);
      console.log('[AssetDistribution] Sample specValues:', allAssets[0].specValues);
      console.log('[AssetDistribution] Sample model:', allAssets[0].model);
    }
    const buildingMap = new Map();
    allAssets.forEach(asset => {
      if (asset.buildingId && asset.building) {
        buildingMap.set(asset.buildingId, {
          id: asset.buildingId,
          buildingName: asset.building
        });
      }
    });
    const result = Array.from(buildingMap.values()).sort((a, b) =>
      a.buildingName.localeCompare(b.buildingName)
    );
    console.log('[AssetDistribution] Extracted buildings:', result);
    return result;
  }, [allAssets]);

  // Filter assets by building
  const assetsFilteredByBuilding = useMemo(() => {
    if (!buildingFilter || buildingFilter === 'all') return allAssets;
    return allAssets.filter(asset => asset.buildingId === buildingFilter);
  }, [allAssets, buildingFilter]);

  // Extract locations from assets filtered by building
  const locations = useMemo(() => {
    const locationMap = new Map();
    assetsFilteredByBuilding.forEach(asset => {
      if (asset.location) {
        locationMap.set(asset.location, {
          id: asset.location,
          locationName: asset.location
        });
      }
    });
    return Array.from(locationMap.values()).sort((a, b) =>
      a.locationName.localeCompare(b.locationName)
    );
  }, [assetsFilteredByBuilding]);

  // Filter assets by building + location
  const assetsFilteredByLocation = useMemo(() => {
    if (!locationFilter || locationFilter === 'all') return assetsFilteredByBuilding;
    return assetsFilteredByBuilding.filter(asset => asset.location === locationFilter);
  }, [assetsFilteredByBuilding, locationFilter]);

  // Extract products from filtered assets (building + location)
  const products = useMemo(() => {
    const productMap = new Map();
    assetsFilteredByLocation.forEach(asset => {
      if (asset.productId && asset.productId._id) {
        productMap.set(asset.productId._id, {
          _id: asset.productId._id,
          productName: asset.productId.productName || 'Unknown'
        });
      }
    });
    return Array.from(productMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );
  }, [assetsFilteredByLocation]);

  // Filter assets by building + location + product
  const assetsFilteredByProduct = useMemo(() => {
    if (!productFilter || productFilter === 'all') return assetsFilteredByLocation;
    return assetsFilteredByLocation.filter(asset => asset.productId?._id === productFilter);
  }, [assetsFilteredByLocation, productFilter]);

  // Extract types from filtered assets
  const types = useMemo(() => {
    const typeSet = new Set<string>();
    assetsFilteredByProduct.forEach(asset => {
      if (asset.type) typeSet.add(asset.type);
    });
    return Array.from(typeSet).sort();
  }, [assetsFilteredByProduct]);

  // Filter assets by type
  const assetsFilteredByType = useMemo(() => {
    if (!typeFilter || typeFilter === 'all') return assetsFilteredByProduct;
    return assetsFilteredByProduct.filter(asset => asset.type === typeFilter);
  }, [assetsFilteredByProduct, typeFilter]);

  // Extract subtypes from filtered assets
  const subTypes = useMemo(() => {
    const subTypeSet = new Set<string>();
    assetsFilteredByType.forEach(asset => {
      if (asset.subType) subTypeSet.add(asset.subType);
    });
    return Array.from(subTypeSet).sort();
  }, [assetsFilteredByType]);

  // Filter assets by subtype
  const assetsFilteredBySubType = useMemo(() => {
    if (!subTypeFilter || subTypeFilter === 'all') return assetsFilteredByType;
    return assetsFilteredByType.filter(asset => asset.subType === subTypeFilter);
  }, [assetsFilteredByType, subTypeFilter]);

  // Extract manufacturers from filtered assets (INDEPENDENT - not cascading)
  const manufacturers = useMemo(() => {
    const manufacturerMap = new Map();
    assetsFilteredBySubType.forEach(asset => {
      if (asset.manufacturer) {
        manufacturerMap.set(asset.manufacturer.id, {
          id: asset.manufacturer.id,
          name: asset.manufacturer.name
        });
      }
    });
    return Array.from(manufacturerMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [assetsFilteredBySubType]);

  // Note: Manufacturer, Model, Capacity, Fire Rating are INDEPENDENT filters
  // They are extracted from subType level and applied in filteredAssets calculation

  // Extract models from filtered assets (INDEPENDENT - from subType level, not manufacturer)
  const models = useMemo(() => {
    const modelSet = new Set<string>();
    assetsFilteredBySubType.forEach(asset => {
      if (asset.model) modelSet.add(asset.model);
    });
    return Array.from(modelSet).sort();
  }, [assetsFilteredBySubType]);



  // Extract capacities from filtered assets using synonym matching
  const capacities = useMemo(() => {
    const capacitySet = new Set<string>();
    assetsFilteredBySubType.forEach(asset => {
      const capacityValue = getSpecValue(asset, 'capacity');
      if (capacityValue) {
        capacitySet.add(capacityValue);
      }
    });
    return Array.from(capacitySet).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [assetsFilteredBySubType]);

  // Extract Operating Pressure values from spec values using synonym matching
  const operatingPressures = useMemo(() => {
    const pressureSet = new Set<string>();
    assetsFilteredBySubType.forEach(asset => {
      const pressureValue = getSpecValue(asset, 'operatingPressure');
      if (pressureValue) {
        pressureSet.add(pressureValue);
      }
    });
    const pressures = Array.from(pressureSet).sort();
    console.log('[AssetDistribution] Extracted Operating Pressures:', pressures, 'from', assetsFilteredBySubType.length, 'assets');
    return pressures;
  }, [assetsFilteredBySubType]); // Changed from assetsFilteredByManufacturer

  // Filter assets by Operating Pressure (for Fire Hydrant cascade)
  const assetsFilteredByOperatingPressure = useMemo(() => {
    if (!operatingPressureFilter || operatingPressureFilter === 'all') return assetsFilteredBySubType;
    return assetsFilteredBySubType.filter(asset => {
      const pressureValue = getSpecValue(asset, 'operatingPressure');
      return pressureValue === operatingPressureFilter;
    });
  }, [assetsFilteredBySubType, operatingPressureFilter]);

  // Extract Size values from spec values using synonym matching
  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    assetsFilteredByOperatingPressure.forEach(asset => {
      const sizeValue = getSpecValue(asset, 'size');
      if (sizeValue) {
        sizeSet.add(sizeValue);
      }
    });
    const sizesList = Array.from(sizeSet).sort();
    console.log('[AssetDistribution] Extracted Sizes:', sizesList, 'from', assetsFilteredByOperatingPressure.length, 'assets');
    return sizesList;
  }, [assetsFilteredByOperatingPressure]);

  // Filter assets by Size using synonym matching
  const assetsFilteredBySize = useMemo(() => {
    if (!sizeFilter || sizeFilter === 'all') return assetsFilteredByOperatingPressure;
    return assetsFilteredByOperatingPressure.filter(asset => {
      const sizeValue = getSpecValue(asset, 'size');
      return sizeValue === sizeFilter;
    });
  }, [assetsFilteredByOperatingPressure, sizeFilter]);

  // Extract Fire Rating values from spec values using synonym matching
  const fireRatings = useMemo(() => {
    const ratingSet = new Set<string>();
    assetsFilteredBySubType.forEach(asset => {
      const ratingValue = getSpecValue(asset, 'fireRating');
      if (ratingValue) {
        ratingSet.add(ratingValue);
      }
    });
    const ratings = Array.from(ratingSet).sort();
    console.log('[AssetDistribution] Extracted Fire Ratings:', ratings, 'from', assetsFilteredBySubType.length, 'assets');
    return ratings;
  }, [assetsFilteredBySubType]);

  // Note: Fire Rating filter is applied in filteredAssets calculation (independent)

  // Reset dependent filters when parent changes
  useEffect(() => {
    setLocationFilter('all');
    setProductFilter('all');
    setTypeFilter('all');
    setSubTypeFilter('all');
    setCapacityFilter('all');
  }, [buildingFilter]);

  useEffect(() => {
    setProductFilter('all');
    setTypeFilter('all');
    setSubTypeFilter('all');
    setCapacityFilter('all');
  }, [locationFilter]);

  useEffect(() => {
    setTypeFilter('all');
    setSubTypeFilter('all');
    setCapacityFilter('all');
  }, [productFilter]);

  useEffect(() => {
    setSubTypeFilter('all');
    setCapacityFilter('all');
    setOperatingPressureFilter('all');  // Reset Operating Pressure when Type changes
    setSizeFilter('all');  // Reset Size when Type changes
    setFireRatingFilter('all');  // Reset Fire Rating when Type changes
  }, [typeFilter]);

  // DO NOT reset manufacturer, model, capacity, or fire rating - they are independent filters

  // Reset Size filter when Operating Pressure changes (for Fire Hydrant cascade)
  useEffect(() => {
    setSizeFilter('all');
  }, [operatingPressureFilter]);

  // Notify parent when local filters change
  useEffect(() => {
    if (onLocalFiltersChange) {
      // Get age range values if selected
      const selectedAgeRange = ageRangeOptions.find(opt => opt.value === ageRangeFilter);

      onLocalFiltersChange({
        buildingId: buildingFilter !== 'all' ? buildingFilter : undefined,
        locationId: locationFilter !== 'all' ? locationFilter : undefined,
        productId: productFilter !== 'all' ? productFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        subType: subTypeFilter !== 'all' ? subTypeFilter : undefined,
        capacity: capacityFilter !== 'all' ? capacityFilter : undefined,
        healthStatus: conditionFilter !== 'all' ? conditionFilter : undefined,
        manufacturer: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
        model: modelFilter !== 'all' ? modelFilter : undefined,
        ageRangeMin: selectedAgeRange ? selectedAgeRange.min : undefined,
        ageRangeMax: selectedAgeRange ? selectedAgeRange.max : undefined,
      });
    }
  }, [buildingFilter, locationFilter, productFilter, typeFilter, subTypeFilter, capacityFilter, conditionFilter, ageRangeFilter, manufacturerFilter, modelFilter, onLocalFiltersChange]);

  const handleClearFilters = () => {
    setBuildingFilter('all');
    setLocationFilter('all');
    setProductFilter('all');
    setTypeFilter('all');
    setSubTypeFilter('all');
    setCapacityFilter('all');
    setConditionFilter('all');
    setAgeRangeFilter('all');
    setManufacturerFilter('all');
    setModelFilter('all');
    setOperatingPressureFilter('all');
    setSizeFilter('all');
    setFireRatingFilter('all');
  };

  const handleChartTypeChange = (type: ChartType) => {
    setChartTypeState(type);
    setChartType('asset-distribution', type);
  };

  // Calculate chart data from FILTERED assets (client-side)
  // Manufacturer, Model, Capacity, Fire Rating are INDEPENDENT filters
  const filteredAssets = useMemo(() => {
    let filtered = assetsFilteredBySubType;

    // Apply INDEPENDENT filters: Manufacturer, Model
    if (manufacturerFilter && manufacturerFilter !== 'all') {
      filtered = filtered.filter(asset => asset.manufacturer?.id === manufacturerFilter);
    }

    if (modelFilter && modelFilter !== 'all') {
      filtered = filtered.filter(asset => asset.model === modelFilter);
    }

    // Apply spec-based filters with synonym matching (data-driven - no category name checks)
    // Operating Pressure filter - applies if data exists
    if (operatingPressureFilter && operatingPressureFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const pressureValue = getSpecValue(asset, 'operatingPressure');
        return pressureValue === operatingPressureFilter;
      });
    }

    // Size filter - applies if data exists
    if (sizeFilter && sizeFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const sizeValue = getSpecValue(asset, 'size');
        return sizeValue === sizeFilter;
      });
    }

    // Fire Rating filter - applies if data exists
    if (fireRatingFilter && fireRatingFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const ratingValue = getSpecValue(asset, 'fireRating');
        return ratingValue === fireRatingFilter;
      });
    }

    // Capacity filter - applies if NOT using hydrant-style specs (Operating Pressure/Size)
    const isHydrantStyle = operatingPressures.length > 0 || sizes.length > 0;
    if (!isHydrantStyle && capacityFilter && capacityFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const capacityValue = getSpecValue(asset, 'capacity');
        return capacityValue === capacityFilter;
      });
    }

    // Apply condition filter
    if (conditionFilter && conditionFilter !== 'all') {
      filtered = filtered.filter(asset => asset.healthStatus === conditionFilter);
    }

    // Apply age range filter
    if (ageRangeFilter && ageRangeFilter !== 'all') {
      const selectedRange = ageRangeOptions.find(opt => opt.value === ageRangeFilter);
      if (selectedRange) {
        const currentDate = new Date();
        filtered = filtered.filter(asset => {
          if (!asset.manufacturingDate) return false;
          const mfgDate = new Date(asset.manufacturingDate);
          const ageInYears = (currentDate.getTime() - mfgDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          if (selectedRange.max === undefined) {
            return ageInYears >= selectedRange.min;
          }
          return ageInYears >= selectedRange.min && ageInYears < selectedRange.max;
        });
      }
    }

    return filtered;
  }, [assetsFilteredBySubType, manufacturerFilter, modelFilter, categoryName, operatingPressureFilter, sizeFilter, fireRatingFilter, capacityFilter, conditionFilter, ageRangeFilter, ageRangeOptions]);

  // Calculate asset distribution by type from filtered assets
  const assetData = useMemo(() => {
    const distributionMap = new Map<string, { operational: number; maintenance: number; total: number }>();

    filteredAssets.forEach(asset => {
      const type = asset.type || 'Unassigned';
      const current = distributionMap.get(type) || { operational: 0, maintenance: 0, total: 0 };

      current.total++;
      if (asset.healthStatus === 'HEALTHY' || asset.healthStatus === 'Good' || asset.healthStatus === 'Excellent') {
        current.operational++;
      } else {
        current.maintenance++;
      }
      distributionMap.set(type, current);
    });

    return Array.from(distributionMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.total,
        operational: data.operational,
        maintenance: data.maintenance,
        efficiency: data.total > 0 ? Math.round((data.operational / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAssets]);

  const totalAssets = useMemo(() => {
    return filteredAssets.length;
  }, [filteredAssets]);

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
    if (assetData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No asset distribution data available
        </div>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={assetData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} axisLine={true} tickLine={true} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: COLORS.primary, stroke: '#fff' }} name="Total Assets" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = assetData.map((item, index) => ({
          name: item.name,
          value: item.count,
          fill: [COLORS.primary, COLORS.info, COLORS.success, COLORS.warning, COLORS.destructive][index % 5],
        }));
        const totalAssets = assetData.reduce((sum, item) => sum + item.count, 0);

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
              <div className="text-3xl font-black text-foreground leading-none">{totalAssets.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">Total Assets</div>
            </div>
          </div>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={assetData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={35} axisLine={true} tickLine={true} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} axisLine={true} tickLine={true} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke={COLORS.primary} fill="url(#areaGrad)" name="Total Assets" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'radial':
        const radialData = [{ name: 'Total Assets', value: totalAssets, fill: COLORS.primary }];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={10} fill={COLORS.primary} background={{ fill: 'hsl(var(--muted))' }} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold text-2xl">
                {totalAssets}
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
                Total Assets
              </text>
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      case 'stacked':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetData} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} axisLine={true} tickLine={true} />
              <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={true} tickLine={true} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="operational" stackId="a" fill={COLORS.success} name="Operational" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="operational" position="right" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="maintenance" stackId="a" fill={COLORS.warning} name="Maintenance" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="maintenance" position="right" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetData} layout="horizontal" margin={{ top: 25, right: 30, left: 0, bottom: 5 }} barGap={4} maxBarSize={60}>
              <defs>
                <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                angle={-20}
                textAnchor="end"
                height={35}
                axisLine={true}
                tickLine={true}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                allowDecimals={false}
                domain={[0, 'auto']}
                axisLine={true}
                tickLine={true}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="url(#countGrad)"
                radius={[4, 4, 0, 0]}
                name="Total Assets"
              >
                <LabelList dataKey="count" position="top" offset={10} style={{ fill: 'hsl(var(--foreground))', fontSize: '10px', fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading || fetchingAssets) {
    return (
      <Card3D className="p-4 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60 min-h-[300px] flex items-center justify-center">
        <LoadingSpinner text="Loading asset distribution..." />
      </Card3D>
    );
  }

  return (
    <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Box className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Asset Distribution Overview</h2>
            <p className="text-[10px] text-muted-foreground">Operational vs Maintenance status</p>
          </div>
        </div>
        <ChartTypeSwitcher
          currentType={chartType}
          onChange={handleChartTypeChange}
          availableTypes={['bar', 'line', 'pie']}
        />
      </div>

      {/* COMPACT QUICK FILTERS */}
      <div className="mb-2 flex flex-wrap items-center gap-2 p-2 bg-muted/20 rounded-xl border border-border/40">
        <div className="flex items-center gap-1.5 px-2 border-r border-border/40 mr-1 text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-wider">Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Building</span>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map(building => (
                  <SelectItem key={building.id} value={building.id}>{building.buildingName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Location</span>
            <Select
              value={locationFilter}
              onValueChange={setLocationFilter}
              disabled={!buildingFilter || buildingFilter === 'all'}
            >
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>{location.locationName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Product</span>
            <Select
              value={productFilter}
              onValueChange={setProductFilter}
              disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
            >
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(product => (
                  <SelectItem key={product._id} value={product._id}>{product.productName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Type</span>
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
              disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
            >
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SubType Filter - Show only if subTypes data exists */}
          {subTypes.length > 0 && (
            <div className="relative">
              <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Sub Type</span>
              <Select
                value={subTypeFilter}
                onValueChange={setSubTypeFilter}
                disabled={!typeFilter || typeFilter === 'all'}
              >
                <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                  <SelectValue placeholder="Sub Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Types</SelectItem>
                  {subTypes.map(subType => (
                    <SelectItem key={subType} value={subType}>{subType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Manufacturer</span>
            <Select
              value={manufacturerFilter}
              onValueChange={setManufacturerFilter}
              disabled={!plantId || plantId === 'all'}
            >
              <SelectTrigger className="h-7 text-[10px] w-[140px] bg-background/50 font-medium">
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Model</span>
            <Select
              value={modelFilter}
              onValueChange={setModelFilter}
              disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
            >
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {models.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capacity Filter - Show if has capacity data AND not hydrant-style */}
          {capacities.length > 0 && !(operatingPressures.length > 0 || sizes.length > 0) && (
            <div className="relative">
              <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Capacity</span>
              <Select
                value={capacityFilter}
                onValueChange={setCapacityFilter}
                disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
              >
                <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                  <SelectValue placeholder="Capacity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capacities</SelectItem>
                  {capacities.map(capacity => (
                    <SelectItem key={capacity} value={capacity}>{capacity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Operating Pressure Filter - Show if has operating pressure data */}
          {operatingPressures.length > 0 && (
            <div className="relative">
              <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Operating Pressure</span>
              <Select
                value={operatingPressureFilter}
                onValueChange={setOperatingPressureFilter}
                disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
              >
                <SelectTrigger className="h-7 text-[10px] w-[150px] bg-background/50 font-medium">
                  <SelectValue placeholder="Operating Pressure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pressures</SelectItem>
                  {operatingPressures.map(pressure => (
                    <SelectItem key={pressure} value={pressure}>{pressure}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Size Filter - Show if has size data */}
          {sizes.length > 0 && (
            <div className="relative">
              <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Size</span>
              <Select
                value={sizeFilter}
                onValueChange={setSizeFilter}
                disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
              >
                <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {sizes.map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fire Rating Filter - Show if has fire rating data */}
          {fireRatings.length > 0 && (
            <div className="relative">
              <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Fire Rating</span>
              <Select
                value={fireRatingFilter}
                onValueChange={setFireRatingFilter}
                disabled={!plantId || plantId === 'all' || !categoryId || categoryId === 'all'}
              >
                <SelectTrigger className="h-7 text-[10px] w-[120px] bg-background/50 font-medium">
                  <SelectValue placeholder="Fire Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  {fireRatings.map(rating => (
                    <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Health Status</span>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Health Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="HEALTHY">Healthy</SelectItem>
                <SelectItem value="NEEDS_ATTENTION">Attention Required</SelectItem>
                <SelectItem value="NOT_WORKING">Not Working</SelectItem>
              </SelectContent>
            </Select>
          </div>


          <div className="relative">
            <span className="absolute -top-1.5 left-2 px-1 bg-background text-[8px] font-bold text-muted-foreground uppercase z-10">Age</span>
            <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter}>
              <SelectTrigger className="h-7 text-[10px] w-[110px] bg-background/50 font-medium">
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                {ageRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(buildingFilter !== 'all' || locationFilter !== 'all' || productFilter !== 'all' || typeFilter !== 'all' ||
            subTypeFilter !== 'all' || capacityFilter !== 'all' || conditionFilter !== 'all' || ageRangeFilter !== 'all' ||
            manufacturerFilter !== 'all' || operatingPressureFilter !== 'all' || sizeFilter !== 'all' || fireRatingFilter !== 'all') && (
              <Button onClick={handleClearFilters} variant="ghost" size="sm" className="h-7 text-[9px] px-2 text-primary font-black uppercase hover:bg-primary/5">
                <X className="h-3 w-3 mr-1" /> Reset
              </Button>
            )}
        </div>
      </div>

      <div className="h-[400px]">
        {renderChart()}
      </div>
    </Card3D>
  );
}