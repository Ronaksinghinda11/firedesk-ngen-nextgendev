import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    className,
    size = 'md',
    text
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    return (
        <div className={cn("flex flex-col items-center justify-center p-8 w-full h-full min-h-[150px]", className)}>
            <Loader2 className={cn("text-primary animate-spin", sizeClasses[size])} />
            {text && <p className="mt-2 text-sm text-muted-foreground font-medium">{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
