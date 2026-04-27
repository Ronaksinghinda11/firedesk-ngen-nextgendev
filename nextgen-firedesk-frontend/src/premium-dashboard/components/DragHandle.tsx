/**
 * DragHandle Component
 * Visual indicator for draggable widgets
 */

import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
    className?: string;
    isDragging?: boolean;
}

export default function DragHandle({ className, isDragging }: DragHandleProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center cursor-grab active:cursor-grabbing',
                'text-muted-foreground hover:text-foreground transition-colors',
                isDragging && 'cursor-grabbing text-primary',
                className
            )}
        >
            <GripVertical className="h-5 w-5" />
        </div>
    );
}
