/**
 * Migration: Service Forms Module
 * Creates tables for standalone questions, form definitions, service submissions, and answers
 * 
 * Tables: inspection_frequencies, questions, question_categories, question_products, 
 *         question_frequencies, question_conditions, forms, form_sections, form_questions,
 *         service_submissions, service_answers, asset_health_history
 * 
 * Run: node migrations/005_service_forms_module.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/config');

async function up() {
    console.log('🚀 Running Service Forms Module Migration (005)...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // ============================================
        // INSPECTION_FREQUENCIES TABLE
        // ============================================
        console.log('📋 Creating inspection_frequencies table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS inspection_frequencies (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                frequency_code VARCHAR(50) UNIQUE NOT NULL,
                frequency_name VARCHAR(100) NOT NULL,
                interval_days INTEGER,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_inspection_frequencies_code ON inspection_frequencies(frequency_code);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_inspection_frequencies_active ON inspection_frequencies(is_active);`);
        console.log('   ✅ inspection_frequencies table created');

        // ============================================
        // QUESTIONS TABLE (STANDALONE, REUSABLE)
        // ============================================
        console.log('📋 Creating questions table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE question_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                -- Core question data
                question_text TEXT NOT NULL,
                question_code VARCHAR(100) UNIQUE NOT NULL,
                
                -- Question behavior
                answer_type VARCHAR(50) NOT NULL,
                question_type VARCHAR(50),
                
                -- Requirements
                is_mandatory BOOLEAN DEFAULT false,
                requires_photo BOOLEAN DEFAULT false,
                requires_notes BOOLEAN DEFAULT false,
                
                -- UI & Help
                help_text TEXT,
                display_condition JSONB,
                
                -- Status
                status question_status_enum DEFAULT 'Active',
                
                -- Audit
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS questions_code_unique ON questions(question_code);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_questions_answer_type ON questions(answer_type);`);
        console.log('   ✅ questions table created');

        // ============================================
        // QUESTION_CATEGORIES TABLE (MULTI-SELECTION)
        // ============================================
        console.log('📋 Creating question_categories table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS question_categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                
                UNIQUE(question_id, category_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_categories_question ON question_categories(question_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_categories_category ON question_categories(category_id);`);
        console.log('   ✅ question_categories table created');

        // ============================================
        // QUESTION_PRODUCTS TABLE (MULTI-SELECTION)
        // ============================================
        console.log('📋 Creating question_products table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS question_products (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                
                UNIQUE(question_id, product_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_products_question ON question_products(question_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_products_product ON question_products(product_id);`);
        console.log('   ✅ question_products table created');

        // ============================================
        // QUESTION_FREQUENCIES TABLE (MULTI-SELECTION)
        // ============================================
        console.log('📋 Creating question_frequencies table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS question_frequencies (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                frequency_id UUID NOT NULL REFERENCES inspection_frequencies(id) ON DELETE CASCADE,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                
                UNIQUE(question_id, frequency_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_frequencies_question ON question_frequencies(question_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_frequencies_frequency ON question_frequencies(frequency_id);`);
        console.log('   ✅ question_frequencies table created');

        // ============================================
        // QUESTION_CONDITIONS TABLE (LINKS QUESTIONS TO CONDITIONS)
        // ============================================
        console.log('📋 Creating question_conditions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS question_conditions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                condition_id UUID NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
                
                condition_source VARCHAR(100),
                display_order INTEGER,
                is_active BOOLEAN DEFAULT true,
                data_source_config JSONB,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                
                UNIQUE(question_id, condition_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_conditions_question ON question_conditions(question_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_conditions_condition ON question_conditions(condition_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_question_conditions_order ON question_conditions(question_id, display_order);`);
        console.log('   ✅ question_conditions table created');

        // ============================================
        // FORMS TABLE
        // ============================================
        console.log('📋 Creating forms table...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE form_status_enum AS ENUM ('Active', 'Inactive');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS forms (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                form_code VARCHAR(100) UNIQUE NOT NULL,
                service_name VARCHAR(255) NOT NULL,
                
                -- Optional form-level filters (can be null if form is generic)
                category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
                product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
                
                status form_status_enum DEFAULT 'Active',
                
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS forms_code_unique ON forms(form_code);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_forms_category ON forms(category_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_forms_product ON forms(product_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_forms_plant ON forms(plant_id);`);
        console.log('   ✅ forms table created');

        // ============================================
        // FORM_SECTIONS TABLE
        // ============================================
        console.log('📋 Creating form_sections table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS form_sections (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                
                section_name VARCHAR(255) NOT NULL,
                section_order INTEGER NOT NULL,
                description TEXT,
                is_mandatory BOOLEAN DEFAULT false,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_form_sections_form ON form_sections(form_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_form_sections_order ON form_sections(form_id, section_order);`);
        console.log('   ✅ form_sections table created');

        // ============================================
        // FORM_QUESTIONS TABLE (LINKS FORMS TO STANDALONE QUESTIONS)
        // ============================================
        console.log('📋 Creating form_questions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS form_questions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
                section_id UUID REFERENCES form_sections(id) ON DELETE SET NULL,
                
                -- Form-specific overrides
                question_order INTEGER NOT NULL,
                is_mandatory_override BOOLEAN,
                
                created_at TIMESTAMPTZ DEFAULT NOW(),
                
                UNIQUE(form_id, question_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_form_questions_form ON form_questions(form_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_form_questions_question ON form_questions(question_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_form_questions_section ON form_questions(section_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_form_questions_order ON form_questions(form_id, question_order);`);
        console.log('   ✅ form_questions table created');

        // ============================================
        // SERVICE_SUBMISSIONS TABLE
        // ============================================
        console.log('📋 Creating service_submissions table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS service_submissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                submission_number VARCHAR(100) UNIQUE,
                
                -- Core relationships
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                schedule_id UUID REFERENCES maintenance_schedulers(id) ON DELETE SET NULL,
                frequency_id UUID REFERENCES inspection_frequencies(id) ON DELETE SET NULL,
                
                -- Assignment
                technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
                submitted_by UUID REFERENCES technicians(id) ON DELETE SET NULL,
                manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
                
                -- Submission metadata
                frequency VARCHAR(50),
                inspection_type VARCHAR(50),
                scheduled_date DATE,
                
                -- Status tracking
                status VARCHAR(50),
                
                -- Timestamps
                started_at TIMESTAMPTZ,
                submitted_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                
                -- QR verification
                qr_verified BOOLEAN DEFAULT false,
                qr_verified_at TIMESTAMPTZ,
                
                -- Override handling
                override_requested BOOLEAN DEFAULT false,
                override_requested_at TIMESTAMPTZ,
                override_reason TEXT,
                override_status VARCHAR(50),
                override_approved_by UUID REFERENCES managers(id) ON DELETE SET NULL,
                override_approved_at TIMESTAMPTZ,
                
                -- Approval workflow
                approval_status VARCHAR(50),
                approved_by UUID REFERENCES managers(id) ON DELETE SET NULL,
                approved_at TIMESTAMPTZ,
                approval_remarks TEXT,
                
                -- Cancellation
                cancelled_reason TEXT,
                cancelled_at TIMESTAMPTZ,
                
                -- Precomputed metrics (computed from service_answers via trigger)
                critical_count INTEGER DEFAULT 0,
                high_count INTEGER DEFAULT 0,
                medium_count INTEGER DEFAULT 0,
                low_count INTEGER DEFAULT 0,
                total_priority_score INTEGER DEFAULT 0,
                
                -- Health status (computed by trigger)
                calculated_health_status VARCHAR(50),
                calculated_priority_score INTEGER,
                
                created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_asset ON service_submissions(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_form ON service_submissions(form_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_tech ON service_submissions(technician_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON service_submissions(status);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_submitted ON service_submissions(submitted_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_asset_submitted ON service_submissions(asset_id, submitted_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_scheduled ON service_submissions(scheduled_date);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_submissions_health ON service_submissions(calculated_health_status);`);
        console.log('   ✅ service_submissions table created');

        // ============================================
        // SERVICE_ANSWERS TABLE (REFERENCES STANDALONE QUESTIONS)
        // ============================================
        console.log('📋 Creating service_answers table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS service_answers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                -- Relationships
                submission_id UUID NOT NULL REFERENCES service_submissions(id) ON DELETE CASCADE,
                question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
                
                -- Answer values (use appropriate field based on question type)
                text_value TEXT,
                numeric_value NUMERIC,
                boolean_value BOOLEAN,
                date_value DATE,
                json_value JSONB,
                
                -- Condition-based answers (for inspection questions)
                selected_condition_id UUID REFERENCES conditions(id) ON DELETE SET NULL,
                condition_code VARCHAR(50),
                condition_name VARCHAR(255),
                severity_level VARCHAR(20),
                priority_score INTEGER,
                health_impact VARCHAR(255),
                
                -- Rich content
                photo_urls JSONB,
                signature_url VARCHAR(500),
                notes TEXT,
                
                -- Answer metadata
                answered_by UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
                answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                
                UNIQUE(submission_id, question_id)
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_submission ON service_answers(submission_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_question ON service_answers(question_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_condition ON service_answers(selected_condition_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_answered_by ON service_answers(answered_by);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_answered_at ON service_answers(answered_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_severity ON service_answers(severity_level);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_service_answers_submission_severity ON service_answers(submission_id, severity_level);`);
        console.log('   ✅ service_answers table created');

        // ============================================
        // ASSET_HEALTH_HISTORY TABLE
        // ============================================
        console.log('📋 Creating asset_health_history table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS asset_health_history (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                
                asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                submission_id UUID REFERENCES service_submissions(id) ON DELETE SET NULL,
                
                -- Timestamp
                submitted_at TIMESTAMPTZ NOT NULL,
                
                -- Snapshot of metrics at this point in time
                critical_count INTEGER,
                high_count INTEGER,
                medium_count INTEGER,
                low_count INTEGER,
                total_priority_score INTEGER,
                health_status VARCHAR(50),
                
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_health_hist_asset_time ON asset_health_history(asset_id, submitted_at);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_health_hist_submission ON asset_health_history(submission_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_health_hist_asset ON asset_health_history(asset_id);`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_health_hist_submitted ON asset_health_history(submitted_at);`);
        console.log('   ✅ asset_health_history table created');

        console.log('\n✅ Service Forms Module Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function down() {
    console.log('🔄 Rolling back Service Forms Module Migration...\n');

    try {
        await sequelize.authenticate();

        // Drop tables in reverse order (respecting foreign key dependencies)
        await sequelize.query('DROP TABLE IF EXISTS asset_health_history CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS service_answers CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS service_submissions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS form_questions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS form_sections CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS forms CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS question_conditions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS question_frequencies CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS question_products CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS question_categories CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS questions CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS inspection_frequencies CASCADE;');

        // Drop enum types
        await sequelize.query('DROP TYPE IF EXISTS form_status_enum;');
        await sequelize.query('DROP TYPE IF EXISTS question_status_enum;');

        console.log('✅ Rollback completed!\n');

    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        throw error;
    }
}

// Export for use with run_all_migrations
module.exports = { up, down };

// Run directly if executed as main script
if (require.main === module) {
    const action = process.argv[2] || 'up';

    (async () => {
        try {
            await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

            if (action === 'down') {
                await down();
            } else {
                await up();
            }
        } catch (error) {
            console.error('Migration error:', error);
            process.exit(1);
        } finally {
            await sequelize.close();
            process.exit(0);
        }
    })();
}
