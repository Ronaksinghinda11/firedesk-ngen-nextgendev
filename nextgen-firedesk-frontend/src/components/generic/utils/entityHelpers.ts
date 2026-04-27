// src/components/generic/utils/entityHelpers.ts
// Extracted from GenericEntityPage.tsx - Lines 1185-1229, 2602-2639

import { Plus, Pencil, Trash2, MessageSquare, Clock } from "lucide-react";
import React from "react";

/**
 * Get value from entity using field name.
 * Handles nested paths and reference fields (e.g., stateId -> stateName).
 * Extracted from GenericEntityPage.tsx lines 1185-1229
 */
export const getFieldValue = (entity: any, fieldName: string): any => {
    // For reference fields (fields ending in "Id"), try to resolve to display name first
    // e.g., if field is "stateId", check for "stateName" in the entity
    if (fieldName.endsWith('Id')) {
        const baseFieldName = fieldName.slice(0, -2); // Remove "Id" suffix
        const displayNameField = `${baseFieldName}Name`;

        // Check if entity has a corresponding Name field
        if (entity[displayNameField]) {
            return entity[displayNameField];
        }

        // Also check capitalized version (e.g., "State.stateName" for nested)
        const capitalizedName = baseFieldName.charAt(0).toUpperCase() + baseFieldName.slice(1);
        if (entity[capitalizedName] && entity[capitalizedName].name) {
            return entity[capitalizedName].name;
        }
        if (entity[capitalizedName] && entity[capitalizedName][`${baseFieldName}Name`]) {
            return entity[capitalizedName][`${baseFieldName}Name`];
        }
    }

    // Handle nested field paths (e.g., "user.name")
    const parts = fieldName.split('.');
    let value = entity;

    for (const part of parts) {
        if (value && typeof value === 'object') {
            value = value[part];
        } else {
            return '';
        }
    }

    // Format dates
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-'))) {
        try {
            return new Date(value).toLocaleDateString();
        } catch {
            return value;
        }
    }

    return value;
};

/**
 * CSV Escape Helper - properly escape CSV values.
 * Extracted from GenericEntityPage.tsx lines 1157-1182
 */
export const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
        return '';
    }

    // Convert to string
    let strValue = String(value);

    // Handle arrays and objects
    if (typeof value === 'object' && !Array.isArray(value)) {
        strValue = JSON.stringify(value);
    } else if (Array.isArray(value)) {
        strValue = value.join(', ');
    }

    // Escape quotes by doubling them
    strValue = strValue.replace(/"/g, '""');

    // Wrap in quotes if contains comma, newline, or quote
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue}"`;
    }

    return strValue;
};

/**
 * Format timestamp to relative time string.
 * Extracted from GenericEntityPage.tsx lines 2617-2631
 */
export const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
        return date.toLocaleDateString();
    }
};

/**
 * Get user initials from name string.
 * Extracted from GenericEntityPage.tsx lines 2633-2639
 */
export const getUserInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
};

/**
 * Get activity icon based on type.
 * Extracted from GenericEntityPage.tsx lines 2602-2615
 */
export const getActivityIcon = (type: string): React.ReactNode => {
    switch (type) {
        case "create":
            return React.createElement(Plus, { className: "h-4 w-4 text-green-500" });
        case "update":
            return React.createElement(Pencil, { className: "h-4 w-4 text-blue-500" });
        case "delete":
            return React.createElement(Trash2, { className: "h-4 w-4 text-red-500" });
        case "comment":
            return React.createElement(MessageSquare, { className: "h-4 w-4 text-purple-500" });
        default:
            return React.createElement(Clock, { className: "h-4 w-4 text-gray-500" });
    }
};
