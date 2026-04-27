/**
 * GanttChart — Timeline view for service windows
 *
 * Shows horizontal bars for each asset's service windows, grouped by service type.
 * Supports zoom levels (day/week/month), date navigation, rich hover details,
 * and synced left/right panel scroll.
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Calendar,
    Layers,
    FileText,
    Hash,
} from 'lucide-react';
import {
    type AssetServiceGroup,
    type CalendarServiceItem,
    type ServiceWindow,
    type ServiceWindowStatus,
    type ServiceType,
    statusConfig,
    serviceTypeColors,
    serviceTypes,
    formatDate,
    formatDateFull,
    frequencyDays,
    normalizeFrequency,
    type Frequency,
} from '@/lib/calendarDataUtils';

// Signed days: positive when b > a, negative when b < a
function signedDaysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
// Absolute days (always >= 0)
function absDaysBetween(a: Date, b: Date): number {
    return Math.abs(signedDaysBetween(a, b));
}

type ZoomLevel = 'day' | 'week' | 'month';

interface GanttChartProps {
    assetGroups: AssetServiceGroup[];
    rangeStart: Date;
    rangeEnd: Date;
    onRangeChange?: (start: Date, end: Date) => void;
    className?: string;
}

const ZOOM_CONFIG: Record<ZoomLevel, { label: string; daysVisible: number; colWidth: number }> = {
    day: { label: 'Day', daysVisible: 31, colWidth: 38 },
    week: { label: 'Week', daysVisible: 90, colWidth: 16 },
    month: { label: 'Month', daysVisible: 365, colWidth: 4 },
};

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 52;
const LEFT_PANEL_WIDTH = 260;
const MAX_VISIBLE_ASSETS = 10; // cap: scroll when more than 10 assets (30 rows)
const MIN_DISPLAY_ROWS = 5;    // minimum rows of height to always reserve (prevents chart collapsing)
const OVERSCAN_COUNT = 5;      // extra rows rendered above/below viewport for smooth scrolling
const SERVICE_TYPE_ABBR: Record<ServiceType, string> = {
    Inspection: 'INS',
    Maintenance: 'MNT',
    Testing: 'TST',
};

export function GanttChart({
    assetGroups,
    rangeStart,
    rangeEnd,
    onRangeChange,
    className = '',
}: GanttChartProps) {
    const [zoom, setZoom] = useState<ZoomLevel>('week');
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const isSyncingScroll = useRef(false);

    // State to track active scrolling (used to temporarily kill pointer events and close tooltips when scrolling)
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>();

    // ─── Virtualization state ───
    const [scrollTop, setScrollTop] = useState(0);
    const [panelHeight, setPanelHeight] = useState(0);
    const panelResizeObserver = useRef<ResizeObserver | null>(null);

    // ─── Sync vertical scroll between left & right panels ───
    const handleLeftScroll = useCallback(() => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        if (leftPanelRef.current && rightPanelRef.current) {
            rightPanelRef.current.scrollTop = leftPanelRef.current.scrollTop;
        }
        requestAnimationFrame(() => { isSyncingScroll.current = false; });
    }, []);

    const handleRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isSyncingScroll.current) return;
        isSyncingScroll.current = true;
        if (leftPanelRef.current) {
            leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
        }

        // Track scroll position for virtualization
        setScrollTop(e.currentTarget.scrollTop);

        // Hide hover tooltips dynamically while scrolling
        if (!isScrolling) setIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
            isSyncingScroll.current = false; // Reset sync flag after timeout
        }, 150);
    }, [isScrolling]);

    // Also sync scrollTop from left panel scroll
    const handleLeftScrollWithVirtualization = useCallback(() => {
        handleLeftScroll();
        if (leftPanelRef.current) {
            setScrollTop(leftPanelRef.current.scrollTop);
        }
    }, [handleLeftScroll]);

    // Track panel height via ResizeObserver for accurate virtualization
    useEffect(() => {
        const el = rightPanelRef.current;
        if (!el) return;
        setPanelHeight(el.clientHeight - HEADER_HEIGHT);
        panelResizeObserver.current = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPanelHeight(entry.contentRect.height - HEADER_HEIGHT);
            }
        });
        panelResizeObserver.current.observe(el);
        return () => { panelResizeObserver.current?.disconnect(); };
    }, []);

    // Visible date range based on zoom
    const config = ZOOM_CONFIG[zoom];

    // Build flat row list: one row per (asset, serviceType, frequency)
    const rows = useMemo(() => {
        const result: Array<{
            asset: AssetServiceGroup;
            serviceType: ServiceType;
            frequency: Frequency;
            windows: ServiceWindow[];
        }> = [];

        assetGroups.forEach((asset) => {
            serviceTypes.forEach((st) => {
                const serviceList = asset.services[st];
                // Group services by frequency to ensure Daily/Weekly/Monthly get distinct non-overlapping rows
                const freqMap = new Map<Frequency, CalendarServiceItem[]>();
                serviceList.forEach((service) => {
                    const freq = normalizeFrequency(service.frequency);
                    if (!freqMap.has(freq)) freqMap.set(freq, []);
                    freqMap.get(freq)!.push(service);
                });

                freqMap.forEach((freqServiceList, freq) => {
                    const windows: ServiceWindow[] = [];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Sort services chronologically to track past completions
                    const sortedServices = [...freqServiceList].sort((a, b) => {
                        const timeA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
                        const timeB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
                        return timeA - timeB;
                    });

                    let previousServiceCompletedDate: Date | null = null;

                    sortedServices.forEach((service) => {
                        if (!service.scheduledDate) return;
                        const scheduled = new Date(service.scheduledDate);
                        scheduled.setHours(0, 0, 0, 0);

                        const statusLower = service.status?.toLowerCase() || '';
                        const isCompleted = statusLower.includes('approved') || statusLower.includes('completed') || statusLower.includes('submit');

                        // Calculate correct window end based on normalized frequency
                        const days = frequencyDays[freq] || 30;

                        const windowEnd = new Date(scheduled);
                        windowEnd.setHours(0, 0, 0, 0);
                        windowEnd.setDate(windowEnd.getDate() + days - 1);

                        // We only want to add this window to the chart if its Active Window overlaps the visible range
                        const isVisible = !(windowEnd < rangeStart || scheduled > rangeEnd);

                        let status: ServiceWindowStatus = 'upcoming';
                        let completedDate: Date | null = null;

                        // Zero-out the local today time for precise day-by-day comparison
                        const todayMid = new Date(today);
                        todayMid.setHours(0, 0, 0, 0);

                        const scheduledMid = new Date(scheduled);
                        scheduledMid.setHours(0, 0, 0, 0);

                        if (isCompleted) {
                            status = 'completed';
                            completedDate = service.completedAt ? new Date(service.completedAt) : scheduled;
                        } else if (todayMid > windowEnd) {
                            status = 'overdue';
                        } else if (todayMid >= scheduledMid && todayMid <= windowEnd) {
                            status = 'due';
                        } else {
                            status = 'upcoming';
                        }

                        // waiting list starts at 0 for the first service ever, or if the preceding service was not completed
                        // Only apply waiting period if this asset's immediate previous service of this type & frequency was completed
                        const waitingDays = previousServiceCompletedDate ? Math.floor(days * 0.5) : 0;
                        let waitingEnd = new Date(scheduled); // Default to scheduled to yield 0 days duration
                        
                        if (previousServiceCompletedDate) {
                            waitingEnd = new Date(previousServiceCompletedDate);
                            waitingEnd.setDate(waitingEnd.getDate() + waitingDays);
                        }

                        // Set the flag for the NEXT iteration based strictly on THIS service's completion status
                        previousServiceCompletedDate = isCompleted ? completedDate : null;

                        // Only add to the rendering list if it's visible on the timeline
                        if (isVisible) {
                            windows.push({
                                id: `${service.id}-w0`,
                                serviceId: service.id,
                                windowStart: scheduled,
                                windowEnd: windowEnd,
                                waitingEnd: waitingEnd,
                                completedDate,
                                status,
                                sourceService: service,
                            });
                        }
                    });

                    // Skip the row entirely if there are no visible windows in the current date range.
                    if (windows.length === 0) return;

                    result.push({
                        asset,
                        serviceType: st,
                        frequency: freq,
                        windows,
                    });
                });
            });
        });

        return result;
    }, [assetGroups, rangeStart, rangeEnd]);

    // Generate dates array (depends on rows to extend bounds for long windows)
    const dates = useMemo(() => {
        const d: Date[] = [];
        const cur = new Date(rangeStart);
        cur.setHours(0, 0, 0, 0);

        // Scan rows for max windowEnd to ensure grid covers overhanging bars
        let maxEnd = new Date(rangeEnd);
        rows.forEach(row => {
            row.windows.forEach(win => {
                if (win.windowEnd > maxEnd) {
                    maxEnd = new Date(win.windowEnd);
                }
            });
        });

        // Provide a minimum 30-day baseline so small date filters don't shrink the grid bounds inefficiently
        const diffDays = Math.round((maxEnd.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
            maxEnd = new Date(cur);
            maxEnd.setDate(maxEnd.getDate() + 30);
        }

        maxEnd.setHours(0, 0, 0, 0);
        while (cur <= maxEnd) {
            d.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return d;
    }, [rangeStart, rangeEnd, rows]);

    // Navigate by scrolling the timeline panel logically based on zoom level
    const navigate = useCallback(
        (direction: 'prev' | 'next') => {
            if (!rightPanelRef.current) return;
            const panel = rightPanelRef.current;

            // Determine how many days to jump based on zoom level
            let daysToJump = 7; // Default to week
            if (zoom === 'day') daysToJump = 1;
            else if (zoom === 'week') daysToJump = 7;
            else if (zoom === 'month') daysToJump = 30;

            const scrollAmount = daysToJump * config.colWidth;
            panel.scrollBy({
                left: direction === 'next' ? scrollAmount : -scrollAmount,
                behavior: 'smooth',
            });
        },
        [zoom, config.colWidth]
    );

    // Scroll to today's position in the timeline
    const goToToday = useCallback(() => {
        if (!rightPanelRef.current) return;
        const todayPos = signedDaysBetween(rangeStart, new Date()) * config.colWidth;
        rightPanelRef.current.scrollTo({
            left: Math.max(0, todayPos - rightPanelRef.current.clientWidth / 2),
            behavior: 'smooth',
        });
    }, [rangeStart, config.colWidth]);

    const changeZoom = (level: ZoomLevel) => {
        setZoom(level);
        // After zoom change, scroll to keep roughly the same center position
        if (rightPanelRef.current) {
            const panel = rightPanelRef.current;
            const oldCenterDay = (panel.scrollLeft + panel.clientWidth / 2) / config.colWidth;
            const newCfg = ZOOM_CONFIG[level];
            requestAnimationFrame(() => {
                if (rightPanelRef.current) {
                    const newScrollLeft = oldCenterDay * newCfg.colWidth - rightPanelRef.current.clientWidth / 2;
                    rightPanelRef.current.scrollLeft = Math.max(0, newScrollLeft);
                }
            });
        }
    };

    // Auto-scroll to today on mount
    useEffect(() => {
        if (rightPanelRef.current) {
            const todayPos = signedDaysBetween(rangeStart, new Date()) * config.colWidth;
            rightPanelRef.current.scrollLeft = Math.max(0, todayPos - rightPanelRef.current.clientWidth / 2);
        }
    }, [rangeStart]); // eslint-disable-line react-hooks/exhaustive-deps

    // Today marker position
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOffset = signedDaysBetween(rangeStart, today);
    const todayX = todayOffset * config.colWidth;

    // Month headers
    const monthHeaders = useMemo(() => {
        const headers: Array<{ label: string; start: number; width: number }> = [];
        let currentMonth = -1;
        let startIdx = 0;

        dates.forEach((d, i) => {
            const m = d.getMonth();
            if (m !== currentMonth) {
                if (currentMonth !== -1) {
                    headers.push({
                        label: dates[startIdx].toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                        start: startIdx * config.colWidth,
                        width: (i - startIdx) * config.colWidth,
                    });
                }
                currentMonth = m;
                startIdx = i;
            }
        });
        // Last month
        if (dates.length > 0) {
            headers.push({
                label: dates[startIdx].toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                start: startIdx * config.colWidth,
                width: (dates.length - startIdx) * config.colWidth,
            });
        }

        return headers;
    }, [dates, config.colWidth]);

    const chartBodyHeight = rows.length * ROW_HEIGHT;

    // ─── Virtualization: compute visible row window ───
    const { visibleStartIndex, visibleEndIndex, topSpacer, bottomSpacer } = useMemo(() => {
        if (panelHeight <= 0 || rows.length === 0) {
            return { visibleStartIndex: 0, visibleEndIndex: rows.length, topSpacer: 0, bottomSpacer: 0 };
        }
        const startIdx = Math.floor(scrollTop / ROW_HEIGHT);
        const visibleCount = Math.ceil(panelHeight / ROW_HEIGHT);
        const start = Math.max(0, startIdx - OVERSCAN_COUNT);
        const end = Math.min(rows.length, startIdx + visibleCount + OVERSCAN_COUNT);
        return {
            visibleStartIndex: start,
            visibleEndIndex: end,
            topSpacer: start * ROW_HEIGHT,
            bottomSpacer: (rows.length - end) * ROW_HEIGHT,
        };
    }, [scrollTop, panelHeight, rows.length]);

    const visibleRows = useMemo(() => {
        return rows.slice(visibleStartIndex, visibleEndIndex);
    }, [rows, visibleStartIndex, visibleEndIndex]);

    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col w-full max-w-full ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('prev')}>
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToToday}>
                        Today
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('next')}>
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-gray-500 ml-2">
                        {formatDateFull(rangeStart)} — {formatDateFull(rangeEnd)}
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-white border rounded-md p-0.5">
                    {(['day', 'week', 'month'] as ZoomLevel[]).map((level) => (
                        <button
                            key={level}
                            className={`px-2.5 py-1 text-xs rounded transition-colors ${zoom === level
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            onClick={() => changeZoom(level)}
                        >
                            {ZOOM_CONFIG[level].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area — fixed height; minimum shown so chart never collapses with few assets */}
            {/* Both inner panels use height:100% so overflow-y:auto actually enables scroll */}
            {(() => {
                const effectiveBodyHeight = Math.max(chartBodyHeight, MIN_DISPLAY_ROWS * ROW_HEIGHT);
                const maxBodyHeight = MAX_VISIBLE_ASSETS * 3 * ROW_HEIGHT;
                const containerHeight = Math.min(effectiveBodyHeight, maxBodyHeight) + HEADER_HEIGHT;
                const panelStyle = { height: '100%' };
                return (
                    <div
                        className="flex min-w-0"
                        style={{ height: containerHeight }}
                    >
                        {/* Left Panel — Asset Labels (synced vertical scroll) */}
                        <div
                            ref={leftPanelRef}
                            className="shrink-0 border-r border-gray-200 bg-gray-50/30 overflow-y-auto overflow-x-hidden"
                            style={{ width: LEFT_PANEL_WIDTH, ...panelStyle }}
                            onScroll={handleLeftScrollWithVirtualization}
                        >
                            {/* Header spacer */}
                            <div className="border-b border-gray-200 sticky top-0 z-10 bg-gray-50" style={{ height: HEADER_HEIGHT }}>
                                <div className="flex items-center justify-between px-3 h-full">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                        Asset / Service
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] h-4 bg-gray-100">
                                        {assetGroups.length} assets
                                    </Badge>
                                </div>
                            </div>

                            {/* Rows — virtualized */}
                            <div style={{ height: chartBodyHeight }}>
                                {/* Top spacer for off-screen rows */}
                                {topSpacer > 0 && <div style={{ height: topSpacer }} />}
                                {visibleRows.map((row, vi) => {
                                    const actualIndex = visibleStartIndex + vi;
                                    const isFirstOfAsset = actualIndex === 0 || rows[actualIndex - 1].asset.assetId !== row.asset.assetId;
                                    const colors = serviceTypeColors[row.serviceType];

                                    return (
                                        <div
                                            key={`label-${row.asset.assetId}-${row.serviceType}-${row.frequency}`}
                                            className={`flex items-center px-2 ${isFirstOfAsset ? 'border-t border-gray-100' : ''}`}
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                {isFirstOfAsset ? (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Layers className="h-3 w-3 text-gray-400 shrink-0" />
                                                        <span className="text-[11px] font-medium text-gray-800 truncate">
                                                            {row.asset.assetCode}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center">
                                                <Badge
                                                    className="text-[8px] px-1 py-0 h-3.5 shrink-0 font-mono ml-1"
                                                    style={{
                                                        background: colors.bg,
                                                        color: colors.text,
                                                        border: `1px solid ${colors.accent}30`,
                                                    }}
                                                >
                                                    {SERVICE_TYPE_ABBR[row.serviceType]}
                                                </Badge>
                                                <span className="text-[8px] text-gray-400 font-medium ml-1.5 shrink-0 uppercase tracking-wider">
                                                    {row.frequency}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Bottom spacer for off-screen rows */}
                                {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
                            </div>
                        </div>

                        {/* Right Panel — Timeline (synced vertical scroll) */}
                        <div
                            ref={rightPanelRef}
                            className={`flex-1 min-w-0 overflow-auto ${isScrolling ? 'pointer-events-none' : ''}`}
                            style={panelStyle}
                            onScroll={handleRightScroll}
                        >
                            <div style={{ width: dates.length * config.colWidth, position: 'relative' }}>
                                {/* Month + Day Headers */}
                                <div className="sticky top-0 z-10 bg-white border-b border-gray-200" style={{ height: HEADER_HEIGHT }}>
                                    {/* Month row */}
                                    <div className="flex border-b border-gray-100" style={{ height: HEADER_HEIGHT / 2 }}>
                                        {monthHeaders.map((mh, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-center text-[10px] font-semibold text-gray-600 border-r border-gray-100"
                                                style={{ width: mh.width, left: mh.start, position: 'absolute' }}
                                            >
                                                {mh.label}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Day labels (only visible in day/week zoom) */}
                                    {zoom !== 'month' && (
                                        <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                                            {dates.map((d, i) => {
                                                const isToday = d.toDateString() === today.toDateString();
                                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`flex items-center justify-center text-[8px] border-r border-gray-50 ${isToday ? 'bg-orange-500 text-white font-bold rounded-sm' : isWeekend ? 'text-gray-300' : 'text-gray-400'
                                                            }`}
                                                        style={{ width: config.colWidth, minWidth: config.colWidth }}
                                                    >
                                                        {d.getDate()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Grid + Bars */}
                                <div className="relative">
                                    {/* Weekend columns (day/week zoom only) */}
                                    {zoom !== 'month' &&
                                        dates.map((d, i) => {
                                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                            if (!isWeekend) return null;
                                            return (
                                                <div
                                                    key={`bg-${i}`}
                                                    className="absolute top-0 bottom-0 bg-gray-50/40"
                                                    style={{
                                                        left: i * config.colWidth,
                                                        width: config.colWidth,
                                                        height: chartBodyHeight,
                                                    }}
                                                />
                                            );
                                        })}

                                    {/* Today line */}
                                    {todayOffset >= 0 && todayOffset <= dates.length && (
                                        <div
                                            className="absolute top-0 z-20"
                                            style={{
                                                left: todayX,
                                                width: 2,
                                                height: chartBodyHeight,
                                                background: '#ea580c',
                                                opacity: 0.6,
                                            }}
                                        />
                                    )}

                                    {/* Rows — virtualized */}
                                    {/* Top spacer for off-screen rows */}
                                    {topSpacer > 0 && <div style={{ height: topSpacer }} />}
                                    {visibleRows.map((row, vi) => {
                                        const actualIndex = visibleStartIndex + vi;
                                        const isFirstOfAsset = actualIndex === 0 || rows[actualIndex - 1].asset.assetId !== row.asset.assetId;
                                        return (
                                            <div
                                                key={`row-${row.asset.assetId}-${row.serviceType}-${row.frequency}`}
                                                className={`relative ${isFirstOfAsset ? 'border-t border-gray-100' : ''}`}
                                                style={{ height: ROW_HEIGHT }}
                                            >
                                                {/* Service window bars */}
                                                {row.windows.map((win) => (
                                                    <ServiceBar
                                                        key={win.id}
                                                        window={win}
                                                        serviceType={row.serviceType}
                                                        rangeStart={rangeStart}
                                                        colWidth={config.colWidth}
                                                        rowHeight={ROW_HEIGHT}
                                                        asset={row.asset}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                    {/* Bottom spacer for off-screen rows */}
                                    {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-1.5 border-t border-gray-100 bg-gray-50/30">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.color}40` }} />
                        <span className="text-[10px] text-gray-500">{cfg.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ────────────────────────────── Service Bar (memoized) ──────────────────────────────

const ServiceBar = React.memo(function ServiceBar({
    window: win,
    serviceType,
    rangeStart,
    colWidth,
    rowHeight,
    asset,
}: {
    window: ServiceWindow;
    serviceType: ServiceType;
    rangeStart: Date;
    colWidth: number;
    rowHeight: number;
    asset: AssetServiceGroup;
}) {
    const service = win.sourceService;
    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Signed offset: positive = bar is to the right of rangeStart
    const startOffset = signedDaysBetween(rangeStart, win.windowStart);
    // Duration always counts actual days in the window (inclusive)
    const duration = absDaysBetween(win.windowStart, win.windowEnd) + 1;
    const left = Math.max(0, startOffset * colWidth);
    const width = Math.max(duration * colWidth, 4);
    const cfg = statusConfig[win.status];
    const typeCol = serviceTypeColors[serviceType];

    // Waiting stripe width: strictly derived from the service's own frequency (50% of window)
    const waitingDaysReal = signedDaysBetween(win.windowStart, win.waitingEnd);
    const waitingDays = waitingDaysReal > 0 ? waitingDaysReal : 0;
    const waitingWidth = duration > 0 && waitingDays > 0 ? Math.min((waitingDays / duration) * 100, 100) : 0;

    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        setIsHovered(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    // Calculate tooltip position to keep it within viewport
    const tooltipWidth = 280;
    const tooltipHeight = 200; // approximate
    const offset = 12;
    
    let tooltipX = mousePos.x + offset;
    let tooltipY = mousePos.y + offset;
    
    // Prevent overflow on right edge
    if (tooltipX + tooltipWidth > window.innerWidth - 10) {
        tooltipX = mousePos.x - tooltipWidth - offset;
    }
    // Prevent overflow on bottom edge
    if (tooltipY + tooltipHeight > window.innerHeight - 10) {
        tooltipY = mousePos.y - tooltipHeight - offset;
    }

    return (
        <>
            <div
                className="absolute cursor-pointer"
                style={{
                    left,
                    top: 3,
                    width,
                    height: rowHeight - 6,
                    zIndex: 1,
                }}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Bar body — overflow hidden so stripe is clipped to rounded corners */}
                <div
                    className="absolute inset-0 rounded-sm transition-all hover:brightness-90 hover:shadow-md"
                    style={{
                        background: win.status === 'completed' ? typeCol.bg : cfg.bg,
                        borderLeft: `3px solid ${typeCol.accent}`,
                        overflow: 'hidden',
                    }}
                >
                    {/* Waiting stripe — shown over the first 50% of the window */}
                    {waitingWidth > 0 && win.status !== 'completed' && (
                        <div
                            className="absolute inset-y-0 left-0"
                            style={{
                                width: `${waitingWidth}%`,
                                background: `repeating-linear-gradient(
                                    45deg,
                                    transparent, transparent 3px,
                                    rgba(100,116,139,0.35) 3px,
                                    rgba(100,116,139,0.35) 6px
                                )`,
                                borderRadius: '2px 0 0 2px',
                            }}
                        />
                    )}

                    {/* Status icon */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ overflow: 'hidden' }}>
                        {win.status === 'completed' && <CheckCircle2 className="h-3 w-3" style={{ color: '#16a34a' }} />}
                        {win.status === 'overdue' && <AlertTriangle className="h-3 w-3" style={{ color: cfg.color }} />}
                        {win.status === 'waiting' && <Clock className="h-3 w-3" style={{ color: cfg.color }} />}
                    </div>
                </div>
            </div>

            {/* Cursor-following tooltip */}
            {isHovered && ReactDOM.createPortal(
                <div
                    className="fixed w-[280px] p-3 shadow-xl z-[9999] pointer-events-none border border-gray-200 rounded-md bg-popover text-popover-foreground"
                    style={{
                        left: tooltipX,
                        top: tooltipY,
                    }}
                >
                    {/* Status Header */}
                    <div
                        className="flex items-center justify-between mb-2 pb-2 border-b"
                        style={{ borderColor: `${cfg.color}20` }}
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
                                {cfg.label}
                            </span>
                        </div>
                        <Badge
                            className="text-[8px] h-3.5 px-1 font-mono"
                            style={{
                                background: typeCol.bg,
                                color: typeCol.text,
                                border: `1px solid ${typeCol.accent}30`,
                            }}
                        >
                            {serviceType}
                        </Badge>
                    </div>

                    {/* Service & Asset Details */}
                    <div className="space-y-1.5 text-[11px]">
                        <DetailRow icon={<Hash className="h-3 w-3" />} label="Asset" value={asset.assetCode} />
                        {service?.name && (
                            <DetailRow icon={<FileText className="h-3 w-3" />} label="Service" value={service.name} />
                        )}
                        {service?.frequency && (
                            <DetailRow icon={<Clock className="h-3 w-3" />} label="Frequency" value={service.frequency} />
                        )}
                        {service?.category && (
                            <DetailRow icon={<Layers className="h-3 w-3" />} label="Category" value={service.category} />
                        )}

                        {/* Schedule */}
                        <div className="pt-1.5 mt-1.5 border-t border-gray-100">
                            <DetailRow
                                icon={<Calendar className="h-3 w-3" />}
                                label="Window"
                                value={`${formatDateFull(win.windowStart)} — ${formatDateFull(win.windowEnd)}`}
                            />
                            {waitingDays > 0 && (
                                <DetailRow
                                    icon={<Clock className="h-3 w-3 text-amber-500" />}
                                    label="Wait until"
                                    value={formatDate(win.waitingEnd)}
                                    highlight
                                />
                            )}
                            {win.completedDate && (
                                <DetailRow
                                    icon={<CheckCircle2 className="h-3 w-3 text-green-500" />}
                                    label="Completed"
                                    value={formatDateFull(win.completedDate)}
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});

// ─── Helper ───

function DetailRow({
    icon,
    label,
    value,
    highlight = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-gray-400 shrink-0">{icon}</span>
            <span className="text-gray-400">{label}:</span>
            <span className={`font-medium truncate ${highlight ? 'text-amber-600' : 'text-gray-700'}`}>{value}</span>
        </div>
    );
}
