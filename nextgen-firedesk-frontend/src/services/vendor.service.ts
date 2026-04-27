// src/services/vendor.service.ts
import { api } from "@/lib/api";

export interface Vendor {
  id: string;
  vendorName: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface VendorResponse {
  success: boolean;
  vendors?: Vendor[];
  vendor?: Vendor;
  message?: string;
}

export const vendorService = {
  /**
   * Get all vendors
   */
  async getVendors(): Promise<VendorResponse> {
    try {
      const response = await api.get("/master-data/vendors") as any;
      return {
        success: response.success || true,
        vendors: response.vendors || [],
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch vendors:", error);
      throw error;
    }
  },

  /**
   * Get all active vendors (for dropdowns)
   */
  async getActiveVendors(): Promise<VendorResponse> {
    try {
      const response = await api.get("/master-data/vendors/active") as any;
      return {
        success: response.success || true,
        vendors: response.vendors || [],
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch active vendors:", error);
      throw error;
    }
  },

  /**
   * Get a single vendor by ID
   */
  async getVendorById(id: string): Promise<VendorResponse> {
    try {
      const response = await api.get(`/master-data/vendors/${id}`) as any;
      return {
        success: response.success || true,
        vendor: response.vendor,
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch vendor:", error);
      throw error;
    }
  },

  /**
   * Create a new vendor
   */
  async createVendor(data: { vendorName: string; status?: string }): Promise<VendorResponse> {
    try {
      const response = await api.post("/master-data/vendors", data) as any;
      return {
        success: response.success || true,
        vendor: response.vendor,
        message: response.message || "Vendor created successfully",
      };
    } catch (error: any) {
      console.error("Failed to create vendor:", error);
      throw error;
    }
  },

  /**
   * Update an existing vendor
   */
  async updateVendor(
    id: string,
    data: { vendorName: string; status?: string }
  ): Promise<VendorResponse> {
    try {
      const response = await api.put(`/master-data/vendors/${id}`, data) as any;
      return {
        success: response.success || true,
        vendor: response.vendor,
        message: response.message || "Vendor updated successfully",
      };
    } catch (error: any) {
      console.error("Failed to update vendor:", error);
      throw error;
    }
  },

  /**
   * Delete a vendor
   */
  async deleteVendor(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.delete(`/master-data/vendors/${id}`) as any;
      return {
        success: response.success || true,
        message: response.message || "Vendor deleted successfully",
      };
    } catch (error: any) {
      console.error("Failed to delete vendor:", error);
      throw error;
    }
  },
};
