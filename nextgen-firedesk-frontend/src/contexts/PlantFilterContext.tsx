import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';

interface Plant {
  id: string;
  plantId: string;
  plantName: string;
  address?: string;
  status?: string;
  categories?: { id: string; category_name?: string; categoryName?: string }[];
}

interface PlantFilterContextType {
  selectedPlantId: string | null;
  availablePlants: Plant[];
  isLoading: boolean;
  setSelectedPlantId: (plantId: string | null) => void;
  clearPlantFilter: () => void;
  refreshPlants: () => Promise<void>;
  getPlantName: (plantId: string) => string;
}

const PlantFilterContext = createContext<PlantFilterContextType | undefined>(undefined);

export const PlantFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedPlantId, setSelectedPlantIdState] = useState<string | null>(null);
  const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch plants based on user role
  const fetchPlants = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if user is a technician - use technician-specific endpoint
      const userRole = user.role?.name?.toLowerCase() || '';
      const isTechnician = userRole === 'technician';

      if (isTechnician) {
        // Technicians get their assigned plants only
        const response: any = await api.get('/technician/my-assigned-plant');
        if (response.success && response.technician?.plants) {
          // Transform technician plants to match Plant interface
          // For technicians, the categories are assigned to the TECHNICIAN, not specifically per plant in this response structure
          // However, we can attach the technician's assigned categories to each plant for context if needed,
          // OR we can just map the categories if the API provides them per plant.
          // Based on controller, categories are at `response.technician.categories` (global for tech)
          const techCategories = response.technician.categories || [];

          const plants = response.technician.plants.map((p: any) => ({
            id: p.id,
            plantId: p.plant_code || p.id,
            plantName: p.plant_name || p.plantName,
            address: p.address_line1 || p.address,
            status: p.status,
            categories: techCategories // Assign all tech categories to each plant for filtering purposes
          })).sort((a: Plant, b: Plant) => a.plantName.localeCompare(b.plantName));
          setAvailablePlants(plants);
        } else {
          setAvailablePlants([]);
        }
      } else if (userRole === 'manager') {
        // Managers get their assigned plants only
        const response: any = await api.get('/managers/me/plants');
        if (response.success && response.plants) {
          const plants = response.plants.map((p: any) => ({
            id: p.id,
            plantId: p.plant_code || p.id,
            plantName: p.plant_name || p.plantName,
            address: p.address_line1 || p.address,
            status: p.status,
            categories: p.categories || []
          })).sort((a: Plant, b: Plant) => a.plantName.localeCompare(b.plantName));
          setAvailablePlants(plants);
        } else {
          setAvailablePlants([]);
        }
      } else {
        // Admin (and others) get all plants
        const response: any = await api.get('/plants');
        const sortedPlants = (response.plants || []).map((p: any) => ({
          id: p.id,
          plantId: p.plant_code || p.plantId,
          plantName: p.plant_name || p.plantName,
          address: p.address_line1 || p.address,
          status: p.status,
          categories: p.categories || []
        })).sort((a: any, b: any) =>
          (a.plantName || a.plant_name || '').localeCompare(b.plantName || b.plant_name || '')
        );
        setAvailablePlants(sortedPlants);
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      setAvailablePlants([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize: Load plants and read plantId from URL or localStorage
  useEffect(() => {
    if (user) {
      fetchPlants();

      // Read plantId from URL search params first (highest priority)
      const plantIdFromUrl = searchParams.get('plantId');
      if (plantIdFromUrl && plantIdFromUrl !== 'all') {
        setSelectedPlantIdState(plantIdFromUrl);
      } else {
        // Fallback to localStorage if no URL param
        const savedPlantId = localStorage.getItem('selectedPlantId');
        if (savedPlantId && savedPlantId !== 'all') {
          setSelectedPlantIdState(savedPlantId);
        } else {
          setSelectedPlantIdState(null);
        }
      }
    }
  }, [user]);

  // Update URL and localStorage when plantId changes
  const setSelectedPlantId = (plantId: string | null) => {
    setSelectedPlantIdState(plantId);

    // Save to localStorage for persistence across page refresh/navigation
    if (plantId && plantId !== 'all') {
      localStorage.setItem('selectedPlantId', plantId);
      searchParams.set('plantId', plantId);
    } else {
      localStorage.removeItem('selectedPlantId');
      searchParams.delete('plantId');
    }
    setSearchParams(searchParams, { replace: true });
  };

  const clearPlantFilter = () => {
    localStorage.removeItem('selectedPlantId');
    setSelectedPlantId(null);
  };

  const refreshPlants = async () => {
    await fetchPlants();
  };

  const getPlantName = (plantId: string): string => {
    const plant = availablePlants.find(p => p.id === plantId);
    return plant ? plant.plantName : 'Unknown Plant';
  };

  return (
    <PlantFilterContext.Provider
      value={{
        selectedPlantId,
        availablePlants,
        isLoading,
        setSelectedPlantId,
        clearPlantFilter,
        refreshPlants,
        getPlantName,
      }}
    >
      {children}
    </PlantFilterContext.Provider>
  );
};

export const usePlantFilter = () => {
  const context = useContext(PlantFilterContext);
  if (context === undefined) {
    throw new Error('usePlantFilter must be used within a PlantFilterProvider');
  }
  return context;
};
