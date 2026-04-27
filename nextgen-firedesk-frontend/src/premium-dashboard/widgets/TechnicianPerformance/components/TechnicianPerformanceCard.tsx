/**
 * TechnicianPerformanceCard Component
 * Simplified card displaying technician name, assigned, and completed services
 */

import { User } from 'lucide-react';

interface TechnicianPerformanceCardProps {
    tech: {
        technicianName: string;
        avatar: string;
        completed: number;
        total: number;
    };
    index: number;
}

export default function TechnicianPerformanceCard({ tech, index }: TechnicianPerformanceCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-3.5">
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-full gradient-orange flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {tech.avatar}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{tech.technicianName}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Technician</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-background/50 border border-border/40 text-center">
                    <div className="text-xs font-bold text-primary">{tech.total}</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Assigned</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50 border border-border/40 text-center">
                    <div className="text-xs font-bold text-orange-600">{tech.completed}</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold">Completed</div>
                </div>
            </div>

            {/* Subtle progress bar for visual interest */}
            <div className="mt-3 w-full bg-muted/50 rounded-full h-1 overflow-hidden">
                <div
                    className="h-full gradient-orange rounded-full transition-all duration-700"
                    style={{ width: `${tech.total > 0 ? (tech.completed / tech.total) * 100 : 0}%` }}
                ></div>
            </div>
        </div>
    );
}
