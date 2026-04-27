// src/utils/plant.utils.ts
import { PlantCreatePayload } from "@/types/plant.types";

/**
 * Transform legacy plant form data to normalized structure
 */
export function transformToNormalizedPlant(formData: any): PlantCreatePayload {
  const payload: PlantCreatePayload = {
    // Basic plant info
    plantName: formData.plantName,
    addressLine1: formData.address || formData.addressLine1 || '',
    addressLine2: formData.address2 || formData.addressLine2 || '',
    cityId: formData.cityId,
    stateId: formData.stateId,
    zipCode: formData.zipCode || '',
    gstNo: formData.gstNo || '',
    industryId: formData.industryId,
    numMainBuildings: formData.mainBuildings || formData.numMainBuildings || 0,
    numSubBuildings: formData.subBuildings || formData.numSubBuildings || 0,
    totalPlantArea: formData.totalPlantArea || null,
    totalBuildUpArea: formData.totalBuildUpArea || null,
    status: formData.status || 'Draft',
  };

  // Manager IDs
  if (formData.managerId) {
    payload.managerIds = [formData.managerId];
  } else if (formData.managerIds && Array.isArray(formData.managerIds)) {
    payload.managerIds = formData.managerIds;
  }

  // Transform buildings from JSONB to normalized structure
  if (formData.buildings && Array.isArray(formData.buildings)) {
    payload.buildings = formData.buildings.map((building: any) => {
      const transformedBuilding: any = {
        buildingName: building.buildingName || building.name,
        buildingHeight: building.buildingHeight || building.height || null,
        totalArea: building.totalArea || building.area || null,
        totalBuildUpArea: building.totalBuildUpArea || building.buildUpArea || null,
      };

      // Transform floors
      if (building.floors && Array.isArray(building.floors)) {
        transformedBuilding.floors = building.floors.map((floor: any) => {
          const transformedFloor: any = {
            floorName: floor.floorName || floor.name,
            usage: floor.usage || '',
            floorArea: floor.floorArea || floor.area || null,
          };

          // Transform wings
          if (floor.wings && Array.isArray(floor.wings)) {
            transformedFloor.wings = floor.wings.map((wing: any) => ({
              wingName: wing.wingName || wing.name,
              usage: wing.usage || '',
              wingArea: wing.wingArea || wing.area || null,
            }));
          }

          return transformedFloor;
        });
      }

      // Transform staircases
      if (formData.staircaseAvailable) {
        transformedBuilding.staircases = [{
          available: true,
          quantity: formData.staircaseQuantity || 0,
          type: formData.staircaseType || '',
          width: formData.staircaseWidth || null,
          fireRating: formData.staircaseFireRating || null,
          pressurization: formData.staircasePressurization || false,
          emergencyLighting: formData.staircaseEmergencyLighting || false,
          location: formData.staircaseLocation || '',
        }];
      }

      // Transform lifts
      if (formData.liftAvailable) {
        transformedBuilding.lifts = [{
          available: true,
          quantity: formData.liftQuantity || 0,
        }];
      }

      return transformedBuilding;
    });
  }

  // Transform entrances from JSONB to normalized structure
  if (formData.entrances && Array.isArray(formData.entrances)) {
    payload.entrances = formData.entrances.map((entrance: any) => ({
      entranceName: entrance.entranceName || entrance.name,
      width: entrance.width || null,
    }));
  }

  // Transform diesel generators
  if (formData.dgAvailable) {
    payload.dieselGenerators = [{
      available: true,
      quantity: formData.dgQuantity || 0,
    }];
  }

  return payload;
}

/**
 * Check if normalized endpoints are available
 */
export async function checkNormalizedEndpoints(): Promise<boolean> {
  try {
    // Try to fetch from normalized endpoint
    const response = await fetch('/api/plant/normalized', {
      method: 'HEAD',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Clean form data by removing invalid fields
 */
export function cleanPlantFormData(formData: any): any {
  const invalidFields = [
    'orgName',
    'createdDate',
    'orgId',
    'city',
    'state',
    'industry',
    'manager',
  ];

  const numericFields = [
    'headerPressure',
    'mainWaterStorage',
    'primeWaterTankStorage',
    'dieselStorage',
    'primeOverTankCapacity2',
    'staircaseFireRating',
    'numberOfBasements',
    'numberOfFloors',
    'builtUpArea',
    'plotArea',
    'totalPlantArea',
    'totalBuildUpArea',
  ];

  const enumFields = ['pressureUnit'];

  const cleanData: any = {};

  Object.keys(formData).forEach((key) => {
    // Skip invalid fields
    if (invalidFields.includes(key)) {
      return;
    }

    const value = formData[key];

    if (value !== null && value !== undefined) {
      // Convert empty strings to null for numeric and enum fields
      if (value === '' && (numericFields.includes(key) || enumFields.includes(key))) {
        cleanData[key] = null;
      } else if (value !== '') {
        // Only include non-empty values
        cleanData[key] = value;
      }
    }
  });

  return cleanData;
}

/**
 * Validate plant form data
 */
export function validatePlantData(formData: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!formData.plantName || formData.plantName.trim() === '') {
    errors.push('Plant name is required');
  }

  if (!formData.addressLine1 && !formData.address) {
    errors.push('Address is required');
  }

  if (!formData.cityId) {
    errors.push('City is required');
  }

  if (!formData.stateId) {
    errors.push('State is required');
  }

  if (!formData.industryId) {
    errors.push('Industry is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
