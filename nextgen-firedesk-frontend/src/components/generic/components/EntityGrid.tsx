// src/components/generic/components/EntityGrid.tsx
// Extracted from GenericEntityPage.tsx - Lines 3977-4166

import {
    Archive,
    Trash2,
    MoreVertical,
    Copy,
    Share2,
    History,
    Bookmark,
    Flag,
    Star,
    RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BaseEntity, EntityConfig } from "../types/entity.types";

interface EntityGridProps {
    config: EntityConfig;
    entities: BaseEntity[];
    archiveStatus: "active" | "archived";
    showBulkActions: boolean;
    selectedEntities: Set<string>;
    bookmarkedEntities: Set<string>;
    flaggedEntities: Set<string>;
    canUpdate: boolean;
    canDelete: boolean;

    // Actions
    onSelectEntity: (entityId: string) => void;
    onEdit: (entity: BaseEntity) => void;
    onArchive: (entity: BaseEntity) => void;
    onRestore: (entity: BaseEntity) => void;
    onDelete: (entity: BaseEntity) => void;
    onDuplicate: (entity: BaseEntity) => void;
    onShare: (entity: BaseEntity) => void;
    onViewHistory: (entity: BaseEntity) => void;
    onBookmark: (entity: BaseEntity) => void;
    onFlag: (entity: BaseEntity) => void;
}

/**
 * Entity grid (card) view component.
 * Extracted from GenericEntityPage.tsx lines 3977-4166
 */
export function EntityGrid({
    config,
    entities,
    archiveStatus,
    showBulkActions,
    selectedEntities,
    bookmarkedEntities,
    flaggedEntities,
    canUpdate,
    canDelete,
    onSelectEntity,
    onEdit,
    onArchive,
    onRestore,
    onDelete,
    onDuplicate,
    onShare,
    onViewHistory,
    onBookmark,
    onFlag,
}: EntityGridProps) {
    if (entities.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No {config.entityNamePlural.toLowerCase()} found.</p>
                <p className="text-sm">
                    {archiveStatus === "active"
                        ? `Click "Add ${config.entityName}" to create one.`
                        : "No archived items available."}
                </p>
            </div>
        );
    }

    // Get display name based on entity type
    const getDisplayName = (entity: BaseEntity): string => {
        const entityAny = entity as any;
        return (
            entityAny.name ||
            entityAny.stateName ||
            entityAny.serviceName ||
            entityAny.industryName ||
            entityAny.categoryName ||
            entityAny.cityName ||
            entityAny.productName ||
            entityAny.assetName ||
            entityAny.userName ||
            entityAny.roleName ||
            entityAny.typeName ||
            "-"
        );
    };

    // Get secondary info based on entity type
    const getSecondaryInfo = (entity: BaseEntity): string | null => {
        const entityAny = entity as any;

        if (config.entityName === "City") {
            return entityAny.stateName || entityAny.State?.stateName || null;
        }
        if (config.entityName === "Category") {
            return entityAny.formName || entityAny.form?.formName || null;
        }
        if (config.entityName === "Product" || config.entityName === "Capacity") {
            return entityAny.categoryName || entityAny.category?.categoryName || null;
        }
        if (config.entityName === "Manager" || config.entityName === "User") {
            return entityAny.email || null;
        }
        if (config.entityName === "Asset") {
            return entityAny.assetTag || entityAny.serialNumber || null;
        }

        return null;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {entities.map((entity) => (
                <Card
                    key={entity.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${selectedEntities.has(entity.id) ? "ring-2 ring-blue-500" : ""
                        }`}
                    onDoubleClick={() => canUpdate && onEdit(entity)}
                >
                    <CardContent className="p-4">
                        {/* Header with checkbox and kebab */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {showBulkActions && (
                                    <Checkbox
                                        checked={selectedEntities.has(entity.id)}
                                        onCheckedChange={() => onSelectEntity(entity.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                <div>
                                    <h3 className="font-semibold text-sm truncate max-w-[180px]">
                                        {getDisplayName(entity)}
                                    </h3>
                                    {getSecondaryInfo(entity) && (
                                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                            {getSecondaryInfo(entity)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Kebab menu - only show if not hidden by config */}
                            {!config.hideListingRowKebab && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onDuplicate(entity)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onShare(entity)}>
                                            <Share2 className="h-4 w-4 mr-2" />
                                            Share
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onViewHistory(entity)}>
                                            <History className="h-4 w-4 mr-2" />
                                            View History
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onBookmark(entity)}>
                                            <Bookmark
                                                className={`h-4 w-4 mr-2 ${bookmarkedEntities.has(entity.id)
                                                        ? "fill-yellow-500 text-yellow-500"
                                                        : ""
                                                    }`}
                                            />
                                            {bookmarkedEntities.has(entity.id)
                                                ? "Remove Bookmark"
                                                : "Bookmark"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onFlag(entity)}>
                                            <Flag
                                                className={`h-4 w-4 mr-2 ${flaggedEntities.has(entity.id)
                                                        ? "fill-red-500 text-red-500"
                                                        : ""
                                                    }`}
                                            />
                                            {flaggedEntities.has(entity.id)
                                                ? "Remove Flag"
                                                : "Flag for Review"}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Status and indicators */}
                        <div className="flex items-center gap-2 mb-3">
                            <Badge
                                variant={entity.status === "Active" ? "default" : "secondary"}
                                className={
                                    entity.status === "Active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-600"
                                }
                            >
                                {entity.status}
                            </Badge>
                            {bookmarkedEntities.has(entity.id) && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {flaggedEntities.has(entity.id) && (
                                <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                            )}
                        </div>

                        {/* Date */}
                        <p className="text-xs text-gray-500 mb-3">
                            Created {new Date(entity.createdAt).toLocaleDateString()}
                        </p>

                        {/* Custom columns if defined */}
                        {config.customColumns && (
                            <div className="mb-3 text-sm">
                                {config.customColumns(entity)}
                            </div>
                        )}

                        {/* Actions */}
                        <div
                            className="flex items-center gap-1 pt-2 border-t"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Archive/Restore */}
                            {config.supportsArchive && (
                                archiveStatus === "active" ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onArchive(entity)}
                                        title="Archive"
                                    >
                                        <Archive className="h-4 w-4 text-orange-500" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRestore(entity)}
                                        title="Restore"
                                    >
                                        <RotateCcw className="h-4 w-4 text-green-500" />
                                    </Button>
                                )
                            )}

                            {/* Delete */}
                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(entity)}
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}

                            {/* Custom actions from config */}
                            {config.customActions && config.customActions(entity)}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
