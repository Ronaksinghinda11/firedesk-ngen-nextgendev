import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // percentage
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 25,
  minLeftWidth = 15,
  maxLeftWidth = 50,
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Clamp the width between min and max
      const clampedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth);
      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
      {/* Left Panel */}
      <div
        style={{ width: `${leftWidth}%` }}
        className="overflow-hidden"
      >
        {leftPanel}
      </div>

      {/* Resizable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          group relative w-1 bg-gray-200 hover:bg-orange-400 transition-colors cursor-col-resize flex-shrink-0
          ${isDragging ? 'bg-orange-500' : ''}
        `}
      >
        {/* Drag Handle Icon */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className={`
            p-1 rounded bg-gray-300 group-hover:bg-orange-500 transition-colors
            ${isDragging ? 'bg-orange-600' : ''}
          `}>
            <GripVertical className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Wider hover area for easier grabbing */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      {/* Right Panel */}
      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="overflow-hidden"
      >
        {rightPanel}
      </div>
    </div>
  );
};
