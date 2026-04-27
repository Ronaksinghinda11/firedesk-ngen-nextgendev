/**
 * Inventory Controller
 * Thin controller layer — delegates all business logic to inventory_service.
 */

const inventory_service = require("../../services/inventory/inventory_service");
const inventory_bulk_service = require("../../services/inventory/inventory_bulk_service");
const csvParser = require('csv-parser');
const { Readable } = require('stream');

// ======================= ASSETS =======================

const get_assets = async (req, res, next) => {
  try {
    const result = await inventory_service.get_assets(
      req.query,
      req.managerPlantIds || [],
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const get_asset_groups = async (req, res, next) => {
  try {
    const result = await inventory_service.get_asset_groups(
      req.query,
      req.managerPlantIds || [],
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const create_asset = async (req, res, next) => {
  try {
    const result = await inventory_service.create_asset(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Inventory asset created",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const get_asset = async (req, res, next) => {
  try {
    const result = await inventory_service.get_asset_by_id(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory asset not found" });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const update_asset = async (req, res, next) => {
  try {
    const result = await inventory_service.update_asset(
      req.params.id,
      req.body,
      req.user,
    );
    return res.status(200).json({
      success: true,
      message: "Inventory asset updated",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const delete_asset = async (req, res, next) => {
  try {
    await inventory_service.delete_asset(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Inventory asset deleted",
    });
  } catch (error) {
    return next(error);
  }
};

const move_to_asset = async (req, res, next) => {
  try {
    const result = await inventory_service.move_to_assets(
      req.params.id,
      req.body,
      req.user,
    );
    return res.status(200).json({
      success: true,
      message: "Inventory asset moved to main assets",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// ======================= SPARES =======================

const get_spares = async (req, res, next) => {
  try {
    const result = await inventory_service.get_spares(
      req.query,
      req.managerPlantIds || [],
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const create_spare = async (req, res, next) => {
  try {
    const result = await inventory_service.create_spare(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: "Inventory spare created",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const get_spare = async (req, res, next) => {
  try {
    const result = await inventory_service.get_spare_by_id(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory spare not found" });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const update_spare = async (req, res, next) => {
  try {
    const result = await inventory_service.update_spare(
      req.params.id,
      req.body,
      req.user,
    );
    return res.status(200).json({
      success: true,
      message: "Inventory spare updated",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const delete_spare = async (req, res, next) => {
  try {
    await inventory_service.delete_spare(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Inventory spare deleted",
    });
  } catch (error) {
    return next(error);
  }
};

// ======================= DROPDOWN / MASTER DATA =======================

const get_dropdown_data = async (req, res, next) => {
  try {
    const { plant_id } = req.query;
    if (!plant_id) {
      return res
        .status(400)
        .json({ success: false, message: "plant_id query param is required" });
    }
    const result = await inventory_service.get_dropdown_data(plant_id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const get_user_plants = async (req, res, next) => {
  try {
    const plants = await inventory_service.get_user_plants(req.user);
    return res.status(200).json({ success: true, data: plants });
  } catch (error) {
    return next(error);
  }
};

const get_all_products = async (req, res, next) => {
  try {
    const products = await inventory_service.get_all_products();
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    return next(error);
  }
};

// ======================= DYNAMIC MASTER VALUES =======================

const get_dynamic_values = async (req, res, next) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "type query param is required" });
    }
    const values = await inventory_service.get_dynamic_values(type);
    return res.status(200).json({ success: true, data: values });
  } catch (error) {
    return next(error);
  }
};

const create_dynamic_value = async (req, res, next) => {
  try {
    const { type, value } = req.body;
    if (!type || !value) {
      return res
        .status(400)
        .json({ success: false, message: "type and value are required" });
    }
    const result = await inventory_service.create_dynamic_value(
      type,
      value,
      req.user,
    );
    return res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created
        ? "Dynamic value created"
        : "Dynamic value already exists",
      data: result.value,
    });
  } catch (error) {
    return next(error);
  }
};

// ======================= SPARE TRANSACTIONS =======================

const issue_spare = async (req, res, next) => {
  try {
    const result = await inventory_service.issue_spare(
      req.params.id,
      req.body,
      req.user,
    );
    return res.status(201).json({
      success: true,
      message: `Issued ${result.quantity_issued} ${result.unit || "unit(s)"} of "${result.spare_name}". Remaining: ${result.quantity_remaining}`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const return_spare = async (req, res, next) => {
  try {
    const result = await inventory_service.return_spare(
      req.params.id,
      req.body,
      req.user,
    );
    return res.status(201).json({
      success: true,
      message: `Returned ${result.quantity_returned} ${result.unit || "unit(s)"} of "${result.spare_name}". New stock: ${result.quantity_now}`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const get_spare_transactions = async (req, res, next) => {
  try {
    const result = await inventory_service.get_spare_transactions(
      req.params.id,
      req.query,
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const get_asset_lifecycle_cost = async (req, res, next) => {
  try {
    const result = await inventory_service.get_asset_lifecycle_cost(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Bulk upload inventory assets from CSV
 * POST /api/inventory/bulk-upload
 * Expects: multipart/form-data with 'file' field (CSV file)
 */
const bulk_upload_inventory = async (req, res, next) => {
  try {
    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded. Please upload a CSV file.' 
      });
    }
    
    const user = req.user;
    const managerPlantIds = user.userType === 'MANAGER' ? req.managerPlantIds || [] : null;
    
    console.log(`[BulkUpload] Processing upload for user ${user.id} (${user.userType})`);
    
    // Parse CSV
    const rows = [];
    const buffer = req.file.buffer;
    const stream = Readable.from(buffer.toString('utf-8'));
    
    stream
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        try {
          console.log(`[BulkUpload] Parsed ${rows.length} rows from CSV`);
          
          // Process bulk upload
          const result = await inventory_bulk_service.bulkCreateInventory(
            rows,
            user,
            managerPlantIds
          );
          
          if (result.success) {
            return res.status(200).json({
              success: true,
              message: `Successfully created ${result.summary.created} inventory assets`,
              ...result
            });
          } else {
            return res.status(400).json({
              success: false,
              message: 'Bulk upload failed. See errors for details.',
              ...result
            });
          }
        } catch (err) {
          console.error('[BulkUpload] Error during processing:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error during bulk upload',
            error: err.message
          });
        }
      })
      .on('error', (err) => {
        console.error('[BulkUpload] CSV parsing error:', err);
        return res.status(400).json({
          success: false,
          message: 'Failed to parse CSV file. Please ensure it is properly formatted.',
          error: err.message
        });
      });
      
  } catch (error) {
    console.error('[BulkUpload] Unexpected error:', error);
    return next(error);
  }
};

module.exports = {
  get_assets,
  get_asset_groups,
  create_asset,
  get_asset,
  update_asset,
  delete_asset,
  move_to_asset,
  get_spares,
  create_spare,
  get_spare,
  update_spare,
  delete_spare,
  get_dropdown_data,
  get_user_plants,
  get_all_products,
  get_dynamic_values,
  create_dynamic_value,
  issue_spare,
  return_spare,
  get_spare_transactions,
  get_asset_lifecycle_cost,
  bulk_upload_inventory,
};
