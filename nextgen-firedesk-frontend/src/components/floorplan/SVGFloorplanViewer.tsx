import { useRef, useEffect, useState, useCallback } from "react";
import { AssetMarker } from "./AssetMarker";
import { AssetPopup } from "./AssetPopup";
import { FloorplanNavigator } from "./FloorplanNavigator";
import type { Layout } from "@/lib/api";
import type { Asset } from "@/data/mockFloorplanAssets";
import { statusConfig } from "@/data/mockFloorplanAssets";
import {
  getSvgViewBox,
  calculateOptimalZoom,
} from "@/lib/floorplanUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Expand, Shrink, Plus, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


type AdminMode = 'navigation' | 'drag' | 'create';

interface FilterState {
  type?: string | string[];
  status?: string | string[];
  health?: string | string[];
  location?: string | string[];
  category?: string | string[];
  searchTerm?: string;
  // Dynamic metadata filters (e.g., metadata_capacity, metadata_productName, etc.)
  [key: string]: string | string[] | undefined;
}

interface SVGFloorplanViewerProps {
  svgUrl: string;
  assets: Asset[];
  allAssets?: Asset[]; // All assets for filter options
  onAssetClick?: (asset: Asset) => void;
  selectedAsset?: Asset | null;
  enablePanZoom?: boolean;
  className?: string;
  // Admin mode props
  isAdminMode?: boolean;
  currentMode?: AdminMode;
  isDragMode?: boolean;
  isCreatingAsset?: boolean;
  onAssetDrag?: (asset: Asset, newCoords: { x: number, y: number }) => void;
  onAssetDragEnd?: (asset: Asset, newCoords: { x: number, y: number }) => void;
  onFloorplanClick?: (coords: { x: number, y: number }) => void;
  onModeChange?: (mode: AdminMode) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  // Fullscreen filter props
  onFilterChange?: (filters: FilterState) => void;
  currentFilters?: FilterState;
  currentLayout?: Layout | null;
  plantId?: string;
  isReadOnly?: boolean;
}

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

export const SVGFloorplanViewer: React.FC<SVGFloorplanViewerProps> = ({
  svgUrl,
  assets,
  allAssets = [],
  onAssetClick,
  selectedAsset,
  enablePanZoom = true,
  className = "",
  // Admin mode props
  isAdminMode = false,
  currentMode = 'navigation',
  isDragMode = false,
  isCreatingAsset = false,
  onAssetDrag,
  onAssetDragEnd,
  onFloorplanClick,
  onModeChange,
  onFullscreenChange,
  // Fullscreen filter props
  onFilterChange,
  currentFilters = {},
  currentLayout,
  plantId,
  isReadOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const floorplanRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placementPreview, setPlacementPreview] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Store actual SVG dimensions parsed from the loaded content
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // Hover/click state for HTML popup
  const [hoveredAsset, setHoveredAsset] = useState<Asset | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPopupPinned, setIsPopupPinned] = useState(false);  // True if opened by click, false if by hover

  const { toast } = useToast();

  // Debug assets received by SVGFloorplanViewer
  useEffect(() => {
    console.log('🖼️ SVGFloorplanViewer received assets:', assets.length);
    console.log('🗺️ Assets to render:', assets);
  }, [assets]);

  // Load SVG content
  useEffect(() => {
    const loadSvg = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(svgUrl);
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.status}`);
        }

        const text = await response.text();
        setSvgContent(text);

        // Parse SVG to extract actual dimensions
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(text, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (svgElement) {
          // Try to get viewBox first (most reliable)
          const viewBoxAttr = svgElement.getAttribute('viewBox');
          if (viewBoxAttr) {
            const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
            if (parts.length >= 4) {
              setSvgDimensions({ width: parts[2], height: parts[3] });
              console.log('📐 Parsed SVG viewBox dimensions:', parts[2], 'x', parts[3]);
            }
          } else {
            // Fallback to width/height attributes
            const widthAttr = svgElement.getAttribute('width');
            const heightAttr = svgElement.getAttribute('height');
            const width = widthAttr ? parseFloat(widthAttr) : 800;
            const height = heightAttr ? parseFloat(heightAttr) : 600;
            setSvgDimensions({ width, height });
            console.log('📐 Parsed SVG dimensions from attributes:', width, 'x', height);
          }
        }
      } catch (err) {
        console.error('SVG loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load floorplan');
        toast({
          title: "Error",
          description: "Failed to load floorplan. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (svgUrl) {
      loadSvg();
    }
  }, [svgUrl, toast]);

  // Initialize view when SVG loads
  useEffect(() => {
    if (svgContent && containerRef.current && svgDimensions.width > 0) {
      try {
        const container = containerRef.current;

        // Wait a bit for container to be fully rendered
        const initializeView = (attempts = 0) => {
          try {
            const containerRect = container.getBoundingClientRect();

            // If container has no dimensions, retry up to 5 times
            if ((containerRect.width === 0 || containerRect.height === 0) && attempts < 5) {
              setTimeout(() => initializeView(attempts + 1), 200);
              return;
            }

            const containerWidth = containerRect.width || 1000;
            const containerHeight = containerRect.height || 600;

            // Use actual SVG dimensions from parsed content
            const optimalScale = calculateOptimalZoom(
              containerWidth,
              containerHeight,
              svgDimensions.width,
              svgDimensions.height
            );

            // Center the SVG properly
            const centerX = (containerWidth - svgDimensions.width * optimalScale) / 2;
            const centerY = (containerHeight - svgDimensions.height * optimalScale) / 2;

            console.log('📍 Fit calculation:', {
              container: { width: containerWidth, height: containerHeight },
              svg: svgDimensions,
              scale: optimalScale,
              center: { x: centerX, y: centerY }
            });

            setTransform({
              scale: optimalScale,
              translateX: centerX,
              translateY: centerY
            });
          } catch (error) {
            console.error('Error initializing SVG view:', error);
            setTransform({ scale: 1, translateX: 0, translateY: 0 });
          }
        };

        setTimeout(() => initializeView(), 100);
      } catch (error) {
        console.error('Error in SVG initialization:', error);
        setError('Failed to initialize floorplan view');
      }
    }
  }, [svgContent, svgDimensions]);

  // Zoom functionality
  const handleZoom = useCallback((delta: number, centerPoint?: { x: number; y: number }) => {
    if (!enablePanZoom || !containerRef.current) return;

    setTransform(prev => {
      const newScale = Math.max(0.1, Math.min(5, prev.scale + delta));
      const scaleRatio = newScale / prev.scale;

      let newTranslateX = prev.translateX;
      let newTranslateY = prev.translateY;

      if (centerPoint) {
        // Zoom towards the center point
        newTranslateX = centerPoint.x - (centerPoint.x - prev.translateX) * scaleRatio;
        newTranslateY = centerPoint.y - (centerPoint.y - prev.translateY) * scaleRatio;
      }

      return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
      };
    });
  }, [enablePanZoom]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enablePanZoom) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const rect = containerRef.current?.getBoundingClientRect();

    if (rect) {
      const centerPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      handleZoom(delta, centerPoint);
    }
  }, [enablePanZoom, handleZoom]);

  // Fullscreen functionality
  const toggleFullscreen = useCallback(async () => {
    if (!floorplanRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await floorplanRef.current.requestFullscreen();
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast({
        title: "Fullscreen Error",
        description: "Unable to enter fullscreen mode",
        variant: "destructive",
      });
    }
  }, [onFullscreenChange, toast]);

  // Listen for fullscreen changes (e.g., ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      onFullscreenChange?.(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  // Auto-fit view when fullscreen mode changes
  useEffect(() => {
    if (!containerRef.current || !svgContent || svgDimensions.width <= 0) return;

    // Use a small delay to allow the container to fully resize after fullscreen change
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      // Skip if container is not yet ready
      if (containerRect.width === 0 || containerRect.height === 0) return;

      const optimalScale = calculateOptimalZoom(
        containerRect.width,
        containerRect.height,
        svgDimensions.width,
        svgDimensions.height
      );

      const centerX = (containerRect.width - svgDimensions.width * optimalScale) / 2;
      const centerY = (containerRect.height - svgDimensions.height * optimalScale) / 2;

      console.log('📺 Fullscreen fit calculation:', {
        isFullscreen,
        container: { width: containerRect.width, height: containerRect.height },
        svg: svgDimensions,
        scale: optimalScale,
        center: { x: centerX, y: centerY }
      });

      setTransform({
        scale: optimalScale,
        translateX: centerX,
        translateY: centerY
      });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [isFullscreen, svgContent, svgDimensions]);

  // Handle floorplan click (admin mode) or pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left click

    // In admin mode with asset creation, handle click-to-place
    if (isAdminMode && isCreatingAsset && !isReadOnly) {
      e.preventDefault();
      e.stopPropagation();

      if (svgRef.current && containerRef.current) {
        // Get container bounds for proper coordinate calculation
        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate relative position within the container
        const relativeX = e.clientX - containerRect.left;
        const relativeY = e.clientY - containerRect.top;

        // Account for the transform (scale and translation)
        const svgX = (relativeX - transform.translateX) / transform.scale;
        const svgY = (relativeY - transform.translateY) / transform.scale;

        onFloorplanClick?.({ x: svgX, y: svgY });
      }
      return;
    }

    // Normal pan functionality
    if (!enablePanZoom) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.translateX, y: e.clientY - transform.translateY });
    e.preventDefault();
  }, [enablePanZoom, transform, isAdminMode, isCreatingAsset, onFloorplanClick]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Handle placement preview in admin mode
    if (isAdminMode && isCreatingAsset && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate relative position within the container
      const relativeX = e.clientX - containerRect.left;
      const relativeY = e.clientY - containerRect.top;

      // Account for the transform (scale and translation)
      const svgX = (relativeX - transform.translateX) / transform.scale;
      const svgY = (relativeY - transform.translateY) / transform.scale;

      setPlacementPreview({ x: svgX, y: svgY });
    }

    // Handle panning
    if (!isPanning || !enablePanZoom) return;

    setTransform(prev => ({
      ...prev,
      translateX: e.clientX - panStart.x,
      translateY: e.clientY - panStart.y
    }));
  }, [isPanning, enablePanZoom, panStart, isAdminMode, isCreatingAsset, transform]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enablePanZoom) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enablePanZoom, handleWheel, handleMouseMove, handleMouseUp]);

  // Reset view / Fit to window
  const fitToWindow = useCallback(() => {
    if (!containerRef.current || svgDimensions.width <= 0) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    if (containerRect.width === 0 || containerRect.height === 0) return;

    const optimalScale = calculateOptimalZoom(
      containerRect.width,
      containerRect.height,
      svgDimensions.width,
      svgDimensions.height
    );

    const centerX = (containerRect.width - svgDimensions.width * optimalScale) / 2;
    const centerY = (containerRect.height - svgDimensions.height * optimalScale) / 2;

    console.log('🔲 Fit to window:', {
      container: { width: containerRect.width, height: containerRect.height },
      svg: svgDimensions,
      scale: optimalScale,
      center: { x: centerX, y: centerY }
    });

    setTransform({
      scale: optimalScale,
      translateX: centerX,
      translateY: centerY
    });
  }, [svgDimensions]);

  // Reset view (alias for fitToWindow)
  const resetView = fitToWindow;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full bg-muted/30 ${className}`}>
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading floorplan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-muted/30 ${className}`}>
        <div className="text-center space-y-4 p-8">
          <div className="text-red-500">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">Failed to Load Floorplan</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} size="sm">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={floorplanRef}
      className={`relative h-full min-h-[400px] overflow-hidden ${className} ${isFullscreen ? 'bg-white' : 'bg-muted/30'
        }`}
    >
      {/* Current Mode Indicator - Only show in create mode */}
      {isAdminMode && currentMode === 'create' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <Badge variant="secondary" className="px-3 py-1 bg-background/90 backdrop-blur-sm">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Creation Mode
            </span>
          </Badge>
        </div>
      )}

      {/* Zoom Control Panel */}
      {enablePanZoom && (
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleZoom(0.2)}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => handleZoom(-0.2)}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={resetView}
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={fitToWindow}
            title="Fit to Window"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Fullscreen Filter Panel - Horizontal Bar Layout */}
      {isFullscreen && (
        <div className="absolute top-4 left-4 right-20 z-30 flex flex-col gap-2">
          {/* Top Row: Navigation + Category Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Navigation */}
            <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1 px-3">
              <FloorplanNavigator
                currentLayout={currentLayout || null}
                plantId={plantId}
                className="text-sm"
                titleClassName="text-base"
                usePortal={false}
              />
            </div>

            {/* Category Buttons - Horizontal Row */}
            {allAssets.length > 0 && (
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                <span className="text-xs font-medium text-muted-foreground px-2">Category:</span>
                {Array.from(new Set(allAssets.map(a => (a.metadata as any)?.category || 'Unknown')))
                  .sort()
                  .map((category: unknown) => {
                    const catName = String(category);
                    const isActive = currentFilters.category
                      ? Array.isArray(currentFilters.category)
                        ? currentFilters.category.includes(catName)
                        : currentFilters.category === catName
                      : false;

                    return (
                      <Button
                        key={catName}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          // Single select for category - clicking same clears it
                          if (isActive) {
                            onFilterChange?.({ ...currentFilters, category: undefined });
                          } else {
                            onFilterChange?.({ ...currentFilters, category: catName });
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        {catName.length > 20 ? catName.substring(0, 20) + '...' : catName}
                      </Button>
                    );
                  })}
              </div>
            )}

            {/* Health Status Buttons */}
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
              <span className="text-xs font-medium text-muted-foreground px-2">Health:</span>
              {Object.entries(statusConfig).map(([key, config]) => {
                const isActive = currentFilters.health
                  ? Array.isArray(currentFilters.health)
                    ? currentFilters.health.includes(key)
                    : currentFilters.health === key
                  : false;

                return (
                  <Button
                    key={key}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const currentHealth = currentFilters.health;
                      let newHealth: string | string[] | undefined;

                      if (!currentHealth) {
                        newHealth = [key];
                      } else {
                        const currentArray = Array.isArray(currentHealth) ? currentHealth : [currentHealth];
                        if (currentArray.includes(key)) {
                          newHealth = currentArray.filter(h => h !== key);
                          if (newHealth.length === 0) newHealth = undefined;
                        } else {
                          newHealth = [...currentArray, key];
                        }
                      }

                      onFilterChange?.({ ...currentFilters, health: newHealth });
                    }}
                    className="h-7 text-xs flex items-center gap-1.5"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </Button>
                );
              })}
            </div>

            {/* Results & Clear */}
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{assets.length}</span>/{allAssets.length}
              </span>
              {Object.values(currentFilters).filter(v => v !== undefined).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchValue("");
                    onFilterChange?.({});
                  }}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Dynamic Category-Specific Filters Row */}
          {currentFilters.category && (() => {
            // Get the selected category (single select)
            const selectedCategory = Array.isArray(currentFilters.category)
              ? currentFilters.category[0]
              : currentFilters.category;

            // Check if Fire Extinguisher is selected (case insensitive, handles plural)
            const isFireExtinguisher = selectedCategory?.toLowerCase().startsWith('fire extinguisher');

            // Get assets filtered by category
            const categoryAssets = allAssets.filter(a => {
              const assetCategory = (a.metadata as any)?.category || 'Unknown';
              return assetCategory.toLowerCase() === selectedCategory?.toLowerCase();
            });

            // Define filter fields based on category
            const getFilterFields = () => {
              if (isFireExtinguisher) {
                return [
                  { key: 'productName', label: 'Product Name', metadataKey: 'productName' },
                  { key: 'make', label: 'Make', metadataKey: 'make' },
                  { key: 'assetType', label: 'Type', metadataKey: 'type' },
                  { key: 'subType', label: 'Sub Type', metadataKey: 'subType' },
                  { key: 'capacity', label: 'Capacity', metadataKey: 'capacity' },
                  { key: 'age', label: 'Age', metadataKey: 'age' },
                  { key: 'condition', label: 'Condition', metadataKey: 'condition' },
                  { key: 'fireRating', label: 'Fire Rating', metadataKey: 'fireRating' },
                  { key: 'serviceStatus', label: 'Service Status', metadataKey: 'serviceStatus' },
                ];
              }

              // Check if Fire Hydrant is selected (case insensitive, handles plural)
              const isFireHydrant = selectedCategory?.toLowerCase().startsWith('fire hydrant');
              if (isFireHydrant) {
                return [
                  { key: 'productName', label: 'Product', metadataKey: 'productName' },
                  { key: 'assetType', label: 'Type', metadataKey: 'type' },
                  { key: 'subType', label: 'Sub Type', metadataKey: 'subType' },
                  { key: 'serviceStatus', label: 'Service Status', metadataKey: 'serviceStatus' },
                  { key: 'condition', label: 'Condition', metadataKey: 'condition' },
                  { key: 'healthStatus', label: 'Health Status', metadataKey: 'healthStatus' },
                  { key: 'make', label: 'Make', metadataKey: 'make' },
                ];
              }

              // Default filters for other categories
              return [
                { key: 'productName', label: 'Product Name', metadataKey: 'productName' },
                { key: 'assetType', label: 'Type', metadataKey: 'type' },
              ];
            };

            const filterFields = getFilterFields();

            // Extract unique values for each filter field from assets (for fallback)
            const getUniqueValues = (metadataKey: string) => {
              const values = new Set<string>();
              categoryAssets.forEach(asset => {
                const value = (asset.metadata as any)?.[metadataKey];
                if (value && typeof value === 'string' && value.trim()) {
                  values.add(value);
                }
              });
              return Array.from(values).sort();
            };

            // Progressive filtering: For each filter, show only values that exist in assets 
            // that match ALL previously selected filters
            const getProgressivelyFilteredAssets = () => {
              let filteredAssets = [...categoryAssets];

              // Apply each active metadata filter progressively
              for (const field of filterFields) {
                const filterKey = `metadata_${field.metadataKey}`;
                const filterValue = (currentFilters as any)[filterKey];

                if (filterValue) {
                  const filterArray = Array.isArray(filterValue) ? filterValue : [filterValue];
                  filteredAssets = filteredAssets.filter(asset => {
                    const assetValue = (asset.metadata as any)?.[field.metadataKey];
                    if (!assetValue) return false;
                    return filterArray.some(v =>
                      String(assetValue).toLowerCase() === String(v).toLowerCase()
                    );
                  });
                }
              }

              return filteredAssets;
            };

            // Get unique values for a field, considering other active filters
            const getFilteredUniqueValues = (metadataKey: string, excludeKey: string) => {
              // Get assets filtered by all OTHER metadata filters (not the current one)
              let relevantAssets = [...categoryAssets];

              for (const field of filterFields) {
                if (field.metadataKey === excludeKey) continue; // Skip the current filter

                const filterKey = `metadata_${field.metadataKey}`;
                const filterValue = (currentFilters as any)[filterKey];

                if (filterValue) {
                  const filterArray = Array.isArray(filterValue) ? filterValue : [filterValue];
                  relevantAssets = relevantAssets.filter(asset => {
                    const assetValue = (asset.metadata as any)?.[field.metadataKey];
                    if (!assetValue) return false;
                    return filterArray.some(v =>
                      String(assetValue).toLowerCase() === String(v).toLowerCase()
                    );
                  });
                }
              }

              // Now extract unique values from remaining assets
              const values = new Set<string>();
              relevantAssets.forEach(asset => {
                const value = (asset.metadata as any)?.[metadataKey];
                if (value && typeof value === 'string' && value.trim()) {
                  values.add(value);
                }
              });
              return Array.from(values).sort();
            };

            return (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-foreground bg-primary/10 rounded-lg px-3 py-1.5">
                  Filters for: {selectedCategory}
                </span>

                {filterFields.map(field => {
                  // Get filtered unique values considering other active filters
                  const uniqueValues = getFilteredUniqueValues(field.metadataKey, field.metadataKey);

                  if (uniqueValues.length === 0) return null;

                  // Check current selected values
                  const filterKey = `metadata_${field.metadataKey}` as keyof FilterState;
                  const currentValue = (currentFilters as any)[filterKey];
                  const currentArray = currentValue
                    ? (Array.isArray(currentValue) ? currentValue : [currentValue])
                    : [];
                  const selectedCount = currentArray.length;

                  // Format selected values for display
                  const getDisplayText = () => {
                    if (selectedCount === 0) return null;
                    if (selectedCount === 1) return currentArray[0];
                    if (selectedCount === 2) return currentArray.join(', ');
                    return `${currentArray[0]}, ${currentArray[1]} +${selectedCount - 2}`;
                  };
                  const displayText = getDisplayText();

                  return (
                    <DropdownMenu key={field.key}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 text-xs gap-1 shadow-lg border ${selectedCount > 0
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-background/95 backdrop-blur-sm'
                            }`}
                        >
                          <span className="font-medium">{field.label}:</span>
                          {selectedCount > 0 ? (
                            <span className="max-w-[120px] truncate">
                              {displayText}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">(All)</span>
                          )}
                          <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        portal={false}
                        className="max-h-60 overflow-y-auto min-w-[150px] z-[100]"
                      >
                        {uniqueValues.map(value => {
                          const isActive = currentArray.includes(value);

                          return (
                            <DropdownMenuCheckboxItem
                              key={value}
                              checked={isActive}
                              onCheckedChange={(checked) => {
                                const newFilters = { ...currentFilters };

                                if (checked) {
                                  // Add to array
                                  (newFilters as any)[filterKey] = [...currentArray, value];
                                } else {
                                  // Remove from array
                                  const newArray = currentArray.filter(v => v !== value);
                                  if (newArray.length === 0) {
                                    delete (newFilters as any)[filterKey];
                                  } else {
                                    (newFilters as any)[filterKey] = newArray;
                                  }
                                }

                                onFilterChange?.(newFilters);
                              }}
                              className="text-xs"
                            >
                              {value}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )
      }

      {/* SVG Container */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[400px] relative"
        onMouseDown={handleMouseDown}
        onClick={() => {
          // Click anywhere on container dismisses popup
          if (hoveredAsset) {
            setHoveredAsset(null);
            setIsPopupPinned(false);
          }
        }}
        style={{
          cursor: isCreatingAsset
            ? 'crosshair'
            : isPanning
              ? 'grabbing'
              : 'grab'
        }}
      >
        {/* Layer 1: SVG Floorplan (bottom layer) */}
        <div
          data-floorplan-container
          style={{
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="pointer-events-none"
          />
        </div>

        {/* Layer 2: Asset Markers Overlay (top layer - completely separate from floorplan) */}
        <div
          data-markers-container
          style={{
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <svg
            ref={svgRef}
            width="800"
            height="600"
            viewBox="0 0 800 600"
            style={{
              pointerEvents: 'none',
              overflow: 'visible'
            }}
          >
            {assets.map((asset) => (
              <AssetMarker
                key={asset.id}
                asset={asset}
                isSelected={selectedAsset?.id === asset.id}
                isActive={hoveredAsset?.id === asset.id}
                scale={1 / transform.scale}
                onClick={(asset, screenPos) => {
                  // If clicking same asset, toggle off; otherwise show new popup (pinned)
                  if (hoveredAsset?.id === asset.id && isPopupPinned) {
                    setHoveredAsset(null);
                    setIsPopupPinned(false);
                  } else {
                    setHoveredAsset(asset);
                    setPopupPosition(screenPos);
                    setIsPopupPinned(true);  // Click pins the popup
                  }
                }}
                onHover={(asset, screenPos) => {
                  // Show popup on hover (not pinned) - only if not already pinned
                  if (!isPopupPinned) {
                    setHoveredAsset(asset);
                    setPopupPosition(screenPos);
                  }
                }}
                onHoverEnd={() => {
                  // Only hide popup on mouse leave if it was opened by hover (not pinned)
                  if (!isPopupPinned) {
                    setHoveredAsset(null);
                  }
                }}
              />
            ))}

            {/* Placement preview during asset creation */}
            {isAdminMode && isCreatingAsset && placementPreview && (
              <g transform={`translate(${placementPreview.x}, ${placementPreview.y})`}>
                <circle
                  cx="0"
                  cy="0"
                  r="8"
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
                <text
                  x="0"
                  y="1"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="8"
                  fill="#3b82f6"
                  fontWeight="bold"
                >
                  +
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 z-30 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Healthy: {assets.filter(a => a.status === 'green').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Warning: {assets.filter(a => a.status === 'yellow').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Critical: {assets.filter(a => a.status === 'red').length}</span>
          </div>
          <div className="text-muted-foreground border-l pl-4 ml-2">
            Zoom: {Math.round(transform.scale * 100)}%
          </div>
        </div>
      </div>

      {/* HTML Asset Popup - rendered outside SVG for proper z-index and static sizing */}
      {
        hoveredAsset && (
          <AssetPopup
            asset={hoveredAsset}
            position={popupPosition}
          />
        )
      }
    </div >
  );
};