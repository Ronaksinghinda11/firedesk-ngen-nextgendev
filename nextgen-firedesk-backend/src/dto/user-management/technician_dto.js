/**
 * Technician DTO - Data Transfer Object for Technician responses
 */
class TechnicianDTO {
    constructor(technician) {
        this.id = technician.id;
        this.technician_code = technician.technician_code;
        this.user_id = technician.user_id;
        this.technician_type = technician.technician_type || "In House";
        this.experience = technician.experience;
        this.specialization = technician.specialization;
        this.status = technician.status || "Active";
        this.created_at = technician.created_at;
        this.updated_at = technician.updated_at;

        // User information
        if (technician.user) {
            this.user = {
                id: technician.user.id,
                name: technician.user.name,
                email: technician.user.email,
                phone: technician.user.phone,
                profile_pic: technician.user.profile_pic,
                status: technician.user.status
            };

            // Flatten common fields for convenience
            this.name = technician.user.name;
            this.email = technician.user.email;
            this.phone = technician.user.phone;

            // Include role from user if available
            if (technician.user.role) {
                this.role = {
                    id: technician.user.role.id,
                    name: technician.user.role.name
                };
            }
        }

        // Plant associations (M:M through technician_plants)
        if (technician.plants && Array.isArray(technician.plants)) {
            this.plants = technician.plants.map(plant => {
                const plant_data = {
                    id: plant.id,
                    plant_name: plant.plant_name || plant.plantName
                };

                // Include manager from junction table if available
                if (plant.TechnicianPlant && plant.TechnicianPlant.manager) {
                    plant_data.assigned_manager = {
                        id: plant.TechnicianPlant.manager.id,
                        manager_code: plant.TechnicianPlant.manager.manager_code,
                        name: plant.TechnicianPlant.manager.user?.name
                    };
                }

                return plant_data;
            });
            this.plant_ids = this.plants.map(p => p.id);
        } else {
            this.plants = [];
            this.plant_ids = [];
        }

        // Manager associations (M:M through technician_managers)
        if (technician.managers && Array.isArray(technician.managers)) {
            this.managers = technician.managers.map(manager => ({
                id: manager.id,
                manager_code: manager.manager_code,
                name: manager.user?.name
            }));
            this.manager_ids = this.managers.map(m => m.id);
        } else {
            this.managers = [];
            this.manager_ids = [];
        }

        // Category associations (M:M through technician_categories)
        if (technician.categories && Array.isArray(technician.categories)) {
            this.categories = technician.categories.map(category => ({
                id: category.id,
                category_name: category.category_name || category.categoryName
            }));
            this.category_ids = this.categories.map(c => c.id);
        } else {
            this.categories = [];
            this.category_ids = [];
        }

        // Vendor information (for Third Party technicians)
        if (technician.vendor) {
            this.vendor = {
                id: technician.vendor.id,
                vendor_name: technician.vendor.vendor_name || technician.vendor.vendorName,
                status: technician.vendor.status
            };
            this.vendor_id = technician.vendor.id;
        } else {
            this.vendor = null;
            this.vendor_id = technician.vendor_id || null;
        }

        // Creator information
        if (technician.creator) {
            this.created_by = {
                id: technician.creator.id,
                name: technician.creator.name
            };
        }
    }

    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            id: this.id,
            technician_code: this.technician_code,
            user_id: this.user_id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            technician_type: this.technician_type,
            experience: this.experience,
            specialization: this.specialization,
            status: this.status,
            user: this.user,
            role: this.role,
            plants: this.plants,
            plant_ids: this.plant_ids,
            managers: this.managers,
            manager_ids: this.manager_ids,
            categories: this.categories,
            category_ids: this.category_ids,
            vendor: this.vendor,
            vendor_id: this.vendor_id,
            created_by: this.created_by,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = TechnicianDTO;
