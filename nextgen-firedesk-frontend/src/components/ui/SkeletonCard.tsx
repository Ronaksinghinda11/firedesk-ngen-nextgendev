import React from 'react';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 animate-pulse ${className}`}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="w-14 h-14 rounded-full bg-gray-200" />
      </div>

      {/* Live data line */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gray-200" />
        <div className="h-3 w-28 bg-gray-100 rounded" />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Section rows */}
      <div className="space-y-3">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-5 w-12 bg-gray-200 rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-5 w-12 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* More rows */}
      <div className="h-px bg-gray-100" />
      <div className="space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
      </div>

      {/* View More skeleton */}
      <div className="mt-auto pt-2 border-t border-gray-100">
        <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
      </div>
    </div>
  );
}

export default SkeletonCard;
