/**
 * AssetCreationPipeline - Unified Asset Creation Service
 * 
 * Provides a single, consistent pipeline for creating assets with full lifecycle setup
 * regardless of source (Direct Form, Inventory + Ticket, or Bulk Upload)
 * 
 * Ensures all assets have:
 * - Related records (Documents, SpecValues, TestingSchedule, LocationHistory)
 * - Business logic triggers (Compliance Score, Service Generation, Audit Logging)
 * - Consistent validation and data quality
 */

const { Op } = require('sequelize');
const { 
    sequelize, 
    Asset, 
    AssetDocument, 
    AssetSpecValue, 
    AssetTestingSchedule,
    AssetLocationHistory,
    Category,
    Manufacturer
} = require('../../models');

class AssetCreationPipeline {
    
    /**
     * Universal asset creation with full lifecycle setup
     * @param {Object} source_data - Asset data from any source
     * @param {Object} user - User object or user ID
     * @param {String} source_type - 'DIRECT' | 'INVENTORY' | 'BULK'
     * @param {Object} transaction - Optional transaction (if not provided, creates new one)
     * @returns {Promise<Asset>} Created asset with full lifecycle
     */
    async createAssetWithLifecycle(source_data, user, source_type = 'DIRECT', transaction = null) {
        const shouldCommit = !transaction;
        transaction = transaction || await sequelize.transaction();
        
        try {
            console.log(`[AssetCreationPipeline] Starting asset creation (source: ${source_type})`);
            
            // 1. Resolve manufacturer STRING → UUID
            await this._resolveManufacturer(source_data, user, transaction);
            
            // 2. Create core asset using existing asset_service
            const asset_service = require('./asset_service');
            const asset = await asset_service.create_asset(source_data, user, transaction);
            
            // 3. Create related records
            await this._createDocuments(asset, source_data, transaction);
            await this._createSpecValues(asset, source_data, transaction);
            await this._initializeTestingSchedule(asset, source_data, transaction);
            await this._createLocationHistory(asset, source_data, user, source_type, transaction);
            
            // 4. Commit transaction if we created it
            if (shouldCommit) {
                await transaction.commit();
                console.log(`[AssetCreationPipeline] ✅ Asset ${asset.asset_code} created successfully`);
            }
            
            // 5. Trigger post-creation business logic (fire-and-forget)
            if (shouldCommit) {
                this._triggerPostCreationLogic(asset, user, source_type);
            }
            
            return asset;
            
        } catch (error) {
            if (shouldCommit && transaction) {
                await transaction.rollback();
            }
            console.error(`[AssetCreationPipeline] ❌ Error creating asset:`, error.message);
            throw error;
        }
    }
    
    /**
     * Resolves manufacturer STRING to UUID manufacturer_id
     * @private
     */
    async _resolveManufacturer(data, user, transaction) {
        // If manufacturer_id already set, skip
        if (data.manufacturer_id) {
            return;
        }
        
        // If no manufacturer string provided, skip
        if (!data.manufacturer || typeof data.manufacturer !== 'string') {
            return;
        }
        
        try {
            const manufacturer_name = data.manufacturer.trim();
            
            // Try to find existing manufacturer (case-insensitive)
            let manufacturer = await Manufacturer.findOne({
                where: {
                    name: { [Op.iLike]: manufacturer_name }
                },
                transaction
            });
            
            // If not found, create new manufacturer
            if (!manufacturer) {
                console.log(`[AssetCreationPipeline] Creating new manufacturer: ${manufacturer_name}`);
                manufacturer = await Manufacturer.create({
                    name: manufacturer_name,
                    contact_email: null,
                    contact_phone: null,
                    address: null,
                    created_by: user?.id || user
                }, { transaction });
            }
            
            // Set manufacturer_id in data
            data.manufacturer_id = manufacturer.id;
            console.log(`[AssetCreationPipeline] ✅ Resolved manufacturer "${manufacturer_name}" → ${manufacturer.id}`);
            
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Failed to resolve manufacturer:`, error.message);
            // Don't fail asset creation if manufacturer resolution fails
            // The string will be preserved in metadata
        }
    }
    
    /**
     * Creates AssetDocument records from documents array
     * @private
     */
    async _createDocuments(asset, source_data, transaction) {
        if (!source_data.documents || !Array.isArray(source_data.documents) || source_data.documents.length === 0) {
            return;
        }
        
        try {
            const document_records = source_data.documents.map(doc => ({
                asset_id: asset.id,
                document_url: doc.document_url || doc.url || doc.path,
                description: doc.description || doc.name || null,
                uploaded_by: asset.created_by
            })).filter(doc => doc.document_url); // Only include docs with URLs
            
            if (document_records.length > 0) {
                await AssetDocument.bulkCreate(document_records, { transaction });
                console.log(`[AssetCreationPipeline] ✅ Created ${document_records.length} document records`);
            }
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Failed to create documents:`, error.message);
            // Don't fail asset creation if documents fail
        }
    }
    
    /**
     * Creates AssetSpecValue records from spec_values array
     * @private
     */
    async _createSpecValues(asset, source_data, transaction) {
        if (!source_data.spec_values || !Array.isArray(source_data.spec_values) || source_data.spec_values.length === 0) {
            return;
        }
        
        try {
            const spec_records = source_data.spec_values.map(spec => ({
                asset_id: asset.id,
                spec_definition_id: spec.spec_definition_id,
                spec_value: spec.spec_value || spec.value,
                unit: spec.unit || null
            })).filter(spec => spec.spec_definition_id && spec.spec_value);
            
            if (spec_records.length > 0) {
                await AssetSpecValue.bulkCreate(spec_records, { transaction });
                console.log(`[AssetCreationPipeline] ✅ Created ${spec_records.length} spec value records`);
            }
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Failed to create spec values:`, error.message);
            // Don't fail asset creation if spec values fail
        }
    }
    
    /**
     * Initializes AssetTestingSchedule if category requires testing
     * @private
     */
    async _initializeTestingSchedule(asset, source_data, transaction) {
        try {
            // Fetch category to check if testing is required
            const category = await Category.findByPk(asset.category_id, { 
                attributes: ['id', 'test_frequency_required', 'test_frequency'],
                transaction 
            });
            
            if (!category || !category.test_frequency_required) {
                return; // Category doesn't require testing
            }
            
            console.log(`[AssetCreationPipeline] Category requires testing, initializing schedule...`);
            
            // Calculate next test dates
            const manufacturing_date = asset.manufacturing_date || new Date().toISOString().split('T')[0];
            const test_frequency_months = category.test_frequency || 12;
            
            const next_hp_test_date = this._calculateNextDate(manufacturing_date, test_frequency_months);
            const next_refill_date = this._calculateNextDate(manufacturing_date, 12); // Annual refill
            
            await AssetTestingSchedule.create({
                asset_id: asset.id,
                last_hp_test_date: [manufacturing_date],
                last_refill_date: [manufacturing_date],
                next_hp_test_date,
                next_refill_date,
                test_frequency: test_frequency_months
            }, { transaction });
            
            console.log(`[AssetCreationPipeline] ✅ Testing schedule initialized`);
            
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Failed to initialize testing schedule:`, error.message);
            // Don't fail asset creation if testing schedule fails
        }
    }
    
    /**
     * Creates AssetLocationHistory record for initial installation
     * @private
     */
    async _createLocationHistory(asset, source_data, user, source_type, transaction) {
        // Only create location history if location fields are provided
        if (!source_data.building_id && !source_data.floor_id && !source_data.wing_id) {
            return;
        }
        
        try {
            await AssetLocationHistory.create({
                asset_id: asset.id,
                old_building_id: null,
                new_building_id: source_data.building_id || null,
                old_floor_id: null,
                new_floor_id: source_data.floor_id || null,
                old_wing_id: null,
                new_wing_id: source_data.wing_id || null,
                changed_by: user?.id || user,
                changed_at: new Date(),
                source_type: source_type,
                source_id: source_data.ticket_id || null
            }, { transaction });
            
            console.log(`[AssetCreationPipeline] ✅ Location history created`);
            
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Failed to create location history:`, error.message);
            // Don't fail asset creation if location history fails
        }
    }
    
    /**
     * Triggers post-creation business logic (fire-and-forget)
     * @private
     */
    _triggerPostCreationLogic(asset, user, source_type) {
        // Run these in parallel, don't wait, don't block
        Promise.all([
            // 1. Update compliance score
            this._updateComplianceScore(asset),
            
            // 2. Generate service schedules
            this._generateServiceSchedules(asset),
            
            // 3. Log audit event
            this._logAuditEvent(asset, user, source_type)
            
        ]).catch(error => {
            console.error(`[AssetCreationPipeline] ⚠️ Post-creation logic error:`, error.message);
        });
    }
    
    /**
     * Updates compliance score for asset
     * @private
     */
    async _updateComplianceScore(asset) {
        try {
            const complianceScoreService = require('./complianceScoreService');
            const score = await complianceScoreService.updateComplianceScore(asset.id);
            console.log(`[AssetCreationPipeline] 📊 Compliance score calculated: ${score}%`);
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Compliance score calculation failed:`, error.message);
        }
    }
    
    /**
     * Generates service schedules for asset
     * @private
     */
    async _generateServiceSchedules(asset) {
        try {
            const schedulerService = require('../scheduler/schedulerService');
            await schedulerService.generateServicesForAsset(asset.id, asset.plant_id);
            console.log(`[AssetCreationPipeline] 📅 Service schedules generated`);
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Service generation failed:`, error.message);
        }
    }
    
    /**
     * Logs audit event for asset creation
     * @private
     */
    async _logAuditEvent(asset, user, source_type) {
        try {
            const auditService = require('../sams/auditService');
            
            const action = source_type === 'INVENTORY' ? 'CREATE_FROM_INVENTORY' : 'CREATE';
            const user_obj = user?.id ? {
                id: user.id,
                name: user.name || user.username,
                type: user.userType
            } : {
                id: user
            };
            
            await auditService.log({
                entityType: 'asset',
                entityId: asset.id,
                entityName: asset.asset_code,
                action,
                user: user_obj,
                source: source_type.toLowerCase()
            });
            
            console.log(`[AssetCreationPipeline] 📝 Audit log created (action: ${action})`);
        } catch (error) {
            console.error(`[AssetCreationPipeline] ⚠️ Audit logging failed:`, error.message);
        }
    }
    
    /**
     * Calculates next date by adding months
     * @private
     */
    _calculateNextDate(dateString, monthsToAdd) {
        const date = new Date(dateString);
        date.setMonth(date.getMonth() + monthsToAdd);
        return date.toISOString().split('T')[0];
    }
}

module.exports = new AssetCreationPipeline();
