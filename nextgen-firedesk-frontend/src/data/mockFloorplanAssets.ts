// Asset interface for compatibility with existing components
// Now matches the API FloorplanAsset interface
export interface Asset {
  id: string;
  assetId?: string;    // For compatibility with backend
  type: string;
  name: string;
  x: number;           // SVG/CAD coordinates
  y: number;           // SVG/CAD coordinates  
  status: "green" | "yellow" | "red";  // Repository status system
  layoutId?: string;   // Layout reference
  // Admin mode fields
  originalX?: number;  // Store original coordinates for change tracking
  originalY?: number;
  isDirty?: boolean;   // Track unsaved changes
  createdBy?: string;  // Track who created/modified
  createdAt?: string;  // Creation timestamp
  modifiedAt?: string; // Last modification timestamp
  plantId?: string;    // Plant reference
  // Geo location fields
  lat?: string;        // Latitude coordinate
  long?: string;       // Longitude coordinate
  // Service tracking fields
  lastInspectionDate?: string;   // Legacy - Last service/inspection date
  nextInspectionDue?: string;    // Legacy - Next service due date
  // Service frequencies from scheduler
  serviceFrequencies?: {
    inspection?: string;
    testing?: string;
    maintenance?: string;
  };
  // Service dates from ServiceSubmissions table - per service type
  serviceDates?: {
    lastServiceDates: {
      inspection?: string;
      testing?: string;
      maintenance?: string;
    };
    nextServiceDates: {
      inspection?: string;
      testing?: string;
      maintenance?: string;
    };
  };
  metadata?: Record<string, unknown>; // For flexible additional data
  meta?: {             // Legacy compatibility
    lastCheck?: string;
    battery?: number;
    temperature?: number;
    description?: string;
    [key: string]: unknown;
  };
}

// Asset type configurations for display
export const assetTypeConfig = {
  smoke_detector: {
    color: "#3b82f6", // blue
    icon: "🔍",
    label: "Smoke Detector"
  },
  fire_extinguisher: {
    color: "#ef4444", // red
    icon: "🧯",
    label: "Fire Extinguisher"
  },
  sprinkler: {
    color: "#06b6d4", // cyan
    icon: "💧",
    label: "Sprinkler"
  },
  fire_alarm: {
    color: "#f59e0b", // amber
    icon: "🚨",
    label: "Fire Alarm"
  },
  fire_hydrant: {
    color: "#10b981", // emerald 
    icon: "🚰",
    label: "Fire Hydrant"
  }
};

// Status configurations (repository style: green/yellow/red)
export const statusConfig = {
  green: {
    color: "#10b981", // emerald
    label: "Healthy",
    priority: 1
  },
  yellow: {
    color: "#f59e0b", // amber
    label: "Attention Required",
    priority: 2
  },
  red: {
    color: "#ef4444", // red
    label: "Critical",
    priority: 3
  }
};