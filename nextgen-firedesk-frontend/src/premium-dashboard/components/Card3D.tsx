/**
 * Card3D Component
 * Reusable 3D card wrapper with shadow effects
 */

import { cn } from '@/lib/utils';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card3D({ children, className }: Card3DProps) {
  const isFullHeight = className?.includes('h-full');

  return (
    <div className={cn("group relative", isFullHeight && "h-full")}>
      <div className={cn(
        'relative bg-card border border-border/50 rounded-2xl transition-all duration-300',
        'hover:border-border hover:shadow-lg',
        className
      )}>
        {children}
      </div>
      <div className="absolute -bottom-1 -right-1 w-full h-full bg-border/20 rounded-2xl -z-10 group-hover:-bottom-1.5 group-hover:-right-1.5 transition-all duration-300"></div>
    </div>
  );
}
