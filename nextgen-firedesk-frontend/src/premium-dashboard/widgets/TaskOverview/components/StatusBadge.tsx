/**
 * StatusBadge Component
 * Colored badge for task status
 */

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    completed: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400',
    in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400',
    inprogress: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400',
    PENDING: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/5 dark:text-slate-400',
    overdue: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/5 dark:text-red-400',
  };

  const labels = {
    completed: 'Healthy',
    in_progress: 'Active',
    inprogress: 'Active',
    PENDING: 'Critical',
    overdue: 'Overdue',
  };

  return (
    <span className={cn('px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border', colors[status as keyof typeof colors] || colors.PENDING)}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
