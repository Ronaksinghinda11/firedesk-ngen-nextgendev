// src/components/generic/utils/csvUtils.ts
// Extracted from GenericEntityPage.tsx - Lines 1232-1299, 1603-1679

import { BaseEntity, EntityConfig } from "../types/entity.types";
import { getFieldValue, escapeCSV } from "./entityHelpers";
import { toast } from "@/hooks/use-toast";

/**
 * Export all entities to CSV file.
 * Extracted from GenericEntityPage.tsx lines 1232-1299
 */
export const exportToCSV = (
    entities: BaseEntity[],
    config: EntityConfig
): void => {
    // Fields to exclude from export
    const excludedFields = ['id', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy', '_id'];

    if (entities.length === 0) {
        toast({
            title: "No Data to Export",
            description: `There are no ${config.entityNamePlural.toLowerCase()} to export`,
            variant: "destructive",
        });
        return;
    }

    // Use ALL entity fields (not just config.fields) to capture status and other important data
    const sampleEntity = entities[0];
    const allFieldNames = Object.keys(sampleEntity).filter(
        (key) => !excludedFields.includes(key)
    );

    // Build headers and field names
    // Try to use labels from config.fields where available, otherwise auto-generate
    const fieldConfigMap = new Map(config.fields.map(f => [f.name, f.label]));

    const headers = allFieldNames.map((fieldName) => {
        // Use configured label if available
        if (fieldConfigMap.has(fieldName)) {
            return fieldConfigMap.get(fieldName)!;
        }
        // Auto-generate readable header from field name
        return fieldName
            .charAt(0).toUpperCase() +
            fieldName.slice(1).replace(/([A-Z])/g, ' $1').trim();
    });

    const fieldNames = allFieldNames;

    // Build CSV data
    const csvData = entities.map((entity) =>
        fieldNames.map((fieldName) => {
            const value = getFieldValue(entity, fieldName);
            return escapeCSV(value);
        })
    );

    // Combine headers and data
    const csvContent = [
        headers.map(escapeCSV).join(","),
        ...csvData.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.entityNamePlural.toLowerCase()}_${new Date().toISOString().split("T")[0]
        }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
        title: "Export Successful",
        description: `Exported ${entities.length
            } ${config.entityNamePlural.toLowerCase()} to CSV`,
    });
};

/**
 * Export selected entities to CSV file.
 * Extracted from GenericEntityPage.tsx lines 1603-1679
 */
export const exportSelectedToCSV = (
    entities: BaseEntity[],
    selectedIds: Set<string>,
    config: EntityConfig
): void => {
    if (selectedIds.size === 0) {
        toast({
            title: `No ${config.entityNamePlural} Selected`,
            description: `Please select at least one ${config.entityName.toLowerCase()} to export`,
            variant: "destructive",
        });
        return;
    }

    // Fields to exclude from export
    const excludedFields = ['id', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy', '_id'];

    // Get selected entities
    const selectedEntitiesData = entities.filter((e) =>
        selectedIds.has(e.id)
    );

    if (selectedEntitiesData.length === 0) {
        return;
    }

    // Use ALL entity fields (not just config.fields) to capture status and other important data
    const sampleEntity = selectedEntitiesData[0];
    const allFieldNames = Object.keys(sampleEntity).filter(
        (key) => !excludedFields.includes(key)
    );

    // Build headers and field names
    // Try to use labels from config.fields where available, otherwise auto-generate
    const fieldConfigMap = new Map(config.fields.map(f => [f.name, f.label]));

    const headers = allFieldNames.map((fieldName) => {
        // Use configured label if available
        if (fieldConfigMap.has(fieldName)) {
            return fieldConfigMap.get(fieldName)!;
        }
        // Auto-generate readable header from field name
        return fieldName
            .charAt(0).toUpperCase() +
            fieldName.slice(1).replace(/([A-Z])/g, ' $1').trim();
    });

    const fieldNames = allFieldNames;

    // Build CSV data
    const csvData = selectedEntitiesData.map((entity) =>
        fieldNames.map((fieldName) => {
            const value = getFieldValue(entity, fieldName);
            return escapeCSV(value);
        })
    );

    // Combine headers and data
    const csvContent = [
        headers.map(escapeCSV).join(","),
        ...csvData.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `selected_${config.entityNamePlural.toLowerCase()}_${new Date().toISOString().split("T")[0]
        }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
        title: "Export Successful",
        description: `Exported ${selectedIds.size
            } ${config.entityNamePlural.toLowerCase()} to CSV`,
    });
};
