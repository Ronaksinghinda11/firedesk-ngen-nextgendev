export interface Organization {
    id: string;
    organizationName: string; // Mapped from organization_name
    organizationCode: string; // Mapped from organization_code
    address: string;
    country?: string;
    state?: string;
    city?: string;
    gstNumber?: string;
    createdAt?: string;
    updatedAt?: string;
    noOfPlants?: number;
}

export interface OrganizationFormData {
    organizationName: string;
    address: string;
    country?: string;
    state?: string;
    city?: string;
    gstNumber?: string;
    organizationCode?: string;
}

export interface OrganizationResponse {
    success: boolean;
    data?: Organization;
    message?: string;
    organization?: Organization; // Support both structures
}
