/**
 * JWT Service - Handles JWT token operations
 */
const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = require('../../config');

class JWTService {
    /**
     * Sign access token
     * @param {Object} payload - Token payload
     * @param {string|null} expiry_time - Token expiry time (e.g., '1d', '1h')
     * @returns {string}
     */
    static signAccessToken(payload, expiry_time = null) {
        const options = expiry_time ? { expiresIn: expiry_time } : {};
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, options);
    }

    /**
     * Sign refresh token
     * @param {Object} payload - Token payload
     * @param {string|null} expiry_time - Token expiry time
     * @returns {string}
     */
    static signRefreshToken(payload, expiry_time = null) {
        const options = expiry_time ? { expiresIn: expiry_time } : {};
        return jwt.sign(payload, REFRESH_TOKEN_SECRET, options);
    }

    /**
     * Verify access token
     * @param {string} token - Access token
     * @returns {Object}
     */
    static verifyAccessToken(token) {
        return jwt.verify(token, ACCESS_TOKEN_SECRET);
    }

    /**
     * Verify refresh token
     * @param {string} token - Refresh token
     * @returns {Object}
     */
    static verifyRefreshToken(token) {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    }
}

module.exports = JWTService;
