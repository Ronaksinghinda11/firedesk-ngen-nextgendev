/**
 * StatusCardCompact Component
 * Shared compact status card for dashboard widgets
 */

import { cn } from '@/lib/utils';

interface StatusCardCompactProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: 'green' | 'blue' | 'amber' | 'red' | 'orange' | 'slate';
    trend?: string;
    className?: string;
}

export default function StatusCardCompact({
    icon: Icon,
    label,
    value,
    color,
    trend,
    className
}: StatusCardCompactProps) {
    const colorClasses = {
        green: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
        red: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
        orange: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
        slate: 'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-400',
    };

    return (
        <div className={cn('flex items-center justify-between p-2 rounded-lg border hover:scale-[1.02] transition-transform', colorClasses[color], className)}>
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{value}</span>
                {trend && (
                    <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        trend.includes('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
}
