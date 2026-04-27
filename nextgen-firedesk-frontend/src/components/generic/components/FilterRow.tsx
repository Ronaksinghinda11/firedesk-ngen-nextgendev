// src/components/generic/components/FilterRow.tsx
import React, { useState, useEffect } from "react";
import { X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { FilterAttribute, FilterOperator, ActiveFilter } from "../types/entity.types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface FilterRowProps {
    filter: ActiveFilter;
    attributes: FilterAttribute[];
    onUpdate: (id: string, updates: Partial<ActiveFilter>) => void;
    onRemove: (id: string) => void;
}

const operatorLabels: Record<FilterOperator, string> = {
    is: "is",
    isNot: "is not",
    contains: "contains",
    before: "before",
    after: "after",
    overdue: "overdue",
    dueSoon: "due soon"
};

// Provide default operators based on attribute type
const defaultOperators: Record<string, FilterOperator[]> = {
    text: ["contains", "is", "isNot"],
    select: ["is", "isNot"],
    date: ["is", "before", "after"],
    number: ["is", "isNot"]
};

export function FilterRow({ filter, attributes, onUpdate, onRemove }: FilterRowProps) {
    const [dateOpen, setDateOpen] = useState(false);
    const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
    const [localValue, setLocalValue] = useState(filter.value);
    const activeAttr = attributes.find(a => a.id === filter.attributeId);

    // Debounce filter value updates to prevent excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== filter.value) {
                onUpdate(filter.id, { value: localValue });
            }
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [localValue]);

    // Sync local value when filter changes externally
    useEffect(() => {
        setLocalValue(filter.value);
    }, [filter.value]);

    if (!activeAttr) return null;

    // Get operators with fallback to defaults
    const operators = activeAttr.operators || defaultOperators[activeAttr.type] || ["is"];

    // Normalize options to always be { label, value } format
    const normalizeOptions = (options: any[] | undefined) => {
        if (!options) return [];
        return options.map(opt => {
            if (typeof opt === 'string') {
                return { label: opt, value: opt };
            }
            return opt;
        });
    };

    const normalizedOptions = normalizeOptions(activeAttr.options);
    
    // Debug log for capacity filter
    if (activeAttr.id === 'capacity') {
        console.log('[FilterRow] Capacity filter - activeAttr:', activeAttr);
        console.log('[FilterRow] Capacity filter - normalizedOptions:', normalizedOptions);
        console.log('[FilterRow] Capacity filter - will show select?', activeAttr.type === "select" && normalizedOptions.length > 0);
    }

    // Parse date value for Calendar
    const parsedDate = filter.value ? new Date(filter.value) : undefined;
    const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 group bg-gray-50 border border-gray-200 rounded-md px-1.5 py-1 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
        >
            {/* Attribute Selector - More compact */}
            <Select
                value={filter.attributeId}
                onValueChange={(val) => onUpdate(filter.id, { attributeId: val, value: "" })}
            >
                <SelectTrigger className="h-6 w-[100px] text-[11px] bg-white border-gray-200 focus:ring-orange-500 px-2">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {attributes
                        .filter(attr => attr.filterable !== false)
                        .map(attr => (
                            <SelectItem key={attr.id} value={attr.id} className="text-xs">
                                {attr.label}
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>

            {/* Operator Selector - More compact */}
            <Select
                value={filter.operator}
                onValueChange={(val) => onUpdate(filter.id, { operator: val as FilterOperator })}
            >
                <SelectTrigger className="h-6 w-[80px] text-[11px] bg-white border-gray-200 focus:ring-orange-500 font-medium px-2">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {operators.map(op => (
                        <SelectItem key={op} value={op} className="text-xs">
                            {operatorLabels[op]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Value Input/Selector - More compact */}
            {activeAttr.type === "select" && normalizedOptions.length > 0 ? (
                <Select
                    value={filter.value}
                    onValueChange={(val) => onUpdate(filter.id, { value: val })}
                >
                    <SelectTrigger className="h-6 w-[100px] text-[11px] bg-white border-gray-200 focus:ring-orange-500 px-2">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {normalizedOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : activeAttr.type === "date" ? (
                <Popover open={dateOpen} onOpenChange={(open) => {
                    setDateOpen(open);
                    if (open) {
                        setTempDate(filter.value ? new Date(filter.value) : undefined);
                    }
                }}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-6 w-[130px] text-[11px] bg-white border-gray-200 focus:ring-orange-500 px-2 justify-start font-normal"
                        >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {isValidDate ? format(parsedDate!, "MMM dd, yyyy") : "Pick date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={tempDate}
                            onSelect={setTempDate}
                            initialFocus
                        />
                        <div className="flex items-center justify-end gap-2 p-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setTempDate(filter.value ? new Date(filter.value) : undefined);
                                    setDateOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (tempDate) {
                                        const formatted = format(tempDate, "yyyy-MM-dd");
                                        onUpdate(filter.id, { value: formatted });
                                    } else {
                                        onUpdate(filter.id, { value: "" }); // Clear if no date selected
                                    }
                                    setDateOpen(false);
                                }}
                            >
                                Apply
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            ) : (
                <Input
                    type={activeAttr.type === "number" ? "number" : "text"}
                    placeholder="Value..."
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className="h-6 w-[100px] text-[11px] bg-white border-gray-200 focus:ring-orange-500 px-2"
                />
            )}

            {/* Remove Button - Always visible, more compact */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(filter.id)}
                className="h-5 w-5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors p-0 ml-0.5"
            >
                <X className="h-3 w-3" />
            </Button>
        </motion.div>
    );
}

export default FilterRow;
