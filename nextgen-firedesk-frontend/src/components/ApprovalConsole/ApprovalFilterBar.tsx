import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type {
  ApprovalQueueFilters,
  FilterDropdownData,
} from '@/services/api/approvalConsoleApi';
import {
  Search,
  ShieldAlert,
  ArrowUpDown,
  Camera,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ApprovalFilterBarProps {
  filters: ApprovalQueueFilters;
  onFiltersChange: (filters: ApprovalQueueFilters) => void;
  dropdownData: FilterDropdownData | null;
  loading?: boolean;
}

interface ToggleFilterConfig {
  key: keyof ApprovalQueueFilters;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
}

const toggleFilters: ToggleFilterConfig[] = [
  {
    key: 'high_risk',
    label: 'High Risk',
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    activeColor: 'bg-red-100 text-red-700 border-red-300',
  },
  {
    key: 'status_changed',
    label: 'Status Changed',
    icon: ArrowUpDown,
    color: 'text-muted-foreground',
    activeColor: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: Clock,
    color: 'text-muted-foreground',
    activeColor: 'bg-orange-100 text-orange-700 border-orange-300',
  },
];

const ApprovalFilterBar: React.FC<ApprovalFilterBarProps> = ({
  filters,
  onFiltersChange,
  dropdownData,
  loading,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        onFiltersChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleToggle = useCallback(
    (key: keyof ApprovalQueueFilters) => {
      const current = filters[key];
      onFiltersChange({
        ...filters,
        [key]: current ? undefined : true,
      });
    },
    [filters, onFiltersChange]
  );

  const handleSelectChange = useCallback(
    (key: keyof ApprovalQueueFilters, value: string) => {
      onFiltersChange({
        ...filters,
        [key]: value === '_all' ? undefined : value,
      });
    },
    [filters, onFiltersChange]
  );

  const handleDateChange = useCallback(
    (range: DateRange | undefined) => {
      onFiltersChange({
        ...filters,
        date_from: range?.from?.toISOString().split('T')[0],
        date_to: range?.to?.toISOString().split('T')[0],
      });
    },
    [filters, onFiltersChange]
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && k !== 'page' && k !== 'limit' && k !== 'sort_by' && k !== 'sort_order'
  ).length;

  const clearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({});
  }, [onFiltersChange]);

  const dateRange: DateRange | undefined =
    filters.date_from || filters.date_to
      ? {
          from: filters.date_from ? new Date(filters.date_from) : undefined,
          to: filters.date_to ? new Date(filters.date_to) : undefined,
        }
      : undefined;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-3 space-y-3">
      {/* Row 1: Search + Toggle Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search form, asset, technician..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {toggleFilters.map((toggle) => {
            const isActive = !!filters[toggle.key];
            const Icon = toggle.icon;
            return (
              <Button
                key={toggle.key}
                variant="outline"
                size="sm"
                className={`h-8 text-xs font-medium transition-all ${
                  isActive
                    ? toggle.activeColor
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleToggle(toggle.key)}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {toggle.label}
              </Button>
            );
          })}
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Row 2: Dropdown Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={filters.service_type || '_all'}
          onValueChange={(v) => handleSelectChange('service_type', v)}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Types</SelectItem>
            {dropdownData?.service_types?.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.technician_id || '_all'}
          onValueChange={(v) => handleSelectChange('technician_id', v)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Technicians</SelectItem>
            {dropdownData?.technicians?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category_id || '_all'}
          onValueChange={(v) => handleSelectChange('category_id', v)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            {dropdownData?.categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.risk_level || '_all'}
          onValueChange={(v) => handleSelectChange('risk_level', v)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
          </SelectContent>
        </Select>

        <DateRangePicker
          date={dateRange}
          onDateChange={handleDateChange}
          className="w-auto"
        />
      </div>
    </div>
  );
};

export default ApprovalFilterBar;
