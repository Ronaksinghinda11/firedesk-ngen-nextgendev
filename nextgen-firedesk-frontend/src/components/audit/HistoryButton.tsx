/**
 * History Button Component
 * 
 * A simple button that opens the HistorySheet. Use this on detail pages
 * to add quick access to entity history.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { HistorySheet } from './HistorySheet';
import type { EntityType, HistoryContext } from './HistoryViewer';
import { cn } from '@/lib/utils';

interface HistoryButtonProps {
    entityType: EntityType | string;
    entityId?: string;
    context?: HistoryContext;
    label?: string;
    variant?: 'default' | 'ghost' | 'outline' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export function HistoryButton({
    entityType,
    entityId,
    context = entityId ? 'ENTITY' : 'MODULE',
    label = 'History',
    variant = 'outline',
    size = 'sm',
    className,
}: HistoryButtonProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant={variant}
                size={size}
                onClick={() => setOpen(true)}
                className={cn('gap-1.5', className)}
            >
                <History className="h-4 w-4" />
                {size !== 'icon' && <span>{label}</span>}
            </Button>

            <HistorySheet
                open={open}
                onOpenChange={setOpen}
                context={context}
                entityType={entityType}
                entityId={entityId}
            />
        </>
    );
}

export default HistoryButton;
