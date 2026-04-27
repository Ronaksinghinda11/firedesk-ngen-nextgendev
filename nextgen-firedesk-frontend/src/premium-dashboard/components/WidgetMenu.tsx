/**
 * WidgetMenu Component
 * Dropdown menu for widget actions (resize, configure, remove)
 */

import { MoreVertical, Maximize2, Minimize2, Settings, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SIZE_OPTIONS, type WidgetSize } from '../utils/widgetSizeUtils';

interface WidgetMenuProps {
    currentSize: WidgetSize;
    onSizeChange: (size: WidgetSize) => void;
    onRemove?: () => void;
    onConfigure?: () => void;
}

export default function WidgetMenu({
    currentSize,
    onSizeChange,
    onRemove,
    onConfigure,
}: WidgetMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Widget Size</DropdownMenuLabel>
                {SIZE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onSizeChange(option.value)}
                        className="text-xs cursor-pointer"
                    >
                        <Maximize2 className="h-3.5 w-3.5 mr-2" />
                        {option.label}
                        {currentSize === option.value && (
                            <span className="ml-auto text-primary">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}

                {(onConfigure || onRemove) && <DropdownMenuSeparator />}

                {onConfigure && (
                    <DropdownMenuItem onClick={onConfigure} className="text-xs cursor-pointer">
                        <Settings className="h-3.5 w-3.5 mr-2" />
                        Configure Graph
                    </DropdownMenuItem>
                )}

                {onRemove && (
                    <DropdownMenuItem
                        onClick={onRemove}
                        className="text-xs cursor-pointer text-destructive focus:text-destructive"
                    >
                        <X className="h-3.5 w-3.5 mr-2" />
                        Remove Component
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
