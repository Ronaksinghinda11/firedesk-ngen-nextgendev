/**
 * MetricCard3D Component
 * Enhanced 3D metric card with progress ring and sparkline
 */

import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface MetricCard3DProps {
  title: string;
  value: number | string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  gradient: string;
  pulse?: boolean;
  progress: number;
  sparkline: Array<{ value: number }>;
}

export default function MetricCard3D({
  title,
  value,
  change,
  trend,
  icon: Icon,
  gradient,
  pulse,
  progress,
  sparkline
}: MetricCard3DProps) {
  const safeProgress = Number.isNaN(progress) ? 0 : progress;
  const circumference = 2 * Math.PI * 16;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="group relative">
      <div className={cn(
        'relative overflow-hidden rounded-2xl p-4 text-white transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-2xl',
        `bg-gradient-to-br ${gradient}`,
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity'
      )}>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 relative',
                pulse && 'animate-pulse'
              )}>
                <Icon className="h-3.5 w-3.5" />
                <svg className="absolute -inset-0.5 w-8 h-8" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="16" cy="16" r="16" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
                  <circle
                    cx="16"
                    cy="16"
                    r="16"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              'bg-white/20 backdrop-blur-sm border border-white/30'
            )}>
              {trend === 'up' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {change}
            </div>
          </div>
          <div className="space-y-0.5 mb-2">
            <p className="text-[10px] font-medium text-white/80">{title}</p>
            <p className="text-2xl font-black leading-none">{value}</p>
          </div>
          <div className="h-5 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline}>
                <defs>
                  <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="white" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="white" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="white" strokeWidth={1.5} fill={`url(#grad-${title})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 w-full h-full bg-black/10 rounded-2xl -z-10 group-hover:-bottom-2 group-hover:-right-2 transition-all duration-300"></div>
      </div>
    </div>
  );
}
