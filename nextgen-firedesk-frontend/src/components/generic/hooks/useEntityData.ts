// src/components/generic/hooks/useEntityData.ts
// Extracted from GenericEntityPage.tsx - Lines 235-237, 446-649

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { BaseEntity, EntityConfig } from "../types/entity.types";

interface UseEntityDataProps {
    config: EntityConfig;
    selectedPlantId?: string | null;
    currentPage: number;
}

interface UseEntityDataReturn {
    entities: BaseEntity[];
    setEntities: React.Dispatch<React.SetStateAction<BaseEntity[]>>;
    archivedEntities: BaseEntity[];
    setArchivedEntities: React.Dispatch<React.SetStateAction<BaseEntity[]>>;
    loading: boolean;
    serverTotalPages: number;
    totalItems: number;
    loadEntities: () => Promise<void>;
}

/**
 * Hook for fetching, transforming, and managing entity data.
 * Extracted from GenericEntityPage.tsx lines 235-237, 446-649
 */
export function useEntityData({
    config,
    selectedPlantId,
    currentPage,
}: UseEntityDataProps): UseEntityDataReturn {
    const [entities, setEntities] = useState<BaseEntity[]>([]);
    const [archivedEntities, setArchivedEntities] = useState<BaseEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const loadEntities = useCallback(async () => {
        try {
            setLoading(true);
            console.log(
                `🔄 Loading ${config.entityNamePlural} from:`,
                config.apiEndpoint
            );

            let response;

            // Use customFetchAll if provided, otherwise use default endpoint
            if (config.customFetchAll) {
                console.log(`🔧 Using customFetchAll function`);
                response = await config.customFetchAll();
            } else {
                const endpoint = config.apiEndpoint.startsWith("/")
                    ? config.apiEndpoint
                    : `/${config.apiEndpoint}`;

                // Apply plant filter if enabled
                const params: Record<string, string> = {};
                if (config.enablePlantFilter && selectedPlantId && selectedPlantId !== 'all') {
                    const paramName = config.plantFilterParam || 'plantId';
                    params[paramName] = selectedPlantId;
                    console.log(`🌿 Applying plant filter: ${paramName}=${selectedPlantId}`);
                }

                // Apply pagination if enabled
                if (config.pagination) {
                    params.page = currentPage.toString();
                    params.limit = (config.itemsPerPage || 10).toString();
                    console.log(`📄 Applying pagination: page=${params.page}, limit=${params.limit}`);
                }

                console.log(`🌐 Making API request to:`, endpoint, params);
                response = await api.get(endpoint, { params });
            }

            console.log(`📦 API Response for ${config.entityNamePlural}:`, response);

            // Handle pagination metadata
            if (config.pagination) {
                if (response.count !== undefined) {
                    setTotalItems(response.count);
                }
                if (response.totalPages !== undefined) {
                    setServerTotalPages(response.totalPages);
                } else if (response.count !== undefined) {
                    setServerTotalPages(Math.ceil(response.count / (config.itemsPerPage || 10)));
                }
            }

            let entityData;

            if (config.transformResponse) {
                // Apply transformResponse first
                const transformedData = config.transformResponse(response);
                console.log(`🔄 After transformResponse:`, transformedData);

                // Then extract using responseKey
                if (config.responseKey) {
                    entityData = transformedData[config.responseKey];
                    console.log(
                        `🔑 Using responseKey "${config.responseKey}" after transform:`,
                        entityData
                    );
                } else {
                    entityData = transformedData;
                    console.log(
                        `📋 No responseKey, using transformed data directly:`,
                        entityData
                    );
                }
            } else if (config.responseKey) {
                entityData = response[config.responseKey];
                console.log(
                    `🔑 Using responseKey "${config.responseKey}":`,
                    entityData
                );
            } else {
                entityData = response[config.entityNamePlural];
                console.log(
                    `🔍 Using entityNamePlural "${config.entityNamePlural}":`,
                    entityData
                );
            }

            if (!entityData) {
                console.log(
                    `⚠️ No data found with primary methods, trying fallbacks...`
                );

                if (Array.isArray(response)) {
                    entityData = response;
                    console.log(`📋 Response is an array, using directly:`, entityData);
                }

                if ((response as any).data) {
                    if (Array.isArray((response as any).data)) {
                        entityData = (response as any).data;
                        console.log(`📋 Found array in response.data:`, entityData);
                    } else if ((response as any).data[config.entityNamePlural]) {
                        entityData = (response as any).data[config.entityNamePlural];
                        console.log(
                            `📋 Found in response.data[${config.entityNamePlural}]:`,
                            entityData
                        );
                    } else if (
                        config.responseKey &&
                        (response as any).data[config.responseKey]
                    ) {
                        entityData = (response as any).data[config.responseKey];
                        console.log(
                            `📋 Found in response.data[${config.responseKey}]:`,
                            entityData
                        );
                    }
                }
            }

            if (entityData && Array.isArray(entityData)) {
                console.log(
                    `✅ ${config.entityNamePlural} loaded successfully:`,
                    entityData
                );

                // Filter to show only ACTIVE entities (excluding archived/inactive ones)
                const archiveValue = config.archiveStatusValue || 'Inactive';
                const activeEntities = entityData.filter(entity => {
                    // Entity is active if status is NOT the archive status value
                    // This ensures archived entities don't appear in the active view
                    return entity.status !== archiveValue && entity.status !== 'Inactive';
                });

                console.log(
                    `🎯 Filtered to ${activeEntities.length} active entities (excluded ${entityData.length - activeEntities.length} archived)`
                );

                // Debug: Check the first entity's structure
                if (activeEntities.length > 0) {
                    console.log(`🔍 First active entity structure:`, activeEntities[0]);
                    console.log(`🔍 First active entity name field:`, activeEntities[0].name);
                }

                setEntities(activeEntities);
            } else {
                console.warn(
                    `⚠️ No valid ${config.entityNamePlural} data found in response: `,
                    response
                );
                console.warn(
                    `Expected responseKey: "${config.responseKey}" or entityNamePlural: "${config.entityNamePlural}"`
                );
                setEntities([]);
            }
        } catch (error: any) {
            console.error("❌ Error loading entities:", error);

            if (error.response && error.response.status) {
                console.error("❌ Response error data:", error.response.data);
                console.error("❌ Response error status:", error.response.status);
                console.error("❌ Response error headers:", error.response.headers);

                const errorMessage =
                    error.response.data?.message ||
                    error.response.data?.error ||
                    error.message ||
                    "An error occurred";

                toast({
                    title: "API Error",
                    description: `Server responded with status ${error.response.status}: ${errorMessage} `,
                    variant: "destructive",
                });
            } else if (error.request) {
                console.error(
                    "❌ Request error (no response received):",
                    error.request
                );

                toast({
                    title: "Network Error",
                    description:
                        "No response received from server. Please check your network connection.",
                    variant: "destructive",
                });
            } else {
                console.error("❌ General error:", error.message);

                const errorMessage =
                    error.message || `Failed to load ${config.entityNamePlural} `;

                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }

            setEntities([]);
        } finally {
            setLoading(false);
        }
    }, [config, selectedPlantId, currentPage]);

    // Auto-fetch on dependencies change
    useEffect(() => {
        loadEntities();
    }, [config.fetchTrigger, config.enablePlantFilter ? selectedPlantId : null, currentPage]);

    return {
        entities,
        setEntities,
        archivedEntities,
        setArchivedEntities,
        loading,
        serverTotalPages,
        totalItems,
        loadEntities,
    };
}
