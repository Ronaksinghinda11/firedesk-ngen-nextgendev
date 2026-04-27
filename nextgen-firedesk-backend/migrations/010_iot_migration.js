/**
 * IoT Tables Migration Script
 * Creates tables for IoT device data and device-asset mapping
 * 
 * Tables:
 * - iot_live_data_pr: Pump Room IoT data
 * - iot_live_data_fe: Fire Extinguisher IoT data
 * - iot_live_data_fh: Fire Hydrant IoT data
 * - iot_device_asset_map: Mapping between IoT devices and physical assets
 * 
 * Foreign Keys:
 * - iot_device_asset_map.asset_code -> assets.asset_code
 * - iot_device_asset_map.category_id -> categories.id
 * - iot_device_asset_map.plant_id -> plants.id
 */

'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // ============================================================================
            // 1. Create iot_live_data_pr table (Pump Room)
            // ============================================================================
            await queryInterface.createTable('iot_live_data_pr', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true,
                },
                device_id: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true,
                    comment: 'Unique device identifier from AWS IoT/Lambda'
                },
                device_data: {
                    type: Sequelize.JSONB,
                    allowNull: false,
                    comment: 'Current IoT sensor data (AS1-3, PS1-3, TS1-3, WLS, DLS, PLS, BAT, etc.)'
                },
                history: {
                    type: Sequelize.JSONB,
                    defaultValue: {},
                    comment: 'Historical trends for each sensor (last 100 values)'
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Add indexes for iot_live_data_pr
            await queryInterface.addIndex('iot_live_data_pr', ['device_id'], { transaction });
            await queryInterface.addIndex('iot_live_data_pr', ['updated_at'], { transaction });

            console.log('✅ Created table: iot_live_data_pr');

            // ============================================================================
            // 2. Create iot_live_data_fe table (Fire Extinguisher)
            // ============================================================================
            await queryInterface.createTable('iot_live_data_fe', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true,
                },
                device_id: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true,
                    comment: 'Unique device identifier from AWS IoT/Lambda'
                },
                device_data: {
                    type: Sequelize.JSONB,
                    allowNull: false,
                    comment: 'Current IoT sensor data (PRESSURE, TEMPERATURE, STATUS, LOCATION)'
                },
                history: {
                    type: Sequelize.JSONB,
                    defaultValue: {},
                    comment: 'Historical trends for each sensor'
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Add indexes for iot_live_data_fe
            await queryInterface.addIndex('iot_live_data_fe', ['device_id'], { transaction });
            await queryInterface.addIndex('iot_live_data_fe', ['updated_at'], { transaction });

            console.log('✅ Created table: iot_live_data_fe');

            // ============================================================================
            // 3. Create iot_live_data_fh table (Fire Hydrant)
            // ============================================================================
            await queryInterface.createTable('iot_live_data_fh', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true,
                },
                device_id: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true,
                    comment: 'Unique device identifier from AWS IoT/Lambda'
                },
                device_data: {
                    type: Sequelize.JSONB,
                    allowNull: false,
                    comment: 'Current IoT sensor data (PRESSURE, FLOW_RATE, STATUS, LOCATION)'
                },
                history: {
                    type: Sequelize.JSONB,
                    defaultValue: {},
                    comment: 'Historical trends for each sensor'
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Add indexes for iot_live_data_fh
            await queryInterface.addIndex('iot_live_data_fh', ['device_id'], { transaction });
            await queryInterface.addIndex('iot_live_data_fh', ['updated_at'], { transaction });

            console.log('✅ Created table: iot_live_data_fh');

            // ============================================================================
            // 4. Create iot_device_asset_map table (Mapping between devices and assets)
            // ============================================================================
            await queryInterface.createTable('iot_device_asset_map', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true,
                },
                device_id: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    comment: 'IoT device identifier (matches device_id in iot_live_data_* tables)'
                },
                asset_code: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    comment: 'Reference to assets.asset_code (unique identifier)',
                    references: {
                        model: 'assets',
                        key: 'asset_code'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                category_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    comment: 'Category ID (Pump Room, Fire Extinguisher, Fire Hydrant)',
                    references: {
                        model: 'categories',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'RESTRICT'
                },
                plant_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    comment: 'Plant ID where device is installed',
                    references: {
                        model: 'plants',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'RESTRICT'
                },
                data_key: {
                    type: Sequelize.STRING(50),
                    allowNull: true,
                    comment: 'Specific data field for this asset (e.g., AS1, AS2, AS3 for pumps)'
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // Add indexes for iot_device_asset_map
            await queryInterface.addIndex('iot_device_asset_map', ['device_id'], { transaction });
            await queryInterface.addIndex('iot_device_asset_map', ['asset_code'], { transaction });
            await queryInterface.addIndex('iot_device_asset_map', ['category_id'], { transaction });
            await queryInterface.addIndex('iot_device_asset_map', ['plant_id'], { transaction });

            // Add unique constraint for device_id + asset_code + data_key
            await queryInterface.addConstraint('iot_device_asset_map', {
                fields: ['device_id', 'asset_code', 'data_key'],
                type: 'unique',
                name: 'iot_device_asset_data_key_unique',
                transaction
            });

            console.log('✅ Created table: iot_device_asset_map with foreign keys');

            await transaction.commit();
            console.log('✅ Migration completed successfully!');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Drop tables in reverse order (to respect foreign keys)
            await queryInterface.dropTable('iot_device_asset_map', { transaction });
            console.log('✅ Dropped table: iot_device_asset_map');

            await queryInterface.dropTable('iot_live_data_fh', { transaction });
            console.log('✅ Dropped table: iot_live_data_fh');

            await queryInterface.dropTable('iot_live_data_fe', { transaction });
            console.log('✅ Dropped table: iot_live_data_fe');

            await queryInterface.dropTable('iot_live_data_pr', { transaction });
            console.log('✅ Dropped table: iot_live_data_pr');

            await transaction.commit();
            console.log('✅ Rollback completed successfully!');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
};