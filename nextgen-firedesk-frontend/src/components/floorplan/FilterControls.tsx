import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, X, RotateCcw } from "lucide-react";
import { assetTypeConfig, statusConfig } from "@/data/mockFloorplanAssets";

interface FilterControlsProps {
  onFilterChange: (filters: FilterState) => void;
  assetCount: {
    total: number;
    filtered: number;
  };
}

interface FilterState {
  type?: string;
  status?: string;
  searchTerm?: string;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  onFilterChange,
  assetCount
}) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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

  const handleFilterChange = (key: keyof FilterState, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchValue("");
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const activeFilterCount = Object.values(filters).filter(value => value !== undefined).length;

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0">
        <div className="space-y-4">
          {/* Search and Toggle */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets by ID, location, or description..."
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

            {/* Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Controls (Expandable) */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
              {/* Asset Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Asset Type</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={filters.type || "all"}
                    onValueChange={(value) => handleFilterChange('type', value === "all" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {Object.entries(assetTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status Filter (Repository style: green/yellow/red) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => handleFilterChange('status', value === "all" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>

              {filters.type && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Type: {assetTypeConfig[filters.type as keyof typeof assetTypeConfig]?.label || filters.type}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFilterChange('type', undefined)}
                    className="h-3 w-3 p-0 hover:bg-transparent"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}

              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Status: {statusConfig[filters.status as keyof typeof statusConfig]?.label || filters.status}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFilterChange('status', undefined)}
                    className="h-3 w-3 p-0 hover:bg-transparent"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}

              {filters.searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Search: "{filters.searchTerm}"</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchValue("");
                      handleFilterChange('searchTerm', undefined);
                    }}
                    className="h-3 w-3 p-0 hover:bg-transparent"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {assetCount.filtered} of {assetCount.total} assets
              {hasActiveFilters && ` (${assetCount.total - assetCount.filtered} hidden by filters)`}
            </span>

            {hasActiveFilters && assetCount.filtered === 0 && (
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">No assets match the current filters</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};