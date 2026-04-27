// src/services/edge-device.service.ts
import { api } from "@/lib/api";

export interface EdgeDevice {
  id: string;
  deviceName: string;
  deviceCode: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface EdgeDeviceResponse {
  success: boolean;
  edgeDevices?: EdgeDevice[];
  edgeDevice?: EdgeDevice;
  message?: string;
}

export const edgeDeviceService = {
  /**
   * Get all edge devices
   */
  async getEdgeDevices(): Promise<EdgeDeviceResponse> {
    try {
      const response = await api.get("/edge-device") as any;
      return {
        success: response.success || true,
        edgeDevices: response.edgeDevices || [],
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch edge devices:", error);
      throw error;
    }
  },

  /**
   * Get all active edge devices (for dropdowns)
   */
  async getActiveEdgeDevices(): Promise<EdgeDeviceResponse> {
    try {
      const response = await api.get("/edge-device/active") as any;
      return {
        success: response.success || true,
        edgeDevices: response.edgeDevices || [],
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch active edge devices:", error);
      throw error;
    }
  },

  /**
   * Get a single edge device by ID
   */
  async getEdgeDeviceById(id: string): Promise<EdgeDeviceResponse> {
    try {
      const response = await api.get(`/edge-device/${id}`) as any;
      return {
        success: response.success || true,
        edgeDevice: response.edgeDevice,
        message: response.message,
      };
    } catch (error: any) {
      console.error("Failed to fetch edge device:", error);
      throw error;
    }
  },

  /**
   * Create a new edge device
   */
  async createEdgeDevice(data: {
    deviceName: string;
    deviceCode: string;
    status?: string;
  }): Promise<EdgeDeviceResponse> {
    try {
      const response = await api.post("/edge-device", data) as any;
      return {
        success: response.success || true,
        edgeDevice: response.edgeDevice,
        message: response.message || "Edge Device created successfully",
      };
    } catch (error: any) {
      console.error("Failed to create edge device:", error);
      throw error;
    }
  },

  /**
   * Update an existing edge device
   */
  async updateEdgeDevice(
    id: string,
    data: {
      deviceName: string;
      deviceCode: string;
      status?: string;
    }
  ): Promise<EdgeDeviceResponse> {
    try {
      const response = await api.put(`/edge-device/${id}`, data) as any;
      return {
        success: response.success || true,
        edgeDevice: response.edgeDevice,
        message: response.message || "Edge Device updated successfully",
      };
    } catch (error: any) {
      console.error("Failed to update edge device:", error);
      throw error;
    }
  },

  /**
   * Delete an edge device
   */
  async deleteEdgeDevice(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.delete(`/edge-device/${id}`) as any;
      return {
        success: response.success || true,
        message: response.message || "Edge Device deleted successfully",
      };
    } catch (error: any) {
      console.error("Failed to delete edge device:", error);
      throw error;
    }
  },
};
