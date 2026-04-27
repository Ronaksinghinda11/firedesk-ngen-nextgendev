import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from '@/lib/utils';

interface ConditionSelectorProps {
    conditions: any[]; // Master conditions list
    selectedConditions: any[]; // Currently selected conditions for the row
    onChange: (newConditions: any[]) => void;
}

export function ConditionSelector({ conditions, selectedConditions, onChange }: ConditionSelectorProps) {
    const [open, setOpen] = useState(false);

    // Helper to check if a master condition is selected
    const isSelected = (masterId: string) => {
        return selectedConditions.some(c => c.condition_id === masterId || c.id === masterId);
    };

    const handleSelect = (masterCondition: any) => {
        const selected = isSelected(masterCondition.id);
        let newConditions;

        if (selected) {
            // Deselect if already selected (toggle off)
            newConditions = [];
        } else {
            // Select new (replace existing)
            const newCondition = {
                condition_source: 'manual',
                condition_id: masterCondition.id,
                condition_name: masterCondition.condition_name,
                condition_code: masterCondition.condition_code,
                display_order: 1,
                is_active: true
            };
            newConditions = [newCondition];
        }

        onChange(newConditions);
        setOpen(false); // Close popover on selection for single-select workflow
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-auto min-h-8 w-full justify-between text-xs px-2 py-1"
                >
                    {selectedConditions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 items-center">
                            {selectedConditions.map((condition) => (
                                <Badge
                                    key={condition.condition_id || condition.id}
                                    variant="secondary"
                                    className="px-1 py-0 text-[10px] h-5 rounded-sm font-normal bg-orange-50 text-orange-700 border-orange-200"
                                >
                                    {condition.condition_name}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Select Condition</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search condition..." className="h-8 text-xs" />
                    <CommandEmpty>No condition found.</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                            {conditions.map((condition) => {
                                const selected = isSelected(condition.id);
                                return (
                                    <CommandItem
                                        key={condition.id}
                                        value={condition.condition_name}
                                        onSelect={() => handleSelect(condition)}
                                        className="text-xs"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-3 w-3",
                                                selected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{condition.condition_name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {condition.condition_code}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] px-1 rounded",
                                                    condition.severity_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                                        condition.severity_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                                            condition.severity_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                )}>
                                                    {condition.severity_level}
                                                </span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
