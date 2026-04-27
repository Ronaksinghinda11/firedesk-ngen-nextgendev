/**
 * API Endpoints Reference
 * Use this file to easily connect frontend with backend
 */

// Base URL - Change this based on environment
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ============================================
// AUTH ENDPOINTS
// ============================================
const AUTH = {
    LOGIN: `${BASE_URL}/auth/login`,           // POST
    SIGNUP: `${BASE_URL}/auth/signup`,         // POST
    LOGOUT: `${BASE_URL}/auth/logout`,         // POST
    REFRESH: `${BASE_URL}/auth/refresh`,       // POST
    ME: `${BASE_URL}/auth/me`,                 // GET
    CHANGE_PASSWORD: `${BASE_URL}/auth/change-password`,    // POST
    FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,    // POST
    VERIFY_OTP: `${BASE_URL}/auth/verify-otp`,              // POST
    RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,      // POST
};

// ============================================
// USER ENDPOINTS
// ============================================
const USERS = {
    LIST: `${BASE_URL}/users`,                 // GET
    GET: (id) => `${BASE_URL}/users/${id}`,    // GET
    CREATE: `${BASE_URL}/users`,               // POST
    UPDATE: (id) => `${BASE_URL}/users/${id}`, // PUT
    DELETE: (id) => `${BASE_URL}/users/${id}`, // DELETE
    UPDATE_ROLE: (id) => `${BASE_URL}/users/${id}/role`, // PUT
    CHECK_PHONE: `${BASE_URL}/users/check-phone`, // POST
};

// ============================================
// ROLE ENDPOINTS
// ============================================
const ROLES = {
    LIST: `${BASE_URL}/roles`,                 // GET
    GET: (id) => `${BASE_URL}/roles/${id}`,    // GET
    CREATE: `${BASE_URL}/roles`,               // POST
    UPDATE: (id) => `${BASE_URL}/roles/${id}`, // PUT
    DELETE: (id) => `${BASE_URL}/roles/${id}`, // DELETE
    ASSIGN_PERMISSIONS: (id) => `${BASE_URL}/roles/${id}/permissions`, // PUT
};

// ============================================
// PERMISSION ENDPOINTS
// ============================================
const PERMISSIONS = {
    LIST: `${BASE_URL}/permissions`,           // GET
    GROUPED: `${BASE_URL}/permissions/grouped`, // GET
    CONSTANTS: `${BASE_URL}/permissions/constants`, // GET
    BY_ROLE: (roleId) => `${BASE_URL}/permissions/role/${roleId}`, // GET
    SYNC: `${BASE_URL}/permissions/sync`,      // POST
};

// ============================================
// MANAGER ENDPOINTS
// ============================================
const MANAGERS = {
    LIST: `${BASE_URL}/managers`,              // GET
    GET: (id) => `${BASE_URL}/managers/${id}`, // GET
    CREATE: `${BASE_URL}/managers`,            // POST
    UPDATE: (id) => `${BASE_URL}/managers/${id}`, // PUT
    DELETE: (id) => `${BASE_URL}/managers/${id}`, // DELETE
    UPDATE_STATUS: (id) => `${BASE_URL}/managers/${id}/status`, // PUT
};

// ============================================
// TECHNICIAN ENDPOINTS
// ============================================
const TECHNICIANS = {
    LIST: `${BASE_URL}/technicians`,           // GET
    GET: (id) => `${BASE_URL}/technicians/${id}`, // GET
    CREATE: `${BASE_URL}/technicians`,         // POST
    UPDATE: (id) => `${BASE_URL}/technicians/${id}`, // PUT
    DELETE: (id) => `${BASE_URL}/technicians/${id}`, // DELETE
};

// Export all endpoints
module.exports = {
    BASE_URL,
    AUTH,
    USERS,
    ROLES,
    PERMISSIONS,
    MANAGERS,
    TECHNICIANS,
};
