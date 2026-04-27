// src/components/generic/utils/archiveUtils.ts
// Extracted from GenericEntityPage.tsx - Lines 1681-1770

import { BaseEntity, EntityConfig } from "../types/entity.types";

/**
 * Helper function to build update data for archive/restore operations.
 * This makes the archive/restore functionality completely generic.
 *
 * Configuration options in EntityConfig:
 * - archiveFields: string[] - Whitelist of fields to include (recommended)
 * - excludeFields: string[] - Blacklist of fields to exclude (fallback)
 *
 * Example usage in config:
 * archiveFields: ['categoryName', 'formId'] // Only send these fields + status
 * excludeFields: ['id', 'createdAt', 'customField'] // Exclude these fields
 * 
 * Extracted from GenericEntityPage.tsx lines 1681-1770
 */
export const buildUpdateData = (
    entity: BaseEntity,
    status: "Active" | "Inactive",
    config: EntityConfig
): Record<string, any> => {
    const updateData: Record<string, any> = {};

    console.log(`🔧 buildUpdateData called for ${config.entityName}`);
    console.log(`🔧 Entity:`, entity);
    console.log(`🔧 archiveFields config:`, config.archiveFields);
    console.log(`🔧 Target status:`, status);

    // If archiveFields are specified in config, use only those fields
    if (config.archiveFields && config.archiveFields.length > 0) {
        config.archiveFields.forEach((field) => {
            // Skip 'status' field as we'll set it separately to avoid overwriting
            if (field === "status") return;

            if ((entity as any)[field] !== undefined) {
                updateData[field] = (entity as any)[field];
                console.log(`🔧 Added field "${field}":`, (entity as any)[field]);
            } else {
                console.warn(`⚠️ Field "${field}" is undefined in entity`);
            }
        });

        // Always set status last to ensure it's the target status
        updateData.status = status;
        console.log(`🔧 Set status to:`, status);
        console.log(`🔧 Final updateData:`, updateData);
        return updateData;
    }

    // Default behavior: auto-detect common field patterns
    const entityAny = entity as any;

    // Check for common entity-specific fields
    if (entityAny.categoryName) {
        updateData.categoryName = entityAny.categoryName;
        if (entityAny.formId) updateData.formId = entityAny.formId;
    } else if (entityAny.industryName) {
        updateData.industryName = entityAny.industryName;
    } else if (entityAny.stateName) {
        updateData.stateName = entityAny.stateName;
    } else if (entityAny.cityName) {
        updateData.cityName = entityAny.cityName;
        if (entityAny.stateId) updateData.stateId = entityAny.stateId;
    } else if (entityAny.serviceName) {
        updateData.serviceName = entityAny.serviceName;
    } else {
        // For other entities, use all fields except excluded ones
        const defaultExcludeFields = [
            "id",
            "createdAt",
            "updatedAt",
            "createdBy",
            "name",
            "form",
            "State",
            "category",
            "formName",
            "stateName",
            "slNo",
        ];

        const excludeFields = config.excludeFields || defaultExcludeFields;

        Object.keys(entity).forEach((key) => {
            if (!excludeFields.includes(key)) {
                updateData[key] = (entity as any)[key];
            }
        });
    }

    // Always set status last
    updateData.status = status;

    return updateData;
};
