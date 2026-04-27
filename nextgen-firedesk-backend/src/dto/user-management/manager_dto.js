/**
 * Manager DTO - Data Transfer Object for Manager responses
 */
class ManagerDTO {
    constructor(manager) {
        this.id = manager.id;
        this.manager_code = manager.manager_code;
        this.user_id = manager.user_id;
        this.status = manager.status || "Active";
        this.created_at = manager.created_at;
        this.updated_at = manager.updated_at;

        // User information
        if (manager.user) {
            this.user = {
                id: manager.user.id,
                name: manager.user.name,
                email: manager.user.email,
                phone: manager.user.phone,
                profile_pic: manager.user.profile_pic,
                status: manager.user.status
            };

            // Flatten common fields for convenience
            this.name = manager.user.name;
            this.email = manager.user.email;
            this.phone = manager.user.phone;
        }

        // Plant associations
        if (manager.plants && Array.isArray(manager.plants)) {
            this.plants = manager.plants.map(plant => ({
                id: plant.id,
                plant_name: plant.plant_name || plant.plantName,
                plant_code: plant.plant_code || plant.plantCode
            }));
            this.plant_ids = this.plants.map(p => p.id);
        } else {
            this.plants = [];
            this.plant_ids = [];
        }

        // Creator information
        if (manager.creator) {
            this.created_by = {
                id: manager.creator.id,
                name: manager.creator.name
            };
        }
    }

    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            id: this.id,
            manager_code: this.manager_code,
            user_id: this.user_id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            status: this.status,
            user: this.user,
            plants: this.plants,
            plant_ids: this.plant_ids,
            created_by: this.created_by,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = ManagerDTO;
