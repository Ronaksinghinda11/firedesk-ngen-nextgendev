/**
 * TaskStatusBar Component
 * Horizontal bar for task status with icon
 */

import { cn } from '@/lib/utils';

interface TaskStatusBarProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'amber' | 'gray' | 'purple' | 'red';
}

export default function TaskStatusBar({ label, value, icon: Icon, color }: TaskStatusBarProps) {
  // 5-color palette: Flame Orange, Sky Blue, Slate Gray, White, Platinum
  const colorClasses = {
    green: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',   // Use Orange
    blue: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',                 // Sky Blue
    amber: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',   // Use Orange
    gray: 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400',             // Slate Gray
    purple: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',               // Use Sky Blue
    red: 'bg-gray-600/10 border-gray-600/20 text-gray-700 dark:text-gray-400',              // Use Slate
  };

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-lg border hover:scale-[1.02] transition-transform', colorClasses[color])}>
      <Icon className="h-3.5 w-3.5" />
      <div className="flex-1 text-[10px] font-medium">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
