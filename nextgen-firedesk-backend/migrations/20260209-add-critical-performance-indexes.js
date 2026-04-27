/**
 * Migration: Add Critical Performance Indexes
 * 
 * This migration adds all missing performance indexes that were defined
 * in earlier migrations but never applied to production.
 * 
 * Run with: npx sequelize-cli db:migrate
 * Or manually in psql: Copy the SQL from the 'up' function
 */

'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;

        console.log('🚀 Adding critical performance indexes...');

        // ==========================================
        // ASSETS TABLE INDEXES
        // ==========================================
        console.log('📋 Adding indexes to assets table...');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_plant ON assets(plant_id);`);
        console.log('   ✅ idx_assets_plant');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);`);
        console.log('   ✅ idx_assets_category');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_product ON assets(product_id);`);
        console.log('   ✅ idx_assets_product');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);`);
        console.log('   ✅ idx_assets_status');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_health ON assets(health_status);`);
        console.log('   ✅ idx_assets_health');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_maint ON assets(maintenance_status);`);
        console.log('   ✅ idx_assets_maint');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_deleted ON assets(deleted_at);`);
        console.log('   ✅ idx_assets_deleted');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_building ON assets(building_id);`);
        console.log('   ✅ idx_assets_building');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assets_floor ON assets(floor_id);`);
        console.log('   ✅ idx_assets_floor');

        // ==========================================
        // SERVICE_SUBMISSIONS TABLE INDEXES
        // ==========================================
        console.log('📋 Adding indexes to service_submissions table...');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_asset ON service_submissions(asset_id);`);
        console.log('   ✅ idx_submissions_asset');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_form ON service_submissions(form_id);`);
        console.log('   ✅ idx_submissions_form');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_tech ON service_submissions(technician_id);`);
        console.log('   ✅ idx_submissions_tech');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON service_submissions(status);`);
        console.log('   ✅ idx_submissions_status');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_scheduled ON service_submissions(scheduled_date);`);
        console.log('   ✅ idx_submissions_scheduled');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_plant ON service_submissions(plant_id);`);
        console.log('   ✅ idx_submissions_plant');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_approval ON service_submissions(approval_status);`);
        console.log('   ✅ idx_submissions_approval');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_submitted ON service_submissions(submitted_at);`);
        console.log('   ✅ idx_submissions_submitted');

        // Composite index for calendar queries
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_calendar ON service_submissions(scheduled_date, status, plant_id);`);
        console.log('   ✅ idx_submissions_calendar (composite)');

        // Composite for asset timeline queries
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_asset_date ON service_submissions(asset_id, scheduled_date);`);
        console.log('   ✅ idx_submissions_asset_date (composite)');

        // ==========================================
        // SERVICE_ANSWERS TABLE INDEXES
        // ==========================================
        console.log('📋 Adding indexes to service_answers table...');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_answers_submission ON service_answers(submission_id);`);
        console.log('   ✅ idx_answers_submission');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_answers_question ON service_answers(question_id);`);
        console.log('   ✅ idx_answers_question');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_answers_compliance ON service_answers(compliance_status);`);
        console.log('   ✅ idx_answers_compliance');

        // ==========================================
        // ADDITIONAL CRITICAL INDEXES
        // ==========================================
        console.log('📋 Adding additional critical indexes...');

        // Users table
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        console.log('   ✅ idx_users_email');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`);
        console.log('   ✅ idx_users_status');

        // Technicians
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_technicians_user ON technicians(user_id);`);
        console.log('   ✅ idx_technicians_user');

        // Managers
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_managers_user ON managers(user_id);`);
        console.log('   ✅ idx_managers_user');

        // Plant assignments (technician_plants is the actual table name)
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_technician_plants_plant ON technician_plants(plant_id);`);
        console.log('   ✅ idx_technician_plants_plant');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_technician_plants_technician ON technician_plants(technician_id);`);
        console.log('   ✅ idx_technician_plants_technician');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plant_managers_plant ON plant_managers(plant_id);`);
        console.log('   ✅ idx_plant_managers_plant');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_plant_managers_manager ON plant_managers(manager_id);`);
        console.log('   ✅ idx_plant_managers_manager');

        // Notifications
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
        console.log('   ✅ idx_notifications_user');

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);`);
        console.log('   ✅ idx_notifications_read');

        console.log('✅ All critical performance indexes added successfully!');
    },

    async down(queryInterface, Sequelize) {
        const sequelize = queryInterface.sequelize;

        console.log('⚠️ Dropping performance indexes...');

        // Assets
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_category;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_product;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_status;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_health;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_maint;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_deleted;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_building;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_assets_floor;`);

        // Service submissions
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_asset;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_form;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_tech;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_status;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_scheduled;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_approval;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_submitted;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_calendar;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_submissions_asset_date;`);

        // Service answers
        await sequelize.query(`DROP INDEX IF EXISTS idx_answers_submission;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_answers_question;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_answers_compliance;`);

        // Additional
        await sequelize.query(`DROP INDEX IF EXISTS idx_users_email;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_users_status;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_technicians_user;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_managers_user;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_technician_plants_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_technician_plants_technician;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_plant_managers_plant;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_plant_managers_manager;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_notifications_user;`);
        await sequelize.query(`DROP INDEX IF EXISTS idx_notifications_read;`);

        console.log('✅ Performance indexes dropped');
    }
};
