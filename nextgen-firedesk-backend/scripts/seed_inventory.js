/**
 * Inventory Seed Script
 * Seeds realistic sample data for inventory_assets and inventory_spares tables.
 *
 * Uses REAL IDs from the database (verified via check_db_for_seed.js):
 *
 * Plants:
 *   e93abd83  → Bharath Science Foundation  (PLT-00002)
 *   2d0556b3  → Factory A                  (PLT-00001)
 *   97089ca8  → Factory Delhi              (PLT-7CDEA6B0)
 *   ec699a1e  → Factory Mumbai             (PLT-00CE5B62)
 *   bd7bc57b  → Nova Pharma Labs           (PLT-00003)
 *
 * Categories:
 *   158c5944  → Fire Extinguisher  (maps to: e93abd83, 2d0556b3, ec699a1e, bd7bc57b)
 *   f409451d  → Fire Alarm         (maps to: ec699a1e, 97089ca8)
 *   1877b8bb  → Cat1               (maps to: 97089ca8)
 *
 * Products (Fire Extinguisher – 158c5944):
 *   f7446591  → Butterfly Valve
 *   8bbba494  → Clean agent
 *   aaceafc0  → Clean Agent (CLEAN_AGENT_1)
 *   1ae6f3e9  → CO2
 *   d8eab48e  → jockey Pump
 *
 * Products (Fire Alarm – f409451d):
 *   c04be0ce  → Latest
 *
 * Products (Cat1 – 1877b8bb):
 *   5ee16553  → Mini WATER
 *
 * Users:
 *   650964de  → Admin (admin@firedesk.com)
 *
 * Run: node scripts/seed_inventory.js
 * Rollback: node scripts/seed_inventory.js down
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

// ─── Real IDs from the database ───────────────────────────────────────────────

const PLANTS = {
  bharath:  'e93abd83-ccac-4cbc-9cec-25a7f3a9c4e6',
  factoryA: '2d0556b3-747d-4cba-bf7f-fb92e90a64f4',
  delhi:    '97089ca8-d10e-4d6b-b358-7fecb04dcd21',
  mumbai:   'ec699a1e-8681-4dff-afeb-c15a1ec7db42',
  nova:     'bd7bc57b-fb43-4b91-b547-2e4be2cf31f9',
};

const CATEGORIES = {
  fireExtinguisher: '158c5944-8c8e-47ac-8ba0-dde856d85d7c',
  fireAlarm:        'f409451d-5c23-4140-b03d-2f4a75850930',
  cat1:             '1877b8bb-1b43-4e1d-9ac7-6e386b88f05f',
};

const PRODUCTS = {
  butterflyValve: 'f7446591-3f1e-4ba7-a2de-c1053fc8db5a',  // Fire Extinguisher
  cleanAgent:     'aaceafc0-ca28-4db0-af74-2d2b67de3a93',  // Fire Extinguisher
  co2:            '1ae6f3e9-a640-433b-963d-6cc1a94a6b1b',  // Fire Extinguisher
  jockeyPump:     'd8eab48e-33d5-4cc6-83b7-621e698e4f1b',  // Fire Extinguisher
  latest:         'c04be0ce-2990-4299-b749-f966da643124',  // Fire Alarm
  miniWater:      '5ee16553-f05c-4e07-8faf-a6235b5f1277',  // Cat1
};

const USERS = {
  admin: '650964de-0a63-4109-919e-023412913308',
};

// ─── Seed data ────────────────────────────────────────────────────────────────

/**
 * inventory_assets seed rows.
 * Columns: id, plant_id, category_id, product_id, type, sub_type,
 *          manufacturer, model, serial_number, manufacturing_date,
 *          warranty_end_date, lifespan_years, quantity, unit_price,
 *          total_price, documents, status, created_by, created_at, updated_at
 */
const INVENTORY_ASSETS = [
  {
    // Bharath Science Foundation – Clean Agent fire extinguisher
    plant_id:          PLANTS.bharath,
    category_id:       CATEGORIES.fireExtinguisher,
    product_id:        PRODUCTS.cleanAgent,
    type:              'Stored Pressure',
    sub_type:          null,
    manufacturer:      'Minimax',
    model:             'MX-CA-6',
    serial_number:     'MM-CA-2026-001',
    manufacturing_date:'2025-11-15',
    warranty_end_date: '2030-11-15',
    lifespan_years:    10,
    quantity:          5,
    unit_price:        3500.00,
    total_price:       17500.00,
    status:            'available',
    notes:             'Stored in main warehouse — ready for deployment',
  },
  {
    // Factory A – Butterfly Valve (fire extinguisher category)
    plant_id:          PLANTS.factoryA,
    category_id:       CATEGORIES.fireExtinguisher,
    product_id:        PRODUCTS.butterflyValve,
    type:              'Wafer Type',
    sub_type:          null,
    manufacturer:      'AVK',
    model:             'BV-300-WT',
    serial_number:     'AVK-BV-2026-007',
    manufacturing_date:'2025-09-01',
    warranty_end_date: '2027-09-01',
    lifespan_years:    7,
    quantity:          3,
    unit_price:        8200.00,
    total_price:       24600.00,
    status:            'available',
    notes:             'Received in Q1 2026 batch',
  },
  {
    // Factory Delhi – Mini WATER (Cat1)
    plant_id:          PLANTS.delhi,
    category_id:       CATEGORIES.cat1,
    product_id:        PRODUCTS.miniWater,
    type:              'Portable',
    sub_type:          'ABC Type',
    manufacturer:      'Safex',
    model:             'SW-9L-P',
    serial_number:     'SFX-SW-2026-042',
    manufacturing_date:'2026-01-10',
    warranty_end_date: '2028-01-10',
    lifespan_years:    5,
    quantity:          10,
    unit_price:        1250.00,
    total_price:       12500.00,
    status:            'available',
    notes:             'Factory Delhi ground floor stock',
  },
  {
    // Factory Mumbai – Fire Alarm (Latest product)
    plant_id:          PLANTS.mumbai,
    category_id:       CATEGORIES.fireAlarm,
    product_id:        PRODUCTS.latest,
    type:              'Conventional',
    sub_type:          'Heat Detector',
    manufacturer:      'Honeywell',
    model:             'HWL-FA-200',
    serial_number:     'HWL-2026-0091',
    manufacturing_date:'2025-12-20',
    warranty_end_date: '2028-12-20',
    lifespan_years:    8,
    quantity:          2,
    unit_price:        22000.00,
    total_price:       44000.00,
    status:            'available',
    notes:             'High-sensitivity panel for server room',
  },
  {
    // Nova Pharma Labs – CO2 extinguisher
    plant_id:          PLANTS.nova,
    category_id:       CATEGORIES.fireExtinguisher,
    product_id:        PRODUCTS.co2,
    type:              'CO2 Type',
    sub_type:          null,
    manufacturer:      'Ceasefire',
    model:             'CF-CO2-5KG',
    serial_number:     'CF-CO2-2026-113',
    manufacturing_date:'2026-02-01',
    warranty_end_date: '2031-02-01',
    lifespan_years:    10,
    quantity:          8,
    unit_price:        4800.00,
    total_price:       38400.00,
    status:            'reserved',
    notes:             'Reserved for clean room — do not deploy without approval',
  },
  {
    // Bharath Science Foundation – Jockey Pump (already moved to assets)
    plant_id:          PLANTS.bharath,
    category_id:       CATEGORIES.fireExtinguisher,
    product_id:        PRODUCTS.jockeyPump,
    type:              'Electric',
    sub_type:          null,
    manufacturer:      'Kirloskar',
    model:             'KP-JP-1HP',
    serial_number:     'KKL-JP-2025-055',
    manufacturing_date:'2025-06-01',
    warranty_end_date: '2028-06-01',
    lifespan_years:    12,
    quantity:          1,
    unit_price:        45000.00,
    total_price:       45000.00,
    status:            'moved',
    notes:             'Deployed to pump room — see assets table for record',
  },
];

/**
 * inventory_spares seed rows.
 * Columns: id, plant_id, spare_name, spare_type, material_form,
 *          unit_of_measurement, linked_product_id, quantity, unit_price,
 *          total_price, created_by, created_at, updated_at
 *
 * Note: The existing row from the user (Screw / Bharath / consumable) is kept
 * and referenced so we don't duplicate it — we only INSERT non-conflicting rows.
 */
const INVENTORY_SPARES = [
  {
    // Bharath – O-Ring seals (general spare, consumable)
    plant_id:            PLANTS.bharath,
    spare_name:          'O-Ring Seal',
    spare_type:          'consumable',
    material_form:       'Solid',
    unit_of_measurement: 'Piece',
    linked_product_id:   null,                     // General spare
    quantity:            50.000,
    unit_price:          25.00,
    total_price:         1250.00,
  },
  {
    // Factory A – CO2 gas refill cylinder (consumable, linked to CO2 product)
    plant_id:            PLANTS.factoryA,
    spare_name:          'CO2 Gas Refill Cylinder',
    spare_type:          'consumable',
    material_form:       'Gas',
    unit_of_measurement: 'Kg',
    linked_product_id:   PRODUCTS.co2,
    quantity:            20.000,
    unit_price:          380.00,
    total_price:         7600.00,
  },
  {
    // Factory A – Pressure gauge (non-consumable, reusable)
    plant_id:            PLANTS.factoryA,
    spare_name:          'Pressure Gauge 0-250 PSI',
    spare_type:          'non-consumable',
    material_form:       'Solid',
    unit_of_measurement: 'Piece',
    linked_product_id:   PRODUCTS.jockeyPump,
    quantity:            6.000,
    unit_price:          850.00,
    total_price:         5100.00,
  },
  {
    // Factory Delhi – Lubricant grease (consumable)
    plant_id:            PLANTS.delhi,
    spare_name:          'High-Temperature Lubricant Grease',
    spare_type:          'consumable',
    material_form:       'Solid',
    unit_of_measurement: 'Kg',
    linked_product_id:   null,                     // General spare
    quantity:            5.500,
    unit_price:          650.00,
    total_price:         3575.00,
  },
  {
    // Factory Mumbai – Smoke detector sensor head (non-consumable)
    plant_id:            PLANTS.mumbai,
    spare_name:          'Ionisation Smoke Detector Head',
    spare_type:          'non-consumable',
    material_form:       'Solid',
    unit_of_measurement: 'Piece',
    linked_product_id:   PRODUCTS.latest,
    quantity:            12.000,
    unit_price:          1200.00,
    total_price:         14400.00,
  },
  {
    // Nova Pharma Labs – Isopropyl Alcohol cleaning fluid (consumable)
    plant_id:            PLANTS.nova,
    spare_name:          'Isopropyl Alcohol 99% (IPA)',
    spare_type:          'consumable',
    material_form:       'Liquid',
    unit_of_measurement: 'Litre',
    linked_product_id:   null,                     // General spare
    quantity:            30.000,
    unit_price:          220.00,
    total_price:         6600.00,
  },
  {
    // Nova Pharma Labs – Butterfly valve seat ring (non-consumable)
    plant_id:            PLANTS.nova,
    spare_name:          'Butterfly Valve EPDM Seat Ring',
    spare_type:          'non-consumable',
    material_form:       'Solid',
    unit_of_measurement: 'Piece',
    linked_product_id:   PRODUCTS.butterflyValve,
    quantity:            8.000,
    unit_price:          1800.00,
    total_price:         14400.00,
  },
  {
    // Factory Delhi – Dry chemical powder (consumable)
    plant_id:            PLANTS.delhi,
    spare_name:          'ABC Dry Chemical Powder',
    spare_type:          'consumable',
    material_form:       'Powder',
    unit_of_measurement: 'Kg',
    linked_product_id:   PRODUCTS.miniWater,
    quantity:            25.000,
    unit_price:          180.00,
    total_price:         4500.00,
  },
];

// ─── Dynamic master values ────────────────────────────────────────────────────

const DYNAMIC_MASTER_VALUES = [
  { type: 'material_form',       value: 'Gas'     },
  { type: 'material_form',       value: 'Powder'  },
  { type: 'unit_of_measurement', value: 'Litre'   },
  { type: 'unit_of_measurement', value: 'Metre'   },
  { type: 'unit_of_measurement', value: 'Box'     },
  { type: 'unit_of_measurement', value: 'Set'     },
];

// ─── Up ───────────────────────────────────────────────────────────────────────

async function up() {
  console.log('🌱 Running Inventory Seed Script...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // ── 1. Dynamic master values ──────────────────────────────────────────────
    console.log('📋 Seeding dynamic_master_values...');
    for (const { type, value } of DYNAMIC_MASTER_VALUES) {
      await sequelize.query(`
        INSERT INTO dynamic_master_values (id, type, value, created_by, created_at)
        VALUES (uuid_generate_v4(), :type, :value, :created_by, NOW())
        ON CONFLICT (type, value) DO NOTHING
      `, {
        replacements: { type, value, created_by: USERS.admin },
        type: sequelize.QueryTypes.INSERT,
      });
      console.log(`   ✅ ${type}: ${value}`);
    }

    // ── 2. Inventory assets ───────────────────────────────────────────────────
    console.log('\n📦 Seeding inventory_assets...');
    for (const row of INVENTORY_ASSETS) {
      await sequelize.query(`
        INSERT INTO inventory_assets (
          id, plant_id, category_id, product_id,
          type, sub_type, manufacturer, model, serial_number,
          manufacturing_date, warranty_end_date, lifespan_years,
          quantity, unit_price, total_price, documents,
          status, notes, created_by, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(),
          :plant_id, :category_id, :product_id,
          :type, :sub_type, :manufacturer, :model, :serial_number,
          :manufacturing_date, :warranty_end_date, :lifespan_years,
          :quantity, :unit_price, :total_price, '[]'::jsonb,
          :status, :notes, :created_by, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          plant_id:          row.plant_id,
          category_id:       row.category_id,
          product_id:        row.product_id,
          type:              row.type              ?? null,
          sub_type:          row.sub_type          ?? null,
          manufacturer:      row.manufacturer      ?? null,
          model:             row.model             ?? null,
          serial_number:     row.serial_number     ?? null,
          manufacturing_date:row.manufacturing_date ?? null,
          warranty_end_date: row.warranty_end_date  ?? null,
          lifespan_years:    row.lifespan_years     ?? null,
          quantity:          row.quantity,
          unit_price:        row.unit_price         ?? null,
          total_price:       row.total_price        ?? null,
          status:            row.status,
          notes:             row.notes              ?? null,
          created_by:        USERS.admin,
        },
        type: sequelize.QueryTypes.INSERT,
      });
      console.log(`   ✅ [${row.status.toUpperCase()}] ${row.manufacturer ?? ''} ${row.model ?? ''} → ${row.quantity}× (plant: ${row.plant_id.slice(0, 8)}…)`);
    }

    // ── 3. Inventory spares ───────────────────────────────────────────────────
    console.log('\n🔧 Seeding inventory_spares...');
    for (const row of INVENTORY_SPARES) {
      await sequelize.query(`
        INSERT INTO inventory_spares (
          id, plant_id, spare_name, spare_type,
          material_form, unit_of_measurement, linked_product_id,
          quantity, unit_price, total_price,
          notes, created_by, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(),
          :plant_id, :spare_name, :spare_type,
          :material_form, :unit_of_measurement, :linked_product_id,
          :quantity, :unit_price, :total_price,
          :notes, :created_by, NOW(), NOW()
        )
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          plant_id:            row.plant_id,
          spare_name:          row.spare_name,
          spare_type:          row.spare_type,
          material_form:       row.material_form        ?? null,
          unit_of_measurement: row.unit_of_measurement  ?? null,
          linked_product_id:   row.linked_product_id    ?? null,
          quantity:            row.quantity,
          unit_price:          row.unit_price            ?? null,
          total_price:         row.total_price           ?? null,
          notes:               row.notes                ?? null,
          created_by:          USERS.admin,
        },
        type: sequelize.QueryTypes.INSERT,
      });

      const link = row.linked_product_id
        ? `linked to product ${row.linked_product_id.slice(0, 8)}…`
        : 'general spare';
      console.log(`   ✅ [${row.spare_type}] ${row.spare_name} — qty ${row.quantity} ${row.unit_of_measurement ?? ''} (${link})`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const [assetCount] = await sequelize.query(
      'SELECT COUNT(*) AS c FROM inventory_assets',
      { type: sequelize.QueryTypes.SELECT }
    );
    const [spareCount] = await sequelize.query(
      'SELECT COUNT(*) AS c FROM inventory_spares',
      { type: sequelize.QueryTypes.SELECT }
    );
    const [dmvCount]   = await sequelize.query(
      'SELECT COUNT(*) AS c FROM dynamic_master_values',
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n─────────────────────────────────────────────');
    console.log('✅ Seed completed successfully!');
    console.log(`   inventory_assets        : ${assetCount.c} total rows`);
    console.log(`   inventory_spares        : ${spareCount.c} total rows`);
    console.log(`   dynamic_master_values   : ${dmvCount.c} total rows`);
    console.log('─────────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (err.parent) console.error('   DB error:', err.parent.message);
    throw err;
  }
}

// ─── Down (rollback) ─────────────────────────────────────────────────────────

async function down() {
  console.log('🔄 Rolling back inventory seed data...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Only delete rows created by the admin seed user to be safe
    const [spares] = await sequelize.query(
      `DELETE FROM inventory_spares WHERE created_by = :uid RETURNING id`,
      { replacements: { uid: USERS.admin }, type: sequelize.QueryTypes.SELECT }
    );
    console.log(`   🗑  Deleted ${Array.isArray(spares) ? spares.length : 0} spare rows`);

    const [assets] = await sequelize.query(
      `DELETE FROM inventory_assets WHERE created_by = :uid RETURNING id`,
      { replacements: { uid: USERS.admin }, type: sequelize.QueryTypes.SELECT }
    );
    console.log(`   🗑  Deleted ${Array.isArray(assets) ? assets.length : 0} asset rows`);

    await sequelize.query(
      `DELETE FROM dynamic_master_values WHERE created_by = :uid`,
      { replacements: { uid: USERS.admin } }
    );
    console.log('   🗑  Deleted dynamic master values seeded by admin');

    console.log('\n✅ Rollback completed!\n');
  } catch (err) {
    console.error('❌ Rollback failed:', err.message);
    throw err;
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (require.main === module) {
  const action = process.argv[2] || 'up';

  (async () => {
    try {
      if (action === 'down') {
        await down();
      } else {
        await up();
      }
    } catch (err) {
      console.error('Script error:', err.message);
      process.exit(1);
    } finally {
      await sequelize.close();
      process.exit(0);
    }
  })();
}

module.exports = { up, down };
