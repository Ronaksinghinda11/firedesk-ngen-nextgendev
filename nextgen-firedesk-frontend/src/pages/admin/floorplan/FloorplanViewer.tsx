import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Package, MapPin, X } from "lucide-react";
import { type Asset } from "@/data/mockFloorplanAssets";
import { floorplanAssetApi, layoutApi, type FloorplanAsset, assetApi, type AssetFromDB, type Layout } from "@/lib/api";
import { SVGFloorplanViewer } from "@/components/floorplan/SVGFloorplanViewer";
import { PDFFloorplanViewer } from "@/components/floorplan/PDFFloorplanViewer";
import { AssetDetailPanel } from "@/components/floorplan/AssetDetailPanel";
import { AssetCreateModal } from "@/components/floorplan/AssetCreateModal";
import { FiltersSidebar } from "@/components/floorplan/FiltersSidebar";
import { AssetsSidebar } from "@/components/floorplan/AssetsSidebar";
import { FloorplanNavigator } from "@/components/floorplan/FloorplanNavigator";
import { filterAssets } from "@/lib/floorplanUtils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Entity } from "@/types/permissions";

interface FilterState {
  type?: string | string[];
  status?: string | string[];
  health?: string | string[];
  location?: string | string[];
  category?: string | string[];
  searchTerm?: string;
  // Dynamic metadata filters
  [key: string]: string | string[] | undefined;
}

interface FiltersSidebarState {
  isCollapsed: boolean;
}

// Inner component that uses admin mode context
const FloorplanViewerContent: React.FC = () => {
  const { toast } = useToast();
  const { id: layoutId } = useParams<{ id: string }>();
  const { canView, canUpdate } = usePermissions();
  // If user can't update, they are in read-only mode
  const isReadOnly = !canUpdate(Entity.FLOORPLANS);

  const [layout, setLayout] = useState<Layout | null>(null);
  const [svgUrl, setSvgUrl] = useState<string>("");
  const [isPdf, setIsPdf] = useState(false);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarState, setSidebarState] = useState<FiltersSidebarState>({ isCollapsed: false });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalCoordinates, setCreateModalCoordinates] = useState({ x: 0, y: 0 });
  const [assetsSidebarCollapsed, setAssetsSidebarCollapsed] = useState(false);
  const [selectedDbAsset, setSelectedDbAsset] = useState<AssetFromDB | null>(null);
  const [isPlacingDbAsset, setIsPlacingDbAsset] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load layout data
  useEffect(() => {
    const loadLayout = async () => {
      if (!layoutId) {
        setError("No layout ID provided");
        setIsLoading(false);
        return;
      }

      // Reset states when navigating to new layout
      setIsPlacingDbAsset(false);
      setSelectedDbAsset(null);
      setSelectedAsset(null);

      try {
        setIsLoading(true);
        console.log('🔄 Loading layout from API for ID:', layoutId);
        const response = await layoutApi.getById(layoutId);
        console.log('📦 Layout Response:', response);

        if (response.success && response.data) {
          setLayout(response.data);

          // Get API base URL
          const API_BASE_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';

          // Priority 1: Use dataUrl (binary storage format — SVG or PDF)
          if (response.data.dataUrl) {
            const detectedPdf =
              response.data.mimeType === 'application/pdf' ||
              response.data.dataUrl.startsWith('data:application/pdf');
            console.log('✅ Using dataUrl from binary storage, mimeType:', response.data.mimeType, 'isPdf:', detectedPdf);
            setSvgUrl(response.data.dataUrl);
            setIsPdf(detectedPdf);
          }
          // Priority 2: Use svgPicture (legacy text format)
          else if (response.data.svgPicture) {
            console.log('⚠️  Using legacy svgPicture format');
            const blob = new Blob([response.data.svgPicture], { type: 'image/svg+xml' });
            setSvgUrl(URL.createObjectURL(blob));
          }
          // Priority 3: Use layoutUrl (legacy URL format)
          else if (response.data.layoutUrl) {
            console.log('⚠️  Using legacy layoutUrl format');
            // Check if URL is already absolute (Cloudinary or external CDN)
            const isAbsoluteUrl = response.data.layoutUrl.startsWith('http://') ||
              response.data.layoutUrl.startsWith('https://');

            // Use URL directly if absolute, otherwise prepend API base URL for local files
            const fullUrl = isAbsoluteUrl
              ? response.data.layoutUrl
              : `${API_BASE_URL}${response.data.layoutUrl}`;

            setSvgUrl(fullUrl);
          }
          // Priority 4: Fallback to default floorplan
          else {
            console.warn('❌ No layout data found, using fallback');
            setSvgUrl("/floorplan-sample.svg");
          }
        }
      } catch (err) {
        console.error('Failed to load layout:', err);
        setError(err instanceof Error ? err.message : 'Failed to load layout');
        toast({
          title: "Error",
          description: "Failed to load floorplan layout",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLayout();
  }, [layoutId, toast]);

  // Check view permission
  useEffect(() => {
    if (!canView(Entity.FLOORPLANS)) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view floorplans.",
        variant: "destructive",
      });
      // Optional: redirect to home or dashboard
    }
  }, [canView, toast]);

  // Load assets from API on component mount - now loading real DB assets
  useEffect(() => {
    const loadAssets = async () => {
      if (!layout?.floorId) return;

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading DB assets for floor from API...');
        const response = await assetApi.getByFloor(layout.floorId);
        console.log('📦 API Response:', response);

        if (response.success && response.data) {
          // Convert ALL DB assets to Asset format (both placed and not placed)
          // This ensures filters show all available types
          const convertedAssets: Asset[] = response.data.map((dbAsset: AssetFromDB) => ({
            id: dbAsset.id,
            assetId: dbAsset.assetId || dbAsset.id.slice(0, 8),
            type: dbAsset.category?.categoryName?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
            name: dbAsset.product?.productName || 'Unknown Asset',
            x: dbAsset.floorplanX || 0, // Default to 0 if not placed
            y: dbAsset.floorplanY || 0, // Default to 0 if not placed
            status: (dbAsset.healthStatus === 'Healthy' || dbAsset.healthStatus === 'HEALTHY') ? 'green' :
              (dbAsset.healthStatus === 'AttentionRequired' || dbAsset.healthStatus === 'NEEDS_ATTENTION') ? 'yellow' : 'red',
            plantId: dbAsset.plantId,
            layoutId: layoutId,
            // Geo location fields
            lat: dbAsset.lat,
            long: dbAsset.long,
            // Service tracking fields (legacy)
            lastInspectionDate: dbAsset.lastInspectionDate,
            nextInspectionDue: dbAsset.nextInspectionDue,
            // Service frequencies from scheduler
            serviceFrequencies: {
              inspection: dbAsset.schedulerData?.inspectionFrequency,
              testing: dbAsset.schedulerData?.testingFrequency,
              maintenance: dbAsset.schedulerData?.maintenanceFrequency,
            },
            // Service dates per type from ServiceSubmissions
            serviceDates: dbAsset.serviceDates || {
              lastServiceDates: {},
              nextServiceDates: {}
            },
            metadata: {
              location: dbAsset.location,
              manufacturer: dbAsset.manufacturer?.name,
              installDate: dbAsset.installDate,
              healthStatus: dbAsset.healthStatus,
              isPlaced: dbAsset.floorplanX !== null && dbAsset.floorplanY !== null, // Track placement status
              category: dbAsset.category?.categoryName || 'Unknown', // For display and filtering
              // Technical specs for Fire Extinguisher specific filters
              type: dbAsset.type,
              subType: dbAsset.subType,
              capacity: dbAsset.capacity ? `${dbAsset.capacity}${dbAsset.capacityUnit || ''}` : undefined,
              make: dbAsset.manufacturer?.name, // Make is same as manufacturer
              model: dbAsset.model,
              productName: dbAsset.product?.productName,
              // Age: Calculate from install date
              age: dbAsset.installDate ? (() => {
                const installYear = new Date(dbAsset.installDate).getFullYear();
                const currentYear = new Date().getFullYear();
                const years = currentYear - installYear;
                if (years === 0) return 'New';
                if (years <= 2) return '0-2 Years';
                if (years <= 5) return '3-5 Years';
                if (years <= 10) return '6-10 Years';
                return '10+ Years';
              })() : undefined,
              // Condition derived from healthStatus
              condition: (dbAsset.healthStatus === 'Healthy' || dbAsset.healthStatus === 'HEALTHY') ? 'Good' :
                (dbAsset.healthStatus === 'AttentionRequired' || dbAsset.healthStatus === 'NEEDS_ATTENTION') ? 'Fair' : 'Poor',
              // Fire Rating from type or subType (common patterns)
              fireRating: dbAsset.type?.includes('ABC') ? 'ABC' :
                dbAsset.type?.includes('BC') ? 'BC' :
                  dbAsset.subType?.toUpperCase() || undefined,
              // Service Status from asset's contract status field
              // Maps to: In-House, Out-Of AMC, Under AMC, Under Warranty
              serviceStatus: (() => {
                const status = dbAsset.status; // Warranty, AMC, In-House, Deactive
                if (status === 'Warranty') return 'Under Warranty';
                if (status === 'AMC') return 'Under AMC';
                if (status === 'In-House') return 'In-House';
                if (status === 'Deactive' || status === 'OBSOLETE') return 'Out-Of AMC';
                return 'In-House'; // Default
              })(),
            },
            createdAt: dbAsset.createdAt || new Date().toISOString(),
            meta: {
              lastCheck: dbAsset.updatedAt || dbAsset.createdAt,
              description: `${dbAsset.category?.categoryName || ''} - ${dbAsset.location}`,
            }
          }));

          setAllAssets(convertedAssets);
          console.log('✅ Loaded DB assets for floor:', convertedAssets.length);
          console.log('🎯 Converted assets for display:', convertedAssets);
        }
      } catch (err) {
        console.error('Failed to load DB assets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assets');
        toast({
          title: "Error",
          description: "Failed to load assets. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [layout?.floorId, layoutId, toast]);

  // Apply filters when data changes
  useEffect(() => {
    console.log('🔄 Applying filters to assets...');
    console.log('📊 All assets:', allAssets.length);
    console.log('🎛️ Current filters:', filters);

    // First filter by placement status - only show placed assets on the floorplan
    const placedAssets = allAssets.filter(asset =>
      asset.metadata?.isPlaced === true
    );

    // Then apply user filters
    const filtered = filterAssets(placedAssets, filters);
    console.log('🎯 Filtered assets for display:', filtered.length);
    console.log('📍 Assets to render:', filtered);
    setFilteredAssets(filtered);
  }, [allAssets, filters]);

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleFloorplanClick = async (coordinates: { x: number; y: number }) => {
    if (isPlacingDbAsset && selectedDbAsset && !isReadOnly) {
      // Place a database asset on the floorplan
      try {
        await assetApi.updateFloorplanPosition(selectedDbAsset.id, {
          floorplanX: coordinates.x,
          floorplanY: coordinates.y,
          buildingId: layout?.buildingId,
          floorId: layout?.floorId,
        });

        toast({
          title: "Success",
          description: "Asset placed on floorplan successfully!",
        });

        // Reset state
        setIsPlacingDbAsset(false);
        setSelectedDbAsset(null);

        // Reload assets to reflect the change
        // This will trigger a re-render of the AssetsSidebar
        window.location.reload(); // Simple approach, or implement proper state refresh
      } catch (error) {
        console.error('Failed to place asset:', error);
        toast({
          title: "Error",
          description: "Failed to place asset on floorplan",
          variant: "destructive",
        });
      }
    }
  };

  const handleDbAssetSelect = (asset: AssetFromDB) => {
    if (isReadOnly) return;

    // Check if asset is already on floorplan
    if (asset.floorplanX !== null && asset.floorplanY !== null) {
      // Just highlight it on the floorplan or show details
      toast({
        title: "Asset Already Placed",
        description: "This asset is already on the floorplan",
      });
      return;
    }

    // Enter placement mode for this asset
    setSelectedDbAsset(asset);
    setIsPlacingDbAsset(true);
    toast({
      title: "Placement Mode",
      description: `Click on the floorplan to place "${asset.assetId || asset.id.slice(0, 8)}"`,
    });
  };

  const handleSaveAsset = async (assetData: Partial<Asset>) => {
    try {
      if (!layout?.floorId || !layout?.buildingId || !layout?.plantId) {
        toast({
          title: "Error",
          description: "Missing floor information. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // This feature creates assets with floorplan coordinates directly
      // The asset is placed at the clicked coordinates on the floorplan
      const newAsset: Asset = {
        id: assetData.id || `asset-${Date.now()}`,
        assetId: assetData.id || `ASSET-${Date.now()}`,
        name: assetData.name || 'New Asset',
        type: assetData.type || 'smoke_detector',
        x: createModalCoordinates.x,
        y: createModalCoordinates.y,
        status: assetData.status || 'green',
        plantId: layout.plantId,
        layoutId: layoutId,
        metadata: {
          location: assetData.metadata?.location || 'New Location',
          description: assetData.meta?.description || '',
          layoutId: layoutId,
          isPlaced: true, // Mark as placed since we're creating it with coordinates
          ...assetData.metadata
        },
        meta: {
          description: assetData.meta?.description || '',
          lastCheck: new Date().toISOString(),
          createdBy: 'admin',
          modifiedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      };

      // Add to local state immediately for instant feedback
      setAllAssets(prev => [...prev, newAsset]);
      setIsCreateModalOpen(false);

      toast({
        title: "Asset Created (Temporary)",
        description: "Asset placed on floorplan. Note: This is temporary and will not persist after page reload.",
        variant: "default",
      });

      // TODO: Implement backend API call to persist the asset
      // This would be something like:
      // const response = await assetApi.create({
      //   plantId: layout.plantId,
      //   buildingId: layout.buildingId,
      //   floorId: layout.floorId,
      //   building: `${layout.building} - ${layout.floor}`,
      //   location: assetData.metadata?.location,
      //   productCategoryId: '...', // Need to get from asset type
      //   productId: '...', // Need to get from asset name
      //   manufacturingDate: new Date().toISOString(),
      //   installDate: new Date().toISOString(),
      //   healthStatus: 'Healthy',
      //   status: 'Warranty',
      //   floorplanX: createModalCoordinates.x,
      //   floorplanY: createModalCoordinates.y,
      // });

    } catch (err) {
      console.error('Failed to create asset:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create asset. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelCreate = () => {
    setIsCreateModalOpen(false);
  };




  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading floorplan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-destructive">Error loading floorplan assets</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Hidden in fullscreen */}
        {!isFullscreen && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-4">
              <div>
                <FloorplanNavigator
                  currentLayout={layout}
                  plantId={layout?.plantId}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredAssets.length} of {allAssets.length} assets shown
                </p>
              </div>
            </div>

            {/* Asset Count Summary & Actions */}
            <div className="flex items-center gap-4">
              {!isPlacingDbAsset ? (
                <>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{filteredAssets.length} Assets</span>
                  </div>
                </>
              ) : (
                <>
                  <Badge variant="default" className="animate-pulse">
                    <MapPin className="h-3 w-3 mr-1" />
                    Placing: {selectedDbAsset?.assetId || selectedDbAsset?.id.slice(0, 8)}
                  </Badge>
                  <Button
                    onClick={() => {
                      setIsPlacingDbAsset(false);
                      setSelectedDbAsset(null);
                    }}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Floorplan Viewer — branches between PDF and SVG */}
        <div className="flex-1 overflow-hidden relative">
          {isPdf ? (
            <PDFFloorplanViewer
              svgUrl={svgUrl}
              assets={filteredAssets}
              allAssets={allAssets}
              onAssetClick={handleAssetClick}
              selectedAsset={selectedAsset}
              isAdminMode={true}
              isCreatingAsset={isPlacingDbAsset}
              isReadOnly={isReadOnly}
              onFloorplanClick={handleFloorplanClick}
              onFullscreenChange={setIsFullscreen}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
              currentLayout={layout}
              plantId={layout?.plantId}
            />
          ) : (
            <SVGFloorplanViewer
              svgUrl={svgUrl || "/floorplan2.svg"}
              assets={filteredAssets}
              allAssets={allAssets}
              onAssetClick={handleAssetClick}
              selectedAsset={selectedAsset}
              isAdminMode={true}
              isCreatingAsset={isPlacingDbAsset}
              isReadOnly={isReadOnly}
              onFloorplanClick={handleFloorplanClick}
              onFullscreenChange={setIsFullscreen}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
              currentLayout={layout}
              plantId={layout?.plantId}
            />
          )}
        </div>
      </div>

      {/* Assets Sidebar - Database Assets - Hidden in fullscreen */}
      {!isFullscreen && layout?.floorId && (
        <div className={`transition-all duration-300`}>
          <AssetsSidebar
            floorId={layout.floorId}
            plantId={layout.plantId}
            buildingId={layout.buildingId || ''}
            onAssetSelect={handleDbAssetSelect}
            isReadOnly={isReadOnly}
            onAssetReposition={(asset) => {
              if (isReadOnly) return;
              setSelectedDbAsset(asset);
              setIsPlacingDbAsset(true);
              toast({
                title: "Repositioning Mode",
                description: `Click on the floorplan to move "${asset.assetId || asset.id.slice(0, 8)}"`,
              });
            }}
            onAssetRemove={async (asset) => {
              if (isReadOnly) return;
              if (!confirm(`Remove "${asset.assetId || asset.id.slice(0, 8)}" from the floorplan? The asset will remain in the database.`)) {
                return;
              }

              try {
                await assetApi.removeFromFloorplan(asset.id);

                toast({
                  title: "Success",
                  description: "Asset removed from floorplan",
                });

                // Reload to reflect changes
                window.location.reload();
              } catch (error) {
                console.error('Failed to remove asset:', error);
                toast({
                  title: "Error",
                  description: "Failed to remove asset from floorplan",
                  variant: "destructive",
                });
              }
            }}
            filters={filters}
            isCollapsed={assetsSidebarCollapsed}
            onToggleCollapse={() => setAssetsSidebarCollapsed(!assetsSidebarCollapsed)}
          />
        </div>
      )}

      {/* Filters Sidebar - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className={`transition-all duration-300 ${sidebarState.isCollapsed ? 'w-auto' : 'w-80'
          }`}>
          <FiltersSidebar
            onFilterChange={handleFilterChange}
            assetCount={{
              total: allAssets.length,
              filtered: filteredAssets.length
            }}
            allAssets={allAssets}
            isCollapsed={sidebarState.isCollapsed}
            onToggleCollapse={() => setSidebarState(prev => ({ isCollapsed: !prev.isCollapsed }))}
          />
        </div>
      )}

      {/* Asset Detail Panel - Hidden in fullscreen */}
      {!isFullscreen && selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {/* Asset Create Modal */}
      {isCreateModalOpen && (
        <AssetCreateModal
          isOpen={isCreateModalOpen}
          coordinates={createModalCoordinates}
          layoutId={layoutId}
          onSave={handleSaveAsset}
          onCancel={handleCancelCreate}
        />
      )}

    </div>
  );
};

// Main component
export default function FloorplanViewer() {
  return <FloorplanViewerContent />;
}