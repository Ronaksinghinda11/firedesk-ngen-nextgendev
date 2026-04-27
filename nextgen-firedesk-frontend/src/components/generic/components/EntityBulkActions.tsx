// src/components/generic/components/EntityBulkActions.tsx
// Extracted from GenericEntityPage.tsx - Lines 3081-3186
// Contains EXACT bulk actions panel with all buttons

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Download,
    Archive,
    RefreshCw,
    Trash2,
    X,
} from "lucide-react";
import { EntityConfig } from "../types/entity.types";

type ArchiveStatus = "active" | "archived";

interface EntityBulkActionsProps {
    config: EntityConfig;
    selectedEntities: Set<string>;
    entities: any[];
    archiveStatus: ArchiveStatus;
    effectiveConfig: EntityConfig;
    // Handlers
    onSelectAll: () => void;
    onSelectAllAssets: () => void;
    onClearSelection: () => void;
    onBulkExport: () => void;
    onBulkArchive: () => void;
    onBulkRestore: () => void;
    onBulkDelete: () => void;
    onClose: () => void;
    onSetSelectedEntities: (entities: Set<string>) => void;
}

export function EntityBulkActions({
    config,
    selectedEntities,
    entities,
    archiveStatus,
    effectiveConfig,
    onSelectAll,
    onSelectAllAssets,
    onClearSelection,
    onBulkExport,
    onBulkArchive,
    onBulkRestore,
    onBulkDelete,
    onClose,
    onSetSelectedEntities,
}: EntityBulkActionsProps) {
    return (
        <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-orange-800">
                            Bulk Actions
                        </h3>
                        <p className="text-orange-700 text-sm mt-1">
                            {selectedEntities.size} {config.entityName}(s) selected
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSelectAll}
                        >
                            {entities.every((e) => selectedEntities.has(e.id))
                                ? "Deselect Page"
                                : "Select Page"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSelectAllAssets}
                        >
                            Select All
                        </Button>
                        {selectedEntities.size > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearSelection}
                                className="text-orange-600"
                            >
                                Clear ({selectedEntities.size})
                            </Button>
                        )}
                        {/* Export removed - available in 3-dot menu */}
                        {effectiveConfig.supportsArchive && archiveStatus === "active" ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onBulkArchive}
                            >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
                            </Button>
                        ) : effectiveConfig.supportsArchive && archiveStatus === "archived" ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onBulkRestore}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Restore
                            </Button>
                        ) : null}
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onBulkDelete}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                        </Button>
                        {/* Custom Bulk Actions */}
                        {config.customBulkActions?.map((action, index) => (
                            <Button
                                key={index}
                                variant={action.variant || "outline"}
                                size="sm"
                                onClick={() => {
                                    const selectedIds = Array.from(selectedEntities);
                                    const selectedEntitiesData = entities.filter((e) =>
                                        selectedEntities.has(e.id)
                                    );
                                    action.onClick(selectedIds, selectedEntitiesData, onSetSelectedEntities);
                                }}
                                disabled={action.label.includes('Select') ? false : selectedEntities.size === 0}
                            >
                                {action.icon}
                                {action.label}
                            </Button>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default EntityBulkActions;
