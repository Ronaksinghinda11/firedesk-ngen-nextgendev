// src/services/organization.service.ts
import { api } from "@/lib/api";
import {
  Organization,
  OrganizationFormData,
  OrganizationResponse,
} from "@/types/organization.types";

export const organizationService = {
  /**
   * Get Organization
   */
  async getOrganization(): Promise<OrganizationResponse> {
    try {
      const response = await api.get("/organization") as any;
      return {
        success: response.success || true,
        data: response.organization,
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch Organization:", error);
      // Return 404 error gracefully
      if (error?.response?.status === 404) {
        return {
          success: false,
          message: "Organization not found",
        };
      }
      throw error;
    }
  },

  /**
   * Create a new Organization
   */
  async createOrganization(data: OrganizationFormData): Promise<OrganizationResponse> {
    try {
      const response = await api.post("/organization", data) as any;
      return {
        success: response.success || true,
        data: response.organization,
        message: response.message || "Organization created successfully",
      };
    } catch (error: any) {
      console.error("Failed to create Organization:", error);
      throw error;
    }
  },

  /**
   * Update an existing Organization
   */
  async updateOrganization(
    id: string,
    data: OrganizationFormData
  ): Promise<OrganizationResponse> {
    try {
      const response = await api.put(`/organization/${id}`, data) as any;
      return {
        success: response.success || true,
        data: response.organization,
        message: response.message || "Organization updated successfully",
      };
    } catch (error: any) {
      console.error("Failed to update Organization:", error);
      throw error;
    }
  },
};
