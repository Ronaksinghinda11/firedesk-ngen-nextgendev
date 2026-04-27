import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationOptions {
    initialPage?: number;
    pageSize?: number;
    totalItems?: number;
}

export interface UsePaginationResult {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    pageNumbers: (number | 'ellipsis-start' | 'ellipsis-end')[];
    setPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    setTotalItems: (total: number) => void;
    resetPage: () => void;
}

/**
 * Custom hook for managing pagination state and logic.
 * Provides consistent pagination behavior across all screens.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
    const {
        initialPage = 1,
        pageSize = 10,
        totalItems: initialTotalItems = 0,
    } = options;

    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalItems, setTotalItems] = useState(initialTotalItems);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(totalItems / pageSize));
    }, [totalItems, pageSize]);

    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    /**
     * Generates page numbers array with smart ellipsis for large page counts.
     * Shows: first page, ellipsis if needed, pages around current, ellipsis if needed, last page.
     */
    const pageNumbers = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
        const start = Math.max(1, currentPage - 1);
        const end = Math.min(totalPages, currentPage + 1);

        // Always show first page
        if (start > 1) {
            pages.push(1);
        }

        // Show ellipsis before current window if there's a gap
        if (start > 2) {
            pages.push('ellipsis-start');
        }

        // Current window of pages
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // Show ellipsis after current window if there's a gap
        if (end < totalPages - 1) {
            pages.push('ellipsis-end');
        }

        // Always show last page
        if (end < totalPages) {
            pages.push(totalPages);
        }

        return pages;
    }, [currentPage, totalPages]);

    const setPage = useCallback((page: number) => {
        const safePage = Math.min(Math.max(page, 1), totalPages);
        setCurrentPage(safePage);
    }, [totalPages]);

    const nextPage = useCallback(() => {
        if (hasNextPage) {
            setCurrentPage(prev => prev + 1);
        }
    }, [hasNextPage]);

    const prevPage = useCallback(() => {
        if (hasPrevPage) {
            setCurrentPage(prev => prev - 1);
        }
    }, [hasPrevPage]);

    const resetPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    return {
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        pageNumbers,
        setPage,
        nextPage,
        prevPage,
        setTotalItems,
        resetPage,
    };
}
