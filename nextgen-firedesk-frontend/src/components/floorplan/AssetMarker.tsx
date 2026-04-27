import React from "react";
import { FireExtinguisher, Droplets, Cog, Box } from 'lucide-react';
import type { Asset } from "@/data/mockFloorplanAssets";
import { statusConfig } from "@/data/mockFloorplanAssets";

interface AssetMarkerProps {
  asset: Asset;
  isSelected?: boolean;
  isActive?: boolean;  // Whether popup is showing for this asset
  scale?: number;
  onClick?: (asset: Asset, screenPos: { x: number; y: number }) => void;
  onHover?: (asset: Asset, screenPos: { x: number; y: number }) => void;
  onHoverEnd?: () => void;
}

export const AssetMarker: React.FC<AssetMarkerProps> = ({
  asset,
  isSelected = false,
  isActive = false,
  scale = 1,
  onClick,
  onHover,
  onHoverEnd
}) => {
  // Convert coordinates to numbers if they're strings
  const xCoord = typeof asset.x === 'string' ? parseFloat(asset.x) : asset.x;
  const yCoord = typeof asset.y === 'string' ? parseFloat(asset.y) : asset.y;

  // Validate asset coordinates
  const isValidCoordinates = asset &&
    typeof xCoord === 'number' &&
    typeof yCoord === 'number' &&
    !isNaN(xCoord) &&
    !isNaN(yCoord);

  // Get status color
  const statusColor = statusConfig[asset.status]?.color || "#6b7280";

  // Get icon component based on asset type
  const getAssetIconComponent = (type: string) => {
    const lowerType = (type || "").toLowerCase();

    // Category: Fire Extinguisher
    const extinguisherTypes = [
      'fire extinguisher', 'extinguisher',
      'powder', 'co2', 'foam', 'water', 'dcp', 'clean agent', 'wet chemical',
      'halon', 'fe', 'portable'
    ];
    if (extinguisherTypes.some(t => lowerType.includes(t))) return FireExtinguisher;

    // Category: Fire Hydrant
    const hydrantTypes = [
      'fire hydrant', 'hydrant', 'valve', 'hose', 'reel', 'coupling', 'branch', 'nozzle', 'cabinet'
    ];
    if (hydrantTypes.some(t => lowerType.includes(t))) return Droplets;

    // Category: Pump Room
    const pumpTypes = [
      'pump', 'jockey', 'diesel', 'electric', 'booster', 'sprinkler', 'pressure'
    ];
    if (pumpTypes.some(t => lowerType.includes(t))) return Cog;

    // Fallback
    return Box;
  };

  const IconComponent = getAssetIconComponent(asset.type);

  // Calculate sizes based on scale
  // Pin size should be consistent, maybe scale slightly on zoom but not linearly
  const pinScale = Math.min(Math.max(scale, 0.5), 2); // Limit scale range

  // Marker style based on state
  const getMarkerStyle = () => {
    const baseStyle = {
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' // Always have a shadow for pins
    };

    if (isSelected || isActive) {
      return {
        ...baseStyle,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
        transform: `scale(${1.2})`, // Scale up when selected/active
        zIndex: 10
      };
    }

    return baseStyle;
  };

  // Get screen position from element
  const getScreenPosition = (e: React.MouseEvent) => {
    const rect = (e.target as Element).getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2, // Center horizontally
      y: rect.top // Top of the pin (head) roughly
    };
  };

  // Click handler
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(asset, getScreenPosition(e));
  };

  // Hover handler
  const handleMouseEnter = (e: React.MouseEvent) => {
    onHover?.(asset, getScreenPosition(e));
  };

  // Hover end handler
  const handleMouseLeave = () => {
    onHoverEnd?.();
  };

  // Return null if coordinates are invalid
  if (!isValidCoordinates) {
    return null;
  }

  return (
    <g transform={`translate(${xCoord}, ${yCoord})`}>
      {/* Pulse animation for critical/selected assets just at the base */}
      {(asset.status === 'red' || isSelected) && (
        <ellipse
          cx="0"
          cy="0"
          rx={8 * pinScale}
          ry={4 * pinScale}
          fill={statusColor}
          opacity="0.4"
          className="animate-ping"
        />
      )}

      {/* Main marker Group */}
      <g
        style={{
          ...getMarkerStyle(),
          pointerEvents: 'auto'
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Pin Shape */}
        <g transform={`scale(${pinScale})`}>
          <path
            d="M 0 0 C -4 -10 -15 -15 -15 -30 A 15 15 0 1 1 15 -30 C 15 -15 4 -10 0 0 Z"
            fill={statusColor}
            stroke={statusColor}
            strokeWidth="1"
          />

          {/* Icon - White SVG 
              Pin head center is roughly (0, -30). Icon size 18.
              Translate to center: x = -9, y = -30 - 9 = -39.
          */}
          <g transform="translate(-9, -39)">
            <IconComponent
              size={18}
              color="white"
              strokeWidth={2.5}
            />
          </g>
        </g>
      </g>
    </g >
  );
};