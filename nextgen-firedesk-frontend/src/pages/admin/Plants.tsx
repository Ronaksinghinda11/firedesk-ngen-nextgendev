import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Factory, Pencil, Trash2, Eye, Plus, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { OrganizationForm } from "@/components/organization-form/OrganizationForm";
import { organizationService } from "@/services/organization.service";
import { Organization } from "@/types/organization.types";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Entity, Action } from "@/types/permissions";

interface Plant {
  id: string;
  plantName: string;
  address: string;
  status: string;
  city?: {
    cityName: string;
    state?: { stateName: string };
  };
  state?: {
    stateName: string;
  };
  industry?: {
    industryName: string;
  };
}

export default function Plants() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlantId } = usePlantFilter();
  const { hasPermission } = usePermissions();
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrganizationDialogOpen, setIsOrganizationDialogOpen] = useState(false);

  // Check permissions
  const canCreate = hasPermission(Entity.PLANTS, Action.CREATE);
  const canUpdate = hasPermission(Entity.PLANTS, Action.UPDATE);
  const canDelete = hasPermission(Entity.PLANTS, Action.DELETE);

  // Filter plants based on selected plant
  // Backend now handles filtering, so we use allPlants directly (which contains filtered results)
  const plants = allPlants;

  // Debug logging
  console.log('🏭 Admin Plants - selectedPlantId:', selectedPlantId);

  useEffect(() => {
    fetchPlants();
    fetchOrganization();
  }, [selectedPlantId]); // Re-fetch when filter changes

  const fetchOrganization = async () => {
    try {
      const response = await organizationService.getOrganization();
      if (response.success && response.data) {
        setOrganization(response.data);
      }
    } catch (error: any) {
      console.log("No organization found or error:", error);
    }
  };

  const fetchPlants = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (selectedPlantId && selectedPlantId !== 'all') {
        params.append('plantId', selectedPlantId);
      }

      const response = await api.get(`/plants?${params.toString()}`) as any;

      if (response.success) {
        const plantsData = response.allPlants || response.plants || response.data || [];
        setAllPlants(Array.isArray(plantsData) ? plantsData : []);
      } else {
        throw new Error(response.message || "Failed to fetch plants");
      }
    } catch (error: any) {
      console.error('Failed to fetch plants:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to load plants",
        variant: "destructive",
      });
      setAllPlants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationSuccess = (updatedOrganization: Organization) => {
    setOrganization(updatedOrganization);
    setIsOrganizationDialogOpen(false);
    toast({
      title: "Success",
      description: organization ? "Organization updated successfully" : "Organization created successfully",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      Active: "bg-green-500/10 text-green-700 border-green-500/20",
      Deactive: "bg-red-500/10 text-red-700 border-red-500/20",
      Draft: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    };

    return (
      <Badge
        variant="outline"
        className={statusColors[status as keyof typeof statusColors] || ""}
      >
        {status}
      </Badge>
    );
  };

  const handleDelete = async (plantId: string, plantName: string) => {
    if (!confirm(`Are you sure you want to delete plant "${plantName}"?`)) {
      return;
    }

    try {
      const response = await api.delete(`/plants/${plantId}`) as any; // Updated to /plants

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Plant deleted successfully!",
        });
        fetchPlants(); // Refresh the list
      } else {
        throw new Error(response.message || "Failed to delete plant");
      }
    } catch (error: any) {
      console.error('Failed to delete plant:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to delete plant",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-1">Plants</h1>
            <p className="text-sm text-muted-foreground">Manage plants in your system</p>
          </div>
          <div className="flex gap-3">
            {/* Organization button - tied to Plant Create permission */}
            {canCreate && (
              <Button
                onClick={() => setIsOrganizationDialogOpen(true)}
                size="lg"
                variant={organization ? "outline" : "default"}
                className={!organization ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" : ""}
              >
                <Building2 className="h-4 w-4 mr-2" />
                {organization ? "Organization Details" : "Setup Organization"}
              </Button>
            )}
            {/* Add Plant button - only show with CREATE permission */}
            {canCreate && (
              <Button
                onClick={() => navigate('/admin/plants/create')}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                disabled={!organization}
                title={!organization ? "Please set up an Organization first" : ""}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Plant
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/50">
                <TableHead className="font-semibold">Plant Name</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">City</TableHead>
                <TableHead className="font-semibold">State</TableHead>
                <TableHead className="font-semibold">Industry</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span className="ml-2 text-muted-foreground">Loading plants...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : plants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-96">
                    <div className="flex flex-col items-center justify-center text-center py-12">
                      <Factory className="h-20 w-20 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">No plants found</h3>
                      <p className="text-sm text-muted-foreground mb-4">Create your first plant to get started</p>
                      {canCreate && (
                        <Button onClick={() => navigate('/admin/plants/create')} disabled={!organization}>
                          + Create Plant
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                plants.map((plant) => (
                  <TableRow key={plant.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium">{plant.plantName}</TableCell>
                    <TableCell className="max-w-xs truncate">{plant.address}</TableCell>
                    <TableCell>{plant.city?.cityName || '-'}</TableCell>
                    <TableCell>{plant.state?.stateName || '-'}</TableCell>
                    <TableCell>{plant.industry?.industryName || '-'}</TableCell>
                    <TableCell>{getStatusBadge(plant.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* View button - always visible */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/plants/${plant.id}`)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Edit button - only with UPDATE permission */}
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/plants/${plant.id}/edit`)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Delete button - only with DELETE permission */}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(plant.id, plant.plantName)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Organization Dialog */}
      <Dialog open={isOrganizationDialogOpen} onOpenChange={setIsOrganizationDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {organization ? "Edit Organization" : "Setup Organization"}
            </DialogTitle>
            <DialogDescription>
              {organization
                ? "Update your organization details below."
                : "Set up your organization before adding plants."}
            </DialogDescription>
          </DialogHeader>
          <OrganizationForm
            existingOrganization={organization}
            onSuccess={handleOrganizationSuccess}
            onCancel={() => setIsOrganizationDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}