/**
 * SortableWidget Component
 * Wraps dashboard widgets to enable drag-and-drop reordering and resizing
 */

import React, { Suspense } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Maximize2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface SortableWidgetProps {
    id: string;
    children: React.ReactNode;
    widgetSize?: number;
    onSizeChange?: (size: number) => void;
    allowedSizes?: number[];
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({
    id,
    children,
    widgetSize = 12,
    onSizeChange,
    allowedSizes
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    const getSizeLabel = (size: number) => {
        switch (size) {
            case 12: return 'Full';
            case 6: return 'Half';
            case 4: return 'Third';
            case 8: return '2/3';
            default: return 'Custom';
        }
    };

    // Apply width based on widgetSize (12-column grid system)
    // Using calc to account for gap-3 (0.75rem) spacing
    const getWidthClass = () => {
        switch (widgetSize) {
            case 12: return 'w-full flex-shrink-0';
            case 8: return 'w-full lg:w-[calc(66.666%-0.5rem)] flex-shrink-0';
            case 6: return 'w-full lg:w-[calc(50%-0.375rem)] flex-shrink-0';
            case 4: return 'w-full lg:w-[calc(33.333%-0.5rem)] flex-shrink-0';
            default: return 'w-full flex-shrink-0';
        }
    };

    const isSizeAllowed = (size: number) => {
        if (!allowedSizes) return true;
        return allowedSizes.includes(size);
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative group h-full flex flex-col ${getWidthClass()}`}>
            {/* Drag Handle - visible on hover */}
            <button
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg bg-background/80 border border-border/50 shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-muted"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Size Selector - bottom right corner, visible on hover */}
            {onSizeChange && (
                <div className="absolute right-2 bottom-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Select
                        value={widgetSize.toString()}
                        onValueChange={(value) => onSizeChange(parseInt(value))}
                    >
                        <SelectTrigger className="w-[80px] h-6 text-[10px] bg-background/95 border-border/50 shadow-sm hover:bg-muted">
                            <div className="flex items-center gap-1">
                                <Maximize2 className="h-3 w-3 text-muted-foreground" />
                                <SelectValue>
                                    {getSizeLabel(widgetSize)}
                                </SelectValue>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {isSizeAllowed(12) && <SelectItem value="12" className="text-xs">Full Width</SelectItem>}
                            {isSizeAllowed(8) && <SelectItem value="8" className="text-xs">2/3 Width</SelectItem>}
                            {isSizeAllowed(6) && <SelectItem value="6" className="text-xs">Half Width</SelectItem>}
                            {isSizeAllowed(4) && <SelectItem value="4" className="text-xs">1/3 Width</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex-1 flex flex-col">
                <Suspense fallback={<Skeleton className="w-full h-full min-h-[300px] rounded-xl" />}>
                    {React.Children.map(children, child => {
                        if (React.isValidElement(child)) {
                            return React.cloneElement(child as React.ReactElement<any>, { widgetSize });
                        }
                        return child;
                    })}
                </Suspense>
            </div>
        </div>
    );
};

export default SortableWidget;
