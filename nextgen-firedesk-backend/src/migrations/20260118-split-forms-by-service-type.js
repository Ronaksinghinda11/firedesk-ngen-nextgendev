/**
 * Migration: Split forms by service type
 * 
 * This migration converts existing forms from the old naming convention 
 * (freq_category_product) to the new convention (ServiceType_Category_Product_Frequency)
 * 
 * It also splits forms that contain multiple service types into separate forms,
 * one for each service type (Inspection, Testing, Maintenance).
 */

const { sequelize } = require('../../config/config');
const { Op } = require('sequelize');

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await sequelize.transaction();

        try {
            console.log('🔄 Starting form migration: Splitting by service type...');

            // Get all models (from index to ensure associations are loaded)
            const {
                Form,
                FormSection,
                FormQuestion,
                Question
            } = require('../models/service-form');
            const Category = require('../models/master-data/category');
            const Product = require('../models/master-data/product');
            const InspectionFrequency = require('../models/service-form/InspectionFrequency');

            // Get all active forms with their sections and questions
            const forms = await Form.findAll({
                where: { status: 'Active' },
                include: [
                    {
                        model: FormSection,
                        as: 'sections',
                        include: [{
                            model: FormQuestion,
                            as: 'formQuestions',
                            include: [{
                                model: Question,
                                as: 'question'
                            }]
                        }]
                    },
                    { model: Category, as: 'category' },
                    { model: Product, as: 'product' },
                    { model: InspectionFrequency, as: 'frequency' }
                ],
                transaction
            });

            console.log(`📋 Found ${forms.length} forms to process`);

            let formsUpdated = 0;
            let formsCreated = 0;
            let formsSkipped = 0;

            for (const form of forms) {
                // Collect all questions from all sections
                const allQuestions = [];
                for (const section of (form.sections || [])) {
                    for (const fq of (section.formQuestions || [])) {
                        if (fq.question) {
                            allQuestions.push(fq.question);
                        }
                    }
                }

                // Group questions by service type
                const questionsByType = {};
                for (const question of allQuestions) {
                    const type = (question.question_type || 'inspection').toLowerCase();
                    if (!questionsByType[type]) {
                        questionsByType[type] = [];
                    }
                    questionsByType[type].push(question);
                }

                const serviceTypes = Object.keys(questionsByType);
                const categoryName = form.category?.category_name || 'Unknown';
                const productName = form.product?.product_name || 'Unknown';
                const frequencyCode = form.frequency?.frequency_code || 'ALL';

                // If form has only one service type, just rename it
                if (serviceTypes.length === 1) {
                    const serviceType = serviceTypes[0];
                    const capitalizedType = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
                    const newName = `${capitalizedType}_${categoryName}_${productName}_${frequencyCode}`;
                    
                    // Check if a form with this name already exists
                    const existingForm = await Form.findOne({
                        where: {
                            service_name: newName,
                            id: { [Op.ne]: form.id }
                        },
                        transaction
                    });

                    if (!existingForm) {
                        await form.update({
                            service_name: newName,
                            service_type: capitalizedType
                        }, { transaction });
                        console.log(`✅ Renamed: ${form.service_name} → ${newName}`);
                        formsUpdated++;
                    } else {
                        console.log(`⏭️ Skipped (exists): ${newName}`);
                        formsSkipped++;
                    }
                } else if (serviceTypes.length > 1) {
                    // Form has multiple service types - need to split
                    console.log(`🔀 Splitting form ${form.service_name} into ${serviceTypes.length} forms`);

                    // Update original form for the first service type
                    const firstType = serviceTypes[0];
                    const firstCapitalizedType = firstType.charAt(0).toUpperCase() + firstType.slice(1);
                    const firstNewName = `${firstCapitalizedType}_${categoryName}_${productName}_${frequencyCode}`;

                    await form.update({
                        service_name: firstNewName,
                        service_type: firstCapitalizedType
                    }, { transaction });

                    // Clear existing sections and recreate for first type only
                    await FormQuestion.destroy({
                        where: {
                            section_id: {
                                [Op.in]: form.sections.map(s => s.id)
                            }
                        },
                        transaction
                    });
                    await FormSection.destroy({
                        where: { form_id: form.id },
                        transaction
                    });

                    // Create section for first type
                    const firstSection = await FormSection.create({
                        form_id: form.id,
                        section_name: `${firstCapitalizedType} Questions`,
                        section_order: 1,
                        is_mandatory: true
                    }, { transaction });

                    for (let i = 0; i < questionsByType[firstType].length; i++) {
                        await FormQuestion.create({
                            form_id: form.id,
                            section_id: firstSection.id,
                            question_id: questionsByType[firstType][i].id,
                            question_order: i + 1
                        }, { transaction });
                    }

                    formsUpdated++;
                    console.log(`✅ Updated original: ${form.service_name} → ${firstNewName}`);

                    // Create new forms for remaining service types
                    for (let i = 1; i < serviceTypes.length; i++) {
                        const serviceType = serviceTypes[i];
                        const capitalizedType = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
                        const newName = `${capitalizedType}_${categoryName}_${productName}_${frequencyCode}`;

                        // Check if form already exists
                        const existingForm = await Form.findOne({
                            where: { service_name: newName },
                            transaction
                        });

                        if (existingForm) {
                            console.log(`⏭️ Skipped (exists): ${newName}`);
                            formsSkipped++;
                            continue;
                        }

                        // Create new form
                        const newForm = await Form.create({
                            form_code: `FORM-${serviceType.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-8)}-${i}`,
                            service_name: newName,
                            service_type: capitalizedType,
                            category_id: form.category_id,
                            product_id: form.product_id,
                            frequency_id: form.frequency_id,
                            plant_id: form.plant_id,
                            status: 'Active',
                            created_by: form.created_by
                        }, { transaction });

                        // Create section for this type
                        const section = await FormSection.create({
                            form_id: newForm.id,
                            section_name: `${capitalizedType} Questions`,
                            section_order: 1,
                            is_mandatory: true
                        }, { transaction });

                        // Link questions
                        for (let j = 0; j < questionsByType[serviceType].length; j++) {
                            await FormQuestion.create({
                                form_id: newForm.id,
                                section_id: section.id,
                                question_id: questionsByType[serviceType][j].id,
                                question_order: j + 1
                            }, { transaction });
                        }

                        formsCreated++;
                        console.log(`✅ Created new: ${newName} with ${questionsByType[serviceType].length} questions`);
                    }
                } else {
                    // No questions - just rename
                    const newName = `Inspection_${categoryName}_${productName}_${frequencyCode}`;
                    await form.update({
                        service_name: newName,
                        service_type: 'Inspection'
                    }, { transaction });
                    formsUpdated++;
                }
            }

            await transaction.commit();

            console.log('\n📊 Migration Summary:');
            console.log(`   Forms updated: ${formsUpdated}`);
            console.log(`   Forms created: ${formsCreated}`);
            console.log(`   Forms skipped: ${formsSkipped}`);
            console.log('✅ Migration completed successfully!');

            return {
                success: true,
                formsUpdated,
                formsCreated,
                formsSkipped
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        // This migration is not easily reversible
        // Would need to merge forms back together which could cause data loss
        console.log('⚠️ This migration cannot be automatically reversed.');
        console.log('   Please restore from backup if needed.');
    }
};
