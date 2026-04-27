/**
 * Comments API Service
 * Frontend API calls for entity comments
 */

import { api } from '@/lib/api';

export interface Comment {
    id: string;
    entity_type: string;
    entity_id: string;
    comment_text: string;
    created_by: string;
    created_by_name: string;
    created_at: string;
    updated_at: string;
    is_edited: boolean;
    edited_at?: string;
}

export interface CommentsResponse {
    success: boolean;
    data?: {
        comments: Comment[];
        total: number;
        hasMore: boolean;
    };
    error?: string;
}

export interface CreateCommentResponse {
    success: boolean;
    data?: Comment;
    error?: string;
}

export const commentApi = {
    /**
     * Get comments for an entity
     */
    async getComments(
        entityType: string,
        entityId: string,
        options: { limit?: number; offset?: number; order?: 'ASC' | 'DESC' } = {}
    ): Promise<CommentsResponse> {
        const { limit = 50, offset = 0, order = 'ASC' } = options;
        return api.get<CommentsResponse>(`/comments/${entityType}/${entityId}`, {
            params: { limit, offset, order }
        });
    },

    /**
     * Create a new comment
     */
    async createComment(
        entityType: string,
        entityId: string,
        text: string
    ): Promise<CreateCommentResponse> {
        return api.post<CreateCommentResponse>(`/comments/${entityType}/${entityId}`, { text });
    },

    /**
     * Update a comment
     */
    async updateComment(
        commentId: string,
        text: string
    ): Promise<CreateCommentResponse> {
        return api.put<CreateCommentResponse>(`/comments/${commentId}`, { text });
    },

    /**
     * Delete a comment
     */
    async deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
        return api.delete<{ success: boolean; error?: string }>(`/comments/${commentId}`);
    }
};

export default commentApi;
