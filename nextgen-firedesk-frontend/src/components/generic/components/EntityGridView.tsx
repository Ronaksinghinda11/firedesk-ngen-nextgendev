// src/components/generic/components/EntityGridView.tsx
// Extracted from GenericEntityPage.tsx - Lines 3976-4220
// Contains EXACT grid/card view rendering

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { BaseEntity, EntityConfig } from "../types/entity.types";

type ArchiveStatus = "active" | "archived";

interface EntityGridViewProps {
    config: EntityConfig;
    paginatedEntities: BaseEntity[];
    archiveStatus: ArchiveStatus;
    showBulkActions: boolean;
    selectedEntities: Set<string>;
    bookmarkedEntities: Set<string>;
    flaggedEntities: Set<string>;
    canDelete: boolean;
    // Handlers
    onCardClick: (entity: BaseEntity) => void;
    onSelectEntity: (id: string) => void;
    onArchive: (entity: BaseEntity) => void;
    onRestore: (entityId: string) => void;
    onDelete: (entity: BaseEntity) => void;
    onDuplicate: (entity: BaseEntity) => void;
    onShare: (entity: BaseEntity) => void;
    onViewHistory: (entity: BaseEntity) => void;
    onBookmark: (entity: BaseEntity) => void;
    onFlag: (entity: BaseEntity) => void;
}

export function EntityGridView({
    config,
    paginatedEntities,
    archiveStatus,
    showBulkActions,
    selectedEntities,
    bookmarkedEntities,
    flaggedEntities,
    canDelete,
    onCardClick,
    onSelectEntity,
    onArchive,
    onRestore,
    onDelete,
    onDuplicate,
    onShare,
    onViewHistory,
    onBookmark,
    onFlag,
}: EntityGridViewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedEntities.length > 0 ? (
                paginatedEntities.map((entity) => (
                    <Card
                        key={entity.id}
                        className="hover:shadow-md transition-shadow cursor-pointer group relative"
                        onClick={() => onCardClick(entity)}
                        title="Click to edit"
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    {showBulkActions && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 -ml-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectEntity(entity.id);
                                            }}
                                        >
                                            {selectedEntities.has(entity.id) ? (
                                                <CheckSquare className="h-4 w-4 text-orange-500" />
                                            ) : (
                                                <Square className="h-4 w-4 text-gray-400" />
                                            )}
                                        </Button>
                                    )}
                                    <CardTitle className="text-lg font-bold text-gray-900">
                                        {(entity as any).plantName || entity[`${config.entityName.toLowerCase()}Id`] || entity.name || `#${entity.name}`}
                                    </CardTitle>
                                </div>
                                <span
                                    className={entity.status === "Active" ? "status-active" : "status-inactive"}
                                >
                                    {entity.status}
                                </span>
                            </div>
                            <CardDescription className="text-xs font-normal text-gray-500">
                                Created on{" "}
                                {new Date(entity.createdAt).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-end space-x-2">
                                {archiveStatus === "active" ? (
                                    <>
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
                                        {canDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(entity);
                                                }}
                                                title="Delete"
                                                className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}
                                {config.customActions && config.customActions(entity)}
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
                                                    {/* Archive option removed for grid view - accessible via View Archive button */}
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
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                    {archiveStatus === "active"
                        ? `No ${config.entityNamePlural.toLowerCase()} found. Create your first ${config.entityName.toLowerCase()} above.`
                        : `No archived ${config.entityNamePlural.toLowerCase()} found.`}
                </div>
            )}
        </div>
    );
}

export default EntityGridView;
