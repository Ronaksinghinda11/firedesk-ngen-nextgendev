/**
 * Calendar Data Utilities
 * 
 * Shared types, constants, and utility functions for the new Gantt + Calendar views.
 * Handles service window generation, status computation, and color theming.
 */

// ────────────────────────────── Types ──────────────────────────────

export type ServiceType = 'Inspection' | 'Maintenance' | 'Testing';

export type Frequency =
    | 'Daily'
    | 'Weekly'
    | 'Monthly'
    | 'Quarterly'
    | 'Half-yearly'
    | 'Yearly'
    | '2 Years'
    | '4 Years';

export type ServiceWindowStatus =
    | 'waiting'
    | 'due'
    | 'overdue'
    | 'completed'
    | 'upcoming';

export interface ServiceWindow {
    id: string;
    serviceId: string;
    windowStart: Date;
    windowEnd: Date;
    waitingEnd: Date;
    completedDate: Date | null;
    status: ServiceWindowStatus;
    sourceService: CalendarServiceItem;
}

export interface AssetServiceGroup {
    assetId: string;
    assetCode: string;
    equipment: string;
    category: string;
    categoryId: string;
    productName?: string;
    services: {
        Inspection: CalendarServiceItem[];
        Maintenance: CalendarServiceItem[];
        Testing: CalendarServiceItem[];
    };
}

/** Normalized service item from API data */
export interface CalendarServiceItem {
    id: string;
    assetId: string;
    assetCode: string;
    name: string;
    type: ServiceType;
    frequency: Frequency;
    frequencyId: string;
    equipment: string;
    category: string;
    categoryId: string;
    productName?: string;
    productId?: string;
    /** Variant types from the product (e.g. "Hose Reel", "Hydrant") */
    productTypes: string[];
    /** Variant sub-types from the product */
    productSubTypes: string[];
    scheduledDate: string;
    status: string;
    completedAt?: string | null;
    submissionNumber?: string;
    plantId?: string;
    plantName?: string;
}

// ────────────────────────────── Constants ──────────────────────────────

export const frequencyDays: Record<Frequency, number> = {
    Daily: 1,
    Weekly: 7,
    Monthly: 30,
    Quarterly: 90,
    'Half-yearly': 182,
    Yearly: 365,
    '2 Years': 730,
    '4 Years': 1460,
};

export const frequencyColors: Record<Frequency, string> = {
    Daily: '#6366f1',
    Weekly: '#8b5cf6',
    Monthly: '#3b82f6',
    Quarterly: '#06b6d4',
    'Half-yearly': '#14b8a6',
    Yearly: '#f59e0b',
    '2 Years': '#ef4444',
    '4 Years': '#ec4899',
};

export const serviceTypeColors: Record<ServiceType, { bg: string; text: string; accent: string }> = {
    Inspection: { bg: '#dbeafe', text: '#1e40af', accent: '#2563eb' },
    Maintenance: { bg: '#fef3c7', text: '#92400e', accent: '#d97706' },
    Testing: { bg: '#ede9fe', text: '#5b21b6', accent: '#7c3aed' },
};

export const statusConfig: Record<ServiceWindowStatus, { color: string; bg: string; label: string }> = {
    waiting: { color: '#64748b', bg: '#e2e8f0', label: 'Waiting Period' },
    due: { color: '#ea580c', bg: '#ffedd5', label: 'Due' },
    overdue: { color: '#dc2626', bg: '#fee2e2', label: 'Overdue' },
    completed: { color: '#16a34a', bg: '#dcfce7', label: 'Completed' },
    upcoming: { color: '#2563eb', bg: '#dbeafe', label: 'Upcoming' },
};

export const serviceTypes: ServiceType[] = ['Inspection', 'Maintenance', 'Testing'];

export const allFrequencies: Frequency[] = [
    'Daily', 'Weekly', 'Monthly', 'Quarterly',
    'Half-yearly', 'Yearly', '2 Years', '4 Years',
];

// ────────────────────────────── Utility Functions ──────────────────────────────

/**
 * Normalise a frequency name string from the API into a typed Frequency.
 * Falls back to 'Monthly' if unrecognised.
 */
export function normalizeFrequency(freq: string | undefined | null): Frequency {
    if (!freq) return 'Monthly';
    const map: Record<string, Frequency> = {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        'half-yearly': 'Half-yearly',
        'half yearly': 'Half-yearly',
        halfyearly: 'Half-yearly',
        yearly: 'Yearly',
        '2 years': '2 Years',
        '2years': '2 Years',
        '4 years': '4 Years',
        '4years': '4 Years',
    };
    return map[freq.toLowerCase().trim()] ?? 'Monthly';
}

/**
 * Map an API inspection_type string to our ServiceType enum.
 */
export function normalizeServiceType(type: string | undefined | null): ServiceType {
    if (!type) return 'Inspection';
    const lower = type.toLowerCase().trim();
    if (lower.includes('maint')) return 'Maintenance';
    if (lower.includes('test')) return 'Testing';
    return 'Inspection';
}

/**
 * Generate service windows for a given date range.
 *
 * @param service  The service definition (frequency, etc.)
 * @param rangeStart  Start of the visible range
 * @param rangeEnd    End of the visible range
 * @param previousCompletionDate  Date the *previous* window's service was completed (for waiting calc)
 */
export function generateServiceWindows(
    service: CalendarServiceItem,
    rangeStart: Date,
    rangeEnd: Date,
    previousCompletionDate?: Date
): ServiceWindow[] {
    const windows: ServiceWindow[] = [];
    const days = frequencyDays[service.frequency];
    const waitingDays = Math.floor(days * 0.5);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Align currentStart to the frequency boundary
    let currentStart = new Date(rangeStart);
    currentStart.setHours(0, 0, 0, 0);

    if (service.frequency === 'Weekly') {
        currentStart.setDate(currentStart.getDate() - currentStart.getDay() + 1);
    } else if (service.frequency === 'Monthly') {
        currentStart.setDate(1);
    } else if (service.frequency === 'Quarterly') {
        const qMonth = Math.floor(currentStart.getMonth() / 3) * 3;
        currentStart.setMonth(qMonth, 1);
    } else if (service.frequency === 'Half-yearly') {
        const hMonth = Math.floor(currentStart.getMonth() / 6) * 6;
        currentStart.setMonth(hMonth, 1);
    } else if (service.frequency === 'Yearly') {
        currentStart.setMonth(0, 1);
    } else if (service.frequency === '2 Years') {
        const year = currentStart.getFullYear();
        currentStart = new Date(year % 2 === 0 ? year : year - 1, 0, 1);
    } else if (service.frequency === '4 Years') {
        const year = currentStart.getFullYear();
        currentStart = new Date(year - (year % 4), 0, 1);
    }

    let windowIndex = 0;
    let lastCompletedDate = previousCompletionDate || null;

    while (currentStart < rangeEnd) {
        const windowEnd = new Date(currentStart);
        windowEnd.setDate(windowEnd.getDate() + days - 1);

        // Waiting period: buffer after last completed date
        let waitingEnd = new Date(currentStart);
        if (lastCompletedDate && windowIndex > 0) {
            const bufferEnd = new Date(lastCompletedDate);
            bufferEnd.setDate(bufferEnd.getDate() + waitingDays);
            waitingEnd = bufferEnd > currentStart ? bufferEnd : currentStart;
        }

        // Determine completion and status
        let completedDate: Date | null = null;
        let status: ServiceWindowStatus = 'upcoming';

        if (windowEnd < today) {
            // Past window — use actual completion data if available, else simulate
            if (service.completedAt && service.status?.toLowerCase().includes('submit') || service.status?.toLowerCase().includes('approved') || service.status?.toLowerCase().includes('completed')) {
                completedDate = new Date(service.completedAt || service.scheduledDate);
                status = 'completed';
                lastCompletedDate = completedDate;
            } else {
                // Check if this could be overdue
                status = 'overdue';
            }
        } else if (currentStart <= today && windowEnd >= today) {
            // Current window
            if (today < waitingEnd) {
                status = 'waiting';
            } else {
                if (service.completedAt && (service.status?.toLowerCase().includes('submit') || service.status?.toLowerCase().includes('approved') || service.status?.toLowerCase().includes('completed'))) {
                    const compDate = new Date(service.completedAt);
                    if (compDate >= currentStart && compDate <= windowEnd) {
                        completedDate = compDate;
                        status = 'completed';
                        lastCompletedDate = completedDate;
                    } else {
                        status = 'due';
                    }
                } else {
                    status = 'due';
                }
            }
        } else {
            status = 'upcoming';
        }

        if (windowEnd >= rangeStart && currentStart <= rangeEnd) {
            windows.push({
                id: `${service.id}-w${windowIndex}`,
                serviceId: service.id,
                windowStart: new Date(currentStart),
                windowEnd: new Date(windowEnd),
                waitingEnd: new Date(waitingEnd),
                completedDate,
                status,
                sourceService: service,
            });
        }

        currentStart.setDate(currentStart.getDate() + days);
        windowIndex++;
    }

    return windows;
}

/**
 * Convert API service submissions into CalendarServiceItems
 */
export function normalizeAPIService(apiService: any): CalendarServiceItem {
    const freqName = apiService.frequency?.frequencyName
        || apiService.inspectionFrequency?.frequencyName
        || '';

    // Extract product variant types and sub-types
    const productVariants: any[] = apiService.asset?.product?.variants || [];
    const productTypes: string[] = [];
    const productSubTypes: string[] = [];
    if (Array.isArray(productVariants)) {
        productVariants.forEach((v: any) => {
            if (v.type && !productTypes.includes(v.type)) productTypes.push(v.type);
            if (Array.isArray(v.subType)) {
                v.subType.forEach((st: string) => {
                    if (st && !productSubTypes.includes(st)) productSubTypes.push(st);
                });
            }
        });
    }

    return {
        id: apiService.id,
        assetId: apiService.asset?.id || '',
        assetCode: apiService.asset?.assetCode || apiService.asset?.assetId || '',
        name: apiService.form?.serviceName || apiService.inspectionType || 'Service',
        type: normalizeServiceType(apiService.inspectionType),
        frequency: normalizeFrequency(freqName),
        frequencyId: apiService.frequency?.id || apiService.inspectionFrequency?.id || '',
        equipment: apiService.asset?.assetCode || apiService.asset?.assetId || '',
        category: apiService.asset?.category?.categoryName || apiService.asset?.category?.category_name || '',
        categoryId: apiService.asset?.category?.id || '',
        productName: apiService.asset?.product?.productName || apiService.asset?.product?.product_name || '',
        productId: apiService.asset?.product?.id || '',
        productTypes,
        productSubTypes,
        scheduledDate: apiService.scheduledDate || apiService.scheduled_date || '',
        status: apiService.status || '',
        completedAt: apiService.completedAt || apiService.completed_at || null,
        submissionNumber: apiService.submissionNumber || '',
        plantId: apiService.plant?.id || '',
        plantName: apiService.plant?.plantName || '',
    };
}

/**
 * Group services by asset, with arrays per service type
 */
export function getAssetGroups(services: CalendarServiceItem[]): AssetServiceGroup[] {
    const map = new Map<string, AssetServiceGroup>();

    services.forEach((s) => {
        const key = s.assetId || s.assetCode;
        if (!map.has(key)) {
            map.set(key, {
                assetId: key,
                assetCode: s.assetCode,
                equipment: s.equipment,
                category: s.category,
                categoryId: s.categoryId,
                productName: s.productName,
                services: { Inspection: [], Maintenance: [], Testing: [] },
            });
        }
        const group = map.get(key)!;
        group.services[s.type].push(s);
    });

    return Array.from(map.values()).sort((a, b) => a.assetCode.localeCompare(b.assetCode));
}

// ────────────────────────────── Date Helpers ──────────────────────────────

export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateFull(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysBetween(a: Date, b: Date): number {
    return Math.ceil(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
