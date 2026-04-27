// src/services/plant.service.ts
import { api } from "@/lib/api";
import { Plant, PlantCreatePayload, FireSafetyForm, ComplianceFireSafety } from "@/types/plant.types";

export const plantService = {
  /**
   * Get all plants (legacy endpoint for backward compatibility)
   */
  async getAllPlants(): Promise<{ success: boolean; plants: Plant[] }> {
    try {
      const response = await api.get('/plants') as any;
      return {
        success: response.success || true,
        plants: response.plants || []
      };
    } catch (error) {
      console.error('Failed to fetch plants:', error);
      throw error;
    }
  },

  /**
   * Get all plants with normalized structure
   */
  async getAllPlantsNormalized(): Promise<{ success: boolean; plants: Plant[] }> {
    try {
      const response = await api.get('/plant/normalized') as any;
      return {
        success: response.success || true,
        plants: response.plants || []
      };
    } catch (error) {
      console.error('Failed to fetch normalized plants:', error);
      // Fallback to legacy endpoint
      return this.getAllPlants();
    }
  },

  /**
   * Get a single plant by ID
   */
  async getPlantById(id: string): Promise<{ success: boolean; plant: Plant }> {
    try {
      const response = await api.get(`/plant/${id}`) as any;
      return {
        success: response.success || true,
        plant: response.plant
      };
    } catch (error) {
      console.error('Failed to fetch plant:', error);
      throw error;
    }
  },

  /**
   * Get a single plant by ID with normalized structure
   */
  async getPlantByIdNormalized(id: string): Promise<{ success: boolean; plant: Plant }> {
    try {
      const response = await api.get(`/plant/normalized/${id}`) as any;
      return {
        success: response.success || true,
        plant: response.plant
      };
    } catch (error) {
      console.error('Failed to fetch normalized plant:', error);
      // Fallback to legacy endpoint
      return this.getPlantById(id);
    }
  },

  /**
   * Create a new plant (legacy format)
   */
  async createPlant(plantData: any): Promise<{ success: boolean; plant: Plant }> {
    try {
      const response = await api.post('/plant', plantData) as any;
      return {
        success: response.success || true,
        plant: response.plant
      };
    } catch (error) {
      console.error('Failed to create plant:', error);
      throw error;
    }
  },

  /**
   * Create a new plant with normalized structure
   */
  async createPlantNormalized(plantData: PlantCreatePayload): Promise<{ success: boolean; plant: Plant }> {
    try {
      const response = await api.post('/plant/normalized', plantData) as any;
      return {
        success: response.success || true,
        plant: response.plant
      };
    } catch (error) {
      console.error('Failed to create normalized plant:', error);
      throw error;
    }
  },

  /**
   * Update a plant
   */
  async updatePlant(id: string, plantData: Partial<Plant>): Promise<{ success: boolean; plant: Plant }> {
    try {
      const response = await api.put(`/plant/${id}`, plantData) as any;
      return {
        success: response.success || true,
        plant: response.plant
      };
    } catch (error) {
      console.error('Failed to update plant:', error);
      throw error;
    }
  },

  /**
   * Update a plant with normalized structure
   */
  async updatePlantNormalized(id: string, plantData: Partial<PlantCreatePayload>): Promise<{ success: boolean; plant: Plant }> {
    try {
      const response = await api.put(`/plant/normalized/${id}`, plantData) as any;
      return {
        success: response.success || true,
        plant: response.plant
      };
    } catch (error) {
      console.error('Failed to update normalized plant:', error);
      // Fallback to legacy endpoint
      return this.updatePlant(id, plantData as any);
    }
  },

  /**
   * Delete a plant
   */
  async deletePlant(id: string): Promise<{ success: boolean }> {
    try {
      const response = await api.delete(`/plant/${id}`) as any;
      return {
        success: response.success || true
      };
    } catch (error) {
      console.error('Failed to delete plant:', error);
      throw error;
    }
  },

  /**
   * Create fire safety form
   */
  async createFireSafetyForm(formData: FireSafetyForm): Promise<{ success: boolean; fireSafetyForm: FireSafetyForm }> {
    try {
      const response = await api.post('/plant/fire-safety', formData) as any;
      return {
        success: response.success || true,
        fireSafetyForm: response.fireSafetyForm
      };
    } catch (error) {
      console.error('Failed to create fire safety form:', error);
      throw error;
    }
  },

  /**
   * Get fire safety forms for a plant
   */
  async getFireSafetyForms(plantId: string): Promise<{ success: boolean; fireSafetyForms: FireSafetyForm[] }> {
    try {
      const response = await api.get(`/plant/${plantId}/fire-safety`) as any;
      return {
        success: response.success || true,
        fireSafetyForms: response.fireSafetyForms || []
      };
    } catch (error) {
      console.error('Failed to fetch fire safety forms:', error);
      throw error;
    }
  },

  /**
   * Create compliance record
   */
  async createComplianceRecord(formData: ComplianceFireSafety): Promise<{ success: boolean; compliance: ComplianceFireSafety }> {
    try {
      const response = await api.post('/plant/compliance', formData) as any;
      return {
        success: response.success || true,
        compliance: response.compliance
      };
    } catch (error) {
      console.error('Failed to create compliance record:', error);
      throw error;
    }
  },

  /**
   * Get compliance records for a plant
   */
  async getComplianceRecords(plantId: string): Promise<{ success: boolean; complianceRecords: ComplianceFireSafety[] }> {
    try {
      const response = await api.get(`/plant/${plantId}/compliance`) as any;
      return {
        success: response.success || true,
        complianceRecords: response.complianceRecords || []
      };
    } catch (error) {
      console.error('Failed to fetch compliance records:', error);
      throw error;
    }
  }
};
