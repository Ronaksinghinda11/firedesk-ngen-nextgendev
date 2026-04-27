/**
 * ChartTypeSwitcher Component
 * Compact button group for switching between chart visualization types
 */

import { BarChart3, LineChart, PieChart, AreaChart, Gauge, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'radial' | 'stacked';

interface ChartTypeSwitcherProps {
    currentType: ChartType;
    onChange: (type: ChartType) => void;
    availableTypes?: ChartType[];
    className?: string;
}

const CHART_ICONS = {
    bar: BarChart3,
    line: LineChart,
    pie: PieChart,
    area: AreaChart,
    radial: Gauge,
    stacked: Layers, // Horizontal stacked bars - using Layers for visual distinction
};

const CHART_LABELS = {
    bar: 'Bar Chart',
    line: 'Line Chart',
    pie: 'Pie Chart',
    area: 'Area Chart',
    radial: 'Gauge',
    stacked: 'Stacked Bar',
};

export default function ChartTypeSwitcher({
    currentType,
    onChange,
    availableTypes = ['bar', 'line', 'pie', 'area', 'radial', 'stacked'],
    className,
}: ChartTypeSwitcherProps) {
    return (
        <div className={cn('flex items-center gap-0.5 bg-muted/30 p-0.5 rounded-lg border border-border/50', className)}>
            {availableTypes.map((type) => {
                const Icon = CHART_ICONS[type];
                const isActive = currentType === type;

                return (
                    <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange(type)}
                        className={cn(
                            'h-7 w-7 p-0 transition-all',
                            isActive
                                ? 'bg-card shadow-sm border border-border/50'
                                : 'hover:bg-muted/50'
                        )}
                        title={CHART_LABELS[type]}
                    >
                        <Icon className={cn(
                            'h-3.5 w-3.5 transition-colors',
                            isActive ? 'text-primary' : 'text-muted-foreground'
                        )} />
                    </Button>
                );
            })}
        </div>
    );
}
