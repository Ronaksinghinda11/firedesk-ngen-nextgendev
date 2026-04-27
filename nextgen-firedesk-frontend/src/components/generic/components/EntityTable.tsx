// src/components/generic/components/EntityTable.tsx
// Extracted from GenericEntityPage.tsx - Lines 3283-3903

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BaseEntity, EntityConfig } from "../types/entity.types";

interface EntityTableProps {
    config: EntityConfig;
    entities: BaseEntity[];
    archiveStatus: "active" | "archived";
    showBulkActions: boolean;
    selectedEntities: Set<string>;
    bookmarkedEntities: Set<string>;
    flaggedEntities: Set<string>;
    canUpdate: boolean;
    canDelete: boolean;
    isAllSelected: boolean;

    // Actions
    onSelectEntity: (entityId: string) => void;
    onSelectAll: () => void;
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
 * Entity table component with entity-specific column rendering.
 * Extracted from GenericEntityPage.tsx lines 3283-3903
 */
export function EntityTable({
    config,
    entities,
    archiveStatus,
    showBulkActions,
    selectedEntities,
    bookmarkedEntities,
    flaggedEntities,
    canUpdate,
    canDelete,
    isAllSelected,
    onSelectEntity,
    onSelectAll,
    onEdit,
    onArchive,
    onRestore,
    onDelete,
    onDuplicate,
    onShare,
    onViewHistory,
    onBookmark,
    onFlag,
}: EntityTableProps) {
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

    // Render entity-specific columns - preserves all original column logic
    const renderEntityColumns = (entity: BaseEntity) => {
        const entityAny = entity as any;

        // Product columns
        if (config.entityName === "Product" || config.entityName === "Capacity") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.name || entityAny.productName}</TableCell>
                    <TableCell>{entityAny.categoryName || entityAny.category?.categoryName || "-"}</TableCell>
                </>
            );
        }

        // Category columns  
        if (config.entityName === "Category") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.categoryName || entityAny.name}</TableCell>
                    <TableCell>{entityAny.formName || entityAny.form?.formName || "-"}</TableCell>
                </>
            );
        }

        // City columns
        if (config.entityName === "City") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.cityName || entityAny.name}</TableCell>
                    <TableCell>{entityAny.stateName || entityAny.State?.stateName || "-"}</TableCell>
                </>
            );
        }

        // Manager columns
        if (config.entityName === "Manager") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.name || entityAny.managerName}</TableCell>
                    <TableCell>{entityAny.email || "-"}</TableCell>
                    <TableCell>{entityAny.phone || entityAny.phoneNumber || "-"}</TableCell>
                </>
            );
        }

        // Asset columns
        if (config.entityName === "Asset") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.assetName || entityAny.name}</TableCell>
                    <TableCell>{entityAny.assetTag || entityAny.serialNumber || "-"}</TableCell>
                    <TableCell>{entityAny.categoryName || entityAny.Category?.categoryName || "-"}</TableCell>
                    <TableCell>{entityAny.locationName || entityAny.Location?.locationName || "-"}</TableCell>
                </>
            );
        }

        // User columns
        if (config.entityName === "User") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.name || entityAny.userName}</TableCell>
                    <TableCell>{entityAny.email || "-"}</TableCell>
                    <TableCell>{entityAny.role?.roleName || entityAny.roleName || "-"}</TableCell>
                </>
            );
        }

        // Role columns
        if (config.entityName === "Role") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.roleName || entityAny.name}</TableCell>
                    <TableCell>{entityAny.description || "-"}</TableCell>
                </>
            );
        }

        // Technician columns
        if (config.entityName === "Technician") {
            return (
                <>
                    <TableCell className="font-medium">{entityAny.name || entityAny.technicianName}</TableCell>
                    <TableCell>{entityAny.email || "-"}</TableCell>
                    <TableCell>{entityAny.phone || entityAny.phoneNumber || "-"}</TableCell>
                    <TableCell>{entityAny.specialization || "-"}</TableCell>
                </>
            );
        }

        // Default columns for other entities (like State, Service, Industry)
        return (
            <>
                <TableCell className="font-medium">
                    {entityAny.name ||
                        entityAny.stateName ||
                        entityAny.serviceName ||
                        entityAny.industryName ||
                        entityAny.typeName ||
                        "-"}
                </TableCell>
            </>
        );
    };

    // Render entity-specific headers
    const renderEntityHeaders = () => {
        // Product/Capacity headers
        if (config.entityName === "Product" || config.entityName === "Capacity") {
            return (
                <>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                </>
            );
        }

        // Category headers
        if (config.entityName === "Category") {
            return (
                <>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Form</TableHead>
                </>
            );
        }

        // City headers
        if (config.entityName === "City") {
            return (
                <>
                    <TableHead>City Name</TableHead>
                    <TableHead>State</TableHead>
                </>
            );
        }

        // Manager headers
        if (config.entityName === "Manager") {
            return (
                <>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                </>
            );
        }

        // Asset headers
        if (config.entityName === "Asset") {
            return (
                <>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                </>
            );
        }

        // User headers
        if (config.entityName === "User") {
            return (
                <>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                </>
            );
        }

        // Role headers
        if (config.entityName === "Role") {
            return (
                <>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                </>
            );
        }

        // Technician headers
        if (config.entityName === "Technician") {
            return (
                <>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Specialization</TableHead>
                </>
            );
        }

        // Default header
        return <TableHead>Name</TableHead>;
    };

    // Custom headers from config
    const renderCustomHeaders = () => {
        if (!config.customHeaders) return null;
        return config.customHeaders.map((header, idx) => (
            <TableHead key={idx}>{header}</TableHead>
        ));
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {/* Bulk selection checkbox */}
                        {showBulkActions && (
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={onSelectAll}
                                />
                            </TableHead>
                        )}

                        {/* Entity-specific headers */}
                        {renderEntityHeaders()}

                        {/* Custom headers from config */}
                        {renderCustomHeaders()}

                        {/* Common headers */}
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entities.map((entity) => (
                        <TableRow
                            key={entity.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onDoubleClick={() => canUpdate && onEdit(entity)}
                        >
                            {/* Bulk selection checkbox */}
                            {showBulkActions && (
                                <TableCell>
                                    <Checkbox
                                        checked={selectedEntities.has(entity.id)}
                                        onCheckedChange={() => onSelectEntity(entity.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </TableCell>
                            )}

                            {/* Entity-specific columns */}
                            {renderEntityColumns(entity)}

                            {/* Custom columns from config */}
                            {config.customColumns && config.customColumns(entity)}

                            {/* Status badge */}
                            <TableCell>
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
                                {/* Bookmark/Flag indicators */}
                                <span className="ml-2">
                                    {bookmarkedEntities.has(entity.id) && (
                                        <Star className="h-3 w-3 inline text-yellow-500 fill-yellow-500" />
                                    )}
                                    {flaggedEntities.has(entity.id) && (
                                        <Flag className="h-3 w-3 inline text-red-500 fill-red-500 ml-1" />
                                    )}
                                </span>
                            </TableCell>

                            {/* Created date */}
                            <TableCell>
                                {new Date(entity.createdAt).toLocaleDateString()}
                            </TableCell>

                            {/* Actions */}
                            <TableCell>
                                <div
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* History button - visible for all entities */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onViewHistory(entity)}
                                        title="View History"
                                    >
                                        <History className="h-4 w-4 text-blue-500" />
                                    </Button>

                                    {/* Archive/Restore button */}
                                    {config.supportsArchive && (
                                        archiveStatus === "active" ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onArchive(entity)}
                                                title="Archive"
                                            >
                                                <Archive className="h-4 w-4 text-orange-500" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onRestore(entity)}
                                                title="Restore"
                                            >
                                                <RotateCcw className="h-4 w-4 text-green-500" />
                                            </Button>
                                        )
                                    )}

                                    {/* Delete button */}
                                    {canDelete && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(entity)}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}

                                    {/* Custom actions from config */}
                                    {config.customActions && config.customActions(entity)}

                                    {/* Kebab menu */}
                                    {!config.hideListingRowKebab && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
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
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
