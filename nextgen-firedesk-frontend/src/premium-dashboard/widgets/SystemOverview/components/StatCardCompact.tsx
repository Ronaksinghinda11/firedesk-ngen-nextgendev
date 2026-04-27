/**
 * StatCardCompact Component
 * Compact stat card for system overview with optional click handler
 */

import { cn } from '@/lib/utils';

interface StatCardCompactProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total?: number;
  color: 'green' | 'amber' | 'red' | 'blue';
  trend?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export default function StatCardCompact({
  icon: Icon,
  label,
  value,
  total,
  color,
  trend,
  clickable,
  onClick
}: StatCardCompactProps) {
  const percentage = total ? Math.round((value / total) * 100) : 0;

  // 5-color palette: Flame Orange, Sky Blue, Slate Gray, White, Platinum
  const colorClasses = {
    green: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400', // Use Orange
    amber: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',             // Use Sky Blue
    red: 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400',           // Use Slate
    blue: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',              // Use Sky Blue
  };

  const progressColors = {
    green: 'bg-orange-500',   // Flame Orange
    amber: 'bg-sky-500',      // Sky Blue
    red: 'bg-gray-500',       // Slate Gray
    blue: 'bg-sky-500',       // Sky Blue
  };

  return (
    <div
      className={cn(
        'p-2 rounded-xl border transition-all',
        colorClasses[color],
        clickable && 'cursor-pointer hover:scale-[1.02] hover:shadow-md'
      )}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-4 w-4" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium truncate">{label}</div>
          <div className="text-lg font-black leading-none mt-0.5">{value}</div>
        </div>
      </div>
      {total && (
        <>
          <div className="flex items-center justify-between text-[9px] mb-1.5">
            <span>{percentage}%</span>
            {trend && <span className="font-bold">{trend}</span>}
          </div>
          <div className="w-full bg-white/20 dark:bg-black/20 rounded-full h-1">
            <div className={cn('h-1 rounded-full transition-all duration-500', progressColors[color])} style={{ width: `${percentage}%` }}></div>
          </div>
        </>
      )}
    </div>
  );
}
