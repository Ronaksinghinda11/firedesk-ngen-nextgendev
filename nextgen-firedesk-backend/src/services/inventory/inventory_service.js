/**
 * Inventory Service
 * Business logic for the Inventory + Spares module
 */

"use strict";

const { Op } = require("sequelize");
const { sequelize } = require("../../../config/config");
const {
  InventoryAsset,
  InventorySpare,
  InventorySpareTransaction,
  DynamicMasterValue,
  Plant,
  Category,
  Product,
  User,
  Asset,
  PlantCategory,
  Manager,
  PlantManager,
} = require("../../models");

class InventoryService {
  // =====================================================================
  // PLANTS
  // =====================================================================

  /**
   * Get plants accessible to the requesting user.
   * - Managers  → only their assigned plants
   * - Admins / org-owners (no Manager record) → all active plants
   */
  async get_user_plants(user) {
    const manager = await Manager.findOne({
      where: { user_id: user.id },
      include: [
        {
          model: Plant,
          as: "plants",
          attributes: ["id", "plant_name", "plant_code"],
          through: { attributes: [] },
        },
      ],
    });

    if (manager && manager.plants && manager.plants.length > 0) {
      return manager.plants;
    }

    // Admin or user with no Manager profile → return all active plants
    return Plant.findAll({
      where: { status: "Active" },
      attributes: ["id", "plant_name", "plant_code"],
      order: [["plant_name", "ASC"]],
    });
  }

  // =====================================================================
  // DROPDOWNS
  // =====================================================================

  /**
   * Return all dropdown data needed for inventory forms scoped to a plant.
   * Categories  → filtered via plant_categories junction
   * Products    → filtered by the returned categories (client filters by selected category)
   * Dynamic values → material_form and unit_of_measurement lists
   */
  async get_dropdown_data(plant_id) {
    if (!plant_id) throw { status: 400, message: "plant_id is required" };

    // Categories mapped to this plant
    const categoriesResult = await sequelize.query(
      `
      SELECT c.id, c.category_name, c.category_code
      FROM categories c
      INNER JOIN plant_categories pc ON pc.category_id = c.id
      WHERE pc.plant_id = :plant_id AND c.status = 'Active'
      ORDER BY c.category_name
    `,
      { replacements: { plant_id }, type: sequelize.QueryTypes.SELECT },
    );

    // Products belonging to any of those categories
    const category_ids = categoriesResult.map((c) => c.id);
    let products = [];
    if (category_ids.length > 0) {
      products = await Product.findAll({
        where: { category_id: category_ids, status: "Active" },
        attributes: [
          "id",
          "product_name",
          "product_code",
          "category_id",
          "variants",
        ],
        order: [["product_name", "ASC"]],
      });
    }

    // Dynamic dropdown values
    const material_forms = await DynamicMasterValue.findAll({
      where: { type: "material_form" },
      attributes: ["id", "value"],
      order: [["value", "ASC"]],
    });

    const units = await DynamicMasterValue.findAll({
      where: { type: "unit_of_measurement" },
      attributes: ["id", "value"],
      order: [["value", "ASC"]],
    });

    return {
      categories: categoriesResult,
      products: products.map((p) => p.toJSON()),
      material_forms: material_forms.map((m) => m.value),
      units: units.map((u) => u.value),
    };
  }

  // =====================================================================
  // ALL PRODUCTS (for spare linked-product dropdown — no plant filter)
  // =====================================================================

  /**
   * Return all active products with their category name.
   * Used by the spare form so users can link a spare to any product
   * regardless of which plant categories are active.
   */
  async get_all_products() {
    const products = await Product.findAll({
      where: { status: "Active" },
      attributes: ["id", "product_name", "product_code", "category_id"],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "category_name"],
        },
      ],
      order: [["product_name", "ASC"]],
    });

    return products.map((p) => {
      const json = p.toJSON();
      return {
        id: json.id,
        product_name: json.product_name,
        product_code: json.product_code,
        category_id: json.category_id,
        category_name: json.category ? json.category.category_name : null,
      };
    });
  }

  // =====================================================================
  // INVENTORY ASSETS
  // =====================================================================

  /**
   * Create a new inventory asset record.
   * Generates an asset_code for each inventory asset using the asset code generator.
   */
  async create_asset(data, user) {
    const {
      plant_id,
      category_id,
      product_id,
      type,
      sub_type,
      manufacturer,
      model,
      serial_number,
      manufacturing_date,
      warranty_end_date,
      lifespan_years,
      quantity,
      unit_price,
      documents,
      notes,
    } = data;

    if (!plant_id) throw { status: 400, message: "plant_id is required" };
    if (!category_id) throw { status: 400, message: "category_id is required" };
    if (!product_id) throw { status: 400, message: "product_id is required" };
    if (!quantity || quantity < 1)
      throw { status: 400, message: "quantity must be >= 1" };

    const numQuantity = parseInt(quantity);
    const createdAssets = [];
    const { generateAssetCode } = require("../../utils/asset_code_generator");

    for (let i = 0; i < numQuantity; i++) {
        let asset_code = null;
        try {
            asset_code = await generateAssetCode(category_id, product_id);
        } catch (err) {
            console.error("[InventoryService] Failed to generate asset code:", err.message);
            // Fall back to a timestamp-based code with index to guarantee uniqueness
            asset_code = `INV-${Date.now()}-${i}`;
        }

        const newAsset = await InventoryAsset.create({
            plant_id,
            category_id,
            product_id,
            type: type || null,
            sub_type: sub_type || null,
            manufacturer: manufacturer || null,
            model: model || null,
            serial_number: serial_number || null, // Might be shared unless it's a comma-separated list
            manufacturing_date: manufacturing_date || null,
            warranty_end_date: warranty_end_date || null,
            lifespan_years: lifespan_years || null,
            quantity: 1, // Store as 1 unit per asset to track individually
            unit_price: unit_price || null,
            total_price: unit_price || null, // Total price for 1 unit is its unit price
            asset_code,
            documents: documents || [],
            notes: notes || null,
            status: "available",
            created_by: user.id,
        });

        createdAssets.push(newAsset);
    }

    // Return the array or first element; controllers expect a single result usually,
    // but the frontend isn't using the returned data object directly.
    return createdAssets;
  }

  /**
   * Paginated list of inventory assets with plant-level access control.
   */
  async get_assets(filters, allowed_plant_ids) {
    const where = {};

    // Plant scoping
    if (filters.plantId) {
      where.plant_id = filters.plantId;
    } else if (allowed_plant_ids && allowed_plant_ids.length > 0) {
      where.plant_id = { [Op.in]: allowed_plant_ids };
    }

    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.category_id = filters.categoryId;
    if (filters.productId) where.product_id = filters.productId;
    if (filters.asset_code) where.asset_code = { [Op.iLike]: `%${filters.asset_code}%` };
    if (filters.type) where.type = { [Op.iLike]: `%${filters.type}%` };
    if (filters.manufacturer) where.manufacturer = { [Op.iLike]: `%${filters.manufacturer}%` };
    if (filters.serial_number) where.serial_number = { [Op.iLike]: `%${filters.serial_number}%` };
    if (filters.unit_price) where.unit_price = filters.unit_price;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await InventoryAsset.findAndCountAll({
      where,
      include: [
        { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
        {
          model: Category,
          as: "category",
          attributes: ["id", "category_name"],
        },
        { model: Product, as: "product", attributes: ["id", "product_name"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      assets: rows,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Fetch grouped inventory assets natively (by plant, product, category)
   * This handles the 1,000,000 asset scalability requirement.
   */
  async get_asset_groups(filters, allowed_plant_ids) {
    const where = {};
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { [Op.in]: ["available", "installed"] };
    }

    if (filters.plantId && filters.plantId !== "all") {
      where.plant_id = filters.plantId;
    } else if (allowed_plant_ids && allowed_plant_ids.length > 0) {
      where.plant_id = { [Op.in]: allowed_plant_ids };
    }

    if (filters.asset_code) where.asset_code = { [Op.iLike]: `%${filters.asset_code}%` };
    if (filters.type) where.type = { [Op.iLike]: `%${filters.type}%` };
    if (filters.manufacturer) where.manufacturer = { [Op.iLike]: `%${filters.manufacturer}%` };
    if (filters.serial_number) where.serial_number = { [Op.iLike]: `%${filters.serial_number}%` };
    if (filters.unit_price) where.unit_price = filters.unit_price;

    if (filters.search) {
      const searchStr = `%${filters.search.toLowerCase()}%`;
      where[Op.or] = [
        { '$plant.plant_name$': { [Op.iLike]: searchStr } },
        { '$category.category_name$': { [Op.iLike]: searchStr } },
        { '$product.product_name$': { [Op.iLike]: searchStr } }
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 100;
    const offset = (page - 1) * limit;

    const attributes = [
      "plant_id",
      "product_id",
      "category_id",
      [sequelize.fn("COUNT", sequelize.col("InventoryAsset.id")), "items_count"],
      [sequelize.fn("SUM", sequelize.col("InventoryAsset.quantity")), "total_quantity"],
      [sequelize.fn("SUM", sequelize.col("InventoryAsset.total_price")), "total_value"],
    ];

    // Count query — group ONLY on FK columns so no JOIN is required normally.
    // Referencing association columns (plant.plant_name) in group without include
    // causes Postgres "missing FROM-clause" error. If search is active, we must include the relations.
    const countQueryArgs = {
      where,
      group: ["InventoryAsset.plant_id", "InventoryAsset.product_id", "InventoryAsset.category_id"],
    };
    
    if (filters.search) {
      countQueryArgs.include = [
        { model: Plant, as: "plant", attributes: [] },
        { model: Category, as: "category", attributes: [] },
        { model: Product, as: "product", attributes: [] }
      ];
    }
    
    const countQuery = await InventoryAsset.count(countQueryArgs);
    const totalGroups = Array.isArray(countQuery) ? countQuery.length : 0;

    // Data query — full JOIN with association names in GROUP BY
    const groups = await InventoryAsset.findAll({
      where,
      attributes,
      include: [
        { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
        { model: Category, as: "category", attributes: ["id", "category_name"] },
        { model: Product, as: "product", attributes: ["id", "product_name"] },
      ],
      group: [
        "InventoryAsset.plant_id",
        "InventoryAsset.product_id",
        "InventoryAsset.category_id",
        "plant.id",
        "plant.plant_name",
        "category.id",
        "category.category_name",
        "product.id",
        "product.product_name",
      ],
      order: [
        [{ model: Plant, as: "plant" }, "plant_name", "ASC"],
        [{ model: Product, as: "product" }, "product_name", "ASC"],
      ],
      limit,
      offset,
      subQuery: false,
    });

    return {
      groups,
      total: totalGroups,
      page,
      limit,
      pages: Math.ceil(totalGroups / limit),
    };
  }

  /**
   * Fetch a single inventory asset by primary key.
   */
  async get_asset_by_id(id) {
    return InventoryAsset.findByPk(id, {
      include: [
        { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
        {
          model: Category,
          as: "category",
          attributes: ["id", "category_name"],
        },
        { model: Product, as: "product", attributes: ["id", "product_name"] },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
    });
  }

  /**
   * Update an inventory asset. Recalculates total_price when quantity/unit_price change.
   */
  async update_asset(id, data, user) {
    const asset = await InventoryAsset.findByPk(id);
    if (!asset) throw { status: 404, message: "Inventory asset not found" };
    if (asset.status === "installed")
      throw { status: 400, message: "Cannot edit an installed asset" };

    const { quantity, unit_price } = data;
    if (quantity !== undefined && unit_price !== undefined) {
      data.total_price = parseFloat(unit_price) * parseInt(quantity);
    } else if (quantity !== undefined && asset.unit_price != null) {
      data.total_price = parseFloat(asset.unit_price) * parseInt(quantity);
    } else if (unit_price !== undefined && asset.quantity != null) {
      data.total_price = parseFloat(unit_price) * parseInt(asset.quantity);
    }

    return asset.update(data);
  }

  /**
   * Delete an inventory asset (cannot delete if already installed).
   */
  async delete_asset(id) {
    const asset = await InventoryAsset.findByPk(id);
    if (!asset) throw { status: 404, message: "Inventory asset not found" };
    if (asset.status === "installed")
      throw { status: 400, message: "Cannot delete an installed asset" };
    await asset.destroy();
  }

  /**
   * Promote an inventory asset into the live assets table.
   * Uses AssetCreationPipeline for consistent asset creation with full lifecycle setup.
   * Wraps both writes in a single transaction so either both succeed or neither does.
   */
  async move_to_assets(inv_asset_id, additional_data, user) {
    const transaction = await sequelize.transaction();
    try {
      // 1. Fetch inventory asset
      const inv_asset = await InventoryAsset.findByPk(inv_asset_id, {
        include: [{ model: Category }, { model: Product }],
        transaction,
      });
      
      if (!inv_asset) {
        throw { status: 404, message: "Inventory asset not found" };
      }
      
      if (inv_asset.status === "installed") {
        throw { status: 400, message: "Asset already installed" };
      }

      // 2. Map inventory + ticket data to asset payload using AssetMapper
      const AssetMapper = require("../../mappers/AssetMapper");
      const asset_payload = AssetMapper.fromInventory(inv_asset, additional_data);
      
      // 3. Validate completeness before proceeding
      const validation = AssetMapper.validate(asset_payload);
      if (!validation.valid) {
        throw { 
          status: 400, 
          message: `Cannot install asset: ${validation.errors.join(', ')}` 
        };
      }
      
      // 4. Create asset with full lifecycle using AssetCreationPipeline
      const AssetCreationPipeline = require("../assets/asset_creation_pipeline");
      const new_asset = await AssetCreationPipeline.createAssetWithLifecycle(
        asset_payload,
        user,
        'INVENTORY',
        transaction // Pass transaction so pipeline doesn't commit
      );

      // 5. Mark the inventory record as installed
      await inv_asset.update(
        {
          status: "installed",
          moved_to_asset_id: new_asset.id,
          moved_at: new Date(),
        },
        { transaction }
      );

      // 6. Create AssetStatusHistory for the installation (INVENTORY → HEALTHY)
      const { AssetStatusHistory } = require("../../models");
      await AssetStatusHistory.create(
        {
          asset_id: new_asset.id,
          old_health_statuses: ["INVENTORY"],
          new_health_status: "HEALTHY",
          changed_by: user?.id || user,
          changed_at: new Date(),
          source_type: "INSTALLATION_TICKET",
          source_id: additional_data.ticket_id || null,
        },
        { transaction }
      );

      // 7. Commit transaction
      await transaction.commit();
      
      // 8. Trigger post-creation business logic (compliance, services, audit)
      AssetCreationPipeline._triggerPostCreationLogic(new_asset, user, 'INVENTORY');
      
      console.log(`[InventoryService] ✅ Asset ${new_asset.asset_code} installed successfully`);
      return new_asset;
      
    } catch (error) {
      await transaction.rollback();
      console.error(`[InventoryService] ❌ Failed to install asset:`, error.message);
      throw error;
    }
  }

  // =====================================================================
  // INVENTORY SPARES
  // =====================================================================

  /**
   * Create a new inventory spare record.
   */
  async create_spare(data, user) {
    const {
      plant_id,
      spare_name,
      spare_type,
      material_form,
      unit_of_measurement,
      linked_product_id,
      quantity,
      unit_price,
      notes,
    } = data;

    if (!plant_id) throw { status: 400, message: "plant_id is required" };
    if (!spare_name) throw { status: 400, message: "spare_name is required" };
    if (!spare_type) throw { status: 400, message: "spare_type is required" };

    if (!["consumable", "non-consumable"].includes(spare_type)) {
      throw {
        status: 400,
        message: "spare_type must be 'consumable' or 'non-consumable'",
      };
    }

    const parsedQty = parseFloat(quantity) || 0;
    const total_price =
      unit_price != null && quantity != null
        ? parseFloat(unit_price) * parsedQty
        : null;

    return InventorySpare.create({
      plant_id,
      spare_name,
      spare_type,
      material_form: material_form || null,
      unit_of_measurement: unit_of_measurement || null,
      linked_product_id: linked_product_id || null,
      quantity: parsedQty,
      unit_price: unit_price || null,
      total_price,
      notes: notes || null,
      created_by: user.id,
    });
  }

  /**
   * Paginated list of inventory spares with plant-level access control.
   */
  async get_spares(filters, allowed_plant_ids) {
    const where = {};

    if (filters.plantId) {
      where.plant_id = filters.plantId;
    } else if (allowed_plant_ids && allowed_plant_ids.length > 0) {
      where.plant_id = { [Op.in]: allowed_plant_ids };
    }

    if (filters.spare_type) where.spare_type = filters.spare_type;

    if (filters.search) {
      const searchStr = `%${filters.search.toLowerCase()}%`;
      where[Op.or] = [
        { spare_name: { [Op.iLike]: searchStr } },
        { '$plant.plant_name$': { [Op.iLike]: searchStr } }
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await InventorySpare.findAndCountAll({
      where,
      include: [
        { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
        {
          model: Product,
          as: "linked_product",
          attributes: ["id", "product_name"],
        },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return {
      spares: rows,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Fetch a single inventory spare by primary key.
   */
  async get_spare_by_id(id) {
    return InventorySpare.findByPk(id, {
      include: [
        { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
        {
          model: Product,
          as: "linked_product",
          attributes: ["id", "product_name"],
        },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
    });
  }

  /**
   * Update an inventory spare. Recalculates total_price when quantity/unit_price change.
   */
  async update_spare(id, data, user) {
    const spare = await InventorySpare.findByPk(id);
    if (!spare) throw { status: 404, message: "Inventory spare not found" };

    const { quantity, unit_price } = data;
    if (quantity !== undefined && unit_price !== undefined) {
      data.total_price = parseFloat(unit_price) * parseFloat(quantity);
    } else if (quantity !== undefined && spare.unit_price != null) {
      data.total_price = parseFloat(spare.unit_price) * parseFloat(quantity);
    } else if (unit_price !== undefined && spare.quantity != null) {
      data.total_price = parseFloat(unit_price) * parseFloat(spare.quantity);
    }

    return spare.update(data);
  }

  /**
   * Delete an inventory spare.
   */
  async delete_spare(id) {
    const spare = await InventorySpare.findByPk(id);
    if (!spare) throw { status: 404, message: "Inventory spare not found" };
    await spare.destroy();
  }

  // =====================================================================
  // DYNAMIC MASTER VALUES (custom dropdown management)
  // =====================================================================

  /**
   * Return all stored values for a given type (e.g. 'material_form').
   */
  async get_dynamic_values(type) {
    if (!type) throw { status: 400, message: "type is required" };

    const values = await DynamicMasterValue.findAll({
      where: { type },
      attributes: ["id", "value"],
      order: [["value", "ASC"]],
    });

    return values.map((v) => v.value);
  }

  /**
   * Upsert a dynamic master value (find-or-create by type + value).
   * Returns the value string and whether it was newly created.
   */
  async create_dynamic_value(type, value, user) {
    if (!type) throw { status: 400, message: "type is required" };
    if (!value) throw { status: 400, message: "value is required" };

    const [record, created] = await DynamicMasterValue.findOrCreate({
      where: { type, value },
      defaults: { type, value, created_by: user.id },
    });

    return { value: record.value, created };
  }

  // =====================================================================
  // SPARE TRANSACTIONS (movement log)
  // =====================================================================

  /**
   * Issue a spare (OUT movement).
   * Allowed for BOTH consumable and non-consumable.
   * Reduces quantity in inventory_spares.
   * Creates a transaction record.
   */
  async issue_spare(spare_id, data, user) {
    const {
      quantity,
      issued_to,
      purpose,
      linked_asset_id,
      linked_ticket_id,
      remarks,
      transaction_date,
    } = data;

    if (!quantity || parseFloat(quantity) <= 0) {
      throw { status: 400, message: "Quantity must be greater than 0" };
    }

    const qty = parseFloat(quantity);
    const transaction = await sequelize.transaction();

    try {
      // Lock the spare row to prevent race conditions
      const spare = await InventorySpare.findByPk(spare_id, {
        lock: true,
        transaction,
      });

      if (!spare) throw { status: 404, message: "Spare not found" };

      const current_qty = parseFloat(spare.quantity);

      if (qty > current_qty) {
        throw {
          status: 400,
          message: `Cannot issue ${qty} ${spare.unit_of_measurement || "units"} — only ${current_qty} in stock`,
        };
      }

      const quantity_before = current_qty;
      const quantity_after = parseFloat((current_qty - qty).toFixed(3));

      // Update stock
      await spare.update({ quantity: quantity_after }, { transaction });

      // Create transaction log
      const record = await InventorySpareTransaction.create(
        {
          spare_id,
          transaction_type: "issue",
          quantity: qty,
          quantity_before,
          quantity_after,
          issued_to: issued_to || null,
          purpose: purpose || null,
          linked_asset_id: linked_asset_id || null,
          linked_ticket_id: linked_ticket_id || null,
          remarks: remarks || null,
          transaction_date:
            transaction_date || new Date().toISOString().split("T")[0],
          created_by: user.id,
        },
        { transaction },
      );

      await transaction.commit();

      return {
        transaction: record,
        spare_name: spare.spare_name,
        quantity_issued: qty,
        quantity_remaining: quantity_after,
        unit: spare.unit_of_measurement,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Return a spare (IN movement).
   * ONLY allowed for non-consumable spares.
   * Increases quantity in inventory_spares.
   * Creates a transaction record.
   */
  async return_spare(spare_id, data, user) {
    const {
      quantity,
      received_from,
      return_condition,
      linked_asset_id,
      linked_ticket_id,
      remarks,
      transaction_date,
    } = data;

    if (!quantity || parseFloat(quantity) <= 0) {
      throw { status: 400, message: "Quantity must be greater than 0" };
    }

    const qty = parseFloat(quantity);
    const transaction = await sequelize.transaction();

    try {
      const spare = await InventorySpare.findByPk(spare_id, {
        lock: true,
        transaction,
      });

      if (!spare) throw { status: 404, message: "Spare not found" };

      const issuedSum = await InventorySpareTransaction.sum("quantity", {
        where: { spare_id, transaction_type: "issue" },
        transaction,
      }) || 0;

      const returnedSum = await InventorySpareTransaction.sum("quantity", {
        where: { spare_id, transaction_type: "return" },
        transaction,
      }) || 0;

      const maxReturnAllowed = issuedSum - returnedSum;

      if (qty > maxReturnAllowed) {
        throw {
          status: 400,
          message: `Cannot return ${qty}. Maximum allowed to return is ${maxReturnAllowed} (Issued: ${issuedSum}, Returned previously: ${returnedSum}).`,
        };
      }

      const current_qty = parseFloat(spare.quantity);
      const quantity_before = current_qty;
      const quantity_after = parseFloat((current_qty + qty).toFixed(3));

      // Update stock
      await spare.update({ quantity: quantity_after }, { transaction });

      // Create transaction log
      const record = await InventorySpareTransaction.create(
        {
          spare_id,
          transaction_type: "return",
          quantity: qty,
          quantity_before,
          quantity_after,
          received_from: received_from || null,
          return_condition: return_condition || null,
          linked_asset_id: linked_asset_id || null,
          linked_ticket_id: linked_ticket_id || null,
          remarks: remarks || null,
          transaction_date:
            transaction_date || new Date().toISOString().split("T")[0],
          created_by: user.id,
        },
        { transaction },
      );

      await transaction.commit();

      return {
        transaction: record,
        spare_name: spare.spare_name,
        quantity_returned: qty,
        quantity_now: quantity_after,
        unit: spare.unit_of_measurement,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Get transaction history for a specific spare, newest first.
   */
  async get_spare_transactions(spare_id, filters = {}) {
    const where = { spare_id };
    if (filters.transaction_type)
      where.transaction_type = filters.transaction_type;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await InventorySpareTransaction.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "created_by_user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [
        ["transaction_date", "DESC"],
        ["created_at", "DESC"],
      ],
      limit,
      offset,
    });

    return { transactions: rows, total: count, page, limit };
  }

  // =====================================================================
  // ASSET LIFECYCLE COST TRACKING
  // =====================================================================

  /**
   * Get the total spare costs spent on an asset throughout its lifecycle.
   * Tracks costs from all Breakdown Maintenance and Preventive Maintenance tickets.
   * Works for both inventory assets (via inventory_asset_id) and live assets (via asset_id).
   */
  async get_asset_lifecycle_cost(asset_id) {
    const { Ticket, TicketInventoryUsage, Asset, Building, Floor, Wing } = require("../../models");

    // First check if this is an inventory asset
    const inv_asset = await InventoryAsset.findByPk(asset_id, {
      include: [
        { model: Plant, as: "plant", attributes: ["id", "plant_name"] },
        { model: Category, as: "category", attributes: ["id", "category_name"] },
        { model: Product, as: "product", attributes: ["id", "product_name"] },
      ],
    });

    if (!inv_asset) {
      throw { status: 404, message: "Inventory asset not found" };
    }

    // If installed, fetch the main Asset record with installation location
    let installedAsset = null;
    if (inv_asset.moved_to_asset_id) {
      installedAsset = await Asset.findByPk(inv_asset.moved_to_asset_id, {
        include: [
          { model: Building, as: "building", attributes: ["id", "building_name"] },
          { model: Floor, as: "floor", attributes: ["id", "floor_name"] },
          { model: Wing, as: "wing", attributes: ["id", "wing_name"] },
        ],
      });
    }

    // Find all tickets linked to this inventory asset (or its moved-to asset)
    const ticketWhere = {
      ticket_category: { [Op.in]: ['Breakdown Maintenance', 'Preventive Maintenance'] },
    };

    // Check by both inventory_asset_id and the moved-to asset_id
    const assetConditions = [{ inventory_asset_id: asset_id }];
    if (inv_asset.moved_to_asset_id) {
      assetConditions.push({ asset_id: inv_asset.moved_to_asset_id });
    }
    ticketWhere[Op.or] = assetConditions;

    const tickets = await Ticket.findAll({
      where: ticketWhere,
      attributes: ["id", "ticket_code", "ticket_category", "completed_status", "total_spare_cost", "created_at"],
      include: [
        {
          model: TicketInventoryUsage,
          as: "inventoryUsage",
          attributes: ["id", "item_type", "item_name", "quantity", "unit_cost", "total_cost", "created_at"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Calculate totals
    let total_spare_cost = 0;
    const ticket_details = tickets.map((t) => {
      const ticket = t.toJSON();
      const ticket_cost = (ticket.inventoryUsage || []).reduce((sum, u) => {
        const cost = parseFloat(u.unit_cost || 0) * parseFloat(u.quantity || 0);
        return sum + cost;
      }, 0);
      total_spare_cost += ticket_cost;

      return {
        ticketId: ticket.id,
        ticketCode: ticket.ticket_code,
        category: ticket.ticket_category,
        status: ticket.completed_status,
        spareCost: ticket_cost,
        date: ticket.created_at,
        items: ticket.inventoryUsage || [],
      };
    });

    return {
      asset: {
        id: inv_asset.id,
        assetCode: inv_asset.asset_code,
        manufacturer: inv_asset.manufacturer,
        model: inv_asset.model,
        serialNumber: inv_asset.serial_number,
        status: inv_asset.status,
        movedAt: inv_asset.moved_at,
        plant: inv_asset.plant ? { id: inv_asset.plant.id, plantName: inv_asset.plant.plant_name } : null,
        category: inv_asset.category ? { id: inv_asset.category.id, categoryName: inv_asset.category.category_name } : null,
        product: inv_asset.product ? { id: inv_asset.product.id, productName: inv_asset.product.product_name } : null,
        movedToAssetId: inv_asset.moved_to_asset_id,
      },
      installedLocation: installedAsset ? {
        assetId: installedAsset.id,
        installDate: installedAsset.install_date,
        building: installedAsset.building ? { id: installedAsset.building.id, name: installedAsset.building.building_name } : null,
        floor: installedAsset.floor ? { id: installedAsset.floor.id, name: installedAsset.floor.floor_name } : null,
        wing: installedAsset.wing ? { id: installedAsset.wing.id, name: installedAsset.wing.wing_name } : null,
        location: installedAsset.location,
      } : null,
      totalSpareCost: total_spare_cost,
      ticketCount: tickets.length,
      tickets: ticket_details,
    };
  }
}

module.exports = new InventoryService();
