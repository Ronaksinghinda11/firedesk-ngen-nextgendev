// src/components/generic/components/EntityHistoryDrawer.tsx
// Elegant timeline-style design

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Send } from "lucide-react";
import { EntityConfig } from "../types/entity.types";
import { formatTimestamp } from "../utils/entityHelpers";
import { AuditHistoryTab } from "@/components/audit";
import { commentApi, Comment as ApiComment } from "@/services/api/commentApi";
import { toast } from "sonner";

interface EntityHistoryDrawerProps {
    config: EntityConfig;
    selectedEntityForComments: string | null;
    selectedEntityName?: string;
    onToggleHistory: () => void;
}

export function EntityHistoryDrawer({
    config,
    selectedEntityForComments,
    selectedEntityName,
    onToggleHistory,
}: EntityHistoryDrawerProps) {
    const [activeTab, setActiveTab] = useState<'history' | 'comments'>('history');
    const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
    const [comments, setComments] = useState<ApiComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [posting, setPosting] = useState(false);

    // Automatically switch to 'selected' view when an entity is selected
    useEffect(() => {
        if (selectedEntityForComments) {
            setViewMode('selected');
        } else {
            setViewMode('all');
        }
    }, [selectedEntityForComments]);

    const getEntityType = useCallback((): string => {
        const entityName = config.entityName?.toLowerCase() || '';
        const mapping: Record<string, string> = {
            'asset': 'asset', 'plant': 'plant', 'user': 'user', 'role': 'role',
            'vendor': 'vendor', 'category': 'category', 'product': 'product',
            'scheduler': 'scheduler', 'incident': 'incident', 'incident type': 'incident_type',
            'incident subtype': 'incident_subtype', 'capa step': 'capa', 'capa': 'capa',
            'condition': 'condition', 'industry': 'industry', 'technician': 'user', 'manager': 'user',
        };
        return mapping[entityName] || entityName.replace(/\s+/g, '_');
    }, [config.entityName]);

    const entityType = getEntityType();

    const loadComments = useCallback(async () => {
        if (!selectedEntityForComments) { setComments([]); return; }
        setLoadingComments(true);
        try {
            const response = await commentApi.getComments(entityType, selectedEntityForComments);
            if (response.success && response.data) setComments(response.data.comments);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    }, [entityType, selectedEntityForComments]);

    useEffect(() => { loadComments(); }, [loadComments]);

    const handlePostComment = async () => {
        if (!newComment.trim() || !selectedEntityForComments) return;
        setPosting(true);
        try {
            const response = await commentApi.createComment(entityType, selectedEntityForComments, newComment.trim());
            if (response.success && response.data) {
                setComments(prev => [...prev, response.data!]);
                setNewComment("");
                toast.success("Comment added");
            }
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setPosting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const response = await commentApi.deleteComment(commentId);
            if (response.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                toast.success("Comment removed");
            }
        } catch (error) {
            toast.error("Failed to remove comment");
        }
    };

    const getInitials = (name: string) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

    const getAvatarColor = (name: string) => {
        const colors = ['#eab308', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    // Render comments content
    const renderCommentsContent = () => {
        if (loadingComments) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', gap: '12px' }}>
                            <Skeleton style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                            <div style={{ flex: 1 }}>
                                <Skeleton style={{ height: '14px', width: '200px', marginBottom: '8px' }} />
                                <Skeleton style={{ height: '14px', width: '100%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (!selectedEntityForComments) {
            return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <p style={{ fontSize: '14px' }}>Select a row to view activity</p>
                </div>
            );
        }

        if (comments.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                    <p style={{ fontSize: '14px' }}>No comments yet</p>
                </div>
            );
        }

        return (
            <div style={{ position: 'relative' }}>
                {/* Timeline Line */}
                <div style={{
                    position: 'absolute',
                    left: '15px',
                    top: '20px',
                    bottom: '20px',
                    width: '2px',
                    background: '#e5e7eb'
                }} />

                {/* Timeline Entries */}
                {comments.map((comment, index) => (
                    <div
                        key={comment.id}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            marginBottom: '20px',
                            position: 'relative'
                        }}
                    >
                        {/* Timeline Dot */}
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#6366f1',
                            border: '2px solid #fff',
                            marginTop: '5px',
                            marginLeft: '10px',
                            zIndex: 1
                        }} />

                        {/* Avatar */}
                        <Avatar style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                            <AvatarFallback style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                background: getAvatarColor(comment.created_by_name),
                                color: '#fff'
                            }}>
                                {getInitials(comment.created_by_name)}
                            </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                                    {comment.created_by_name || "Unknown"}
                                </span>
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    {formatTimestamp(comment.created_at)}
                                </span>
                            </div>
                            <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                                {comment.comment_text}
                            </p>
                        </div>

                        {/* Entry Number */}
                        <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                            #{index + 1}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderLeft: '1px solid #e5e7eb',
            background: '#fff'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: activeTab === 'history' ? 600 : 400,
                            color: activeTab === 'history' ? '#1f2937' : '#6b7280',
                            background: activeTab === 'history' ? '#f3f4f6' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('comments')}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: activeTab === 'comments' ? 600 : 400,
                            color: activeTab === 'comments' ? '#1f2937' : '#6b7280',
                            background: activeTab === 'comments' ? '#f3f4f6' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Comments {comments.length > 0 && `(${comments.length})`}
                    </button>
                </div>
                <button onClick={onToggleHistory} style={{
                    padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px' }}>
                {activeTab === 'history' ? (
                    <>
                        {/* History View Toggle */}
                        <div style={{
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            gap: '8px',
                            flexShrink: 0
                        }}>
                            <Button
                                variant={viewMode === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('all')}
                                style={{ flex: 1, fontSize: '13px', height: '32px' }}
                            >
                                All {config.entityNamePlural || 'Items'}
                            </Button>
                            <Button
                                variant={viewMode === 'selected' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('selected')}
                                disabled={!selectedEntityForComments}
                                style={{ flex: 1, fontSize: '13px', height: '32px' }}
                            >
                                Selected {selectedEntityForComments && '(1)'}
                            </Button>
                        </div>

                        {/* History info text */}
                        <div style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>
                            {viewMode === 'selected' && selectedEntityForComments ? (
                                <>Showing history for: <strong style={{ color: '#1f2937' }}>{selectedEntityName || config.entityName}</strong></>
                            ) : viewMode === 'selected' && !selectedEntityForComments ? (
                                <span style={{ color: '#f59e0b' }}>Select an item to view its history</span>
                            ) : (
                                <>Showing all <strong style={{ color: '#1f2937' }}>{config.entityNamePlural || config.entityName + 's'}</strong> history</>
                            )}
                        </div>
                        <AuditHistoryTab
                            entityType={entityType}
                            entityId={viewMode === 'selected' ? selectedEntityForComments || undefined : undefined}
                            className="flex-1 min-h-0"
                        />
                    </>
                ) : (
                    <>
                        {/* Commenting on Header */}
                        {selectedEntityForComments && (
                            <div style={{
                                marginBottom: '16px',
                                paddingBottom: '12px',
                                borderBottom: '1px solid #e5e7eb',
                                flexShrink: 0
                            }}>
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                    Commenting on: <strong style={{ color: '#1f2937' }}>{selectedEntityName || config.entityName}</strong>
                                </span>
                            </div>
                        )}
                        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                            {renderCommentsContent()}
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Comment Input - Fixed at bottom */}
            {activeTab === 'comments' && selectedEntityForComments && (
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #e5e7eb',
                    background: '#f9fafb'
                }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Input
                            placeholder="Add a comment."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handlePostComment())}
                            disabled={posting}
                            style={{
                                flex: 1,
                                height: '40px',
                                fontSize: '14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px'
                            }}
                        />
                        <button
                            onClick={handlePostComment}
                            disabled={!newComment.trim() || posting}
                            style={{
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: newComment.trim() ? '#6366f1' : '#e5e7eb',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: newComment.trim() ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <Send style={{ width: '18px', height: '18px', color: newComment.trim() ? '#fff' : '#9ca3af' }} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EntityHistoryDrawer;
