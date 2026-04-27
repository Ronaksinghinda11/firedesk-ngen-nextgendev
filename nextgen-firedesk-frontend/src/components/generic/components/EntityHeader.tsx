// src/components/generic/components/EntityHeader.tsx
// Extracted from GenericEntityPage.tsx - Lines 2738-3078

import {
    Plus,
    Filter,
    LayoutGrid,
    List,
    Archive,
    MoreVertical,
    Download,
    Upload,
    Printer,
    Share2,
    RefreshCw,
    CheckSquare,
    Settings,
    HelpCircle,
    History,
    RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityConfig, ViewMode } from "../types/entity.types";

interface EntityHeaderProps {
    config: EntityConfig;
    archiveStatus: "active" | "archived";
    viewMode: ViewMode;
    showFilter: boolean;
    activeFilterCount?: number; // Number of active filters
    canCreate: boolean;
    isLoading: boolean;

    // Actions
    onAddNew: () => void;
    onToggleFilter: () => void;
    onViewModeChange: (mode: ViewMode) => void;
    onToggleArchiveView: () => void;
    onExport: () => void;
    onImport: () => void;
    onPrint: () => void;
    onShare: () => void;
    onRefresh: () => void;
    onBulkActions: () => void;
    onSettings: () => void;
    onHelp: () => void;
    onHistory: () => void;
}

/**
 * Entity header component with stats, toolbar, and action buttons.
 * Extracted from GenericEntityPage.tsx lines 2738-3078
 */
export function EntityHeader({
    config,
    archiveStatus,
    viewMode,
    showFilter,
    activeFilterCount = 0,
    canCreate,
    isLoading,
    onAddNew,
    onToggleFilter,
    onViewModeChange,
    onToggleArchiveView,
    onExport,
    onImport,
    onPrint,
    onShare,
    onRefresh,
    onBulkActions,
    onSettings,
    onHelp,
    onHistory,
}: EntityHeaderProps) {
    // Check if menu items should be limited
    const limitedMenuItems = config.limitTopMenuItems;
    const shouldShowMenuItem = (item: string) => {
        if (!limitedMenuItems) return true;
        return limitedMenuItems.includes(item as any);
    };

    return (
        <Card className="border-gray-200 shadow-sm rounded-l bg-white whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-md">
            <CardContent className="p-0">
                <div className="flex items-center justify-between p-3 px-4">
                    {/* Title with Orange Accent Bar */}
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1 bg-orange-500 rounded"></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 ">
                                    {archiveStatus === "active"
                                        ? config.entityNamePlural
                                        : `Archived ${config.entityNamePlural}`}
                                </h1>
                                {isLoading && (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent shadow-[0_0_5px_rgba(249,115,22,0.3)]"></div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 font-normal">
                                {archiveStatus === "active"
                                    ? `Manage and organize your ${config.entityNamePlural.toLowerCase()} efficiently`
                                    : `Review and restore archived ${config.entityNamePlural.toLowerCase()}`}
                            </p>
                        </div>
                    </div>

                    {/* Compact Action Toolbar */}
                    <div className="flex items-center gap-2">
                        {/* Custom Header Actions */}
                        {config.headerActions && (
                            <div className="flex items-center gap-2 border-r pr-2 mr-2 border-gray-100">
                                {config.headerActions()}
                            </div>
                        )}

                        {/* Primary Add Action */}
                        {!config.hideCreateButton && canCreate && archiveStatus === "active" && (
                            <Button
                                onClick={onAddNew}
                                className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm h-9 px-4 transition-all duration-200 active:scale-95"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                <span className="font-semibold">Add {config.entityName}</span>
                            </Button>
                        )}

                        {/* Secondary Actions */}
                        <div className="flex items-center gap-1.5 px-1.5 border-x border-gray-100">
                            <Button
                                variant={showFilter ? "secondary" : "outline"}
                                size="sm"
                                onClick={onToggleFilter}
                                className={`h-9 gap-2 transition-all duration-200 ${showFilter ? "bg-gray-100 border-gray-200" : "hover:bg-gray-50"
                                    }`}
                            >
                                <Filter className={`h-4 w-4 ${showFilter ? "text-orange-500" : "text-gray-500"}`} />
                                <span className="font-medium text-gray-700">Filter</span>
                                {activeFilterCount > 0 && (
                                    <span className="ml-1 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>

                            {/* View Toggle Group - Commented out per request to remove grid view */}
                            {/* <div className="flex p-0.5 bg-gray-50 border rounded-md h-9">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewModeChange("table")}
                                    className={`px-2 h-full rounded-sm transition-all duration-200 ${viewMode === "table"
                                        ? "bg-white text-orange-600 shadow-sm"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewModeChange("grid")}
                                    className={`px-2 h-full rounded-sm transition-all duration-200 ${viewMode === "grid"
                                        ? "bg-white text-orange-600 shadow-sm"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div> */}
                        </div>

                        {/* Utility Actions */}
                        <div className="flex items-center gap-1.5">
                            {config.supportsArchive && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onToggleArchiveView}
                                    className={`h-9 gap-2 transition-all duration-200 ${archiveStatus === "archived" ? "bg-gray-100 border-gray-300" : "hover:bg-gray-50"
                                        }`}
                                >
                                    {archiveStatus === "active" ? (
                                        <>
                                            <Archive className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium text-gray-700">View Archive</span>
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="h-4 w-4 text-orange-500" />
                                            <span className="font-medium text-gray-700">View Active</span>
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* More Actions Shell */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-gray-50 transition-all duration-200">
                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 shadow-xl border-gray-100 p-1.5 rounded-lg">
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data Options</div>
                                    {shouldShowMenuItem("export") && (
                                        <DropdownMenuItem onClick={onExport} className="rounded-md gap-2 py-2">
                                            <Download className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">Export Data</span>
                                        </DropdownMenuItem>
                                    )}
                                    {/* Import is now independently controlled via 'import' in limitTopMenuItems */}
                                    {shouldShowMenuItem("import") && (
                                        <DropdownMenuItem onClick={onImport} className="rounded-md gap-2 py-2">
                                            <Upload className="h-4 w-4 text-emerald-500" />
                                            <span className="font-medium">Import Data</span>
                                        </DropdownMenuItem>
                                    )}
                                    {shouldShowMenuItem("print") && (
                                        <DropdownMenuItem onClick={onPrint} className="rounded-md gap-2 py-2">
                                            <Printer className="h-4 w-4 text-indigo-500" />
                                            <span className="font-medium">Print List</span>
                                        </DropdownMenuItem>
                                    )}
                                    {shouldShowMenuItem("share") && (
                                        <DropdownMenuItem onClick={onShare} className="rounded-md gap-2 py-2">
                                            <Share2 className="h-4 w-4 text-cyan-500" />
                                            <span className="font-medium">Share List</span>
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator className="my-1.5 opacity-50" />
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Management</div>

                                    {shouldShowMenuItem("refresh") && (
                                        <DropdownMenuItem onClick={onRefresh} disabled={isLoading} className="rounded-md gap-2 py-2">
                                            <RefreshCw className={`h-4 w-4 text-amber-500 ${isLoading ? "animate-spin" : ""}`} />
                                            <span className="font-medium">Refresh List</span>
                                        </DropdownMenuItem>
                                    )}
                                    {shouldShowMenuItem("bulkActions") && (
                                        <DropdownMenuItem onClick={onBulkActions} className="rounded-md gap-2 py-2">
                                            <CheckSquare className="h-4 w-4 text-rose-500" />
                                            <span className="font-medium">Bulk Actions</span>
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator className="my-1.5 opacity-50" />

                                    {shouldShowMenuItem("settings") && (
                                        <DropdownMenuItem onClick={onSettings} className="rounded-md gap-2 py-2">
                                            <Settings className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium">Display Settings</span>
                                        </DropdownMenuItem>
                                    )}
                                    {shouldShowMenuItem("help") && (
                                        <DropdownMenuItem onClick={onHelp} className="rounded-md gap-2 py-2">
                                            <HelpCircle className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium">Help Center</span>
                                        </DropdownMenuItem>
                                    )}
                                    {shouldShowMenuItem("history") && (
                                        <DropdownMenuItem onClick={onHistory} className="rounded-md gap-2 py-2">
                                            <History className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium">Audit History</span>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
