/**
 * Configuration Index
 * Export all configuration values
 */
require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3001,

    // JWT Secrets
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,

    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT || 5432,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // SMS
    SMS_AUTH_KEY: process.env.SMS_AUTH_KEY,
    SMS_AUTH_TOKEN: process.env.SMS_AUTH_TOKEN,
    SMS_SENDERID: process.env.SMS_SENDERID,

    // Email (optional)
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'NextGen FireDesk',

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
