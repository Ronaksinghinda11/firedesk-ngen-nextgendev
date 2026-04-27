/**
 * History Sheet Component
 * 
 * A Sheet/Drawer wrapper for HistoryViewer, making it easy to add history viewing
 * to any page with minimal code.
 */

import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { HistoryViewer, type EntityType, type HistoryContext } from './HistoryViewer';

// ============== Types ==============

interface HistorySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    context: HistoryContext;
    entityType?: EntityType | string;
    entityId?: string;
    userId?: string;
    title?: string;
    description?: string;
}

// ============== Component ==============

export function HistorySheet({
    open,
    onOpenChange,
    context,
    entityType,
    entityId,
    userId,
    title,
    description,
}: HistorySheetProps) {
    const defaultTitle = context === 'MODULE'
        ? `${entityType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} History`
        : context === 'USER'
            ? 'User Activity'
            : 'History';

    const defaultDescription = context === 'MODULE'
        ? `View all changes made to ${entityType?.replace(/_/g, ' ')}s`
        : context === 'ENTITY'
            ? 'View all changes made to this item'
            : 'View activity history';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="px-6 pt-6 pb-0">
                    <SheetTitle className="text-lg">{title || defaultTitle}</SheetTitle>
                    <SheetDescription className="text-xs">
                        {description || defaultDescription}
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 px-6 pb-6 overflow-hidden">
                    <HistoryViewer
                        context={context}
                        entityType={entityType}
                        entityId={entityId}
                        userId={userId}
                        className="h-full"
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default HistorySheet;
