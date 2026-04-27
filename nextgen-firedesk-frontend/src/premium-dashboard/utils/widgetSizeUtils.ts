/**
 * Widget Size Utilities
 * Helper functions and constants for widget sizing with dropdown options
 */

export type WidgetSize = 'one-third' | 'half' | 'two-thirds' | 'full';

export interface SizeOption {
    value: WidgetSize;
    label: string;
    gridCols: string;
}

export const SIZE_OPTIONS: SizeOption[] = [
    { value: 'one-third', label: 'One Third', gridCols: 'lg:col-span-4' },
    { value: 'half', label: 'Half Width', gridCols: 'lg:col-span-6' },
    { value: 'two-thirds', label: '2/3 Width', gridCols: 'lg:col-span-8' },
    { value: 'full', label: 'Full Width', gridCols: 'lg:col-span-12' },
];

export function getWidgetGridClass(size: WidgetSize): string {
    const option = SIZE_OPTIONS.find(opt => opt.value === size);
    return option?.gridCols || 'lg:col-span-6'; // Default to half width
}

export function getSizeLabel(size: WidgetSize): string {
    const option = SIZE_OPTIONS.find(opt => opt.value === size);
    return option?.label || 'Half Width';
}
