/**
 * Calendar Filter Bar
 * 
 * Unified filter bar for the new calendar views.
 * Supports cascading: Category → Product → Type → Sub-type
 * Plus: Service Type, Frequency, Date Range (with calendar popover)
 */

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
    allFrequencies,
    frequencyColors,
    serviceTypes,
    serviceTypeColors,
    type Frequency,
    type ServiceType,
    type CalendarServiceItem,
} from '@/lib/calendarDataUtils';

export interface CalendarFilters {
    categories: string[];
    products: string[];
    types: string[];
    subTypes: string[];
    serviceTypes: string[];
    frequencies: string[];
    dateRange: { start: string; end: string } | null;
}

interface FilterOption {
    value: string;
    label: string;
}

interface CalendarFilterBarProps {
    filters: CalendarFilters;
    onFiltersChange: (filters: CalendarFilters) => void;
    /** Full normalized service list — used to derive cascading options */
    services: CalendarServiceItem[];
    /** Legacy props kept for backward compat — ignored if services is provided */
    categoryOptions?: FilterOption[];
    productOptions?: FilterOption[];
    typeOptions?: FilterOption[];
    subTypeOptions?: FilterOption[];
}

const EMPTY_FILTERS: CalendarFilters = {
    categories: [],
    products: [],
    types: [],
    subTypes: [],
    serviceTypes: [],
    frequencies: [],
    dateRange: null,
};

export function CalendarFilterBar({
    filters,
    onFiltersChange,
    services,
}: CalendarFilterBarProps) {
    // ─── Cascading filter options ───
    // Category: all categories from the services data
    const categoryOptions = useMemo<FilterOption[]>(() => {
        const cats = new Map<string, string>();
        services.forEach((s) => {
            if (s.categoryId && s.category) cats.set(s.categoryId, s.category);
        });
        return Array.from(cats, ([value, label]) => ({ value, label }));
    }, [services]);

    // Product: filtered by selected categories
    const productOptions = useMemo<FilterOption[]>(() => {
        const prods = new Map<string, string>();
        services.forEach((s) => {
            if (filters.categories.length > 0 && !filters.categories.includes(s.categoryId)) return;
            if (s.productName) prods.set(s.productName, s.productName);
        });
        return Array.from(prods, ([value, label]) => ({ value, label }));
    }, [services, filters.categories]);

    // Type: product variant types, filtered by selected categories + products
    const typeOptions = useMemo<FilterOption[]>(() => {
        const types = new Map<string, string>();
        services.forEach((s) => {
            if (filters.categories.length > 0 && !filters.categories.includes(s.categoryId)) return;
            if (filters.products.length > 0 && !filters.products.includes(s.productName || '')) return;
            (s.productTypes || []).forEach((t) => {
                types.set(t, t);
            });
        });
        return Array.from(types, ([value, label]) => ({ value, label }));
    }, [services, filters.categories, filters.products]);

    // Sub-type: product variant sub-types, filtered by selected categories + products + types
    const subTypeOptions = useMemo<FilterOption[]>(() => {
        const subTypes = new Map<string, string>();
        services.forEach((s) => {
            if (filters.categories.length > 0 && !filters.categories.includes(s.categoryId)) return;
            if (filters.products.length > 0 && !filters.products.includes(s.productName || '')) return;
            // If types are selected, only include sub-types from matching variants
            if (filters.types.length > 0) {
                // We need to check variant-level: only include sub-types from variants whose type is selected
                // But we don't have per-variant data here, just flat arrays.
                // Use productSubTypes only if at least one productType matches the selected types.
                const hasMatchingType = (s.productTypes || []).some(t => filters.types.includes(t));
                if (!hasMatchingType) return;
            }
            (s.productSubTypes || []).forEach((st) => {
                subTypes.set(st, st);
            });
        });
        return Array.from(subTypes, ([value, label]) => ({ value, label }));
    }, [services, filters.categories, filters.products, filters.types]);

    // ─── Auto-clear stale child selections when parent changes ───
    useEffect(() => {
        const validProductValues = new Set(productOptions.map((o) => o.value));
        const validTypeValues = new Set(typeOptions.map((o) => o.value));
        const validSubTypeValues = new Set(subTypeOptions.map((o) => o.value));

        const newProducts = filters.products.filter((v) => validProductValues.has(v));
        const newTypes = filters.types.filter((v) => validTypeValues.has(v));
        const newSubTypes = filters.subTypes.filter((v) => validSubTypeValues.has(v));

        if (
            newProducts.length !== filters.products.length ||
            newTypes.length !== filters.types.length ||
            newSubTypes.length !== filters.subTypes.length
        ) {
            onFiltersChange({
                ...filters,
                products: newProducts,
                types: newTypes,
                subTypes: newSubTypes,
            });
        }
    }, [productOptions, typeOptions, subTypeOptions]);

    // ─── Filter counts ───
    const totalActiveFilters = useMemo(() => {
        let count = 0;
        count += filters.categories.length;
        count += filters.products.length;
        count += filters.types.length;
        count += filters.subTypes.length;
        count += filters.serviceTypes.length;
        count += filters.frequencies.length;
        if (filters.dateRange) count++;
        return count;
    }, [filters]);

    const toggleValue = (
        field: keyof CalendarFilters,
        value: string
    ) => {
        const current = filters[field] as string[];
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        onFiltersChange({ ...filters, [field]: next });
    };

    const clearField = (field: keyof CalendarFilters) => {
        if (field === 'dateRange') {
            onFiltersChange({ ...filters, dateRange: null });
        } else {
            onFiltersChange({ ...filters, [field]: [] });
        }
    };

    const clearAll = () => onFiltersChange({ ...EMPTY_FILTERS });

    const frequencyOptions: FilterOption[] = allFrequencies.map((f) => ({
        value: f,
        label: f,
    }));

    const serviceTypeOpts: FilterOption[] = serviceTypes.map((t) => ({
        value: t,
        label: t,
    }));

    // ─── Date range helpers ───
    const handleStartDateSelect = (date: Date | undefined) => {
        if (!date) return;
        const startStr = format(date, 'yyyy-MM-dd');
        onFiltersChange({
            ...filters,
            dateRange: {
                start: startStr,
                end: filters.dateRange?.end || startStr,
            },
        });
    };

    const handleEndDateSelect = (date: Date | undefined) => {
        if (!date) return;
        const endStr = format(date, 'yyyy-MM-dd');
        onFiltersChange({
            ...filters,
            dateRange: {
                start: filters.dateRange?.start || endStr,
                end: endStr,
            },
        });
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-gray-400 mr-1">
                <Filter className="h-3 w-3" />
                <span className="uppercase tracking-wider font-medium">Filters</span>
                {totalActiveFilters > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-orange-100 text-orange-700 ml-1">
                        {totalActiveFilters}
                    </Badge>
                )}
            </div>

            {/* Category */}
            <FilterDropdown
                label="Category"
                options={categoryOptions}
                selected={filters.categories}
                onToggle={(v) => toggleValue('categories', v)}
                onClear={() => clearField('categories')}
            />

            {/* Product (cascaded from Category) */}
            <FilterDropdown
                label="Product"
                options={productOptions}
                selected={filters.products}
                onToggle={(v) => toggleValue('products', v)}
                onClear={() => clearField('products')}
            />

            {/* Type (cascaded from Product) */}
            <FilterDropdown
                label="Type"
                options={typeOptions}
                selected={filters.types}
                onToggle={(v) => toggleValue('types', v)}
                onClear={() => clearField('types')}
            />

            {/* Sub-type (cascaded from Type) */}
            <FilterDropdown
                label="Sub-type"
                options={subTypeOptions}
                selected={filters.subTypes}
                onToggle={(v) => toggleValue('subTypes', v)}
                onClear={() => clearField('subTypes')}
            />

            {/* Service Type */}
            <FilterDropdown
                label="Service Type"
                options={serviceTypeOpts}
                selected={filters.serviceTypes}
                onToggle={(v) => toggleValue('serviceTypes', v)}
                onClear={() => clearField('serviceTypes')}
                colorMap={Object.fromEntries(serviceTypes.map((t) => [t, serviceTypeColors[t].accent]))}
            />

            {/* Frequency */}
            <FilterDropdown
                label="Frequency"
                options={frequencyOptions}
                selected={filters.frequencies}
                onToggle={(v) => toggleValue('frequencies', v)}
                onClear={() => clearField('frequencies')}
                colorMap={Object.fromEntries(allFrequencies.map((f) => [f, frequencyColors[f]]))}
            />

            {/* Date Range — Calendar Popovers */}
            <DateRangeFilter
                dateRange={filters.dateRange}
                onStartDateSelect={handleStartDateSelect}
                onEndDateSelect={handleEndDateSelect}
                onClear={() => clearField('dateRange')}
            />

            {/* Clear All */}
            {totalActiveFilters > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-400 hover:text-red-500 gap-1"
                    onClick={clearAll}
                >
                    <X className="h-3 w-3" />
                    Clear All
                </Button>
            )}
        </div>
    );
}

// ────────────────────────────── Date Range Filter ──────────────────────────────

function DateRangeFilter({
    dateRange,
    onStartDateSelect,
    onEndDateSelect,
    onClear,
}: {
    dateRange: { start: string; end: string } | null;
    onStartDateSelect: (date: Date | undefined) => void;
    onEndDateSelect: (date: Date | undefined) => void;
    onClear: () => void;
}) {
    const [startOpen, setStartOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined);
    const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);

    const startDate = dateRange?.start ? new Date(dateRange.start + 'T00:00:00') : undefined;
    const endDate = dateRange?.end ? new Date(dateRange.end + 'T00:00:00') : undefined;

    const formatDisplay = (d: Date | undefined) => d ? format(d, 'MMM dd, yyyy') : undefined;

    return (
        <div className="flex items-center gap-1">
            {/* From Date */}
            <Popover open={startOpen} onOpenChange={(open) => {
                setStartOpen(open);
                if (open) setTempStartDate(startDate);
            }}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 text-xs gap-1 ${dateRange?.start ? 'border-orange-300 bg-orange-50 text-orange-700' : ''}`}
                    >
                        <CalendarIcon className="h-3 w-3" />
                        {formatDisplay(startDate) || 'Start Date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={tempStartDate}
                        onSelect={setTempStartDate}
                        initialFocus
                        showClearButton={false}
                        showTodayButton={false}
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setTempStartDate(startDate);
                                setStartOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                onStartDateSelect(tempStartDate);
                                setStartOpen(false);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            Apply
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {dateRange && <span className="text-xs text-gray-400">→</span>}

            {/* To Date */}
            <Popover open={endOpen} onOpenChange={(open) => {
                setEndOpen(open);
                if (open) setTempEndDate(endDate);
            }}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-7 text-xs gap-1 ${dateRange?.end ? 'border-orange-300 bg-orange-50 text-orange-700' : ''}`}
                    >
                        <CalendarIcon className="h-3 w-3" />
                        {formatDisplay(endDate) || 'End Date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={tempEndDate}
                        onSelect={setTempEndDate}
                        initialFocus
                        showClearButton={false}
                        showTodayButton={false}
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setTempEndDate(endDate);
                                setEndOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                onEndDateSelect(tempEndDate);
                                setEndOpen(false);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            Apply
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Clear date range */}
            {dateRange && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    onClick={onClear}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

// ────────────────────────────── Internal Dropdown ──────────────────────────────

function FilterDropdown({
    label,
    options,
    selected,
    onToggle,
    onClear,
    colorMap,
}: {
    label: string;
    options: FilterOption[];
    selected: string[];
    onToggle: (value: string) => void;
    onClear: () => void;
    colorMap?: Record<string, string>;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 text-xs gap-1 min-w-[80px] justify-between ${selected.length > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : ''}`}
                >
                    <span>{label}</span>
                    {selected.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-orange-200 text-orange-800">
                            {selected.length}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{label}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
                        Clear
                    </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {options.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">No options available</p>
                    )}
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center gap-2 text-xs cursor-pointer py-0.5 hover:bg-gray-50 rounded px-1"
                            onClick={() => onToggle(option.value)}
                        >
                            <Checkbox
                                checked={selected.includes(option.value)}
                                onCheckedChange={() => onToggle(option.value)}
                                className="h-3.5 w-3.5"
                            />
                            {colorMap?.[option.value] && (
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: colorMap[option.value] }}
                                />
                            )}
                            <span className="truncate">{option.label}</span>
                        </label>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export { EMPTY_FILTERS };
