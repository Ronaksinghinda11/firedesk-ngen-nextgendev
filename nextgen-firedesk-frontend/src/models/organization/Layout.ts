// Re-export Layout and related types from plant.types.ts
export type { Layout, Building, Floor, Wing } from '@/types/plant.types';

// DTOs for Layout API
export interface CreateLayoutDto {
  plantId: string;
  buildingId: string;
  floorId: string;
  wingId?: string;
  layoutType?: string;
  health?: string;
  layoutFile?: File;
}

export interface UpdateLayoutDto {
  plantId?: string;
  buildingId?: string;
  floorId?: string;
  wingId?: string;
  layoutType?: string;
  health?: string;
  layoutFile?: File;
}
