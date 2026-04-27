/**
 * TechnicianCard Component
 * Card displaying technician performance metrics
 */

import { Star } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

// Project color scheme
const COLORS = {
  primary: 'hsl(24, 95%, 53%)',
};

interface TechnicianCardProps {
  tech: {
    technicianName: string;
    avatar: string;
    efficiency: number;
    rating: number;
    completed: number;
    waiting: number;
    overdue: number;
    trend: number[];
  };
  index: number;
}

export default function TechnicianCard({ tech, index }: TechnicianCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-3.5 transition-all hover:border-primary/30 hover:shadow-xl hover:scale-[1.03]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full gradient-orange flex items-center justify-center text-white font-bold text-xs shadow-md">
          {tech.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{tech.technicianName}</div>
          <div className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 text-orange-500 fill-orange-500" />
            <span className="text-[10px] text-muted-foreground">{tech.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted-foreground">Efficiency</span>
          <span className="font-bold text-foreground">{tech.efficiency}%</span>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-1 overflow-hidden">
          <div
            className="h-full gradient-orange rounded-full transition-all duration-500"
            style={{ width: `${tech.efficiency}%` }}
          ></div>
        </div>

        <div className="h-6 -mx-1.5 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tech.trend.map(v => ({ value: v }))}>
              <defs>
                <linearGradient id={`spark${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={1.5} fill={`url(#spark${index})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 5-color palette: Orange=Done, Sky Blue=Wait, Slate Gray=Late */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <div className="text-center">
            <div className="text-[10px] font-bold text-orange-600">{tech.completed}</div>
            <div className="text-[9px] text-muted-foreground">Done</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-sky-600">{tech.waiting}</div>
            <div className="text-[9px] text-muted-foreground">Wait</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-gray-600">{tech.overdue}</div>
            <div className="text-[9px] text-muted-foreground">Late</div>
          </div>
        </div>
      </div>
    </div>
  );
}
