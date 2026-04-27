/**
 * InventoryBulkService - Bulk Upload for Inventory Assets
 * 
 * Provides CSV bulk upload functionality with:
 * - All-or-nothing transaction strategy (ACID compliance)
 * - 3-tier validation (structural, business, database)
 * - Rich error reporting
 * - Sequential asset code generation
 * - Flexible CSV column name matching
 */

const { Op } = require('sequelize');
const {
    sequelize,
    InventoryAsset,
    Plant,
    Category,
    Product
} = require('../../models');
const AssetMapper = require('../../mappers/AssetMapper');

class InventoryBulkService {
    
    /**
     * Bulk create inventory assets from CSV data
     * @param {Array} rows - Parsed CSV rows
     * @param {Object} user - User object
     * @param {Array} managerPlantIds - Plant IDs accessible to manager (null for admin)
     * @returns {Object} { success, summary, errors, created_assets }
     */
    async bulkCreateInventory(rows, user, managerPlantIds = null) {
        const MAX_ROWS = 10000;
        
        console.log(`[InventoryBulkService] Starting bulk upload (${rows.length} rows, user: ${user.id})`);
        
        // 1. Structural validation
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error('No data provided');
        }
        
        if (rows.length > MAX_ROWS) {
            throw new Error(`Bulk upload limited to ${MAX_ROWS} rows. Please split into multiple files.`);
        }
        
        // 2. Build reference maps (name → UUID)
        console.log(`[InventoryBulkService] Building reference maps...`);
        const reference_maps = await this._buildReferenceMaps();
        
        // 3. Validate all rows
        console.log(`[InventoryBulkService] Validating ${rows.length} rows...`);
        const validation_result = await this._validateRows(
            rows,
            user,
            managerPlantIds,
            reference_maps
        );
        
        if (!validation_result.valid) {
            console.log(`[InventoryBulkService] ❌ Validation failed: ${validation_result.errors.length} errors`);
            return {
                success: false,
                summary: {
                    total_rows: rows.length,
                    valid_rows: rows.length - validation_result.errors.length,
                    error_rows: validation_result.errors.length,
                    created: 0
                },
                errors: validation_result.errors,
                created_assets: []
            };
        }
        
        // 4. Execute bulk creation (all-or-nothing transaction)
        console.log(`[InventoryBulkService] Creating ${validation_result.valid_payloads.length} assets...`);
        const transaction = await sequelize.transaction();
        const created_assets = [];
        
        try {
            const { generateAssetCode } = require('../../utils/asset_code_generator');
            
            for (const payload of validation_result.valid_payloads) {
                // Generate asset code sequentially
                let asset_code;
                try {
                    asset_code = await generateAssetCode(
                        payload.category_id,
                        payload.product_id,
                        transaction
                    );
                } catch (err) {
                    // Fallback if asset code generation fails
                    asset_code = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    console.warn(`[InventoryBulkService] Asset code generation failed, using fallback: ${asset_code}`);
                }
                
                // Create inventory asset
                const inv_asset = await InventoryAsset.create({
                    ...payload,
                    asset_code,
                    status: 'available',
                    created_by: user.id
                }, { transaction });
                
                created_assets.push(inv_asset);
            }
            
            await transaction.commit();
            console.log(`[InventoryBulkService] ✅ Successfully created ${created_assets.length} inventory assets`);
            
            return {
                success: true,
                summary: {
                    total_rows: rows.length,
                    valid_rows: rows.length,
                    error_rows: 0,
                    created: created_assets.length
                },
                errors: [],
                created_assets
            };
            
        } catch (db_error) {
            await transaction.rollback();
            console.error(`[InventoryBulkService] ❌ Database error:`, db_error.message);
            
            return {
                success: false,
                summary: {
                    total_rows: rows.length,
                    valid_rows: rows.length,
                    error_rows: 1,
                    created: 0
                },
                errors: [{
                    row: 'N/A',
                    field: 'database',
                    message: `Database error: ${db_error.message}`
                }],
                created_assets: []
            };
        }
    }
    
    /**
     * Build reference maps for name → UUID resolution
     * @private
     */
    async _buildReferenceMaps() {
        const [plants, categories, products] = await Promise.all([
            Plant.findAll({ attributes: ['id', 'plant_name'] }),
            Category.findAll({ attributes: ['id', 'category_name'] }),
            Product.findAll({ attributes: ['id', 'product_name', 'category_id'] })
        ]);
        
        // Build plant map
        const plantsMap = new Map();
        plants.forEach(p => {
            const key = p.plant_name.toLowerCase().trim();
            plantsMap.set(key, p.id);
            plantsMap.set(p.id, p.id); // Support UUID directly
        });
        
        // Build category map
        const categoriesMap = new Map();
        categories.forEach(c => {
            const key = c.category_name.toLowerCase().trim();
            categoriesMap.set(key, c.id);
            categoriesMap.set(c.id, c.id);
        });
        
        // Build product map (name → {id, category_id})
        const productsMap = new Map();
        products.forEach(p => {
            const key = p.product_name.toLowerCase().trim();
            productsMap.set(key, { id: p.id, category_id: p.category_id });
            productsMap.set(p.id, { id: p.id, category_id: p.category_id });
        });
        
        return { plantsMap, categoriesMap, productsMap };
    }
    
    /**
     * Validate all rows and build payloads
     * @private
     */
    async _validateRows(rows, user, managerPlantIds, reference_maps) {
        const { plantsMap, categoriesMap, productsMap } = reference_maps;
        const errors = [];
        const valid_payloads = [];
        const seen_serial_numbers = new Set();
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Excel row (header = 1, data starts at 2)
            
            // Use AssetMapper to parse CSV row
            const parsed = AssetMapper.fromCSVRow(row, reference_maps);
            
            // Required field validation
            if (!parsed.plant_id) {
                errors.push({ row: rowNum, field: 'plant', message: 'Plant is required' });
                continue;
            }
            
            if (!parsed.category_id) {
                errors.push({ row: rowNum, field: 'category', message: 'Category is required' });
                continue;
            }
            
            if (!parsed.product_id) {
                errors.push({ row: rowNum, field: 'product', message: 'Product is required' });
                continue;
            }
            
            if (!parsed.type) {
                errors.push({ row: rowNum, field: 'type', message: 'Type is required' });
                continue;
            }
            
            if (!parsed.manufacturing_date) {
                errors.push({ row: rowNum, field: 'manufacturing_date', message: 'Manufacturing date is required' });
                continue;
            }
            
            if (!parsed.quantity || parsed.quantity < 1) {
                errors.push({ row: rowNum, field: 'quantity', message: 'Quantity must be at least 1' });
                continue;
            }
            
            // Plant existence check
            if (!plantsMap.has(parsed.plant_id)) {
                errors.push({ row: rowNum, field: 'plant', message: `Plant not found` });
                continue;
            }
            
            // Manager permission check
            if (managerPlantIds && !managerPlantIds.includes(parsed.plant_id)) {
                errors.push({ row: rowNum, field: 'plant', message: `Plant not assigned to you` });
                continue;
            }
            
            // Category existence check
            if (!categoriesMap.has(parsed.category_id)) {
                errors.push({ row: rowNum, field: 'category', message: `Category not found` });
                continue;
            }
            
            // Product existence check
            const product_ref = productsMap.get(parsed.product_id);
            if (!product_ref) {
                errors.push({ row: rowNum, field: 'product', message: `Product not found` });
                continue;
            }
            
            // Product must belong to category
            if (product_ref.category_id !== parsed.category_id) {
                errors.push({ 
                    row: rowNum, 
                    field: 'product', 
                    message: `Product does not belong to selected category` 
                });
                continue;
            }
            
            // Date format validation
            if (parsed.manufacturing_date && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.manufacturing_date)) {
                errors.push({ 
                    row: rowNum, 
                    field: 'manufacturing_date', 
                    message: 'Date format must be YYYY-MM-DD' 
                });
                continue;
            }
            
            if (parsed.warranty_end_date && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.warranty_end_date)) {
                errors.push({ 
                    row: rowNum, 
                    field: 'warranty_end_date', 
                    message: 'Date format must be YYYY-MM-DD' 
                });
                continue;
            }
            
            // Serial number uniqueness (within batch)
            if (parsed.serial_number) {
                if (seen_serial_numbers.has(parsed.serial_number)) {
                    errors.push({ 
                        row: rowNum, 
                        field: 'serial_number', 
                        message: `Duplicate serial number: ${parsed.serial_number}` 
                    });
                    continue;
                }
                seen_serial_numbers.add(parsed.serial_number);
            }
            
            // Price validation
            if (parsed.unit_price !== null && (isNaN(parsed.unit_price) || parsed.unit_price < 0)) {
                errors.push({ 
                    row: rowNum, 
                    field: 'unit_price', 
                    message: 'Unit price must be a positive number' 
                });
                continue;
            }
            
            // Lifespan validation
            if (parsed.lifespan_years !== null && (isNaN(parsed.lifespan_years) || parsed.lifespan_years < 0)) {
                errors.push({ 
                    row: rowNum, 
                    field: 'lifespan_years', 
                    message: 'Lifespan must be a positive integer' 
                });
                continue;
            }
            
            // All validations passed
            valid_payloads.push(parsed);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            valid_payloads
        };
    }
}

module.exports = new InventoryBulkService();
