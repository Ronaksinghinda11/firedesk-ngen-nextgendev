import { api } from './api';

export const incidentService = {
    async getIncidentSubtypes() {
        return api.get('/sams/lookup/incident-subtype');
    },

    async getPlants() {
        return api.get('/technician/my-assigned-plant');
    },

    async getBuildings(plantId: string) {
        return api.get('/buildings', { params: { plantId } });
    },

    async getFloors(buildingId: string) {
        return api.get('/floors', { params: { buildingId } });
    },

    async createIncident(data: any) {
        // Clean up empty strings - convert to null for optional UUID fields
        const cleanData = {
            ...data,
            buildingId: data.buildingId || null,
            floorId: data.floorId || null,
        };
        console.log('[Incident Service] Creating incident with data:', JSON.stringify(cleanData, null, 2));
        return api.post('/sams/incident', cleanData);
    }
};
