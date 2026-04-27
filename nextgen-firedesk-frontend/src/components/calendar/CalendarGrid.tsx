/**
 * CalendarGrid — Monthly Calendar View
 *
 * Displays a standard month grid with colored dots indicating service statuses
 * for each day. Click a day to see detail modal. Shows progress indicators
 * and service counts per day.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowRight,
    Calendar,
} from 'lucide-react';
import {
    type CalendarServiceItem,
    type ServiceWindowStatus,
    statusConfig,
    serviceTypeColors,
    normalizeServiceType,
    formatDateFull,
} from '@/lib/calendarDataUtils';

interface CalendarGridProps {
    services: CalendarServiceItem[];
    month: number;
    year: number;
    onMonthChange: (month: number, year: number) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/** Map API status to our window status for day-cell display */
function mapAPIStatusToWindowStatus(apiStatus: string): ServiceWindowStatus {
    const s = apiStatus?.toLowerCase() || '';
    if (s.includes('submit') || s.includes('approved') || s.includes('completed')) return 'completed';
    if (s.includes('lapsed') || s.includes('overdue')) return 'overdue';
    if (s.includes('due') || s.includes('pending') || s === 'assigned') return 'due';
    if (s.includes('upcoming')) return 'upcoming';
    return 'due';
}

export function CalendarGrid({
    services,
    month,
    year,
    onMonthChange,
}: CalendarGridProps) {
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build days grid
    const gridDays = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();

        // Monday = 0, Sunday = 6
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const days: Array<{ date: Date; inMonth: boolean }> = [];

        // Leading days from previous month
        for (let i = startDow - 1; i >= 0; i--) {
            const d = new Date(firstDay);
            d.setDate(d.getDate() - i - 1);
            days.push({ date: d, inMonth: false });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month - 1, i), inMonth: true });
        }

        // Trailing days to fill 6 rows
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month, i), inMonth: false });
        }

        return days;
    }, [month, year]);

    // Group services by day
    const servicesByDay = useMemo(() => {
        const map = new Map<string, CalendarServiceItem[]>();
        services.forEach((s) => {
            const dateKey = s.scheduledDate?.split('T')[0];
            if (!dateKey) return;
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(s);
        });
        return map;
    }, [services]);

    // Navigation
    const navigate = (dir: 'prev' | 'next') => {
        let newMonth = month + (dir === 'next' ? 1 : -1);
        let newYear = year;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        onMonthChange(newMonth, newYear);
    };

    const goToCurrentMonth = () => {
        onMonthChange(today.getMonth() + 1, today.getFullYear());
    };

    // Detail modal services
    const selectedDayServices = useMemo(() => {
        if (!selectedDay) return [];
        const key = selectedDay.toISOString().split('T')[0];
        return servicesByDay.get(key) || [];
    }, [selectedDay, servicesByDay]);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => navigate('prev')}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToCurrentMonth}>
                        Today
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => navigate('next')}>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <h2 className="text-sm font-semibold text-gray-800">
                    {MONTH_NAMES[month - 1]} {year}
                </h2>

                <div className="flex items-center gap-3">
                    {Object.entries(statusConfig).filter(([k]) => k !== 'waiting').map(([key, cfg]) => (
                        <div key={key} className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                            <span className="text-[10px] text-gray-500">{cfg.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
                {DAY_NAMES.map((name) => (
                    <div key={name} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-1.5">
                        {name}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7">
                {gridDays.map((day, i) => {
                    const dateKey = day.date.toISOString().split('T')[0];
                    const dayServices = servicesByDay.get(dateKey) || [];
                    const isToday = day.date.toDateString() === today.toDateString();
                    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

                    // Aggregate status counts
                    const statusCounts: Record<ServiceWindowStatus, number> = {
                        waiting: 0, due: 0, overdue: 0, completed: 0, upcoming: 0,
                    };
                    dayServices.forEach((s) => {
                        const status = mapAPIStatusToWindowStatus(s.status);
                        statusCounts[status]++;
                    });

                    const total = dayServices.length;
                    const completedPct = total > 0 ? (statusCounts.completed / total) * 100 : 0;

                    return (
                        <div
                            key={i}
                            className={`relative border-b border-r border-gray-50 cursor-pointer transition-colors
                ${!day.inMonth ? 'opacity-30' : ''}
                ${isToday ? 'ring-2 ring-orange-400 ring-inset rounded-sm z-10' : ''}
                ${isWeekend && day.inMonth ? 'bg-gray-50/30' : ''}
                hover:bg-orange-50/40
              `}
                            style={{ minHeight: 72 }}
                            onClick={() => day.inMonth && setSelectedDay(day.date)}
                        >
                            {/* Day number */}
                            <div className="flex items-center justify-between px-1.5 pt-1">
                                <span className={`text-xs ${isToday ? 'bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold' : 'text-gray-600'}`}>
                                    {day.date.getDate()}
                                </span>
                                {total > 0 && day.inMonth && (
                                    <span className="text-[9px] text-gray-400">{total}</span>
                                )}
                            </div>

                            {/* Status dots */}
                            {day.inMonth && total > 0 && (
                                <div className="flex items-center gap-0.5 px-1.5 mt-1 flex-wrap">
                                    {statusCounts.completed > 0 && (
                                        <StatusDot status="completed" count={statusCounts.completed} />
                                    )}
                                    {statusCounts.due > 0 && (
                                        <StatusDot status="due" count={statusCounts.due} />
                                    )}
                                    {statusCounts.overdue > 0 && (
                                        <StatusDot status="overdue" count={statusCounts.overdue} />
                                    )}
                                    {statusCounts.upcoming > 0 && (
                                        <StatusDot status="upcoming" count={statusCounts.upcoming} />
                                    )}
                                </div>
                            )}

                            {/* Completion bar */}
                            {day.inMonth && total > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5">
                                    <div
                                        className="h-full transition-all"
                                        style={{
                                            width: `${completedPct}%`,
                                            background: statusConfig.completed.color,
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Day Detail Modal */}
            <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            {selectedDay && formatDateFull(selectedDay)}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDayServices.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">No services scheduled for this day.</p>
                    ) : (
                        <div className="space-y-2 mt-2">
                            {selectedDayServices.map((s) => {
                                const status = mapAPIStatusToWindowStatus(s.status);
                                const stCfg = statusConfig[status];
                                const typeCfg = serviceTypeColors[normalizeServiceType(s.type as string)];

                                return (
                                    <div
                                        key={s.id}
                                        className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div
                                            className="w-1 self-stretch rounded-full shrink-0"
                                            style={{ background: typeCfg.accent }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-medium text-gray-800 truncate">{s.name}</span>
                                                <Badge className="text-[8px] h-3.5 px-1" style={{ background: typeCfg.bg, color: typeCfg.text }}>
                                                    {s.type}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                                                <span>{s.assetCode || s.equipment}</span>
                                                <span>•</span>
                                                <span>{s.frequency}</span>
                                                {s.category && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{s.category}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            className="text-[9px] h-5 px-1.5 shrink-0"
                                            style={{ background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.color}30` }}
                                        >
                                            {stCfg.label}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ────────────────────────────── Status Dot ──────────────────────────────

function StatusDot({ status, count }: { status: ServiceWindowStatus; count: number }) {
    const cfg = statusConfig[status];
    return (
        <div className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
            {count > 1 && <span className="text-[8px]" style={{ color: cfg.color }}>{count}</span>}
        </div>
    );
}
