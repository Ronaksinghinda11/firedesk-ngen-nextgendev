/**
 * Database Configuration
 * Sequelize instance and connection
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create Sequelize instance from DATABASE_URL or individual params
const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
            ssl: process.env.DATABASE_URL.includes('sslmode=require')
                ? { require: true, rejectUnauthorized: false }
                : false
        },
        pool: {
            max: 25,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
    })
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            pool: {
                max: 25,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
    );

module.exports = { sequelize };
