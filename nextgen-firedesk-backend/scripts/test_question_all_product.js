
const { sequelize } = require('../config/config');
const { Op } = require('sequelize');
const Product = require('../src/models/master-data/product');
const Category = require('../src/models/master-data/category');
const Question = require('../src/models/service-form/Question');
const Plant = require('../src/models/plants/Plant');
const questionBulkService = require('../src/services/service-form/questionBulkService');
const User = require('../src/models/user-management/user');
require('../src/models/service-form/index'); // Init associations

async function testAllProductsImportFull() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Find a category with products to test with
        console.log('finding a category with products...');
        const categories = await Category.findAll({
            where: { status: 'Active' },
            limit: 5
        });

        let targetCategory = null;
        let expectedProductCount = 0;

        for (const cat of categories) {
            const count = await Product.count({
                where: {
                    category_id: cat.id,
                    status: 'Active'
                }
            });
            if (count > 0) {
                targetCategory = cat;
                expectedProductCount = count;
                break;
            }
        }

        if (!targetCategory) {
            console.error('No category with products found. Cannot test.');
            return;
        }

        console.log(`Testing with Category: ${targetCategory.category_name} (ID: ${targetCategory.id})`);
        console.log(`Expected Product Count: ${expectedProductCount}`);

        const user = await User.findOne();
        const userId = user ? user.id : '00000000-0000-0000-0000-000000000000';

        // Find valid Plant and Frequency for validation
        const plant = await Plant.findOne();
        if (!plant) throw new Error('No plant found for testing');

        const InspectionFrequency = require('../src/models/service-form/InspectionFrequency');
        const frequency = await InspectionFrequency.findOne();
        if (!frequency) throw new Error('No frequency found for testing');

        // --- TEST CASE 1: CREATE NEW QUESTION ---
        console.log('\n--- TEST CASE 1: CREATE NEW QUESTION with products="ALL" ---');
        const createRow = {
            question_text: "Test Question Creation ALL " + Date.now(),
            answer_type: "boolean",
            service_type: "inspection",
            plant_name: plant.plant_name,
            categories: targetCategory.category_name, // REQUIRED for creation
            products: "ALL",
            frequencies: frequency.frequency_name
        };
        console.log('Input Row (Create):', createRow);

        const createResult = await questionBulkService.validateImportData([createRow], userId);

        if (createResult.errors.length > 0) {
            console.error('Create Validation Errors:', JSON.stringify(createResult.errors, null, 2));
        } else if (createResult.valid.length > 0) {
            const valRow = createResult.valid[0];
            console.log('Create Validated Product IDs:', valRow.product_ids ? valRow.product_ids.length : 0);
            if (valRow.product_ids && valRow.product_ids.length === expectedProductCount) {
                console.log('SUCCESS: Create with "ALL" resolved correct number of products.');
            } else {
                console.error(`FAILURE: Create with "ALL" expected ${expectedProductCount} products, got ${valRow.product_ids ? valRow.product_ids.length : 0}`);
            }
        }

        // --- TEST CASE 2: UPDATE EXISTING QUESTION ---
        console.log('\n--- TEST CASE 2: UPDATE EXISTING QUESTION with products="ALL" (No Categories) ---');

        // Find existing question for update test
        let question = await Question.findOne({
            include: [{
                model: Category,
                as: 'categories',
                where: { id: targetCategory.id },
                through: { attributes: [] }
            }]
        });

        if (!question) {
            console.log('Creating temporary test question for Update test...');
            const code = 'TEST_QN_' + Date.now();
            question = await Question.create({
                question_code: code,
                question_text: 'Test Question Update',
                answer_type: 'boolean',
                service_type: 'inspection',
                plant_id: plant.id,
                created_by: userId,
                updated_by: userId,
                status: 'Active'
            });
            const QuestionCategory = require('../src/models/service-form/QuestionCategory');
            await QuestionCategory.create({
                question_id: question.id,
                category_id: targetCategory.id
            });
            // Reload
            question = await Question.findByPk(question.id, {
                include: [{ model: Category, as: 'categories' }]
            });
        }

        console.log(`Testing UPDATE on Question: ${question.question_code}`);
        console.log(`Existing Categories: ${question.categories.map(c => c.category_name).join(', ')}`);

        // Prepare update row: OMIT categories, plant, etc. ONLY provide products: "ALL"
        const updateRow = {
            question_code: question.question_code,
            products: "ALL"
        };
        console.log('Input Row (Update):', updateRow);

        const updateResult = await questionBulkService.validateImportData([updateRow], userId);

        if (updateResult.errors.length > 0) {
            console.error('Update Validation Errors:', JSON.stringify(updateResult.errors, null, 2));
        } else if (updateResult.valid.length > 0) {
            const valRow = updateResult.valid[0];
            console.log('Update Validated Product IDs:', valRow.product_ids ? valRow.product_ids.length : 0);

            if (valRow.product_ids && valRow.product_ids.length === expectedProductCount) {
                console.log('SUCCESS: Update with "ALL" resolved correct number of products from existing categories.');
            } else {
                console.error(`FAILURE: Update with "ALL" expected ${expectedProductCount} products, got ${valRow.product_ids ? valRow.product_ids.length : 0}`);
            }

            if (valRow.category_ids && valRow.category_ids.length > 0) {
                console.log('SUCCESS: Update row preserved existing category_ids.');
            } else {
                console.error('FAILURE: Update row missing category_ids (needed for form gen).');
            }

            if (valRow.plant_id) {
                console.log('SUCCESS: Update row preserved existing plant_id.');
            } else {
                console.error('FAILURE: Update row missing plant_id.');
            }
        }

        // --- TEST CASE 3: UPDATE EXISTING QUESTION (CASE INSENSITIVE CODE) ---
        console.log('\n--- TEST CASE 3: UPDATE EXISTING QUESTION (CASE INSENSITIVE CODE) ---');
        const lowerCaseCode = question.question_code.toLowerCase();
        console.log(`Using Lowercase Code: ${lowerCaseCode} (Original: ${question.question_code})`);

        const caseInsensitiveRow = {
            question_code: lowerCaseCode,
            products: "ALL"
        };

        const ciResult = await questionBulkService.validateImportData([caseInsensitiveRow], userId);

        if (ciResult.errors.length > 0) {
            console.error('Case Insensitive Update Failed:', JSON.stringify(ciResult.errors, null, 2));
        } else if (ciResult.valid.length > 0) {
            const valRow = ciResult.valid[0];
            console.log('Case Insensitive Update Validated Product IDs:', valRow.product_ids ? valRow.product_ids.length : 0);
            if (valRow.product_ids && valRow.product_ids.length === expectedProductCount) {
                console.log('SUCCESS: Case-insensitive update identified existing question and resolved products.');
            } else {
                console.error('FAILURE: Case-insensitive update failed to resolve products (likely didn\'t match existing question).');
            }
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await sequelize.close();
    }
}

testAllProductsImportFull();
