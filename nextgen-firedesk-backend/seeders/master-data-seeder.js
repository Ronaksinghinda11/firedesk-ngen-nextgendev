/**
 * Master Data Seeder
 * Seeds initial data for master data tables
 * Run after migration: node seeders/master-data-seeder.js
 * 
 * NOTE: Countries, States, Cities are handled by react-country-state-city library
 * No database seeding needed for location data
 */

require('dotenv').config();
const { sequelize } = require('../config/config');

// Import models (excluding Country, State, City)
const Category = require('../src/models/master-data/category');
const Product = require('../src/models/master-data/product');
const Vendor = require('../src/models/master-data/Vendor');
const Industry = require('../src/models/master-data/Industry');
const ConditionMaster = require('../src/models/master-data/ConditionMaster');
const InspectionFrequency = require('../src/models/service-form/InspectionFrequency');

async function seedMasterData() {
    try {
        console.log('🌱 Starting Master Data Seeder...\n');

        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ==========================================
        // 1. CATEGORIES
        // ==========================================
        console.log('Seeding categories...');
        const categories = await Category.bulkCreate([
            {
                category_name: 'Fire Extinguisher',
                category_code: 'FIRE_EXTINGUISHER',
                test_frequency_required: true,
                status: 'Active'
            },
            {
                category_name: 'Fire Hydrant',
                category_code: 'FIRE_HYDRANT',
                test_frequency_required: true,
                status: 'Active'
            },
            {
                category_name: 'Fire Alarm',
                category_code: 'FIRE_ALARM',
                test_frequency_required: true,
                status: 'Active'
            },
            {
                category_name: 'Sprinkler System',
                category_code: 'SPRINKLER_SYSTEM',
                test_frequency_required: true,
                status: 'Active'
            }
        ]);
        categories.forEach(cat => {
            console.log(`  ✓ ${cat.category_name} (${cat.category_code})`);
        });

        // ==========================================
        // 2. PRODUCTS
        // ==========================================
        console.log('\nSeeding products...');
        const fireExtinguisher = categories.find(c => c.category_name === 'Fire Extinguisher');
        const products = await Product.bulkCreate([
            {
                category_id: fireExtinguisher.id,
                product_name: 'ABC Powder',
                product_code: 'ABC_POWDER',
                test_frequency: 'One Year',
                variants: { capacity: '5kg', type: 'stored pressure' },
                status: 'Active'
            },
            {
                category_id: fireExtinguisher.id,
                product_name: 'CO2 Type',
                product_code: 'CO2_TYPE',
                test_frequency: 'One Year',
                variants: { capacity: '4.5kg', type: 'carbon dioxide' },
                status: 'Active'
            },
            {
                category_id: fireExtinguisher.id,
                product_name: 'Foam Type',
                product_code: 'FOAM_TYPE',
                test_frequency: 'One Year',
                variants: { capacity: '9L', type: 'mechanical foam' },
                status: 'Active'
            }
        ]);
        products.forEach(prod => {
            console.log(`  ✓ ${prod.product_name} (${prod.product_code})`);
        });

        // ==========================================
        // 3. VENDORS
        // ==========================================
        console.log('\nSeeding vendors...');
        const vendors = await Vendor.bulkCreate([
            {
                vendor_name: 'Supreme Safety Solutions',
                vendor_code: 'SUPREME_SAFETY_SOLUTIONS',
                address: 'Mumbai, Maharashtra',
                contact_name: 'Rajesh Kumar',
                email: 'rajesh@supremesafety.com',
                phone_no: '+91-9876543210',
                status: 'Active'
            },
            {
                vendor_name: 'FireTech Industries',
                vendor_code: 'FIRETECH_INDUSTRIES',
                address: 'Pune, Maharashtra',
                contact_name: 'Priya Sharma',
                email: 'priya@firetech.com',
                phone_no: '+91-9876543211',
                status: 'Active'
            }
        ]);
        vendors.forEach(vendor => {
            console.log(`  ✓ ${vendor.vendor_name} (${vendor.vendor_code})`);
        });

        // ==========================================
        // 4. INDUSTRIES
        // ==========================================
        console.log('\nSeeding industries...');
        const industries = await Industry.bulkCreate([
            { industry_name: 'Manufacturing', industry_code: 'MANUFACTURING', status: 'Active' },
            { industry_name: 'Healthcare', industry_code: 'HEALTHCARE', status: 'Active' },
            { industry_name: 'Education', industry_code: 'EDUCATION', status: 'Active' },
            { industry_name: 'Hospitality', industry_code: 'HOSPITALITY', status: 'Active' },
            { industry_name: 'IT Services', industry_code: 'IT_SERVICES', status: 'Active' }
        ]);
        industries.forEach(ind => {
            console.log(`  ✓ ${ind.industry_name} (${ind.industry_code})`);
        });

        // ==========================================
        // 5. CONDITIONS
        // ==========================================
        console.log('\nSeeding conditions...');
        const conditions = await ConditionMaster.bulkCreate([
            {
                condition_code: 'PRESSURE_LOW',
                condition_name: 'Pressure Low',
                severity_level: 'HIGH',
                priority_score: 80,
                health_impact: 'Extinguisher may not discharge properly',
                recommended_action: 'Recharge or replace immediately',
                requires_immediate_action: true,
                is_active: true
            },
            {
                condition_code: 'SEAL_DAMAGED',
                condition_name: 'Seal Damaged',
                severity_level: 'CRITICAL',
                priority_score: 95,
                health_impact: 'Tamper evidence compromised, may have been used',
                recommended_action: 'Inspect and replace seal, verify charge',
                requires_immediate_action: true,
                is_active: true
            },
            {
                condition_code: 'HOSE_DAMAGED',
                condition_name: 'Hose Damaged',
                severity_level: 'MEDIUM',
                priority_score: 60,
                health_impact: 'May leak during discharge',
                recommended_action: 'Replace hose assembly',
                requires_immediate_action: false,
                is_active: true
            },
            {
                condition_code: 'LABEL_FADED',
                condition_name: 'Label Faded',
                severity_level: 'LOW',
                priority_score: 30,
                health_impact: 'Instructions may not be readable',
                recommended_action: 'Replace label',
                requires_immediate_action: false,
                is_active: true
            },
            {
                condition_code: 'COMPLIANT_OK',
                condition_name: 'Good Condition',
                severity_level: 'INFO',
                priority_score: 10,
                health_impact: 'No issues detected',
                recommended_action: 'Continue regular maintenance',
                requires_immediate_action: false,
                is_active: true
            }
        ]);
        conditions.forEach(cond => {
            console.log(`  ✓ ${cond.condition_name} (${cond.condition_code}) - ${cond.severity_level}`);
        });

        // ==========================================
        // 6. INSPECTION FREQUENCIES
        // ==========================================
        console.log('\nSeeding inspection frequencies...');
        const frequencies = await InspectionFrequency.bulkCreate([
            { frequency_name: 'Daily', frequency_code: 'DAILY', interval_days: 1, is_active: true },
            { frequency_name: 'Weekly', frequency_code: 'WEEKLY', interval_days: 7, is_active: true },
            { frequency_name: 'Monthly', frequency_code: 'MONTHLY', interval_days: 30, is_active: true },
            { frequency_name: 'Quarterly', frequency_code: 'QUARTERLY', interval_days: 90, is_active: true },
            { frequency_name: 'Half Yearly', frequency_code: 'HALF_YEARLY', interval_days: 180, is_active: true },
            { frequency_name: 'Yearly', frequency_code: 'YEARLY', interval_days: 365, is_active: true },
            { frequency_name: '2 Years', frequency_code: '2_YEARS', interval_days: 730, is_active: true },
            { frequency_name: '5 Years', frequency_code: '5_YEARS', interval_days: 1825, is_active: true }
        ], { updateOnDuplicate: ['frequency_name', 'interval_days', 'is_active'] });

        frequencies.forEach(freq => {
            console.log(`  ✓ ${freq.frequency_name} (${freq.frequency_code})`);
        });

        console.log('\n✅ Master data seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Categories: ${await Category.count()}`);
        console.log(`   - Products: ${await Product.count()}`);
        console.log(`   - Vendors: ${await Vendor.count()}`);
        console.log(`   - Industries: ${await Industry.count()}`);
        console.log(`   - Industries: ${await Industry.count()}`);
        console.log(`   - Conditions: ${await ConditionMaster.count()}`);
        console.log(`   - Frequencies: ${await InspectionFrequency.count()}`);

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

seedMasterData();
