import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    currentItemsCount: number;
    itemLabel?: string;
    onPageChange: (page: number) => void;
    loading?: boolean;
    showPageNumbers?: boolean;
    pageNumbers?: (number | 'ellipsis-start' | 'ellipsis-end')[];
}

/**
 * Reusable pagination component for consistent pagination UI across the app.
 * Displays current page info, prev/next buttons, and optional page number buttons.
 */
export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    currentItemsCount,
    itemLabel = 'item',
    onPageChange,
    loading = false,
    showPageNumbers = true,
    pageNumbers = [],
}: PaginationProps) {
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    // Don't render if there's only one page
    if (totalPages <= 1) {
        return null;
    }

    return (
        <View style={{ marginTop: 16 }}>
            {/* Page Info */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
                {(() => {
                    const startItem = (currentPage - 1) * pageSize + 1;
                    const endItem = Math.min(currentPage * pageSize, totalItems);
                    return (
                        <Text style={{ color: '#6b7280', fontSize: 13 }}>
                            Showing {startItem}-{endItem} of {totalItems} {itemLabel}{totalItems !== 1 ? 's' : ''}
                        </Text>
                    );
                })()}
            </View>

            {/* Pagination Controls */}
            <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
            }}>
                {/* Previous Button */}
                <TouchableOpacity
                    onPress={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrev || loading}
                    style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: !hasPrev ? '#e5e7eb' : '#f97316',
                        opacity: !hasPrev || loading ? 0.5 : 1,
                    }}
                >
                    <Text style={{
                        color: !hasPrev ? '#9ca3af' : '#f97316',
                        fontWeight: '600',
                        fontSize: 14,
                    }}>
                        Prev
                    </Text>
                </TouchableOpacity>

                {/* Page Numbers */}
                {showPageNumbers && pageNumbers.length > 0 && (
                    <>
                        {pageNumbers.map((page, idx) => {
                            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                                return (
                                    <Text
                                        key={`${page}-${idx}`}
                                        style={{
                                            marginHorizontal: 4,
                                            color: '#9ca3af',
                                            fontWeight: '600',
                                            fontSize: 14,
                                        }}
                                    >
                                        ...
                                    </Text>
                                );
                            }

                            const isActive = page === currentPage;
                            return (
                                <TouchableOpacity
                                    key={page}
                                    onPress={() => onPageChange(page)}
                                    disabled={loading}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        backgroundColor: isActive ? '#f97316' : '#ffffff',
                                        borderWidth: 1,
                                        borderColor: isActive ? '#f97316' : '#e5e7eb',
                                        opacity: loading ? 0.7 : 1,
                                    }}
                                >
                                    <Text style={{
                                        color: isActive ? '#ffffff' : '#1f2937',
                                        fontWeight: '700',
                                        fontSize: 14,
                                    }}>
                                        {page}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </>
                )}

                {/* Simple Page Indicator (when showPageNumbers is false) */}
                {!showPageNumbers && (
                    <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>
                        Page {currentPage} / {totalPages}
                    </Text>
                )}

                {/* Next Button */}
                <TouchableOpacity
                    onPress={() => onPageChange(currentPage + 1)}
                    disabled={!hasNext || loading}
                    style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: !hasNext ? '#e5e7eb' : '#f97316',
                        opacity: !hasNext || loading ? 0.5 : 1,
                    }}
                >
                    <Text style={{
                        color: !hasNext ? '#9ca3af' : '#f97316',
                        fontWeight: '600',
                        fontSize: 14,
                    }}>
                        Next
                    </Text>
                </TouchableOpacity>

                {/* Loading Indicator */}
                {loading && (
                    <ActivityIndicator
                        size="small"
                        color="#f97316"
                        style={{ marginLeft: 8 }}
                    />
                )}
            </View>
        </View>
    );
}

/**
 * Simplified pagination component for filter lists (like in calendar).
 * Shows only Prev/Next buttons with page indicator.
 */
export function SimplePagination({
    currentPage,
    totalPages,
    onPageChange,
    loading = false,
}: Pick<PaginationProps, 'currentPage' | 'totalPages' | 'onPageChange' | 'loading'>) {
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    // Don't render if there's only one page
    if (totalPages <= 1) {
        return null;
    }

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 12,
        }}>
            <TouchableOpacity
                onPress={() => onPageChange(currentPage - 1)}
                disabled={!hasPrev || loading}
                style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6',
                    opacity: !hasPrev || loading ? 0.5 : 1,
                }}
            >
                <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 14 }}>
                    Prev
                </Text>
            </TouchableOpacity>

            <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 14 }}>
                Page {currentPage} / {totalPages}
            </Text>

            <TouchableOpacity
                onPress={() => onPageChange(currentPage + 1)}
                disabled={!hasNext || loading}
                style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6',
                    opacity: !hasNext || loading ? 0.5 : 1,
                }}
            >
                <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 14 }}>
                    Next
                </Text>
            </TouchableOpacity>
        </View>
    );
}
