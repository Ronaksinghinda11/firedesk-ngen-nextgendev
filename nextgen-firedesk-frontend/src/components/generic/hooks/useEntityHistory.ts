// src/components/generic/hooks/useEntityHistory.ts
// Extracted from GenericEntityPage.tsx - Lines 260, 267-311, 426-430, 651-714, 2100-2161, 2317-2536, 2590-2600

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Activity, BaseEntity, EntityConfig, Comment } from "../types/entity.types";

interface UseEntityHistoryProps {
    config: EntityConfig;
    entities: BaseEntity[];
    archivedEntities: BaseEntity[];
    editingEntity: BaseEntity | null;
}

interface UseEntityHistoryReturn {
    // History state
    showHistory: boolean;
    setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
    activities: Activity[];
    loadingActivities: boolean;

    // Comments state  
    comments: Record<string, Comment[]>;
    newComment: string;
    setNewComment: React.Dispatch<React.SetStateAction<string>>;
    selectedEntityForComments: string | null;
    setSelectedEntityForComments: React.Dispatch<React.SetStateAction<string | null>>;

    // Bookmarks and flags
    bookmarkedEntities: Set<string>;
    flaggedEntities: Set<string>;

    // Actions
    loadActivities: (entityId?: string) => Promise<void>;
    toggleHistory: () => void;
    handleAddComment: (entityId: string) => Promise<void>;
    handleDeleteComment: (entityId: string, commentId: string) => void;
    getEntityComments: (entityId: string) => Comment[];
    handleViewHistory: (entity: BaseEntity) => void;
    handleBookmark: (entity: BaseEntity) => void;
    handleFlag: (entity: BaseEntity) => void;
}

/**
 * Hook for managing history, comments, bookmarks, and flags.
 * Extracted from GenericEntityPage.tsx lines 260, 267-311, 426-430, 651-714, 2100-2161, 2317-2536, 2590-2600
 */
export function useEntityHistory({
    config,
    entities,
    archivedEntities,
    editingEntity,
}: UseEntityHistoryProps): UseEntityHistoryReturn {
    const [showHistory, setShowHistory] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Comments state
    const [comments, setComments] = useState<Record<string, Comment[]>>(() => {
        // Load comments from localStorage on mount
        const stored = localStorage.getItem(`comments_${config.entityNamePlural}`);
        return stored ? JSON.parse(stored) : {};
    });
    const [newComment, setNewComment] = useState("");
    const [selectedEntityForComments, setSelectedEntityForComments] = useState<string | null>(null);

    // Bookmarks and flags
    const [bookmarkedEntities, setBookmarkedEntities] = useState<Set<string>>(() => {
        // Load bookmarks from localStorage on mount
        const stored = localStorage.getItem(`bookmarks_${config.entityNamePlural}`);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    const [flaggedEntities, setFlaggedEntities] = useState<Set<string>>(() => {
        // Load flags from localStorage on mount
        const stored = localStorage.getItem(`flags_${config.entityNamePlural}`);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    // Load comments from backend
    const loadCommentsFromBackend = useCallback(async (entityId: string) => {
        try {
            const params: any = {
                limit: 100,
                offset: 0,
                entityId: entityId,
            };

            if (config.entityName) {
                params.entityType = config.entityName.toLowerCase();
            }

            const response = await api.get<{
                success: boolean;
                activities: any[];
                total: number;
            }>("/activity", { params });

            if (response.success && response.activities) {
                // Filter comments (activities with action='commented')
                const commentActivities = response.activities.filter(
                    (act: any) => act.action === "commented"
                );

                // Transform to comment format
                const backendComments = commentActivities.map((act: any) => ({
                    id: act.id,
                    text: act.description || act.metadata?.comment || "",
                    user: act.userName || "Unknown User",
                    timestamp: act.createdAt,
                    avatar: undefined,
                }));

                // Merge with local comments (backend comments take precedence)
                const localComments = comments[entityId] || [];
                const mergedComments = [
                    ...backendComments,
                    ...localComments.filter(
                        (lc) => !backendComments.some((bc: Comment) => bc.id === lc.id)
                    ),
                ];

                // Sort by timestamp (newest first)
                mergedComments.sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                // Update comments state
                setComments((prevComments) => {
                    const updatedComments = {
                        ...prevComments,
                        [entityId]: mergedComments,
                    };

                    // Persist to localStorage
                    localStorage.setItem(
                        `comments_${config.entityNamePlural}`,
                        JSON.stringify(updatedComments)
                    );

                    return updatedComments;
                });
            }
        } catch (error: any) {
            console.error("❌ Error loading comments from backend:", error);
            // Don't show error toast for comments loading - it's not critical
        }
    }, [comments, config.entityName, config.entityNamePlural]);

    const loadActivities = useCallback(async (entityId?: string) => {
        try {
            setLoadingActivities(true);

            // Fetch activities from the backend
            const params: any = {
                limit: 50,
                offset: 0,
            };

            // Filter by entity type if available
            if (config.entityName) {
                params.entityType = config.entityName.toLowerCase();
            }

            // Filter by specific entity if ID provided
            if (entityId) {
                params.entityId = entityId;
            }

            const response = await api.get<{
                success: boolean;
                activities: any[];
                total: number;
            }>("/activity", { params });

            if (response.success && response.activities) {
                // Transform backend activities to match our Activity interface
                const transformedActivities: Activity[] = response.activities.map(
                    (act: any) => ({
                        id: act.id,
                        action: act.action || "updated",
                        entityName: act.entityName || config.entityName,
                        user: act.userName || "System",
                        userAvatar: act.userAvatar,
                        timestamp: act.createdAt,
                        details: act.description || act.metadata?.fieldsChanged?.join(", "),
                        type:
                            act.action === "created"
                                ? "create"
                                : act.action === "deleted"
                                    ? "delete"
                                    : act.action === "commented"
                                        ? "comment"
                                        : "update",
                    })
                );

                setActivities(transformedActivities);
            } else {
                setActivities([]);
            }
        } catch (error: any) {
            console.error("❌ Error loading activities:", error);
            toast({
                title: "Error",
                description: "Failed to load activity history",
                variant: "destructive",
            });
            setActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    }, [config.entityName]);

    // Auto-load activities when history is shown
    useEffect(() => {
        if (showHistory) {
            loadActivities();
        }
    }, [showHistory, loadActivities]);

    const toggleHistory = useCallback(() => {
        const newShowHistory = !showHistory;
        setShowHistory(newShowHistory);

        // If opening history panel and we're in edit view, set the selected entity
        if (newShowHistory && editingEntity && !selectedEntityForComments) {
            setSelectedEntityForComments(editingEntity.id);
            loadActivities(editingEntity.id);
            loadCommentsFromBackend(editingEntity.id);
        }
    }, [showHistory, editingEntity, selectedEntityForComments, loadActivities, loadCommentsFromBackend]);

    const handleAddComment = useCallback(async (entityId: string) => {
        if (!newComment.trim()) {
            toast({
                title: "Error",
                description: "Comment cannot be empty",
                variant: "destructive",
            });
            return;
        }

        if (!entityId) {
            toast({
                title: "Error",
                description: "No entity selected for comment",
                variant: "destructive",
            });
            return;
        }

        // Find the entity to get its name
        const entity =
            entities.find((e) => e.id === entityId) ||
            archivedEntities.find((e) => e.id === entityId);
        const entityName = entity?.name || entityId;
        const commentText = newComment.trim();

        console.log("📝 Posting comment:", {
            entityId,
            entityType: config.entityName,
            entityName,
            comment: commentText,
        });

        try {
            // Call backend API to post comment
            const response = await api.post<{
                success: boolean;
                message: string;
                comment: {
                    id: string;
                    text: string;
                    user: string;
                    timestamp: string;
                    entityId: string;
                    entityType: string;
                };
            }>("/activity/comment", {
                entityId: entityId,
                entityType: config.entityName,
                entityName: entityName,
                comment: commentText,
            });

            console.log("✅ Comment API response:", response);

            if (response && response.success && response.comment) {
                // Create comment object from backend response
                const commentObj: Comment = {
                    id: response.comment.id,
                    text: response.comment.text || commentText,
                    user: response.comment.user || "Unknown User",
                    timestamp: response.comment.timestamp || new Date().toISOString(),
                    avatar: undefined,
                };

                // Update state - use functional update to ensure React sees the change
                setComments((prevComments) => {
                    const prevEntityComments = prevComments[entityId] || [];
                    const updatedComments = {
                        ...prevComments,
                        [entityId]: [commentObj, ...prevEntityComments],
                    };

                    // Persist to localStorage
                    localStorage.setItem(
                        `comments_${config.entityNamePlural}`,
                        JSON.stringify(updatedComments)
                    );

                    return updatedComments;
                });

                // Clear input AFTER state update
                setNewComment("");

                // Reload comments from backend to ensure consistency
                await loadCommentsFromBackend(entityId);

                toast({
                    title: "Comment Posted",
                    description: "Your comment has been posted successfully",
                });
            } else {
                console.error("❌ Invalid response format:", response);
                throw new Error(
                    response?.message || "Failed to post comment - invalid response"
                );
            }
        } catch (error: any) {
            console.error("❌ Error posting comment:", error);
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Failed to post comment. Please try again.";

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
            });
        }
    }, [newComment, entities, archivedEntities, config.entityName, config.entityNamePlural, loadCommentsFromBackend]);

    const handleDeleteComment = useCallback((entityId: string, commentId: string) => {
        setComments((prevComments) => {
            const updatedComments = {
                ...prevComments,
                [entityId]: (prevComments[entityId] || []).filter((c) => c.id !== commentId),
            };

            // Persist to localStorage
            localStorage.setItem(
                `comments_${config.entityNamePlural}`,
                JSON.stringify(updatedComments)
            );

            return updatedComments;
        });

        toast({
            title: "Comment Deleted",
            description: "Comment has been removed",
        });
    }, [config.entityNamePlural]);

    const getEntityComments = useCallback((entityId: string): Comment[] => {
        return comments[entityId] || [];
    }, [comments]);

    const handleViewHistory = useCallback((entity: BaseEntity) => {
        setSelectedEntityForComments(entity.id);
        setShowHistory(true);
        loadActivities(entity.id);
        loadCommentsFromBackend(entity.id);
        toast({
            title: "History View",
            description: `Viewing history for ${entity.name}`,
        });
    }, [loadActivities, loadCommentsFromBackend]);

    const handleBookmark = useCallback((entity: BaseEntity) => {
        setBookmarkedEntities((prev) => {
            const newBookmarks = new Set(prev);

            if (newBookmarks.has(entity.id)) {
                newBookmarks.delete(entity.id);
                toast({
                    title: "Bookmark Removed",
                    description: `${entity.name} removed from bookmarks`,
                });
            } else {
                newBookmarks.add(entity.id);
                toast({
                    title: "Bookmarked",
                    description: `${entity.name} added to bookmarks`,
                });
            }

            // Persist to localStorage
            localStorage.setItem(
                `bookmarks_${config.entityNamePlural}`,
                JSON.stringify(Array.from(newBookmarks))
            );

            return newBookmarks;
        });
    }, [config.entityNamePlural]);

    const handleFlag = useCallback((entity: BaseEntity) => {
        setFlaggedEntities((prev) => {
            const newFlags = new Set(prev);

            if (newFlags.has(entity.id)) {
                newFlags.delete(entity.id);
                toast({
                    title: "Flag Removed",
                    description: `${entity.name} flag removed`,
                });
            } else {
                newFlags.add(entity.id);
                toast({
                    title: `${config.entityName} Flagged`,
                    description: `${entity.name} flagged for review`,
                });
            }

            // Persist to localStorage
            localStorage.setItem(
                `flags_${config.entityNamePlural}`,
                JSON.stringify(Array.from(newFlags))
            );

            return newFlags;
        });
    }, [config.entityName, config.entityNamePlural]);

    return {
        showHistory,
        setShowHistory,
        activities,
        loadingActivities,
        comments,
        newComment,
        setNewComment,
        selectedEntityForComments,
        setSelectedEntityForComments,
        bookmarkedEntities,
        flaggedEntities,
        loadActivities,
        toggleHistory,
        handleAddComment,
        handleDeleteComment,
        getEntityComments,
        handleViewHistory,
        handleBookmark,
        handleFlag,
    };
}
