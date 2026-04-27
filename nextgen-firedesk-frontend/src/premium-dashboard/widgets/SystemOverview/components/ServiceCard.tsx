/**
 * ServiceCard Component
 * Displays service metrics with progress bar
 */

import { cn } from '@/lib/utils';

interface ServiceCardProps {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'amber' | 'blue';
}

export default function ServiceCard({ label, value, total, color }: ServiceCardProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  // 5-color palette: Flame Orange, Sky Blue, Slate Gray, White, Platinum
  const colorClasses = {
    green: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400', // Use Orange
    amber: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',             // Use Sky Blue
    blue: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',              // Use Sky Blue
  };

  const progressColors = {
    green: 'bg-orange-500',   // Flame Orange
    amber: 'bg-sky-500',     // Sky Blue
    blue: 'bg-sky-500',       // Sky Blue
  };

  return (
    <div className={cn('text-center p-2 rounded-lg border hover:scale-105 transition-transform', colorClasses[color])}>
      <div className="text-base font-black">{value}</div>
      <div className="text-[9px] mt-0.5 mb-1">{label}</div>
      <div className="w-full bg-white/20 dark:bg-black/20 rounded-full h-0.5">
        <div className={cn('h-0.5 rounded-full', progressColors[color])} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
