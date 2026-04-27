/**
 * OverdueCard Component
 * Card for overdue task breakdown by severity
 */

import { cn } from '@/lib/utils';

interface OverdueCardProps {
  label: string;
  value: number;
  severity: 'high' | 'medium' | 'low';
}

export default function OverdueCard({ label, value, severity }: OverdueCardProps) {
  // 5-color palette: Flame Orange, Sky Blue, Slate Gray, White, Platinum
  const colors = {
    high: 'bg-gray-600/10 border-gray-600/20 text-gray-700 dark:text-gray-400',     // Slate for critical
    medium: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400', // Orange for medium
    low: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',          // Sky Blue for low
  };

  const progressColors = {
    high: 'bg-gray-600',      // Slate Gray
    medium: 'bg-orange-500',  // Flame Orange
    low: 'bg-sky-500',        // Sky Blue
  };

  return (
    <div className={cn('p-3 rounded-xl border hover:scale-[1.02] transition-transform', colors[severity])}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-medium">{label}</span>
        <span className="text-lg font-black">{value}</span>
      </div>
      <div className="w-full bg-white/20 dark:bg-black/20 rounded-full h-1.5">
        <div className={cn('h-1.5 rounded-full transition-all duration-500', progressColors[severity])} style={{ width: `${Math.min(value * 10, 100)}%` }}></div>
      </div>
    </div>
  );
}
