/**
 * ComparisonCard Component
 * Displays current vs previous period comparison with animated progress
 */

import { cn } from '@/lib/utils';

// Project color scheme
const COLORS = {
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(217, 91%, 60%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
};

interface ComparisonCardProps {
  label: string;
  current: number;
  previous: number;
  change: string;
  suffix?: string;
  icon: React.ElementType;
  color: 'green' | 'amber' | 'blue' | 'red';
  inverse?: boolean;
}

export default function ComparisonCard({
  label,
  current,
  previous,
  change,
  suffix = '',
  icon: Icon,
  color,
  inverse
}: ComparisonCardProps) {
  const changeValue = parseFloat(change.replace('%', ''));
  const isPositive = inverse ? changeValue < 0 : changeValue > 0;

  const colorClasses = {
    green: 'from-green-500/10 to-green-500/5 border-green-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
  };

  const iconColors = {
    green: 'text-green-600 bg-green-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
    red: 'text-red-600 bg-red-500/10',
  };

  const progressColors = {
    green: COLORS.success,
    amber: COLORS.warning,
    blue: COLORS.info,
    red: COLORS.destructive,
  };

  return (
    <div className={cn('p-4 rounded-xl border bg-gradient-to-br group hover:shadow-lg transition-all duration-300', colorClasses[color])}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', iconColors[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-bold',
          isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        )}>
          {change}
        </div>
      </div>
      <div className="mb-3">
        <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-black text-foreground">{current}{suffix}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">Previous: {previous}{suffix}</div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000 ease-out rounded-full"
          style={{
            width: `${Math.min(100, (current / Math.max(current, previous)) * 100)}%`,
            backgroundColor: progressColors[color]
          }}
        />
      </div>
    </div>
  );
}
