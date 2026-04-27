/**
 * TaskTypeCard Component
 * Compact card for task type breakdown
 */

import { cn } from '@/lib/utils';

interface TaskTypeCardProps {
  label: string;
  value: number;
  color: 'blue' | 'gray' | 'orange';
}

export default function TaskTypeCard({ label, value, color }: TaskTypeCardProps) {
  // 5-color palette: Flame Orange, Sky Blue, Slate Gray, White, Platinum
  const colorClasses = {
    blue: 'bg-sky-500/10 border-sky-500/20',      // Sky Blue
    gray: 'bg-gray-500/10 border-gray-500/20',    // Slate Gray
    orange: 'bg-orange-500/10 border-orange-500/20', // Flame Orange
  };

  return (
    <div className={cn('text-center p-2 rounded-lg border hover:scale-105 transition-transform', colorClasses[color])}>
      <div className="text-xs font-bold text-foreground">{value}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
