// src/components/generic/components/EntityListHeader.tsx
// Extracted from GenericEntityPage.tsx - Lines 2738-2978
// Contains EXACT page header, stats, and action bar logic

import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    Filter,
    List,
    Grid3X3,
    Archive,
    MoreHorizontal,
    Download,
    Upload,
    Printer,
    Share2,
    RefreshCw,
    Settings,
    HelpCircle,
    Clock,
} from "lucide-react";
import { EntityConfig } from "../types/entity.types";

type ArchiveStatus = "active" | "archived";
type ViewMode = "table" | "grid";

interface EntityListHeaderProps {
    config: EntityConfig;
    archiveStatus: ArchiveStatus;
    entities: any[];
    archivedEntities: any[];
    totalItems: number;
    canCreate: boolean;
    viewMode: ViewMode;
    showFilter: boolean;
    filterOptions: any;
    isManagerModule: boolean;
    // Handlers
    onCreateClick: () => void;
    onFilterToggle: () => void;
    onViewModeChange: (mode: ViewMode) => void;
    onArchiveToggle: () => void;
    onExport: () => void;
    onImport: () => void;
    onPrint: () => void;
    onShareList: () => void;
    onRefresh: () => void;
    onBulkActions: () => void;
    onShowSettings: () => void;
    onShowHistory: () => void;
    onGetHelp: () => void;
    onLoadEntities: () => void;
    onSetArchiveStatus: (status: ArchiveStatus) => void;
}

export function EntityListHeader({
    config,
    archiveStatus,
    entities,
    archivedEntities,
    totalItems,
    canCreate,
    viewMode,
    showFilter,
    filterOptions,
    isManagerModule,
    onCreateClick,
    onFilterToggle,
    onViewModeChange,
    onArchiveToggle,
    onExport,
    onImport,
    onPrint,
    onShareList,
    onRefresh,
    onBulkActions,
    onShowSettings,
    onShowHistory,
    onGetHelp,
    onLoadEntities,
    onSetArchiveStatus,
}: EntityListHeaderProps) {
    return (
        <>
            {/* Page Header with Stats */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Page Title */}
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                    {archiveStatus === "active"
                                        ? config.entityNamePlural
                                        : `Archived ${config.entityNamePlural}`}
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    {archiveStatus === "active"
                                        ? `Manage and organize your ${config.entityNamePlural.toLowerCase()} efficiently`
                                        : `Review and restore archived ${config.entityNamePlural.toLowerCase()}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar - All buttons pushed to right */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-6">
                    {/* Stats Section */}
                    <div className="flex items-center gap-6">
                        {/* Total Count */}
                        <div className="text-right">
                            <div className="text-gray-900 font-medium text-lg">
                                {archiveStatus === "active"
                                    ? (config.pagination ? totalItems : entities.length)
                                    : archivedEntities.length}
                            </div>
                            <div className="text-gray-500 text-xs">Total</div>
                        </div>

                        {/* Active/Inactive Counts (only show when viewing active entities) */}
                        {archiveStatus === "active" && (
                            <>
                                <div className="w-px h-8 bg-gray-300"></div>
                                <div className="text-right">
                                    <div className="text-green-600 font-medium text-lg">
                                        {entities.filter((e) => e.status === "Active").length}
                                    </div>
                                    <div className="text-gray-500 text-xs">Active</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-red-600 font-medium text-lg">
                                        {
                                            entities.filter((e) => e.status === "Inactive")
                                                .length
                                        }
                                    </div>
                                    <div className="text-gray-500 text-xs">Inactive</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* All Action Buttons in one line */}
                    <div className="flex items-center gap-2">
                        {/* Custom Header Actions */}
                        {config.headerActions && config.headerActions()}

                        {/* Primary Action Button - Check permissions */}
                        {archiveStatus === "active" && !config.hideCreateButton && canCreate && (
                            <Button
                                onClick={onCreateClick}
                                className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add {config.entityName}
                            </Button>
                        )}

                        {/* Filter Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onFilterToggle}
                            className="border-gray-300 hover:bg-gray-50"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                            {filterOptions.status !== "all" && (
                                <span className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-xs">
                                    Active
                                </span>
                            )}
                        </Button>

                        {/* View Toggle */}
                        <div className="flex border border-gray-300 rounded-md bg-white">
                            <Button
                                variant={viewMode === "table" ? "default" : "ghost"}
                                size="sm"
                                className={`rounded-r-none border-0 ${viewMode === "table"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "text-gray-600 hover:text-gray-700"
                                    }`}
                                onClick={() => onViewModeChange("table")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                className={`rounded-l-none border-0 ${viewMode === "grid"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "text-gray-600 hover:text-gray-700"
                                    }`}
                                onClick={() => onViewModeChange("grid")}
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Archive Toggle - Always show for all modules */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={
                                archiveStatus === "active"
                                    ? onArchiveToggle
                                    : () => {
                                        onSetArchiveStatus("active");
                                        onLoadEntities(); // Reload active entities
                                    }
                            }
                            className="border-gray-300 hover:bg-gray-50"
                        >
                            <Archive className="h-4 w-4 mr-2" />
                            {archiveStatus === "active"
                                ? "View Archive"
                                : "Back to Active"}
                        </Button>

                        {/* More Actions Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-300 hover:bg-gray-50"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {/* For Manager module, only show specific menu items */}
                                {isManagerModule ? (
                                    <>
                                        <DropdownMenuItem onClick={onExport}>
                                            <Download className="h-4 w-4 mr-2 text-gray-600" />
                                            <span>Export Data</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={onBulkActions}>
                                            <List className="h-4 w-4 mr-2 text-gray-600" />
                                            <span>Bulk Actions</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={onShowHistory}>
                                            <Clock className="h-4 w-4 mr-2 text-gray-600" />
                                            <span>History & Comments</span>
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('export')) && (
                                            <DropdownMenuItem onClick={onExport}>
                                                <Download className="h-4 w-4 mr-2 text-gray-600" />
                                                <span>Export Data</span>
                                            </DropdownMenuItem>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('import')) && (
                                            <DropdownMenuItem onClick={onImport}>
                                                <Upload className="h-4 w-4 mr-2 text-gray-600" />
                                                <span>Import Data</span>
                                            </DropdownMenuItem>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('print')) && (
                                            <DropdownMenuItem onClick={onPrint}>
                                                <Printer className="h-4 w-4 mr-2 text-gray-600" />
                                                <span>Print List</span>
                                            </DropdownMenuItem>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('share')) && (
                                            <DropdownMenuItem onClick={onShareList}>
                                                <Share2 className="h-4 w-4 mr-2 text-gray-600" />
                                                <span>Share List</span>
                                            </DropdownMenuItem>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('refresh')) && (
                                            <DropdownMenuItem onClick={onRefresh}>
                                                <RefreshCw className="h-4 w-4 mr-2 text-gray-600" />
                                                <span>Refresh Data</span>
                                            </DropdownMenuItem>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('bulkActions')) && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={onBulkActions}>
                                                    <List className="h-4 w-4 mr-2 text-gray-600" />
                                                    <span>Bulk Actions</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('history')) && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={onShowHistory}>
                                                    <Clock className="h-4 w-4 mr-2 text-gray-600" />
                                                    <span>History & Comments</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('settings')) && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={onShowSettings}>
                                                    <Settings className="h-4 w-4 mr-2 text-gray-600" />
                                                    <span>Settings</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {(!config.limitTopMenuItems || config.limitTopMenuItems.includes('help')) && (
                                            <DropdownMenuItem onClick={onGetHelp}>
                                                <HelpCircle className="h-4 w-4 mr-2 text-gray-600" />
                                                <span>Get Help</span>
                                            </DropdownMenuItem>
                                        )}
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </>
    );
}

export default EntityListHeader;
