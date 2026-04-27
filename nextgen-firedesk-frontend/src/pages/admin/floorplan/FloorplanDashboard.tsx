import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Factory, Layers, ChevronRight, ChevronDown, Map, Plus, Minus, Upload, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { floorplanHierarchyApi, layoutApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Entity } from "@/types/permissions";
import { UploadLayoutModal } from "@/components/floorplan/UploadLayoutModal";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { useAuth } from "@/contexts/AuthContext";
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
import { EntityHistoryDrawer } from '@/components/generic/components/EntityHistoryDrawer';
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Floor {
  id: string;
  name: string;
  level: number;
  hasFloorplan: boolean;
  layoutId?: string | null; // Layout ID from hierarchy response
}

interface Building {
  id: string;
  name: string;
  location: string;
  floors: Floor[];
}

interface Plant {
  id: string;
  name: string;
  description: string;
  buildings: Building[];
}

export default function FloorplanDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const { user } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter plants based on global plant filter
  const filteredPlants = useMemo(() => {
    if (selectedPlantId && selectedPlantId !== 'all') {
      return plants.filter(p => p.id === selectedPlantId);
    }


    return plants;
  }, [plants, selectedPlantId]);

  // History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFloorData, setUploadFloorData] = useState<any>(null);

  // Delete state
  const [layoutToDelete, setLayoutToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load hierarchy from API (includes layoutId for each floor)
  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load floorplan hierarchy (includes layoutId for each floor)
      const hierarchyResponse = await floorplanHierarchyApi.getHierarchy();
      if (hierarchyResponse.success && hierarchyResponse.data) {
        setPlants(hierarchyResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load floorplan data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [toast]);

  const togglePlant = (plantId: string) => {
    const newExpanded = new Set(expandedPlants);
    if (newExpanded.has(plantId)) {
      newExpanded.delete(plantId);
      // Also collapse all buildings under this plant
      plants.find(p => p.id === plantId)?.buildings.forEach(b => {
        const newExpandedBuildings = new Set(expandedBuildings);
        newExpandedBuildings.delete(b.id);
        setExpandedBuildings(newExpandedBuildings);
      });
    } else {
      newExpanded.add(plantId);
    }
    setExpandedPlants(newExpanded);
  };

  const toggleBuilding = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId);
    } else {
      newExpanded.add(buildingId);
    }
    setExpandedBuildings(newExpanded);
  };

  const handleFloorSelect = (plant: Plant, building: Building, floor: Floor) => {
    // Determine the base path based on user type
    const basePath = user?.userType === 'manager' ? '/manager' : '/admin';

    // Use layoutId from hierarchy response (one-to-one relationship)
    if (floor.layoutId) {
      // Navigate to the floorplan viewer with the layout ID
      navigate(`${basePath}/floorplans/${floor.layoutId}`);
    } else if (floor.hasFloorplan) {
      // Fallback for backwards compatibility
      navigate(`${basePath}/floorplans/manufacturing-facility`);
    } else {
      // For floors without layout, show a message
      toast({
        title: "No Floorplan",
        description: `Floorplan for ${plant.name} > ${building.name} > ${floor.name} is not available yet.`,
      });
    }
  };

  const handleAddFloorplan = (plant: Plant, building: Building, floor: Floor, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent floor selection

    setUploadFloorData({
      plantId: plant.id,
      buildingId: building.id,
      floorId: floor.id,
      plantName: plant.name,
      buildingName: building.name,
      floorName: floor.name,
    });
    setUploadModalOpen(true);
  };

  const handleDeleteLayout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!layoutToDelete) return;

    try {
      setIsDeleting(true);
      const response = await layoutApi.delete(layoutToDelete.id);

      if (response.success) {
        toast({
          title: "Success",
          description: "Floorplan deleted successfully",
        });

        // Refresh the list
        await loadData();
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

  const handleUploadSuccess = async () => {
    // Reload hierarchy to reflect new layout
    await loadData();

    toast({
      title: "Success",
      description: "Layout uploaded successfully",
    });
  };

  const countTotalBuildings = () => filteredPlants.reduce((acc, p) => acc + p.buildings.length, 0);
  const countTotalFloors = () => filteredPlants.reduce((acc, p) => acc + p.buildings.reduce((bAcc, b) => bAcc + b.floors.length, 0), 0);
  const countFloorsWithFloorplan = () => {
    return filteredPlants.reduce((acc, p) =>
      acc + p.buildings.reduce((bAcc, b) =>
        bAcc + b.floors.filter(f => f.hasFloorplan).length, 0), 0);
  };

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* Content Container */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {/* Page Header with Stats */}
        <div className="mb-3">
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Page Title */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                      Floorplan
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Expand plants and buildings to view available floorplans
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-lg border border-gray-200 py-2 px-3">
            <div className="flex items-center justify-between">
              {/* Stats Section */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-gray-900 font-medium text-lg">
                    {filteredPlants.length}
                  </div>
                  <div className="text-gray-500 text-xs">Total Plants</div>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-right">
                  <div className="text-orange-600 font-medium text-lg">
                    {countTotalBuildings()}
                  </div>
                  <div className="text-gray-500 text-xs">Total Buildings</div>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-right">
                  <div className="text-blue-600 font-medium text-lg">
                    {countTotalFloors()}
                  </div>
                  <div className="text-gray-500 text-xs">Total Floors</div>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-right">
                  <div className="text-green-600 font-medium text-lg">
                    {countFloorsWithFloorplan()}
                  </div>
                  <div className="text-gray-500 text-xs">With Floorplan</div>
                </div>
              </div>

              {/* Action Section */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedPlants(new Set(filteredPlants.map(p => p.id)))}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExpandedPlants(new Set());
                    setExpandedBuildings(new Set());
                  }}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Collapse All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryDrawerOpen(true)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tree View */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3">
            {filteredPlants.map((plant, plantIndex) => (
              <div key={plant.id} className="mb-2">
                {/* Plant Row */}
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
                  onClick={() => togglePlant(plant.id)}
                >
                  <button className="flex items-center justify-center w-5 h-5">
                    {expandedPlants.has(plant.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  <Factory className="h-5 w-5 text-orange-500" />
                  <span className="font-medium text-gray-900">{plant.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {plant.buildings.length} Buildings
                  </Badge>
                </div>

                {/* Buildings under this Plant */}
                {expandedPlants.has(plant.id) && (
                  <div className="ml-8">
                    {plant.buildings.map((building, buildingIndex) => (
                      <div key={building.id} className="mb-1">
                        {/* Building Row */}
                        <div
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group ${building.floors.some(f => f.hasFloorplan) ? 'border-l-2 border-green-500' : ''
                            }`}
                          onClick={() => toggleBuilding(building.id)}
                        >
                          <button className="flex items-center justify-center w-5 h-5">
                            {expandedBuildings.has(building.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                          <Building2 className={`h-5 w-5 ${building.floors.some(f => f.hasFloorplan) ? 'text-green-500' : 'text-blue-500'
                            }`} />
                          <span className="font-medium text-gray-900">{building.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({building.location})</span>
                          <div className="ml-auto flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {building.floors.length} Floors
                            </Badge>
                            {/* Floorplan count indicator */}
                            {building.floors.some(f => f.hasFloorplan) && (
                              <Badge className="text-xs bg-green-500 hover:bg-green-600 flex items-center gap-1">
                                <Map className="h-3 w-3" />
                                {building.floors.filter(f => f.hasFloorplan).length} Floorplans
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Floors under this Building */}
                        {expandedBuildings.has(building.id) && (
                          <div className="ml-8">
                            {building.floors.map((floor, floorIndex) => (
                              <div
                                key={floor.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded group"
                              >
                                <div className="w-5 h-5" />
                                <Layers className={`h-4 w-4 ${floor.hasFloorplan ? 'text-green-500' : 'text-gray-400'}`} />
                                <span
                                  className="text-gray-900 cursor-pointer flex-1"
                                  onClick={() => handleFloorSelect(plant, building, floor)}
                                >
                                  {floor.name}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">(Level {floor.level})</span>
                                <div className="ml-auto flex items-center gap-2">
                                  {floor.hasFloorplan ? (
                                    <>
                                      <Badge className="text-xs bg-green-500 hover:bg-green-600">
                                        Available
                                      </Badge>
                                      {canUpdate(Entity.FLOORPLANS) && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => handleAddFloorplan(plant, building, floor, e)}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          Replace
                                        </Button>
                                      )}
                                      {canDelete(Entity.FLOORPLANS) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (floor.layoutId) {
                                              setLayoutToDelete({ id: floor.layoutId, name: floor.name });
                                            }
                                          }}
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Badge variant="outline" className="text-xs">
                                        No Layout
                                      </Badge>
                                      {canCreate(Entity.FLOORPLANS) && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => handleAddFloorplan(plant, building, floor, e)}
                                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                        >
                                          <Upload className="h-3 w-3 mr-1" />
                                          Add Floorplan
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadFloorData && (
        <UploadLayoutModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setUploadFloorData(null);
          }}
          onSuccess={handleUploadSuccess}
          floorData={uploadFloorData}
        />
      )}

      {/* Delete Confirmation Dialog */}
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

      {/* History Drawer */}
      <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] p-0">
          <EntityHistoryDrawer
            config={{
              entityName: 'Floor',
              entityNamePlural: 'Floors',
              apiEndpoint: '/api/v1/layouts',
              fields: []
            }}
            selectedEntityForComments={null}
            selectedEntityName={undefined}
            onToggleHistory={() => setHistoryDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
