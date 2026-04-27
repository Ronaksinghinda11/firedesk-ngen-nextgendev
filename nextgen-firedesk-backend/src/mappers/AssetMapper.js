/**
 * AssetMapper - DTO Pattern for Asset Creation
 * 
 * Maps data from various sources (Inventory, Direct Form, Bulk CSV) to Asset creation payload
 * Ensures data consistency and prevents field loss between flows
 */

class AssetMapper {
    /**
     * Maps InventoryAsset to Asset creation payload
     * @param {Object} inventoryAsset - InventoryAsset model instance
     * @param {Object} ticketData - Additional data from installation ticket
     * @returns {Object} Asset creation payload
     */
    static fromInventory(inventoryAsset, ticketData = {}) {
        // Ensure we have the raw data
        const inv = inventoryAsset.toJSON ? inventoryAsset.toJSON() : inventoryAsset;
        
        return {
            // Core required fields
            plant_id: inv.plant_id,
            category_id: inv.category_id,
            product_id: inv.product_id,
            
            // Type & subtype
            type: inv.type || ticketData.type || null,
            sub_type: inv.sub_type || ticketData.sub_type || null,
            
            // Dates
            manufacturing_date: inv.manufacturing_date || ticketData.manufacturing_date || null,
            install_date: ticketData.install_date || new Date().toISOString().split('T')[0],
            warranty_end_date: inv.warranty_end_date || ticketData.warranty_end_date || null,
            lifespan_years: inv.lifespan_years || ticketData.lifespan_years || null,
            
            // Location from ticket
            building_id: ticketData.building_id || null,
            floor_id: ticketData.floor_id || null,
            wing_id: ticketData.wing_id || null,
            location: ticketData.location || null,
            // NOTE: latitude/longitude intentionally excluded (separate logic)
            
            // Manufacturer (STRING from inventory - will be resolved to UUID in pipeline)
            manufacturer: inv.manufacturer || null,
            manufacturer_id: ticketData.manufacturer_id || null, // May be provided by ticket
            
            // Status fields
            status: 'ACTIVE',
            health_status: 'HEALTHY',
            maintenance_status: ticketData.maintenance_status || 'IN_HOUSE',
            
            // Metadata object
            metadata: {
                serial_number: inv.serial_number || null,
                model: inv.model || null,
                manufacturer: inv.manufacturer || null, // Keep as fallback display
                tag: ticketData.tag || null,
                // ✅ NEW: Preserve cost data in metadata
                unit_price: inv.unit_price || null,
                total_price: inv.total_price || null,
            },
            
            // Asset code
            asset_code: inv.asset_code || null,
            
            // ✅ NEW: Documents array (will be created as AssetDocument records)
            documents: inv.documents || [],
            
            // ✅ NEW: Spec values array (will be created as AssetSpecValue records)
            spec_values: ticketData.spec_values || [],
            
            // Tracking
            created_by: ticketData.created_by || inv.created_by,
            
            // Source tracking for audit
            source_type: 'INVENTORY',
            source_id: ticketData.ticket_id || null,
            ticket_id: ticketData.ticket_id || null,
            
            // Preserve any additional fields from ticket
            ...ticketData,
        };
    }
    
    /**
     * Validates asset data completeness
     * @param {Object} data - Asset creation payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validate(data) {
        const errors = [];
        
        // Required fields validation
        if (!data.plant_id) {
            errors.push('Plant is required');
        }
        if (!data.category_id) {
            errors.push('Category is required');
        }
        if (!data.product_id) {
            errors.push('Product is required');
        }
        if (!data.type) {
            errors.push('Type is required (must be set in inventory before installation)');
        }
        if (!data.manufacturing_date) {
            errors.push('Manufacturing date is required (must be set in inventory before installation)');
        }
        if (!data.install_date) {
            errors.push('Installation date is required');
        }
        if (!data.maintenance_status) {
            errors.push('Maintenance status is required');
        }
        
        // Date logic validation
        if (data.install_date && data.manufacturing_date) {
            const installDate = new Date(data.install_date);
            const mfgDate = new Date(data.manufacturing_date);
            
            if (installDate < mfgDate) {
                errors.push('Installation date cannot be before manufacturing date');
            }
        }
        
        // Warranty date validation
        if (data.warranty_end_date && data.manufacturing_date) {
            const warrantyDate = new Date(data.warranty_end_date);
            const mfgDate = new Date(data.manufacturing_date);
            
            if (warrantyDate < mfgDate) {
                errors.push('Warranty end date cannot be before manufacturing date');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Maps bulk CSV row to InventoryAsset creation payload
     * @param {Object} csvRow - Parsed CSV row
     * @param {Map} referenceMaps - Maps for resolving names to UUIDs
     * @returns {Object} InventoryAsset creation payload
     */
    static fromCSVRow(csvRow, referenceMaps = {}) {
        const { plantsMap, categoriesMap, productsMap } = referenceMaps;
        
        // Helper to get flexible field values (supports various column name formats)
        const getField = (row, ...keys) => {
            for (const key of keys) {
                const val = row[key];
                if (val !== undefined && val !== null && val !== '') {
                    return val;
                }
            }
            return null;
        };
        
        // Extract fields with flexible column names
        const plant_input = getField(csvRow, 'plant_id', 'plant', 'Plant', 'plant_name', 'Plant Name');
        const category_input = getField(csvRow, 'category_id', 'category', 'Category', 'category_name', 'Category Name');
        const product_input = getField(csvRow, 'product_id', 'product', 'Product', 'product_name', 'Product Name');
        
        // Resolve to UUIDs
        const plant_id = plantsMap?.get(plant_input?.toString().toLowerCase().trim()) || plant_input;
        const category_id = categoriesMap?.get(category_input?.toString().toLowerCase().trim()) || category_input;
        const product_ref = productsMap?.get(product_input?.toString().toLowerCase().trim());
        
        const type = getField(csvRow, 'type', 'Type', 'Asset Type');
        const sub_type = getField(csvRow, 'sub_type', 'subtype', 'Sub Type', 'SubType');
        const manufacturer = getField(csvRow, 'manufacturer', 'Manufacturer', 'Mfr', 'Brand');
        const model = getField(csvRow, 'model', 'Model', 'Model Number');
        const serial_number = getField(csvRow, 'serial_number', 'serial', 'Serial Number', 'SN');
        const manufacturing_date = getField(csvRow, 'manufacturing_date', 'mfg_date', 'Manufacturing Date', 'Mfg Date');
        const warranty_end_date = getField(csvRow, 'warranty_end_date', 'warranty', 'Warranty End', 'Warranty End Date');
        const lifespan_years = getField(csvRow, 'lifespan_years', 'lifespan', 'Lifespan', 'Lifespan Years');
        const quantity = getField(csvRow, 'quantity', 'Quantity', 'Qty');
        const unit_price = getField(csvRow, 'unit_price', 'price', 'Price', 'Unit Price', 'Cost');
        const notes = getField(csvRow, 'notes', 'Notes', 'Remarks', 'Description');
        
        const parsed_quantity = quantity ? parseInt(quantity, 10) : 1;
        const parsed_unit_price = unit_price ? parseFloat(unit_price) : null;
        const parsed_lifespan = lifespan_years ? parseInt(lifespan_years, 10) : null;
        const total_price = parsed_unit_price ? parsed_unit_price * parsed_quantity : null;
        
        return {
            plant_id,
            category_id,
            product_id: product_ref?.id || null,
            type,
            sub_type,
            manufacturer,
            model,
            serial_number,
            manufacturing_date,
            warranty_end_date,
            lifespan_years: parsed_lifespan,
            quantity: parsed_quantity,
            unit_price: parsed_unit_price,
            total_price,
            notes,
        };
    }
}

module.exports = AssetMapper;
