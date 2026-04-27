import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Filter,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Package,
  Settings,
  ChevronDown,
  ChevronUp,
  Heart,
  MapPin,
  Activity,
  Check,
  Layers
} from "lucide-react";
import { assetTypeConfig, statusConfig, type Asset } from "@/data/mockFloorplanAssets";

interface FiltersSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  assetCount: {
    total: number;
    filtered: number;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  allAssets?: Asset[]; // Added to dynamically extract locations
}

interface FilterState {
  type?: string | string[];
  status?: string | string[];
  health?: string | string[];
  location?: string | string[];
  category?: string | string[];
  searchTerm?: string;
}

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  onFilterChange,
  assetCount,
  isCollapsed = false,
  onToggleCollapse,
  allAssets = []
}) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true); // Changed to true by default
  const [searchValue, setSearchValue] = useState("");
  const [expandedSections, setExpandedSections] = useState<{
    assetType: boolean;
    health: boolean;
    location: boolean;
    category: boolean;
  }>({
    assetType: true, // Expanded by default
    category: true,  // Expanded by default
    health: true,    // Expanded by default
    location: true   // Expanded by default
  });

  // Extract unique asset types (product names) from assets on this floor
  // Dependent on selected category
  const availableAssetTypes = useMemo(() => {
    const typeMap = new Map<string, { name: string; count: number }>();

    // First filter by category if selected
    const assetsToProcess = filters.category
      ? allAssets.filter(asset => {
        const categoryArray = Array.isArray(filters.category) ? filters.category : [filters.category];
        // Type casting to access category - same logic as in floorplanUtils
        const assetCategory = (asset.metadata as any)?.category || 'Unknown';
        return categoryArray.includes(assetCategory);
      })
      : allAssets;

    assetsToProcess.forEach(asset => {
      // Use product name as the type for filtering
      const productName = asset.name || asset.type || 'Unknown';

      if (typeMap.has(productName)) {
        const existing = typeMap.get(productName)!;
        typeMap.set(productName, { ...existing, count: existing.count + 1 });
      } else {
        typeMap.set(productName, { name: productName, count: 1 });
      }
    });

    // Return array of product names sorted alphabetically
    return Array.from(typeMap.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([key, value]) => ({ key, ...value }));
  }, [allAssets, filters.category]);

  // Extract unique categories from assets
  const availableCategories = useMemo(() => {
    const categoryMap = new Map<string, { name: string; count: number }>();

    allAssets.forEach(asset => {
      // Use category from metadata
      const categoryName = (asset.metadata?.category as string) || 'Unknown';

      if (categoryMap.has(categoryName)) {
        const existing = categoryMap.get(categoryName)!;
        categoryMap.set(categoryName, { ...existing, count: existing.count + 1 });
      } else {
        categoryMap.set(categoryName, { name: categoryName, count: 1 });
      }
    });

    // Return array of categories sorted alphabetically
    return Array.from(categoryMap.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([key, value]) => ({ key, ...value }));
  }, [allAssets]);

  // Extract unique locations from assets
  const availableLocations = useMemo(() => {
    const locationSet = new Set<string>();

    // UUID detection: skip any value that looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    allAssets.forEach(asset => {
      // Only use metadata.location (the actual location name string from the database)
      const loc = asset.metadata?.location;
      if (loc && typeof loc === 'string' && loc.trim() && !uuidRegex.test(loc.trim())) {
        locationSet.add(loc.trim());
      }
    });

    return Array.from(locationSet).sort();
  }, [allAssets]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        searchTerm: searchValue || undefined
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterChange = (key: keyof FilterState, value: string | string[] | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' || !value ? undefined : value
    }));
  };

  const toggleFilterValue = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValue = prev[key];

      // If no current value, set as array with single value
      if (!currentValue) {
        return { ...prev, [key]: [value] };
      }

      // If current value is a string, convert to array
      const currentArray = Array.isArray(currentValue) ? currentValue : [currentValue];

      // Toggle the value in the array
      const hasValue = currentArray.includes(value);
      const newArray = hasValue
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];

      // If array is empty, set to undefined
      return {
        ...prev,
        [key]: newArray.length === 0 ? undefined : newArray
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchValue("");
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const activeFilterCount = Object.values(filters).filter(value => value !== undefined).length;

  if (isCollapsed) {
    return (
      <div className="w-12 bg-card border-l border-border flex flex-col items-center py-4">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Vertical Filter Icon */}
        <div className="flex flex-col items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </div>

        {/* Asset Count */}
        <div className="mt-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Assets</div>
          <div className="text-sm font-medium">{assetCount.filtered}</div>
          <div className="text-xs text-muted-foreground">of {assetCount.total}</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-80 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 overflow-y-auto">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Assets</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, location, or description..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 pr-4"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchValue("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Filter Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Filter Options</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="text-xs"
            >
              {isFiltersExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>

          {isFiltersExpanded && (
            <div className="space-y-3">
              {/* Category Filter Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('category')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Category</span>
                    {filters.category && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {Array.isArray(filters.category) ? filters.category.length : 1}
                      </Badge>
                    )}
                  </div>
                  {expandedSections.category ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandedSections.category && (
                  <div className="px-3 pb-3 space-y-2">
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category) => {
                        const currentValue = filters.category;
                        const isChecked = currentValue
                          ? Array.isArray(currentValue)
                            ? currentValue.includes(category.name)
                            : currentValue === category.name
                          : false;

                        return (
                          <label
                            key={category.key}
                            className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleFilterValue('category', category.name)}
                              className="h-4 w-4"
                            />
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1">{category.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {category.count}
                            </Badge>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground px-2 py-3">
                        No categories available.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Asset Type Filter Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('assetType')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Asset Type</span>
                    {filters.type && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {Array.isArray(filters.type) ? filters.type.length : 1}
                      </Badge>
                    )}
                  </div>
                  {expandedSections.assetType ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandedSections.assetType && (
                  <div className="px-3 pb-3 space-y-2">
                    {availableAssetTypes.length > 0 ? (
                      availableAssetTypes.map((assetType) => {
                        const currentValue = filters.type;
                        const isChecked = currentValue
                          ? Array.isArray(currentValue)
                            ? currentValue.includes(assetType.name)
                            : currentValue === assetType.name
                          : false;

                        return (
                          <label
                            key={assetType.key}
                            className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleFilterValue('type', assetType.name)}
                              className="h-4 w-4"
                            />
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1">{assetType.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {assetType.count}
                            </Badge>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground px-2 py-3">
                        {filters.category ? 'No asset types found for selected categories.' : 'No asset types available on this floor.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Health Status Filter Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('health')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Health Status</span>
                    {filters.health && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {Array.isArray(filters.health) ? filters.health.length : 1}
                      </Badge>
                    )}
                  </div>
                  {expandedSections.health ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandedSections.health && (
                  <div className="px-3 pb-3 space-y-2">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const currentValue = filters.health;
                      const isChecked = currentValue
                        ? Array.isArray(currentValue)
                          ? currentValue.includes(key)
                          : currentValue === key
                        : false;

                      return (
                        <label
                          key={key}
                          className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleFilterValue('health', key)}
                            className="h-4 w-4"
                          />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-sm flex-1">{config.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Location Filter Section */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('location')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location</span>
                    {filters.location && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {Array.isArray(filters.location) ? filters.location.length : 1}
                      </Badge>
                    )}
                  </div>
                  {expandedSections.location ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expandedSections.location && (
                  <div className="px-3 pb-3 space-y-2">
                    {availableLocations.length > 0 ? (
                      availableLocations.map((location) => {
                        const currentValue = filters.location;
                        const isChecked = currentValue
                          ? Array.isArray(currentValue)
                            ? currentValue.includes(location)
                            : currentValue === location
                          : false;

                        return (
                          <label
                            key={location}
                            className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleFilterValue('location', location)}
                              className="h-4 w-4"
                            />
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm flex-1">{location}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground px-2 py-3">
                        No locations available. Location data will appear here when assets have location metadata.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Active Filters</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 text-xs flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {filters.category && (
                <div className="space-y-1">
                  {(Array.isArray(filters.category) ? filters.category : [filters.category]).map((category) => (
                    <Badge key={category} variant="secondary" className="flex items-center justify-between w-full">
                      <span className="truncate">Category: {category}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFilterValue('category', category)}
                        className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {filters.type && (
                <div className="space-y-1">
                  {(Array.isArray(filters.type) ? filters.type : [filters.type]).map((type) => (
                    <Badge key={type} variant="secondary" className="flex items-center justify-between w-full">
                      <span className="truncate">Type: {type}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFilterValue('type', type)}
                        className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {filters.health && (
                <div className="space-y-1">
                  {(Array.isArray(filters.health) ? filters.health : [filters.health]).map((health) => (
                    <Badge key={health} variant="secondary" className="flex items-center justify-between w-full">
                      <span className="truncate">Health: {statusConfig[health as keyof typeof statusConfig]?.label || health}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFilterValue('health', health)}
                        className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {filters.location && (
                <div className="space-y-1">
                  {(Array.isArray(filters.location) ? filters.location : [filters.location]).map((location) => (
                    <Badge key={location} variant="secondary" className="flex items-center justify-between w-full">
                      <span className="truncate">Location: {location}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFilterValue('location', location)}
                        className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {filters.searchTerm && (
                <Badge variant="secondary" className="flex items-center justify-between w-full">
                  <span className="truncate">Search: "{filters.searchTerm}"</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchValue("");
                      handleFilterChange('searchTerm', undefined);
                    }}
                    className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Results Summary */}
        <div className="space-y-2 mt-auto">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Results
          </h4>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Showing:</span>
              <span className="font-medium">{assetCount.filtered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{assetCount.total}</span>
            </div>
            {hasActiveFilters && assetCount.filtered !== assetCount.total && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Hidden:</span>
                <span className="text-muted-foreground">{assetCount.total - assetCount.filtered}</span>
              </div>
            )}
          </div>

          {hasActiveFilters && assetCount.filtered === 0 && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                No assets match the current filters
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full mt-2 h-6 text-xs"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};