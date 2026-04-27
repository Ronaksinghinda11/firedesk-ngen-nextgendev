/**
 * WidgetSizeControl Component
 * Allows users to toggle widget size between compact, normal, and expanded
 */

import { Minimize2, Square, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WidgetSize = 'compact' | 'normal' | 'expanded';

interface WidgetSizeControlProps {
    currentSize: WidgetSize;
    onChange: (size: WidgetSize) => void;
    className?: string;
}

export default function WidgetSizeControl({
    currentSize,
    onChange,
    className,
}: WidgetSizeControlProps) {
    const sizes: { value: WidgetSize; icon: typeof Minimize2; label: string }[] = [
        { value: 'compact', icon: Minimize2, label: 'Compact view' },
        { value: 'normal', icon: Square, label: 'Normal view' },
        { value: 'expanded', icon: Maximize2, label: 'Expanded view' },
    ];

    return (
        <div className={cn('flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5', className)}>
            {sizes.map(({ value, icon: Icon, label }) => (
                <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(value)}
                    className={cn(
                        'h-7 w-7 p-0 hover:bg-background/80 transition-colors',
                        currentSize === value && 'bg-background shadow-sm'
                    )}
                    title={label}
                >
                    <Icon className="h-3.5 w-3.5" />
                </Button>
            ))}
        </div>
    );
}
