// src/types/plant.types.ts

export interface Building {
    id?: string;
    plantId?: string;
    buildingName: string;
    buildingHeight?: number;
    totalArea?: number;
    totalBuildUpArea?: number;
    floors?: Floor[];
    staircases?: Staircase[];
    lifts?: Lift[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Floor {
    id?: string;
    buildingId?: string;
    floorName: string;
    usage?: string;
    floorArea?: number;
    wings?: Wing[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Wing {
    id?: string;
    floorId?: string;
    wingName: string;
    usage?: string;
    wingArea?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Entrance {
    id?: string;
    plantId?: string;
    entranceName: string;
    width?: number;
}

export interface DieselGenerator {
    id?: string;
    plantId?: string;
    available: boolean;
    quantity: number;
}

export interface Staircase {
    id?: string;
    buildingId?: string;
    available: boolean;
    quantity: number;
    type?: string;
    width?: number;
    fireRating?: number;
    pressurization?: boolean;
    emergencyLighting?: boolean;
    location?: string;
}

export interface Lift {
    id?: string;
    buildingId?: string;
    available: boolean;
    quantity: number;
}

export interface FireSafetyForm {
    id?: string;
    plantId?: string;
    primeOverTankCapacity?: number;
    terraceTankCapacity?: number;
    dieselTank1Capacity?: number;
    dieselTank2Capacity?: number;
    headerPressureBar?: number;
    systemCommissionDate?: string;
    amcVendorId?: string;
    amcVendor?: Vendor;
    amcStartDate?: string;
    amcEndDate?: string;
    numFireExtinguishers?: number;
    numHydrantPoints?: number;
    numSprinklers?: number;
    numSafeAssemblyAreas?: number;
    dieselEngine?: number;
    electricalPump?: number;
    jockeyPump?: number;
}

export interface ComplianceFireSafety {
    id?: string;
    plantId?: string;
    fireNocNumber: string;
    nocValidityDate: string;
    insurancePolicyNumber: string;
    insurerName: string;
    insuranceValidityDate?: string;
    numFireExtinguishers: number;
    numHydrantPoints: number;
    numSprinklers: number;
    numSafeAssemblyAreas: number;
    documentUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface MonitoringForm {
    id?: string;
    plantId?: string;
    buildingId?: string;
    floorId?: string;
    building?: Building;
    floor?: Floor;
    devices?: MonitoringDevice[];
    createdAt?: string;
}

export interface MonitoringDevice {
    id?: string;
    monitoringFormId?: string;
    edgeDeviceId?: string;
    edgeDevice?: EdgeDevice;
}

export interface Layout {
    id?: string;
    plantId?: string;
    buildingId?: string;
    floorId?: string;
    wingId?: string;
    plant?: Plant;
    building?: Building;
    floor?: Floor;
    wing?: Wing;
    layoutType?: string;
    health?: string;
    // Legacy fields (kept for backward compatibility)
    layoutUrl?: string;
    svgPicture?: string;
    // NEW: Binary storage fields
    dataUrl?: string; // Base64 encoded data URL (SVG or PDF)
    fileName?: string;
    fileSizeBytes?: number;
    mimeType?: string; // e.g. 'image/svg+xml' or 'application/pdf'
    // Legacy snake_case aliases (kept for backward compat)
    file_name?: string;
    file_size?: number;
    mime_type?: string;
}

export interface Vendor {
    id: string;
    vendorName: string;
}

export interface EdgeDevice {
    id: string;
    deviceName: string;
    deviceCode: string;
}

export interface Manager {
    id: string;
    managerId: string;
    userId: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface Plant {
    id: string;
    plantName: string;
    address: string;
    cityId?: string;
    stateId?: string;
    zipCode?: string;
    gstNo?: string;
    industryId?: string;
    mainBuildings?: number;
    subBuildings?: number;
    totalPlantArea?: number;
    totalBuildUpArea?: number;
    status: 'Active' | 'Deactive' | 'Draft';

    // Relations
    city?: {
        id: string;
        cityName: string;
        state?: {
            id: string;
            stateName: string;
        };
    };
    state?: {
        id: string;
        stateName: string;
    };
    industry?: {
        id: string;
        industryName: string;
    };
    managers?: Manager[];
    buildings?: Building[];
    entrances?: Entrance[];
    dieselGenerators?: DieselGenerator[];
    fireSafetyForms?: FireSafetyForm[];
    complianceForms?: ComplianceFireSafety[];
    monitoringForms?: MonitoringForm[];
    layouts?: Layout[];

    // Legacy fields for backward compatibility (from denormalized schema)
    orgUserId?: string;
    plantImage?: string;
    pumpIotDeviceId?: string;
    primeOverTankCapacity?: number;
    numFireExtinguishers?: number;
    numHydrantPoints?: number;
    numSprinklers?: number;

    // Timestamps
    createdAt?: string;
    updatedAt?: string;
}

export interface PlantCreatePayload {
    plantName: string;
    addressLine1: string;
    addressLine2?: string;
    cityId: string;
    stateId: string;
    zipCode?: string;
    gstNo?: string;
    industryId: string;
    numMainBuildings?: number;
    numSubBuildings?: number;
    totalPlantArea?: number;
    totalBuildUpArea?: number;
    status?: 'Active' | 'Deactive' | 'Draft';

    // Manager IDs array
    managerIds?: string[];

    // Buildings array with nested floors and wings
    buildings?: {
        buildingName: string;
        buildingHeight?: number;
        totalArea?: number;
        totalBuildUpArea?: number;
        floors?: {
            floorName: string;
            usage?: string;
            floorArea?: number;
            wings?: {
                wingName: string;
                usage?: string;
                wingArea?: number;
            }[];
        }[];
        staircases?: {
            available?: boolean;
            quantity?: number;
            type?: string;
            width?: number;
            fireRating?: number;
            pressurization?: boolean;
            emergencyLighting?: boolean;
            location?: string;
        }[];
        lifts?: {
            available?: boolean;
            quantity?: number;
        }[];
    }[];

    // Entrances array
    entrances?: {
        entranceName: string;
        width?: number;
    }[];

    // Diesel Generators
    dieselGenerators?: {
        available?: boolean;
        quantity?: number;
    }[];
}
