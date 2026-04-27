/**
 * Master Data Schema Migration
 * Migrates all master data tables from INTEGER to UUID primary keys
 * Updates field names, types, and relationships
 * 
 * IMPORTANT: This is a destructive migration that will:
 * - Drop and recreate tables with new schemas
 * - All existing data will be lost
 * - Make sure to backup your database before running
 * 
 * For production, you'll need to:
 * 1. Export existing data
 * 2. Run migration
 * 3. Transform and re-import data with UUIDs
 */

'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('Starting master data schema migration...');

            // NOTE: Countries, States, Cities are handled by react-country-state-city library
            // No database tables needed for location data

            // ==========================================
            // 1. DROP AND RECREATE CATEGORIES TABLE (IF EXISTS)
            // ==========================================
            console.log('Recreating categories table...');
            await queryInterface.dropTable('categories', { transaction, cascade: true }).catch(() => {
                console.log('  → Categories table did not exist, creating fresh...');
            });

            await queryInterface.createTable('categories', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                category_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                category_code: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true
                },
                test_frequency_required: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                status: {
                    type: Sequelize.ENUM('Active', 'Inactive'),
                    defaultValue: 'Active',
                    allowNull: false
                },
                created_by: {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                created_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                },
                updated_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                }
            }, { transaction });

            // ==========================================
            // 2. DROP AND RECREATE CATEGORY_FILES TABLE (IF EXISTS)
            // ==========================================
            console.log('Recreating category_files table...');
            await queryInterface.dropTable('category_files', { transaction, cascade: true }).catch(() => {
                console.log('  → Category_files table did not exist, creating fresh...');
            });

            await queryInterface.createTable('category_files', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                category_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: {
                        model: 'categories',
                        key: 'id'
                    }
                },
                file_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                mime_type: {
                    type: Sequelize.STRING(100),
                    allowNull: true
                },
                file_size: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                storage_path: {
                    type: Sequelize.STRING(500),
                    allowNull: false
                },
                uploaded_by: {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                created_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                },
                updated_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                }
            }, { transaction });

            // ==========================================
            // 3. DROP AND RECREATE PRODUCTS TABLE (IF EXISTS)
            // ==========================================
            console.log('Recreating products table...');
            await queryInterface.dropTable('products', { transaction, cascade: true }).catch(() => {
                console.log('  → Products table did not exist, creating fresh...');
            });

            await queryInterface.createTable('products', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                category_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: {
                        model: 'categories',
                        key: 'id'
                    }
                },
                product_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                    unique: true
                },
                product_code: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true
                },
                test_frequency: {
                    type: Sequelize.ENUM('One Year', 'Two Years', 'Three Years', 'Five Years', 'Ten Years'),
                    allowNull: true
                },
                variants: {
                    type: Sequelize.JSONB,
                    allowNull: true,
                    defaultValue: {}
                },
                image: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                status: {
                    type: Sequelize.ENUM('Active', 'Inactive'),
                    defaultValue: 'Active',
                    allowNull: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                },
                updated_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                }
            }, { transaction });

            // ==========================================
            // 4. DROP AND RECREATE VENDORS TABLE (IF EXISTS)
            // ==========================================
            console.log('Recreating vendors table...');
            await queryInterface.dropTable('vendors', { transaction, cascade: true }).catch(() => {
                console.log('  → Vendors table did not exist, creating fresh...');
            });

            await queryInterface.createTable('vendors', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                vendor_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                    unique: true
                },
                vendor_code: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true
                },
                address: {
                    type: Sequelize.STRING(500),
                    allowNull: true
                },
                contact_name: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                email: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },
                phone_no: {
                    type: Sequelize.STRING(20),
                    allowNull: true
                },
                status: {
                    type: Sequelize.ENUM('Active', 'Inactive'),
                    defaultValue: 'Active',
                    allowNull: false
                },
                created_by: {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                created_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                },
                updated_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                }
            }, { transaction });

            // ==========================================
            // 5. DROP AND RECREATE INDUSTRIES TABLE (IF EXISTS)
            // ==========================================
            console.log('Recreating industries table...');
            await queryInterface.dropTable('industries', { transaction, cascade: true }).catch(() => {
                console.log('  → Industries table did not exist, creating fresh...');
            });

            await queryInterface.createTable('industries', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                industry_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                    unique: true
                },
                industry_code: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true
                },
                status: {
                    type: Sequelize.ENUM('Active', 'Inactive'),
                    defaultValue: 'Active',
                    allowNull: false
                },
                created_by: {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                created_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                },
                updated_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                }
            }, { transaction });

            // ==========================================
            // 6. DROP AND RECREATE CONDITIONS TABLE
            // ==========================================
            console.log('Recreating conditions table...');
            await queryInterface.dropTable('condition_master', { transaction, cascade: true }).catch(() => { });
            await queryInterface.dropTable('conditions', { transaction, cascade: true }).catch(() => { });

            await queryInterface.createTable('conditions', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                condition_code: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true
                },
                condition_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },
                severity_level: {
                    type: Sequelize.ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'),
                    defaultValue: 'MEDIUM'
                },
                priority_score: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },
                health_impact: {
                    type: Sequelize.STRING(500),
                    allowNull: true
                },
                recommended_action: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },
                requires_immediate_action: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                is_active: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true
                },
                created_by: {
                    type: Sequelize.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                created_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                },
                updated_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW
                }
            }, { transaction });

            await transaction.commit();
            console.log('✅ Master data schema migration completed successfully!');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Reverting this migration would require recreating old schema
        // This is intentionally left minimal - backup your data before migrating!
        console.log('⚠️  WARNING: Reverting this migration will drop all tables!');
        console.log('⚠️  Make sure you have a backup!');

        const transaction = await queryInterface.sequelize.transaction();

        try {
            // NOTE: Countries, States, Cities are not managed by migration
            await queryInterface.dropTable('conditions', { transaction });
            await queryInterface.dropTable('industries', { transaction });
            await queryInterface.dropTable('vendors', { transaction });
            await queryInterface.dropTable('products', { transaction });
            await queryInterface.dropTable('category_files', { transaction });
            await queryInterface.dropTable('categories', { transaction });

            await transaction.commit();
            console.log('Migration reverted - all master data tables dropped');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
