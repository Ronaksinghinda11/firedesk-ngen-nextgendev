/**
 * API Request/Response Types
 * TypeScript-style interfaces for frontend reference
 */

// ============================================
// AUTH TYPES
// ============================================

/**
 * Login Request
 * POST /auth/login
 */
const LoginRequest = {
    email: 'string (required)',  // Email or phone
    password: 'string (required)'
};

/**
 * Login Response
 */
const LoginResponse = {
    success: true,
    message: 'Login successful',
    user: {
        id: 'uuid',
        name: 'string',
        email: 'string',
        phone: 'string | null',
        status: 'Active | Inactive',
        role: {
            id: 'uuid',
            name: 'string',
            description: 'string'
        }
    },
    access_token: 'jwt-token'
};

/**
 * Signup Request
 * POST /auth/signup
 */
const SignupRequest = {
    name: 'string (required, min 2 chars)',
    email: 'string (required, valid email)',
    phone: 'string (optional, 10 digit Indian)',
    password: 'string (required, min 6 chars)',
    confirm_password: 'string (required, must match password)'
};

// ============================================
// USER TYPES
// ============================================

/**
 * Create User Request
 * POST /users
 */
const CreateUserRequest = {
    name: 'string (required)',
    email: 'string (required)',
    phone: 'string (optional)',
    password: 'string (required)',
    role_id: 'uuid (required)',
    status: 'Active | Inactive (optional, default Active)'
};

/**
 * Update User Request
 * PUT /users/:id
 */
const UpdateUserRequest = {
    name: 'string (optional)',
    email: 'string (optional)',
    phone: 'string (optional)',
    status: 'Active | Inactive (optional)'
};

// ============================================
// ROLE TYPES
// ============================================

/**
 * Create Role Request
 * POST /roles
 */
const CreateRoleRequest = {
    name: 'string (required)',
    description: 'string (optional)'
};

/**
 * Assign Permissions Request
 * PUT /roles/:id/permissions
 */
const AssignPermissionsRequest = {
    permission_ids: ['uuid array (required)']
};

// ============================================
// MANAGER TYPES
// ============================================

/**
 * Create Manager Request
 * POST /managers
 */
const CreateManagerRequest = {
    name: 'string (required)',
    email: 'string (required)',
    phone: 'string (optional)',
    password: 'string (required)',
    role_id: 'uuid (required - Manager role ID)',
    plant_ids: ['uuid array (optional)']
};

// ============================================
// TECHNICIAN TYPES
// ============================================

/**
 * Create Technician Request
 * POST /technicians
 */
const CreateTechnicianRequest = {
    name: 'string (required)',
    email: 'string (required)',
    phone: 'string (optional)',
    role_id: 'uuid (required - Technician role ID)',
    technician_type: 'In House | Third Party (required)',
    plant_id: 'uuid (for In House)',
    plant_ids: ['uuid array (for Third Party)'],
    manager_ids: ['uuid array (optional)'],
    category_ids: ['uuid array (optional)'],
    vendor_id: 'uuid (for Third Party)',
    experience: 'string (optional)',
    specialization: 'string (optional)'
};

// ============================================
// COMMON RESPONSE TYPES
// ============================================

const SuccessResponse = {
    success: true,
    message: 'string',
    data: 'object | array'
};

const ErrorResponse = {
    success: false,
    message: 'string'
};

module.exports = {
    // Auth
    LoginRequest,
    LoginResponse,
    SignupRequest,

    // User
    CreateUserRequest,
    UpdateUserRequest,

    // Role
    CreateRoleRequest,
    AssignPermissionsRequest,

    // Manager
    CreateManagerRequest,

    // Technician
    CreateTechnicianRequest,

    // Common
    SuccessResponse,
    ErrorResponse
};
