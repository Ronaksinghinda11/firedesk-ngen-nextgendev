import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { filterAssets } from "@/lib/floorplanUtils";
import {
  Package,
  MapPin,

  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Move,
  X
} from "lucide-react";
import { assetApi, type AssetFromDB } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

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

interface AssetsSidebarProps {
  floorId: string;
  plantId: string;
  buildingId: string;
  onAssetSelect: (asset: AssetFromDB) => void;
  onAssetReposition?: (asset: AssetFromDB) => void;
  onAssetRemove?: (asset: AssetFromDB) => void;
  filters?: FilterState;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isReadOnly?: boolean;
}

export const AssetsSidebar: React.FC<AssetsSidebarProps> = ({
  floorId,
  plantId,
  buildingId,
  onAssetSelect,
  onAssetReposition,
  onAssetRemove,
  filters = {},
  isCollapsed,
  onToggleCollapse,
  isReadOnly = false,
}) => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<AssetFromDB[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load assets for this floor
  useEffect(() => {
    const loadAssets = async () => {
      if (!floorId) return;

      try {
        setIsLoading(true);
        const response = await assetApi.getByFloor(floorId);

        if (response.success) {
          setAssets(response.data);
          // Initial load - don't apply search yet, will be done in useEffect
          setFilteredAssets(response.data);
        }
      } catch (error) {
        console.error('Failed to load assets:', error);
        toast({
          title: "Error",
          description: "Failed to load assets for this floor",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [floorId, toast]);

  // Filter assets based on all filters from FiltersSidebar
  useEffect(() => {
    // Convert AssetFromDB[] to Asset[] format for filtering
    const assetsForFiltering = assets.map((dbAsset) => ({
      id: dbAsset.id,
      assetId: dbAsset.assetId || dbAsset.id.slice(0, 8),
      type: dbAsset.category?.categoryName?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
      name: dbAsset.product?.productName || 'Unknown Asset',
      x: dbAsset.floorplanX || 0,
      y: dbAsset.floorplanY || 0,
      status: (dbAsset.healthStatus === 'Healthy' || dbAsset.healthStatus === 'HEALTHY') ? 'green' :
        (dbAsset.healthStatus === 'AttentionRequired' || dbAsset.healthStatus === 'NEEDS_ATTENTION') ? 'yellow' : 'red',
      plantId: dbAsset.plantId,
      metadata: {
        location: dbAsset.location,
        manufacturer: dbAsset.manufacturer?.name,
        installDate: dbAsset.installDate,
        healthStatus: dbAsset.healthStatus,
        isPlaced: dbAsset.floorplanX !== null && dbAsset.floorplanY !== null,
        category: dbAsset.category?.categoryName || 'Unknown',
      },
      createdAt: dbAsset.createdAt || new Date().toISOString(),
      meta: {
        lastCheck: dbAsset.updatedAt || dbAsset.createdAt,
        description: `${dbAsset.category?.categoryName || ''} - ${dbAsset.location}`,
      }
    }));

    // Apply filters using the filterAssets utility
    const filtered = filterAssets(assetsForFiltering, filters);

    // Convert back to AssetFromDB[] by finding originals
    const filteredDbAssets = filtered.map(asset =>
      assets.find(dbAsset => dbAsset.id === asset.id)!
    ).filter(Boolean);

    setFilteredAssets(filteredDbAssets);
  }, [filters, assets]);



  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'AttentionRequired':
      case 'NEEDS_ATTENTION':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'NotWorking':
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        // Default to red/critical if undefined or unknown, as per logic above
        // But for icon we might want a generic one unless we want to emphasize it's unknown/critical
        // If status mapping above defaults to red, then maybe we should show critical icon for default?
        // For now let's just add the uppercase cases.
        return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'HEALTHY':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'AttentionRequired':
      case 'NEEDS_ATTENTION':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'NotWorking':
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const assetsOnFloorplan = filteredAssets.filter(a => a.floorplanX !== null && a.floorplanY !== null);
  const assetsNotOnFloorplan = filteredAssets.filter(a => a.floorplanX === null || a.floorplanY === null);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-card border-l border-border flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="mt-4 writing-mode-vertical">
          <span className="text-xs text-muted-foreground">Assets</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Floor Assets</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">{assetsOnFloorplan.length}</span>
            <span>on floorplan</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">{assetsNotOnFloorplan.length}</span>
            <span>available</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {assets.length === 0
                ? "No assets found for this floor"
                : "No assets match your search"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Assets not on floorplan */}
            {assetsNotOnFloorplan.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Available to Add ({assetsNotOnFloorplan.length})
                </h4>
                <div className="space-y-2">
                  {assetsNotOnFloorplan.map((asset) => (
                    <Card
                      key={asset.id}
                      className="cursor-pointer hover:bg-accent transition-colors border-2 border-dashed border-primary/30"
                      onClick={() => onAssetSelect(asset)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getHealthStatusIcon(asset.healthStatus)}
                              <span className="font-medium text-sm truncate">
                                {asset.assetId || asset.id.slice(0, 8)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">
                              {asset.product?.productName || 'Unknown Product'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{asset.location}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs whitespace-nowrap ${getHealthStatusColor(asset.healthStatus)}`}
                          >
                            {asset.healthStatus}
                          </Badge>
                        </div>
                      </CardContent>
                      {!isReadOnly && (
                        <CardContent className="pt-0 pb-3">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssetSelect(asset);
                            }}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Add to Floorplan
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Separator */}
            {assetsNotOnFloorplan.length > 0 && assetsOnFloorplan.length > 0 && (
              <Separator className="my-4" />
            )}

            {/* Assets on floorplan */}
            {assetsOnFloorplan.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  On Floorplan ({assetsOnFloorplan.length})
                </h4>
                <div className="space-y-2">
                  {assetsOnFloorplan.map((asset) => (
                    <Card
                      key={asset.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => onAssetSelect(asset)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getHealthStatusIcon(asset.healthStatus)}
                              <span className="font-medium text-sm truncate">
                                {asset.assetId || asset.id.slice(0, 8)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">
                              {asset.product?.productName || 'Unknown Product'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{asset.location}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs whitespace-nowrap ${getHealthStatusColor(asset.healthStatus)}`}
                          >
                            {asset.healthStatus}
                          </Badge>
                        </div>
                        {!isReadOnly && (
                          <div className="flex gap-2 mt-2">
                            {onAssetReposition && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssetReposition(asset);
                                }}
                              >
                                <Move className="h-3 w-3 mr-1" />
                                Change Position
                              </Button>
                            )}
                            {onAssetRemove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssetRemove(asset);
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};