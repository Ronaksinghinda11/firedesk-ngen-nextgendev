import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, ChevronDown, Map, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { layoutApi, type Layout } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FloorplanNavigatorProps {
  currentLayout: Layout | null;
  plantId?: string;
  className?: string;
  titleClassName?: string;
  usePortal?: boolean;
  isFullscreen?: boolean; // Whether currently in fullscreen mode
  onLayoutChange?: (layoutId: string) => void; // Callback for in-place layout change (fullscreen mode)
}

interface LayoutTree {
  [buildingId: string]: {
    buildingName: string;
    floors: {
      [floorId: string]: {
        floorName: string;
        layoutId: string;
      };
    };
  };
}

export const FloorplanNavigator: React.FC<FloorplanNavigatorProps> = ({
  currentLayout,
  plantId,
  className = "",
  titleClassName = "text-2xl",
  usePortal = true,
  isFullscreen = false,
  onLayoutChange,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [layoutTree, setLayoutTree] = useState<LayoutTree>({});
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [layoutToDelete, setLayoutToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all layouts for the plant
  const loadLayouts = async () => {
    if (!plantId) return;

    try {
      setIsLoading(true);
      const response = await layoutApi.getByPlantId(plantId);

      if (response.success && response.data) {
        setLayouts(response.data);

        // Build tree structure
        const tree: LayoutTree = {};

        response.data.forEach((layout) => {
          const buildingId = layout.buildingId || 'unknown';
          const floorId = layout.floorId || 'unknown';
          const buildingName = layout.building?.buildingName || 'Unknown Building';
          const floorName = layout.floor?.floorName || 'Unknown Floor';

          // Append wing name to floor name if wing exists
          const wingName = layout.wing?.wingName;
          const displayName = wingName ? `${floorName} - Wing ${wingName}` : floorName;

          if (!tree[buildingId]) {
            tree[buildingId] = {
              buildingName,
              floors: {},
            };
          }

          tree[buildingId].floors[floorId] = {
            floorName: displayName,
            layoutId: layout.id || '',
          };
        });

        console.log('🌳 Layout tree structure:', tree);
        console.log('📍 Total layouts loaded:', response.data.length);
        setLayoutTree(tree);

        // Auto-expand the current building
        if (currentLayout?.buildingId) {
          setExpandedBuildings(new Set([currentLayout.buildingId]));
        }
      }
    } catch (error) {
      console.error('Failed to load layouts:', error);
      toast({
        title: "Error",
        description: "Failed to load floorplan navigation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLayouts();
  }, [plantId, currentLayout?.buildingId, toast]);

  const toggleBuilding = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId);
    } else {
      newExpanded.add(buildingId);
    }
    setExpandedBuildings(newExpanded);
  };

  const navigateToLayout = async (layoutId: string) => {
    console.log('🧭 Navigating to layout:', layoutId);

    // Exit fullscreen mode if currently in fullscreen before navigating
    if (document.fullscreenElement) {
      console.log('📺 Exiting fullscreen mode before navigation');
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Failed to exit fullscreen:', error);
      }
    }

    // Navigate to the new layout (normal view)
    navigate(`/admin/floorplans/${layoutId}`);
    setIsOpen(false);
  };

  const handleDeleteLayout = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    if (!layoutToDelete) return;

    try {
      setIsDeleting(true);
      const response = await layoutApi.delete(layoutToDelete.id);

      if (response.success) {
        toast({
          title: "Success",
          description: "Floorplan deleted successfully",
        });

        // If we deleted the current layout, navigate to plant dashboard or another safe place
        if (currentLayout?.id === layoutToDelete.id) {
          // Try to find another layout to navigate to, or go back to plant dashboard
          // For now, let's go to the plant edit page or just reload the list
          // Ideally we should navigate to a safe parent route
          // navigate(`/admin/plants/${plantId}`); // Assuming this route exists
        }

        // Refresh the list
        await loadLayouts();
      }
    } catch (error) {
      console.error('Failed to delete layout:', error);
      toast({
        title: "Error",
        description: "Failed to delete floorplan",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setLayoutToDelete(null);
    }
  };

  // Get current path for display - always starts from Plant level
  const getCurrentPath = () => {
    if (!currentLayout) return "Loading...";

    const parts = [];

    // Always start with Plant
    const plantName = currentLayout.plant?.plantName || "Plant";
    parts.push(plantName);

    // Add Building
    const buildingName = currentLayout.building?.buildingName || "Building";
    parts.push(buildingName);

    // Add Floor if available
    if (currentLayout.floor?.floorName) {
      const floorName = currentLayout.floor.floorName;
      const wingName = currentLayout.wing?.wingName;
      // Append wing to floor name if wing exists
      parts.push(wingName ? `${floorName} - Wing ${wingName}` : floorName);
    }

    return parts.join(" / ");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className="h-6 w-6 text-primary" />

      <div className="flex items-center gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 hover:bg-transparent focus-visible:ring-0"
            >
              <div className="text-left">
                <h1 className={`font-semibold text-foreground flex items-center gap-2 ${titleClassName}`}>
                  {getCurrentPath()}
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </h1>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-80 max-h-96 overflow-y-auto"
            sideOffset={8}
            portal={usePortal}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading floorplans...
              </div>
            ) : Object.keys(layoutTree).length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No floorplans available
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(layoutTree).map(([buildingId, building]) => (
                  <div key={buildingId} className="mb-1">
                    {/* Building Header */}
                    <button
                      onClick={() => toggleBuilding(buildingId)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm transition-colors ${Object.keys(building.floors).length > 0
                        ? 'hover:bg-accent bg-accent/30 border-l-2 border-primary'
                        : 'hover:bg-accent'
                        }`}
                    >
                      {expandedBuildings.has(buildingId) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <Building2 className={`h-4 w-4 shrink-0 ${Object.keys(building.floors).length > 0 ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      <span className="font-medium text-sm truncate flex-1 text-left">
                        {building.buildingName}
                      </span>
                      {/* Floorplan count badge */}
                      {Object.keys(building.floors).length > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          <Map className="h-3 w-3" />
                          {Object.keys(building.floors).length}
                        </span>
                      )}
                    </button>

                    {/* Floors List */}
                    {expandedBuildings.has(buildingId) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {Object.entries(building.floors).map(([floorId, floor]) => {
                          const isCurrentFloor =
                            currentLayout?.buildingId === buildingId &&
                            currentLayout?.floorId === floorId;

                          return (
                            <div
                              key={floorId}
                              className={`group flex items-center justify-between px-3 py-2 rounded-sm transition-colors ${isCurrentFloor
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent'
                                }`}
                            >
                              <button
                                onClick={() => navigateToLayout(floor.layoutId)}
                                className="flex items-center gap-2 flex-1 text-left min-w-0"
                              >
                                <Map className="h-4 w-4 shrink-0" />
                                <span className="text-sm truncate">
                                  {floor.floorName}
                                </span>
                              </button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${isCurrentFloor
                                  ? 'text-primary-foreground hover:bg-primary-foreground/20'
                                  : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLayoutToDelete({ id: floor.layoutId, name: floor.floorName });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={!!layoutToDelete} onOpenChange={(open) => !open && setLayoutToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the floorplan for <span className="font-medium text-foreground">{layoutToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLayout}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};