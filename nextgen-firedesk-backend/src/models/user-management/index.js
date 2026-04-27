const User = require('./user');
const Role = require('./role');
const Permission = require('./permission');
const RolePermission = require('./role_permission');
const RefreshToken = require('./refresh_token');
const Manager = require('./manager');
const Technician = require('./technician');
const TechnicianPlant = require('./technician_plant');
const TechnicianManager = require('./technician_manager');
const TechnicianCategory = require('./technician_category');
const PlantManager = require('./plant_manager');

// ============================================================================
// USER - ROLE ASSOCIATIONS
// ============================================================================

// User belongs to Role
User.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
});

// Role has many Users
Role.hasMany(User, {
    foreignKey: 'role_id',
    as: 'users'
});

// ============================================================================
// ROLE - PERMISSION ASSOCIATIONS (Many-to-Many)
// ============================================================================

// Role has many Permissions through RolePermission
Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions'
});

// Permission belongs to many Roles through RolePermission
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles'
});

// Direct associations for RolePermission
RolePermission.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
});

RolePermission.belongsTo(Permission, {
    foreignKey: 'permission_id',
    as: 'permission'
});

Role.hasMany(RolePermission, {
    foreignKey: 'role_id',
    as: 'role_permissions'
});

Permission.hasMany(RolePermission, {
    foreignKey: 'permission_id',
    as: 'permission_roles'
});

// ============================================================================
// REFRESH TOKEN ASSOCIATIONS
// ============================================================================

// User has one RefreshToken
User.hasOne(RefreshToken, {
    foreignKey: 'user_id',
    as: 'refresh_token',
    onDelete: 'CASCADE'
});

// RefreshToken belongs to User
RefreshToken.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// ============================================================================
// MANAGER ASSOCIATIONS
// ============================================================================

// Manager belongs to User (1:1)
Manager.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// User has one Manager profile
User.hasOne(Manager, {
    foreignKey: 'user_id',
    as: 'manager_profile'
});

// Manager created by User
Manager.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

// ============================================================================
// TECHNICIAN ASSOCIATIONS
// ============================================================================

// Technician belongs to User (1:1)
Technician.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// User has one Technician profile
User.hasOne(Technician, {
    foreignKey: 'user_id',
    as: 'technician_profile'
});

// Technician created by User
Technician.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

// ============================================================================
// TECHNICIAN - MANAGER ASSOCIATIONS (Many-to-Many)
// ============================================================================

// ============================================================================
// TECHNICIAN - MANAGER ASSOCIATIONS (Many-to-Many)
// ============================================================================

Technician.belongsToMany(Manager, {
    through: TechnicianManager,
    foreignKey: 'technician_id',
    otherKey: 'manager_id',
    as: 'managers'
});

Manager.belongsToMany(Technician, {
    through: TechnicianManager,
    foreignKey: 'manager_id',
    otherKey: 'technician_id',
    as: 'technicians'
});

// Direct associations for TechnicianManager
TechnicianManager.belongsTo(Technician, {
    foreignKey: 'technician_id',
    as: 'technician'
});

TechnicianManager.belongsTo(Manager, {
    foreignKey: 'manager_id',
    as: 'manager'
});

Technician.hasMany(TechnicianManager, {
    foreignKey: 'technician_id',
    as: 'manager_assignments'
});

Manager.hasMany(TechnicianManager, {
    foreignKey: 'manager_id',
    as: 'technician_assignments'
});

// ============================================================================
// TECHNICIAN PLANT ASSOCIATIONS
// ============================================================================

TechnicianPlant.belongsTo(Technician, {
    foreignKey: 'technician_id',
    as: 'technician'
});

TechnicianPlant.belongsTo(Manager, {
    foreignKey: 'manager_id',
    as: 'manager'
});

Technician.hasMany(TechnicianPlant, {
    foreignKey: 'technician_id',
    as: 'plant_assignments'
});

// Technician belongs to many Plants through TechnicianPlant
const Plant = require('../plants/Plant');
Technician.belongsToMany(Plant, {
    through: TechnicianPlant,
    foreignKey: 'technician_id',
    otherKey: 'plant_id',
    as: 'plants'
});

Plant.belongsToMany(Technician, {
    through: TechnicianPlant,
    foreignKey: 'plant_id',
    otherKey: 'technician_id',
    as: 'technicians'
});

TechnicianPlant.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// ============================================================================
// TECHNICIAN CATEGORY ASSOCIATIONS
// ============================================================================

TechnicianCategory.belongsTo(Technician, {
    foreignKey: 'technician_id',
    as: 'technician'
});

Technician.hasMany(TechnicianCategory, {
    foreignKey: 'technician_id',
    as: 'category_assignments'
});

// Technician belongs to many Categories through TechnicianCategory
const Category = require('../master-data/category');
Technician.belongsToMany(Category, {
    through: TechnicianCategory,
    foreignKey: 'technician_id',
    otherKey: 'category_id',
    as: 'categories'
});

Category.belongsToMany(Technician, {
    through: TechnicianCategory,
    foreignKey: 'category_id',
    otherKey: 'technician_id',
    as: 'technicians'
});

TechnicianCategory.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'category'
});

// ============================================================================
// PLANT MANAGER ASSOCIATIONS
// ============================================================================

PlantManager.belongsTo(Manager, {
    foreignKey: 'manager_id',
    as: 'manager'
});

Manager.hasMany(PlantManager, {
    foreignKey: 'manager_id',
    as: 'plant_assignments'
});

// PlantManager to Plant association (for loading plant details)
// NOTE: Plant is already imported earlier in this file
PlantManager.belongsTo(Plant, {
    foreignKey: 'plant_id',
    as: 'plant'
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    User,
    Role,
    Permission,
    RolePermission,
    RefreshToken,
    Manager,
    Technician,
    TechnicianPlant,
    TechnicianManager,
    TechnicianCategory,
    PlantManager
};
