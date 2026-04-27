// src/components/generic/components/EntityTableView.tsx
// Extracted from GenericEntityPage.tsx - Lines 3283-3903
// Contains EXACT table rendering logic with all entity-specific columns

import React from "react";
import { Button } from "@/components/ui/button";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Archive,
    Bookmark,
    CheckSquare,
    Clock,
    Copy,
    Flag,
    MoreVertical,
    RefreshCw,
    Share2,
    Square,
    Trash2,
} from "lucide-react";
import { PermissionSummary } from "@/components/admin/PermissionLevelSelector";
import { BaseEntity, EntityConfig, SortConfig } from "../types/entity.types";

type ArchiveStatus = "active" | "archived";

interface EntityTableViewProps {
    config: EntityConfig;
    paginatedEntities: BaseEntity[];
    showBulkActions: boolean;
    selectedEntities: Set<string>;
    entities: BaseEntity[];
    archiveStatus: ArchiveStatus;
    bookmarkedEntities: Set<string>;
    flaggedEntities: Set<string>;
    canDelete: boolean;
    // Handlers
    onSelectAll: () => void;
    onSelectEntity: (id: string) => void;
    onRowClick: (entity: BaseEntity) => void;
    onArchive: (entity: BaseEntity) => void;
    onRestore: (entityId: string) => void;
    onDelete: (entity: BaseEntity) => void;
    onDuplicate: (entity: BaseEntity) => void;
    onShare: (entity: BaseEntity) => void;
    onViewHistory: (entity: BaseEntity) => void;
    onBookmark: (entity: BaseEntity) => void;
    onFlag: (entity: BaseEntity) => void;
    visibleColumns?: string[];
    isVisible: (field: string) => boolean;
    sorts: SortConfig[];
    onUpdateSorts: (sorts: SortConfig[]) => void;
    onEdit?: (entity: BaseEntity) => void;
    onViewComments?: (entityId: string) => void;
    currentUserRole?: any;
}

export function EntityTableView({
    config,
    paginatedEntities,
    showBulkActions,
    selectedEntities,
    entities,
    archiveStatus,
    bookmarkedEntities,
    flaggedEntities,
    canDelete,
    onSelectAll,
    onSelectEntity,
    onRowClick,
    onArchive,
    onRestore,
    onDelete,
    onDuplicate,
    onShare,
    onViewHistory,
    onBookmark,
    onFlag,
    onEdit,
    onViewComments,
    currentUserRole,
    isVisible,
    visibleColumns,
    sorts,
    onUpdateSorts
}: EntityTableViewProps) {

    // Count how many meaningful columns are visible (excluding meta columns like status/createdAt)
    // For entities with filterAttributes, use those; otherwise check standard entity columns
    const hasVisibleColumns = (() => {
        // If entity uses filterAttributes, check those
        if (config.filterAttributes && config.filterAttributes.length > 0) {
            return config.filterAttributes.some(attr =>
                isVisible(attr.id) && attr.id !== 'status' && attr.id !== 'createdAt'
            );
        }
        // For entities without filterAttributes (User, Role, Product, etc.), 
        // check if any core columns are visible based on entity type
        const coreColumns = ['name', 'phone', 'roleId', 'description', 'isDefault', 'permissions', 'categoryId', 'email'];
        return coreColumns.some(col => isVisible(col));
    })();

    // If no meaningful columns are visible, show empty state instead of table
    if (!hasVisibleColumns) {
        return (
            <div className="rounded-l border border-gray-200 bg-white shadow-sm overflow-hidden p-8">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Columns Selected</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        All columns are currently hidden. Select at least one column from the "Columns" dropdown to view the table.
                    </p>
                </div>
            </div>
        );
    }

    const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Reset focus when data changes
    React.useEffect(() => {
        setFocusedRowIndex(-1);
    }, [paginatedEntities]);

    const handleTableKeyDown = (e: React.KeyboardEvent) => {
        if (!paginatedEntities.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedRowIndex(prev => Math.min(prev + 1, paginatedEntities.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedRowIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && focusedRowIndex >= 0) {
            e.preventDefault();
            onRowClick(paginatedEntities[focusedRowIndex]);
        }
    };

    // Scroll focused row into view
    React.useEffect(() => {
        if (focusedRowIndex >= 0 && scrollContainerRef.current) {
            const row = scrollContainerRef.current.querySelector(`[data-row-index="${focusedRowIndex}"]`);
            if (row) {
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [focusedRowIndex]);

    return (
        <div className="rounded-l border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-orange-200">
            {/* Scrollable Container with sticky header support (Custom Premium Scrollbar) */}
            <div
                ref={scrollContainerRef}
                className="overflow-auto max-h-[calc(100vh-220px)] scrollbar-premium relative focus:outline-none"
                tabIndex={0}
                onKeyDown={handleTableKeyDown}
            >
                <table className="relative border-collapse w-full table-auto text-sm caption-bottom">
                    <TableHeader className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <TableRow className="hover:bg-transparent border-b">
                            {showBulkActions && (
                                <TableHead className="w-[50px] bg-white sticky top-0 z-20">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onSelectAll}
                                    >
                                        {paginatedEntities.length > 0 && paginatedEntities.every(e => selectedEntities.has(e.id)) ? (
                                            <CheckSquare className="h-4 w-4" />
                                        ) : (
                                            <Square className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TableHead>
                            )}
                            {/* Entity-specific hardcoded headers (matching backup behavior) */}
                            {config.customHeaders ? (
                                // If entity has both customHeaders AND filterAttributes, use filterAttributes for sorting/visibility
                                config.filterAttributes && config.filterAttributes.length > 0 ? (
                                    <>
                                        {config.filterAttributes.map((attr, attrIndex) => {
                                            // Find matching header label
                                            const headerLabel = config.customHeaders?.[attrIndex] || attr.label;
                                            const isFirstColumn = attr.mandatory || attrIndex === 0;

                                            return isVisible(attr.id) && (
                                                <TableHead
                                                    key={attr.id}
                                                    className={cn(
                                                        "bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0",
                                                        isFirstColumn && "md:left-0 z-30 min-w-[120px] md:border-r border-gray-100",
                                                        !isFirstColumn && "z-20",
                                                        (attr.sortable !== false) && "cursor-pointer hover:bg-gray-50 select-none"
                                                    )}
                                                    onClick={() => {
                                                        if (attr.sortable === false) return;
                                                        const currentSort = sorts.find(s => s.field === attr.id);
                                                        let newSorts = sorts.filter(s => s.field !== attr.id);
                                                        if (!currentSort) {
                                                            newSorts = [...newSorts, { field: attr.id, direction: 'asc' }];
                                                        } else if (currentSort.direction === 'asc') {
                                                            newSorts = [...newSorts, { field: attr.id, direction: 'desc' }];
                                                        }
                                                        onUpdateSorts(newSorts);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {headerLabel}
                                                        {sorts.find(s => s.field === attr.id)?.direction === 'asc' && (
                                                            <span className="text-orange-500">↑</span>
                                                        )}
                                                        {sorts.find(s => s.field === attr.id)?.direction === 'desc' && (
                                                            <span className="text-orange-500">↓</span>
                                                        )}
                                                    </div>
                                                </TableHead>
                                            );
                                        })}
                                    </>
                                ) : (
                                    // Legacy: customHeaders without filterAttributes (no sorting/visibility)
                                    <>
                                        {config.customHeaders.map((header, index) => (
                                            <TableHead
                                                key={index}
                                                className={cn(
                                                    "bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20",
                                                    index === 0 && "md:left-0 z-30 min-w-[120px] md:border-r border-gray-100"
                                                )}
                                            >
                                                {header}
                                            </TableHead>
                                        ))}
                                    </>
                                )
                            ) : config.entityName === "User" ? (
                                <>
                                    {isVisible('name') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 md:left-0 z-30 min-w-[180px] md:border-r border-gray-100 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'name');
                                                let newSorts = sorts.filter(s => s.field !== 'name');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'name', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'name', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                User
                                                {sorts.find(s => s.field === 'name')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'name')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('email') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'email');
                                                let newSorts = sorts.filter(s => s.field !== 'email');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'email', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'email', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Email
                                                {sorts.find(s => s.field === 'email')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'email')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('phone') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'phone');
                                                let newSorts = sorts.filter(s => s.field !== 'phone');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'phone', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'phone', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Contact
                                                {sorts.find(s => s.field === 'phone')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'phone')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('roleId') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'roleId');
                                                let newSorts = sorts.filter(s => s.field !== 'roleId');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'roleId', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'roleId', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Role
                                                {sorts.find(s => s.field === 'roleId')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'roleId')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('status') && <TableHead className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20">Status</TableHead>}
                                    {isVisible('created_at') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'created_at');
                                                let newSorts = sorts.filter(s => s.field !== 'created_at');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'created_at', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'created_at', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Created At
                                                {sorts.find(s => s.field === 'created_at')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'created_at')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('updated_at') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'updated_at');
                                                let newSorts = sorts.filter(s => s.field !== 'updated_at');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'updated_at', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'updated_at', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Updated At
                                                {sorts.find(s => s.field === 'updated_at')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'updated_at')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                </>
                            ) : config.entityName === "Role" ? (
                                <>
                                    {isVisible('name') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 md:left-0 z-30 min-w-[150px] md:border-r border-gray-100 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'name');
                                                let newSorts = sorts.filter(s => s.field !== 'name');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'name', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'name', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Role Name
                                                {sorts.find(s => s.field === 'name')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'name')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('description') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'description');
                                                let newSorts = sorts.filter(s => s.field !== 'description');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'description', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'description', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Description
                                                {sorts.find(s => s.field === 'description')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'description')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('isDefault') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'isDefault');
                                                let newSorts = sorts.filter(s => s.field !== 'isDefault');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'isDefault', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'isDefault', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Type
                                                {sorts.find(s => s.field === 'isDefault')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'isDefault')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('permissions') && <TableHead className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20">Permissions</TableHead>}
                                    {isVisible('created_at') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'created_at');
                                                let newSorts = sorts.filter(s => s.field !== 'created_at');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'created_at', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'created_at', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Created At
                                                {sorts.find(s => s.field === 'created_at')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'created_at')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {isVisible('updated_at') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'updated_at');
                                                let newSorts = sorts.filter(s => s.field !== 'updated_at');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'updated_at', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'updated_at', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Updated At
                                                {sorts.find(s => s.field === 'updated_at')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'updated_at')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                </>
                            ) : config.entityName === "Plant" ? (
                                <>
                                    {isVisible('plantName') && (
                                        <TableHead
                                            className="bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 md:left-0 z-30 min-w-[180px] md:border-r border-gray-100 cursor-pointer hover:bg-gray-50 select-none"
                                            onClick={() => {
                                                const currentSort = sorts.find(s => s.field === 'plantName');
                                                let newSorts = sorts.filter(s => s.field !== 'plantName');
                                                if (!currentSort) {
                                                    newSorts = [...newSorts, { field: 'plantName', direction: 'asc' }];
                                                } else if (currentSort.direction === 'asc') {
                                                    newSorts = [...newSorts, { field: 'plantName', direction: 'desc' }];
                                                }
                                                onUpdateSorts(newSorts);
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                Plant Name
                                                {sorts.find(s => s.field === 'plantName')?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                {sorts.find(s => s.field === 'plantName')?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                            </div>
                                        </TableHead>
                                    )}
                                    {config.filterAttributes?.map((attr) => (
                                        attr.id !== 'plantName' && isVisible(attr.id) && (
                                            <TableHead
                                                key={attr.id}
                                                className={cn(
                                                    "bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0 z-20",
                                                    (attr.sortable !== false) && "cursor-pointer hover:bg-gray-50 select-none"
                                                )}
                                                onClick={() => {
                                                    if (attr.sortable === false) return;
                                                    const currentSort = sorts.find(s => s.field === attr.id);
                                                    let newSorts = sorts.filter(s => s.field !== attr.id);
                                                    if (!currentSort) {
                                                        newSorts = [...newSorts, { field: attr.id, direction: 'asc' }];
                                                    } else if (currentSort.direction === 'asc') {
                                                        newSorts = [...newSorts, { field: attr.id, direction: 'desc' }];
                                                    }
                                                    onUpdateSorts(newSorts);
                                                }}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {attr.label}
                                                    {sorts.find(s => s.field === attr.id)?.direction === 'asc' && <span className="text-orange-500">↑</span>}
                                                    {sorts.find(s => s.field === attr.id)?.direction === 'desc' && <span className="text-orange-500">↓</span>}
                                                </div>
                                            </TableHead>
                                        )
                                    ))}
                                </>
                            ) : config.filterAttributes?.map((attr, attrIndex) => {
                                // Find the first visible mandatory column
                                const firstMandatoryAttr = config.filterAttributes?.find(a => a.mandatory);
                                const isFirstColumn = firstMandatoryAttr ? attr.id === firstMandatoryAttr.id : attrIndex === 0;

                                return isVisible(attr.id) && (
                                    <TableHead
                                        key={attr.id}
                                        className={cn(
                                            "bg-white font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider whitespace-nowrap sticky top-0",
                                            (isFirstColumn || attr.sticky) && "md:left-0 z-30 min-w-[180px] md:border-r border-gray-100 shadow-[1px_0_0_0_#f3f4f6]",
                                            (!isFirstColumn && !attr.sticky) && "z-20",
                                            (attr.sortable !== false) && "cursor-pointer hover:bg-gray-50 select-none"
                                        )}
                                        onClick={() => {
                                            if (attr.sortable === false) return;
                                            // Toggle sort: invalid/none -> asc -> desc -> none
                                            const currentSort = sorts.find(s => s.field === attr.id);
                                            let newSorts = sorts.filter(s => s.field !== attr.id); // Remove current

                                            if (!currentSort) {
                                                newSorts = [...newSorts, { field: attr.id, direction: 'asc' }];
                                            } else if (currentSort.direction === 'asc') {
                                                newSorts = [...newSorts, { field: attr.id, direction: 'desc' }];
                                            }
                                            // If desc, we just removed it above, so it becomes none

                                            onUpdateSorts(newSorts);
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            {attr.label}
                                            {sorts.find(s => s.field === attr.id)?.direction === 'asc' && (
                                                <span className="text-orange-500">↑</span>
                                            )}
                                            {sorts.find(s => s.field === attr.id)?.direction === 'desc' && (
                                                <span className="text-orange-500">↓</span>
                                            )}
                                        </div>
                                    </TableHead>
                                );
                            })}
                            <TableHead className="w-[100px] bg-white sticky top-0 right-0 z-30 text-center font-bold text-gray-500 py-2 uppercase text-[10px] tracking-wider border-l border-gray-100">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paginatedEntities.length > 0 ? (
                            paginatedEntities.map((entity, index) => (
                                <TableRow
                                    key={entity.id}
                                    data-row-index={index}
                                    className={cn(
                                        "cursor-pointer transition-all duration-200 group relative border-gray-100 row-hover-effect",
                                        focusedRowIndex === index && "bg-orange-50/70 border-l-2 border-l-orange-500 shadow-sm z-10"
                                    )}
                                    onClick={() => {
                                        setFocusedRowIndex(index);
                                        onRowClick(entity);
                                    }}
                                    onMouseEnter={() => setFocusedRowIndex(index)}
                                    title="Click to edit"
                                >
                                    {showBulkActions && (
                                        <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectEntity(entity.id);
                                                }}
                                            >
                                                {selectedEntities.has(entity.id) ? (
                                                    <CheckSquare className="h-4 w-4" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    )}

                                    {config.customColumns ? (
                                        <>
                                            {config.customColumns(entity, isVisible)}
                                        </>
                                    ) : config.entityName === "Role" ? (
                                        <>
                                            {/* Role Name */}
                                            {isVisible('name') && (
                                                <TableCell className="font-medium bg-white md:sticky md:left-0 z-10 min-w-[150px] md:border-r border-gray-100">
                                                    {entity.name || "Unnamed"}
                                                </TableCell>
                                            )}

                                            {/* Description */}
                                            {isVisible('description') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).description || "No description"}
                                                </TableCell>
                                            )}

                                            {/* Type (Default/Custom) */}
                                            {isVisible('isDefault') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${(entity as any).isDefault
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {(entity as any).isDefault ? "Default" : "Custom"}
                                                    </span>
                                                </TableCell>
                                            )}

                                            {/* Permissions Summary */}
                                            {isVisible('permissions') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).permissionLevels && Object.keys((entity as any).permissionLevels).length > 0 ? (
                                                        <PermissionSummary permissions={(entity as any).permissionLevels} />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No permissions configured</span>
                                                    )}
                                                </TableCell>
                                            )}
                                        </>
                                    ) : config.entityName === "User" ? (
                                        <>
                                            {/* User column - Sticky */}
                                            {isVisible('name') && (
                                                <TableCell className="font-medium bg-white md:sticky md:left-0 z-10 min-w-[180px] md:border-r border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        {bookmarkedEntities.has(entity.id) && (
                                                            <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                                        )}
                                                        {flaggedEntities.has(entity.id) && (
                                                            <Flag className="h-4 w-4 text-red-500" />
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span>{entity.name || (entity as any).fullName || "Unknown"}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            )}
                                            {/* Email column */}
                                            {isVisible('email') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).user?.email || (entity as any).email || "N/A"}
                                                </TableCell>
                                            )}
                                            {/* Contact column */}
                                            {isVisible('phone') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).user?.phone || (entity as any).phone || "N/A"}
                                                </TableCell>
                                            )}
                                            {/* Role column */}
                                            {isVisible('roleId') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).role || "User"}
                                                </TableCell>
                                            )}
                                            {/* Status column */}
                                            {isVisible('status') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span className={entity.status?.toLowerCase() === "inactive" ? "status-inactive" : "status-active"}>
                                                        {entity.status || "Active"}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {/* Created At column */}
                                            {isVisible('createdAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).createdAt
                                                        ? new Date((entity as any).createdAt).toLocaleDateString()
                                                        : "N/A"}
                                                </TableCell>
                                            )}
                                            {/* Updated At column */}
                                            {isVisible('updatedAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).updatedAt
                                                        ? new Date((entity as any).updatedAt).toLocaleDateString()
                                                        : "N/A"}
                                                </TableCell>
                                            )}
                                        </>
                                    ) : config.entityName === "Product" ? (
                                        <>
                                            {/* Product Name - Use name or productName */}
                                            {isVisible('name') && (
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {bookmarkedEntities.has(entity.id) && (
                                                            <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                                        )}
                                                        {flaggedEntities.has(entity.id) && (
                                                            <Flag className="h-4 w-4 text-red-500" />
                                                        )}
                                                        {entity.name ||
                                                            (entity as any).productName ||
                                                            "Unnamed"}
                                                    </div>
                                                </TableCell>
                                            )}

                                            {/* Category - Use categoryName directly */}
                                            {isVisible('categoryId') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).categoryName ||
                                                        (entity as any).category?.categoryName ||
                                                        "N/A"}
                                                </TableCell>
                                            )}

                                            {/* Test Frequency */}
                                            {isVisible('testFrequency') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).testFrequency || "N/A"}
                                                </TableCell>
                                            )}

                                            {/* Variants - Use variants or productVariants */}
                                            {isVisible('variants') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <div className="flex gap-1">
                                                        {(
                                                            (entity as any).variants ||
                                                            (entity as any).productVariants ||
                                                            []
                                                        )
                                                            .slice(0, 2)
                                                            .map((variant: any, index: number) => (
                                                                <span
                                                                    key={index}
                                                                    className="text-xs bg-secondary px-2 py-1 rounded"
                                                                >
                                                                    {variant.type ||
                                                                        variant.variantType ||
                                                                        variant.name ||
                                                                        "Variant"}
                                                                </span>
                                                            ))}
                                                        {(
                                                            (entity as any).variants ||
                                                            (entity as any).productVariants ||
                                                            []
                                                        ).length > 2 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    +
                                                                    {(
                                                                        (entity as any).variants ||
                                                                        (entity as any).productVariants ||
                                                                        []
                                                                    ).length - 2}{" "}
                                                                    more
                                                                </span>
                                                            )}
                                                    </div>
                                                </TableCell>
                                            )}

                                            {/* Status */}
                                            {isVisible('status') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span
                                                        className={entity.status?.toLowerCase() === "inactive" ? "status-inactive" : "status-active"}
                                                    >
                                                        {entity.status || "Active"}
                                                    </span>
                                                </TableCell>
                                            )}

                                            {/* Created At - Handle undefined createdAt */}
                                            {isVisible('createdAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).createdAt
                                                        ? new Date(
                                                            (entity as any).createdAt
                                                        ).toLocaleDateString()
                                                        : "N/A"}
                                                </TableCell>
                                            )}
                                        </>
                                    ) : config.entityName === "Category" ? (
                                        <>
                                            {isVisible('name') && (
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {bookmarkedEntities.has(entity.id) && (
                                                            <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                                        )}
                                                        {flaggedEntities.has(entity.id) && (
                                                            <Flag className="h-4 w-4 text-red-500" />
                                                        )}
                                                        {entity.name ||
                                                            (entity as any).categoryName ||
                                                            "Unnamed"}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {isVisible('formName') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).formName || "N/A"}
                                                </TableCell>
                                            )}
                                            {isVisible('status') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span
                                                        className={entity.status?.toLowerCase() === "inactive" ? "status-inactive" : "status-active"}
                                                    >
                                                        {entity.status || "Active"}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {isVisible('createdAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {new Date(entity.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            )}
                                        </>
                                    ) : config.entityName === "City" ? (
                                        <>
                                            {isVisible('name') && (
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {bookmarkedEntities.has(entity.id) && (
                                                            <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                                        )}
                                                        {flaggedEntities.has(entity.id) && (
                                                            <Flag className="h-4 w-4 text-red-500" />
                                                        )}
                                                        {entity.name ||
                                                            (entity as any).cityName ||
                                                            "Unnamed"}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {isVisible('stateName') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).stateName || "N/A"}
                                                </TableCell>
                                            )}
                                            {isVisible('status') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span
                                                        className={entity.status?.toLowerCase() === "inactive" ? "status-inactive" : "status-active"}
                                                    >
                                                        {entity.status || "Active"}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {isVisible('createdAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {new Date(entity.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            )}
                                        </>
                                    ) : config.entityName === "Manager" ? (
                                        <>
                                            {isVisible('managerId') && (
                                                <TableCell className="font-medium">
                                                    {(entity as any).managerId || "N/A"}
                                                </TableCell>
                                            )}
                                            {isVisible('name') && (
                                                <TableCell className="font-medium">
                                                    {entity.name || "Unknown"}
                                                </TableCell>
                                            )}
                                            {isVisible('email') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {(entity as any).user?.email || (entity as any).email || "N/A"}
                                                </TableCell>
                                            )}
                                            {isVisible('plantIds') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {(entity as any).plants?.slice(0, 3).map((plant: any, index: number) => (
                                                            <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                {plant.plantName}
                                                            </span>
                                                        ))}
                                                        {(entity as any).plants?.length > 3 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                +{(entity as any).plants.length - 3} more
                                                            </span>
                                                        )}
                                                        {(!(entity as any).plants || (entity as any).plants.length === 0) && (
                                                            <span className="text-xs text-muted-foreground">No plants</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {isVisible('status') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span
                                                        className={entity.status?.toLowerCase() === "inactive" ? "status-inactive" : "status-active"}
                                                    >
                                                        {entity.status || "Active"}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {isVisible('createdAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {new Date(entity.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {isVisible('name') && (
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {bookmarkedEntities.has(entity.id) && (
                                                            <Bookmark className="h-4 w-4 text-orange-500 fill-orange-500" />
                                                        )}
                                                        {flaggedEntities.has(entity.id) && (
                                                            <Flag className="h-4 w-4 text-red-500" />
                                                        )}
                                                        {entity.name ||
                                                            (entity as any).cityName ||
                                                            (entity as any).stateName ||
                                                            (entity as any).industryName ||
                                                            "Unnamed"}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {isVisible('status') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    <span
                                                        className={entity.status?.toLowerCase() === "inactive" ? "status-inactive" : "status-active"}
                                                    >
                                                        {entity.status || "Active"}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {isVisible('createdAt') && (
                                                <TableCell className="text-sm font-normal text-gray-700 transition-colors duration-200">
                                                    {new Date(entity.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            )}
                                        </>
                                    )}

                                    {/* Actions column */}
                                    <TableCell className="sticky right-0 bg-white z-10 text-center border-l border-gray-100 w-[100px] min-w-[100px]">
                                        <div className="flex space-x-2 justify-center">
                                            {archiveStatus === "active" ? (
                                                <>
                                                    {/* History button - visible for all entities */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onViewHistory(entity);
                                                        }}
                                                        title="View History"
                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                    >
                                                        <Clock className="h-4 w-4" />
                                                    </Button>

                                                    {/* Archive button for each row - only show if supported */}
                                                    {config.supportsArchive && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onArchive(entity);
                                                            }}
                                                            title="Archive"
                                                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && !config.hideDeleteButton && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(entity);
                                                            }}
                                                            title={`Delete ${config.entityName}`}
                                                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRestore(entity.id);
                                                    }}
                                                    title="Restore"
                                                    className="text-green-600 hover:text-green-800 hover:bg-green-100"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {config.customActions &&
                                                config.customActions(entity)}
                                            {!config.hideListingRowKebab && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        {archiveStatus === "active" ? (
                                                            <>
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDuplicate(entity);
                                                                    }}
                                                                >
                                                                    <Copy className="h-4 w-4 mr-2" />
                                                                    Duplicate
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onShare(entity);
                                                                    }}
                                                                >
                                                                    <Share2 className="h-4 w-4 mr-2" />
                                                                    Share
                                                                </DropdownMenuItem>
                                                                {archiveStatus === "active" && config.supportsArchive && (
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onArchive(entity);
                                                                        }}
                                                                    >
                                                                        <Archive className="h-4 w-4 mr-2" />
                                                                        Archive
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onViewHistory(entity);
                                                                    }}
                                                                >
                                                                    <Clock className="h-4 w-4 mr-2" />
                                                                    View History
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onBookmark(entity);
                                                                    }}
                                                                >
                                                                    <Bookmark
                                                                        className={`h-4 w-4 mr-2 ${bookmarkedEntities.has(entity.id)
                                                                            ? "fill-orange-500 text-orange-500"
                                                                            : ""
                                                                            }`}
                                                                    />
                                                                    {bookmarkedEntities.has(entity.id)
                                                                        ? "Remove Bookmark"
                                                                        : "Bookmark"}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onFlag(entity);
                                                                    }}
                                                                >
                                                                    <Flag
                                                                        className={`h-4 w-4 mr-2 ${flaggedEntities.has(entity.id)
                                                                            ? "text-red-500"
                                                                            : ""
                                                                            }`}
                                                                    />
                                                                    {flaggedEntities.has(entity.id)
                                                                        ? "Remove Flag"
                                                                        : "Flag"}
                                                                </DropdownMenuItem>
                                                            </>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onRestore(entity.id);
                                                                }}
                                                            >
                                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                                Restore
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        config.customHeaders
                                            ? config.customHeaders.length + 3 + (showBulkActions ? 1 : 0)
                                            : config.entityName === "Technician"
                                                ? showBulkActions
                                                    ? 6
                                                    : 5
                                                : config.entityName === "Product"
                                                    ? showBulkActions
                                                        ? 8
                                                        : 7
                                                    : config.entityName === "Category"
                                                        ? showBulkActions
                                                            ? 7
                                                            : 6
                                                        : config.entityName === "City"
                                                            ? showBulkActions
                                                                ? 6
                                                                : 5
                                                            : config.entityName === "Manager"
                                                                ? showBulkActions
                                                                    ? 8
                                                                    : 7
                                                                : showBulkActions
                                                                    ? 5
                                                                    : 4
                                    }
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {archiveStatus === "active"
                                        ? `No ${config.entityNamePlural.toLowerCase()} found. Create your first ${config.entityName.toLowerCase()} above.`
                                        : `No archived ${config.entityNamePlural.toLowerCase()} found.`}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </table>
            </div>
        </div>
    );
}

export default EntityTableView;
