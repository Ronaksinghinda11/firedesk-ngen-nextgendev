/**
 * TechnicianPerformance Widget
 * Standalone widget displaying technician performance metrics
 */

import { useMemo, useState, useEffect } from 'react';
import { Users, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Card3D from '../../components/Card3D';
import TechnicianPerformanceCard from './components/TechnicianPerformanceCard';
import { DashboardData } from '../../types/dashboard.types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { dashboardApi } from '@/services/api/dashboardApi';

interface TechnicianPerformanceProps {
    data: DashboardData;
    loading: boolean;
    role?: 'admin' | 'manager';
    plantId?: string;
    categoryId?: string;
    widgetSize?: number;
    className?: string;
}

export default function TechnicianPerformance({ data, loading: initialLoading, role = 'admin', plantId, categoryId, widgetSize = 12, className }: TechnicianPerformanceProps) {
    // Local date range state - default to 2026 year range
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(2026, 0, 1), // January 1, 2026
        to: new Date(2026, 11, 31)  // December 31, 2026
    });
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [performanceData, setPerformanceData] = useState(data.tasksOverview?.technicianPerformance || []);
    const [hasReceivedInitialData, setHasReceivedInitialData] = useState(false);

    // Master list of technicians to ensure they are shown even with 0 values
    const [masterTechnicians, setMasterTechnicians] = useState<any[]>([]);

    // Reset master list when plant or category changes
    useEffect(() => {
        setMasterTechnicians([]);
    }, [plantId, categoryId]);

    // Update master list whenever we get data (from props or fetch)
    useEffect(() => {
        if (performanceData.length > 0) {
            setMasterTechnicians(prev => {
                const newList = [...prev];
                performanceData.forEach((tech: any) => {
                    const id = tech.technicianId || tech.id;
                    if (!newList.find(t => (t.technicianId || t.id) === id)) {
                        newList.push(tech);
                    }
                });
                return newList;
            });
        }
    }, [performanceData]);

    // Sync with props data when it changes (only if no local date range is set)
    useEffect(() => {
        if (!dateRange && data.tasksOverview?.technicianPerformance !== undefined) {
            console.log('[TechnicianPerformance] Syncing with props data:', data.tasksOverview.technicianPerformance);
            setPerformanceData(data.tasksOverview.technicianPerformance);
            setHasReceivedInitialData(true);
        }
    }, [data.tasksOverview, dateRange]);

    // Fetch data when filters or local date range change (debounced)
    useEffect(() => {
        // Guard: Don't fetch if plantId is missing
        if (!plantId || !dateRange) {
            console.log('[TechnicianPerformance] Skipping local fetch (no plantId or no local dateRange)');
            return;
        }

        // Debounce API calls to prevent rapid-fire requests
        const debounceTimer = setTimeout(() => {
            const fetchData = async () => {
                console.log('[TechnicianPerformance] Fetching local data with filters:', { plantId, categoryId, dateRange });
                setIsLoading(true);
                try {
                    const result = await dashboardApi.getTechnicianPerformance({
                        plantId,
                        categoryId,
                        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
                    });
                    console.log('[TechnicianPerformance] Local fetch result:', result);
                    setPerformanceData(result.technicianPerformance || []);
                    setHasReceivedInitialData(true);
                } catch (error) {
                    console.error("Failed to fetch technician performance data", error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchData();
        }, 300); // 300ms debounce

        // Cleanup function to cancel the timer if dependencies change before timeout
        return () => clearTimeout(debounceTimer);
    }, [plantId, categoryId, dateRange]);

    // Technician performance data mapping
    const techPerformance = useMemo(() => {
        // Use master list as the base to ensure all technicians are shown
        const baseList = masterTechnicians.length > 0 ? masterTechnicians : performanceData;

        console.log('[TechnicianPerformance] Mapping data. Master:', masterTechnicians.length, 'Current:', performanceData.length);

        return baseList.map((masterTech: any) => {
            const techId = masterTech.technicianId || masterTech.id;
            const fetchedTech = performanceData.find((t: any) => (t.technicianId || t.id) === techId);

            const name = masterTech.name || masterTech.technicianName || fetchedTech?.name || 'Unknown';

            return {
                technicianName: name,
                avatar: name.substring(0, 2).toUpperCase(),
                completed: fetchedTech?.completedTasks || 0,
                total: fetchedTech?.totalTasks || 0,
            };
        });
    }, [performanceData, masterTechnicians]);

    if (initialLoading && !hasReceivedInitialData) {
        return (
            <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60 min-h-[200px] flex items-center justify-center">
                <LoadingSpinner text="Loading technician performance..." />
            </Card3D>
        );
    }

    return (
        <Card3D className="p-3 shadow-lg border-t-4 border-t-primary border-x border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Technician Performance</h2>
                        <p className="text-[9px] text-muted-foreground">Assigned vs Completed Services</p>
                    </div>
                </div>
            </div>

            {/* COMPACT QUICK FILTERS */}
            <div className="mb-4 flex flex-wrap items-center gap-2 p-2 bg-muted/20 rounded-xl border border-border/40">
                <div className="flex items-center gap-1.5 px-2 border-r border-border/40 mr-1 text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Filters</span>
                </div>

                {/* Date Range - Compact version */}
                <Popover open={datePickerOpen} onOpenChange={(open) => {
                    setDatePickerOpen(open);
                    if (open) setTempDateRange(dateRange);
                }}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-7 text-[10px] px-2 font-bold bg-background/50 border-border/40 hover:bg-background">
                            <CalendarIcon className="mr-1.5 h-3 w-3 text-primary/70" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>{format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, y')}</>
                                ) : (format(dateRange.from, 'MMM dd, y'))
                            ) : (<span>Select Date Range</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from || dateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                        <div className="flex items-center justify-end gap-2 p-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setTempDateRange(dateRange);
                                    setDatePickerOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setDateRange(tempDateRange);
                                    setDatePickerOpen(false);
                                }}
                                disabled={!tempDateRange?.from || !tempDateRange?.to}
                            >
                                Apply
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {dateRange && (dateRange.from?.getFullYear() !== 2026 || dateRange.to?.getFullYear() !== 2026) && (
                    <Button onClick={() => setDateRange({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) })} variant="ghost" size="sm" className="h-7 text-[9px] px-2 text-primary font-black uppercase hover:bg-primary/5">
                        <X className="h-3 w-3 mr-1" /> Reset
                    </Button>
                )}
            </div>

            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                        <LoadingSpinner size="sm" text="Updating..." />
                    </div>
                )}

                {techPerformance.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm border border-dashed border-border/60 rounded-xl bg-muted/5">
                        No technician data available
                    </div>
                ) : (
                    <div className="flex items-stretch gap-3 overflow-x-auto pb-4 custom-scrollbar">
                        {techPerformance.map((tech, index) => (
                            <div key={index} className="min-w-[220px] flex-shrink-0">
                                <TechnicianPerformanceCard tech={tech} index={index} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(155, 155, 155, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(155, 155, 155, 0.4);
                }
            ` }} />
        </Card3D>
    );
}
