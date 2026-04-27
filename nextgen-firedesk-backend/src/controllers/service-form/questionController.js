/**
 * Question Controller
 * CRUD endpoints for question management
 */

const Joi = require("joi");
const questionService = require("../../services/service-form/questionService");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const questionController = {
    /**
     * Create a new question with associations
     * POST /questions
     */
    async create(req, res, next) {
        const createQuestionSchema = Joi.object({
            question_text: Joi.string().required(),
            question_code: Joi.string().max(100).optional().allow('', null),
            answer_type: Joi.string().valid(
                'text', 'number', 'boolean', 'date',
                'select', 'multi_select', 'condition', 'photo', 'signature'
            ).required(),
            question_type: Joi.string().valid(
                'inspection', 'testing', 'maintenance', 'general'
            ).optional().allow(null),
            service_type: Joi.string().valid(
                'inspection', 'testing', 'maintenance'
            ).optional().allow(null),
            is_mandatory: Joi.boolean().optional().default(false),
            requires_photo: Joi.boolean().optional().default(false),
            requires_notes: Joi.boolean().optional().default(false),
            help_text: Joi.string().optional().allow('', null),
            standards: Joi.string().optional().allow('', null),
            display_condition: Joi.object().optional().allow(null),
            // Many-to-many associations
            category_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional().default([]),
            product_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional().default([]),
            frequency_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional().default([]),
            conditions: Joi.array().items(
                Joi.object({
                    condition_id: Joi.string().pattern(uuidPattern).required(),
                    condition_source: Joi.string().valid('manual', 'system', 'calculated').optional(),
                    display_order: Joi.number().integer().min(1).optional(),
                    is_active: Joi.boolean().optional().default(true),
                    data_source_config: Joi.object().optional().allow(null)
                })
            ).optional().default([]),
            // Plant context for proper grouping
            plant_id: Joi.string().pattern(uuidPattern).optional().allow(null)
        });

        const { error, value } = createQuestionSchema.validate(req.body);
        if (error) return next(error);

        try {
            const question = await questionService.createQuestion(value, req.user.id);

            return res.status(201).json({
                success: true,
                message: "Question created successfully",
                data: question
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get all questions with optional filters
     * GET /questions
     */
    async getAll(req, res, next) {
        try {
            const { status, answer_type, question_type, service_type, category_id, product_id, frequency_id } = req.query;

            const filters = {
                ...(status && { status }),
                ...(answer_type && { answer_type }),
                ...(question_type && { question_type }),
                ...(service_type && { service_type }),
                ...(category_id && { category_id }),
                ...(product_id && { product_id }),
                ...(frequency_id && { frequency_id })
            };

            const questions = await questionService.getAllQuestions(filters);

            return res.json({
                success: true,
                count: questions.length,
                data: questions
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get a single question by ID
     * GET /questions/:id
     */
    async getById(req, res, next) {
        const getByIdSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = getByIdSchema.validate(req.params);
        if (error) return next(error);

        try {
            const question = await questionService.getQuestionById(req.params.id);

            return res.json({
                success: true,
                data: question
            });
        } catch (error) {
            if (error.message === 'Question not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Update a question
     * PUT /questions/:id
     */
    async update(req, res, next) {
        const updateQuestionSchema = Joi.object({
            question_text: Joi.string().optional(),
            answer_type: Joi.string().valid(
                'text', 'number', 'boolean', 'date',
                'select', 'multi_select', 'condition', 'photo', 'signature'
            ).optional(),
            question_type: Joi.string().valid(
                'inspection', 'testing', 'maintenance', 'general'
            ).optional().allow(null),
            service_type: Joi.string().valid(
                'inspection', 'testing', 'maintenance'
            ).optional().allow(null),
            is_mandatory: Joi.boolean().optional(),
            requires_photo: Joi.boolean().optional(),
            requires_notes: Joi.boolean().optional(),
            help_text: Joi.string().optional().allow('', null),
            standards: Joi.string().optional().allow('', null),
            display_condition: Joi.object().optional().allow(null),
            status: Joi.string().valid('Active', 'Inactive').optional(),
            // Many-to-many associations (undefined = don't update, [] = clear all)
            category_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional(),
            product_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional(),
            frequency_ids: Joi.array().items(
                Joi.string().pattern(uuidPattern)
            ).optional(),
            plant_id: Joi.string().pattern(uuidPattern).optional().allow(null),
            conditions: Joi.array().items(
                Joi.object({
                    condition_id: Joi.string().pattern(uuidPattern).required(),
                    condition_source: Joi.string().valid('manual', 'system', 'calculated').optional(),
                    display_order: Joi.number().integer().min(1).optional(),
                    is_active: Joi.boolean().optional(),
                    data_source_config: Joi.object().optional().allow(null)
                })
            ).optional()
        });

        const { error, value } = updateQuestionSchema.validate(req.body);
        if (error) return next(error);

        try {
            const question = await questionService.updateQuestion(req.params.id, value, req.user?.id);

            return res.json({
                success: true,
                message: "Question updated successfully",
                data: question
            });
        } catch (error) {
            if (error.message === 'Question not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Bulk update questions
     * PUT /questions/bulk
     */
    async bulkUpdate(req, res, next) {
        const bulkUpdateSchema = Joi.object({
            questions: Joi.array().items(
                Joi.object({
                    id: Joi.string().pattern(uuidPattern).required(),
                    question_text: Joi.string().optional(),
                    answer_type: Joi.string().valid(
                        'text', 'number', 'boolean', 'date',
                        'select', 'multi_select', 'condition', 'photo', 'signature'
                    ).optional(),
                    question_type: Joi.string().valid(
                        'inspection', 'testing', 'maintenance', 'general'
                    ).optional().allow(null),
                    service_type: Joi.string().valid(
                        'inspection', 'testing', 'maintenance'
                    ).optional().allow(null),
                    is_mandatory: Joi.boolean().optional(),
                    requires_photo: Joi.boolean().optional(),
                    requires_notes: Joi.boolean().optional(),
                    help_text: Joi.string().optional().allow('', null),
                    standards: Joi.string().optional().allow('', null),
                    display_condition: Joi.object().optional().allow(null),
                    status: Joi.string().valid('Active', 'Inactive').optional(),
                    // Many-to-many associations (undefined = don't update, [] = clear all)
                    category_ids: Joi.array().items(
                        Joi.string().pattern(uuidPattern)
                    ).optional(),
                    product_ids: Joi.array().items(
                        Joi.string().pattern(uuidPattern)
                    ).optional(),
                    frequency_ids: Joi.array().items(
                        Joi.string().pattern(uuidPattern)
                    ).optional(),
                    plant_id: Joi.string().pattern(uuidPattern).optional().allow(null),
                    conditions: Joi.array().items(
                        Joi.object({
                            condition_id: Joi.string().pattern(uuidPattern).required(),
                            condition_source: Joi.string().valid('manual', 'system', 'calculated').optional(),
                            display_order: Joi.number().integer().min(1).optional(),
                            is_active: Joi.boolean().optional(),
                            data_source_config: Joi.object().optional().allow(null)
                        })
                    ).optional()
                })
            ).min(1).required()
        });

        const { error, value } = bulkUpdateSchema.validate(req.body);
        if (error) return next(error);

        try {
            const result = await questionService.bulkUpdateQuestions(value.questions, req.user.id);

            return res.json({
                success: true,
                message: `${result.success} questions updated successfully`,
                ...result
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Delete a question (soft delete)
     * DELETE /questions/:id
     */
    async delete(req, res, next) {
        const deleteSchema = Joi.object({
            id: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = deleteSchema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await questionService.deleteQuestion(req.params.id, req.user?.id);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            if (error.message === 'Question not found') {
                return next({ status: 404, message: error.message });
            }
            return next(error);
        }
    },

    /**
     * Bulk create questions
     * POST /questions/bulk
     */
    async bulkCreate(req, res, next) {
        const bulkCreateSchema = Joi.object({
            questions: Joi.array().items(
                Joi.object({
                    question_text: Joi.string().required(),
                    question_code: Joi.string().max(100).optional().allow('', null),
                    answer_type: Joi.string().valid(
                        'text', 'number', 'boolean', 'date',
                        'select', 'multi_select', 'condition', 'photo', 'signature'
                    ).required(),
                    question_type: Joi.string().valid(
                        'inspection', 'testing', 'maintenance', 'general'
                    ).optional().allow(null),
                    service_type: Joi.string().valid(
                        'inspection', 'testing', 'maintenance'
                    ).optional().allow(null),
                    is_mandatory: Joi.boolean().optional().default(false),
                    requires_photo: Joi.boolean().optional().default(false),
                    requires_notes: Joi.boolean().optional().default(false),
                    help_text: Joi.string().optional().allow('', null),
                    standards: Joi.string().optional().allow('', null),
                    category_ids: Joi.array().items(Joi.string().pattern(uuidPattern)).optional().default([]),
                    product_ids: Joi.array().items(Joi.string().pattern(uuidPattern)).optional().default([]),
                    frequency_ids: Joi.array().items(Joi.string().pattern(uuidPattern)).optional().default([]),
                    plant_id: Joi.string().pattern(uuidPattern).optional().allow(null), // Plant context for form generation
                    conditions: Joi.array().items(
                        Joi.object({
                            condition_id: Joi.string().pattern(uuidPattern).required(),
                            condition_source: Joi.string().optional(),
                            display_order: Joi.number().integer().optional(),
                            is_active: Joi.boolean().optional()
                        })
                    ).optional().default([])
                })
            ).min(1).required()
        });

        const { error, value } = bulkCreateSchema.validate(req.body);
        if (error) return next(error);

        try {
            const questions = await questionService.bulkCreateQuestions(value.questions, req.user.id);

            return res.status(201).json({
                success: true,
                message: `${questions.length} questions created successfully`,
                count: questions.length,
                data: questions
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get questions by category
     * GET /questions/category/:categoryId
     */
    async getByCategory(req, res, next) {
        const schema = Joi.object({
            categoryId: Joi.string().pattern(uuidPattern).required()
        });

        const { error } = schema.validate(req.params);
        if (error) return next(error);

        try {
            const questions = await questionService.getQuestionsByCategory(
                req.params.categoryId,
                req.query
            );

            return res.json({
                success: true,
                count: questions.length,
                data: questions
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Get questions by criteria (for form generation)
     * GET /questions/criteria
     */
    async getByCriteria(req, res, next) {
        try {
            const { category_id, product_id, frequency_id } = req.query;

            const questions = await questionService.getQuestionsByCriteria({
                category_id,
                product_id,
                frequency_id
            });

            return res.json({
                success: true,
                count: questions.length,
                data: questions
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Export questions as CSV
     * GET /questions/export
     */
    async exportQuestions(req, res, next) {
        try {
            const questionBulkService = require('../../services/service-form/questionBulkService');
            const { plant_id, category_id, service_type } = req.query;

            const filters = {
                ...(plant_id && { plant_id }),
                ...(category_id && { category_id }),
                ...(service_type && { service_type })
            };

            const csv = await questionBulkService.exportQuestions(filters);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=questions_export.csv');
            return res.send(csv);
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Export questions as PDF
     * POST /questions/export-pdf
     */
    async exportPdf(req, res, next) {
        try {
            const { questionIds, paperSize, orientation } = req.body;

            if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
                return next({ status: 400, message: 'No question IDs provided for PDF export' });
            }

            const { Question } = require('../../models/service-form');
            const Category = require('../../models/master-data/category');
            const Product = require('../../models/master-data/product');
            const Condition = require('../../models/master-data/ConditionMaster');
            const InspectionFrequency = require('../../models/service-form/InspectionFrequency');
            const Plant = require('../../models/plants/Plant');
            const { Op } = require('sequelize');

            // Fetch all requested questions with their associations (includes service_type)
            const questions = await Question.findAll({
                where: { id: { [Op.in]: questionIds } },
                attributes: ['id', 'question_text', 'service_type', 'is_mandatory', 'requires_photo', 'help_text', 'standards', 'plant_id'],
                include: [
                    { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] },
                    { model: Category, as: 'categories', through: { attributes: [] }, attributes: ['category_name'] },
                    { model: Product, as: 'products', through: { attributes: [] }, attributes: ['product_name'] },
                    { model: InspectionFrequency, as: 'frequencies', through: { attributes: [] }, attributes: ['frequency_name'] },
                    { model: Condition, as: 'conditions', through: { attributes: ['display_order'] }, attributes: ['condition_name', 'severity_level', 'priority_score'] }
                ],
                order: [['created_at', 'ASC']]
            });

            // ── Helpers ──────────────────────────────────────────────────────────────
            const escapeHtml = (text) => {
                if (!text) return '';
                return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
            };

            const capitalise = (str) => str
                ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
                : '-';

            const conditionStyle = (severity) => {
                switch ((severity || '').toLowerCase()) {
                    case 'critical': return 'background:#fee2e2;color:#991b1b;';
                    case 'high':     return 'background:#ffedd5;color:#9a3412;';
                    case 'medium':   return 'background:#fef9c3;color:#854d0e;';
                    default:         return 'background:#f0fdf4;color:#166534;';
                }
            };

            // ── Double-group: Plant → Service Type ───────────────────────────────────
            const SERVICE_TYPE_ORDER = ['inspection', 'testing', 'maintenance'];
            const grouped = {};
            questions.forEach(q => {
                const pName = q.plant ? (q.plant.plant_name || q.plant.plantName) : 'All Plants';
                const sType = (q.service_type || 'inspection').toLowerCase();
                if (!grouped[pName]) grouped[pName] = {};
                if (!grouped[pName][sType]) grouped[pName][sType] = [];
                grouped[pName][sType].push(q);
            });

            const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const plantNames = Object.keys(grouped).sort();

            // ── Build table body rows ────────────────────────────────────────────────
            let rowCounter = 0;
            const buildRows = (qs) => qs.map(q => {
                rowCounter++;
                const catStr  = q.categories  && q.categories.length  > 0 ? q.categories.map(c => escapeHtml(c.category_name)).join(', ') : '-';
                const prodStr = q.products     && q.products.length    > 0
                    ? q.products.map(p => `<span class="tag">${escapeHtml(p.product_name)}</span>`).join(' ')
                    : '-';
                const freqStr = q.frequencies  && q.frequencies.length > 0
                    ? q.frequencies.map(f => `<span class="tag freq-tag">${escapeHtml(f.frequency_name)}</span>`).join(' ')
                    : '-';

                let condCell = '<span class="na">\u2014</span>';
                if (q.conditions && q.conditions.length > 0) {
                    const cond = q.conditions[0];
                    condCell = `<span class="cond-badge" style="${conditionStyle(cond.severity_level)}">${escapeHtml(cond.condition_name)} <span class="cond-meta">P:${cond.priority_score || 0}</span></span>`;
                }

                const reqCell   = q.is_mandatory  ? '<span class="chk yes">\u2713</span>' : '<span class="chk no">\u2014</span>';
                const photoCell = q.requires_photo ? '<span class="chk yes">\u2713</span>' : '<span class="chk no">\u2014</span>';

                return `<tr>
                    <td class="num-col">${rowCounter}</td>
                    <td class="question-col">${escapeHtml(q.question_text)}${q.is_mandatory ? ' <span style="color:#ef4444;font-weight:bold;">*</span>' : ''}</td>
                    <td>${escapeHtml(catStr)}</td>
                    <td>${prodStr}</td>
                    <td>${freqStr}</td>
                    <td class="help-col">${escapeHtml(q.help_text) || '<span class="na">\u2014</span>'}</td>
                    <td>${condCell}</td>
                    <td class="std-col">${escapeHtml(q.standards) || '<span class="na">\u2014</span>'}</td>
                    <td class="center">${reqCell}</td>
                    <td class="center">${photoCell}</td>
                </tr>`;
            }).join('\n');

            // ── Assemble full table body ─────────────────────────────────────────────
            let tableBodyHTML = '';
            plantNames.forEach(plantName => {
                const serviceTypes = grouped[plantName];
                const plantTotal = Object.values(serviceTypes).reduce((acc, arr) => acc + arr.length, 0);

                tableBodyHTML += `<tr><td colspan="10" class="plant-header">
                    &#127981; ${escapeHtml(plantName)}
                    <span class="plant-count">${plantTotal} questions</span>
                </td></tr>`;

                SERVICE_TYPE_ORDER.forEach(sType => {
                    const qs = serviceTypes[sType];
                    if (!qs || qs.length === 0) return;
                    tableBodyHTML += `<tr><td colspan="10" class="stype-header stype-${sType}">${capitalise(sType)} <span class="stype-count">${qs.length}</span></td></tr>`;
                    tableBodyHTML += buildRows(qs);
                });
            });

            // ── Full HTML document ───────────────────────────────────────────────────
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0; padding: 16px; color: #1e293b; font-size: 9pt; background: #fff; }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 12px; margin-bottom: 14px; }
.brand { font-size: 22pt; font-weight: 900; color: #ea580c; letter-spacing: -0.5px; line-height: 1; }
.brand-sub { font-size: 9pt; color: #64748b; font-weight: 500; margin-top: 3px; }
.report-title { font-size: 14pt; font-weight: bold; color: #1e293b; text-transform: uppercase; text-align: right; }
.report-meta { font-size: 8pt; color: #64748b; text-align: right; margin-top: 4px; }
.summary-bar { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 7px 14px; margin-bottom: 12px; display: flex; gap: 20px; font-size: 8.5pt; color: #9a3412; font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
th { background: #f1f5f9; text-align: left; padding: 7px 8px; border: 1px solid #cbd5e1; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.3px; white-space: nowrap; }
td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; }
tr:nth-child(even) td { background: #fafafa; }
.num-col { width: 28px; text-align: center; color: #94a3b8; font-weight: 600; }
.question-col { min-width: 180px; font-weight: 600; color: #1e293b; }
.help-col { min-width: 130px; color: #64748b; font-style: italic; }
.std-col { min-width: 75px; }
.center { text-align: center; }
.na { color: #cbd5e1; }
.plant-header { background: #fff7ed; color: #9a3412; font-weight: 800; font-size: 10pt; padding: 9px 12px; border: 1px solid #fed7aa; text-transform: uppercase; letter-spacing: 0.4px; }
.plant-count { font-size: 7.5pt; font-weight: 600; margin-left: 10px; background: #fed7aa; color: #9a3412; padding: 1px 7px; border-radius: 10px; }
.stype-header { font-weight: 700; font-size: 8.5pt; padding: 5px 12px; border: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.4px; }
.stype-inspection { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.stype-testing { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.stype-maintenance { background: #fdf4ff; color: #7e22ce; border-color: #e9d5ff; }
.stype-count { font-size: 7.5pt; margin-left: 8px; opacity: 0.7; }
.tag { display: inline-block; background: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 3px; margin: 1px; font-size: 7.5pt; white-space: nowrap; }
.freq-tag { background: #eff6ff; color: #1d4ed8; }
.cond-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 600; white-space: nowrap; }
.cond-meta { opacity: 0.7; font-weight: 400; }
.chk { font-weight: 700; font-size: 11pt; }
.chk.yes { color: #16a34a; } .chk.no { color: #cbd5e1; }
.report-footer { margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 7.5pt; color: #94a3b8; text-align: center; }
@media print { body { padding: 0; } .plant-header, .stype-header { page-break-after: avoid; } }
</style>
</head>
<body>
<div class="report-header">
    <div><div class="brand">FireDesk</div><div class="brand-sub">Leistung Technologies</div></div>
    <div><div class="report-title">Master Questions List</div><div class="report-meta">Date: ${currentDate} &nbsp;|&nbsp; Total: ${questions.length} questions</div></div>
</div>
<div class="summary-bar">
    <span>Total Questions: <strong>${questions.length}</strong></span>
    <span>Plants: <strong>${plantNames.length}</strong></span>
</div>
<table>
    <thead><tr>
        <th class="num-col">#</th>
        <th class="question-col">Activity Description</th>
        <th style="min-width:90px">Category</th>
        <th style="min-width:110px">Products</th>
        <th style="min-width:110px">Frequencies</th>
        <th class="help-col">Help Text</th>
        <th style="min-width:120px">Condition</th>
        <th class="std-col">Standard</th>
        <th style="width:38px" class="center">Req.</th>
        <th style="width:38px" class="center">Photo</th>
    </tr></thead>
    <tbody>${tableBodyHTML}</tbody>
</table>
<div class="report-footer">Generated on ${currentDate} | FireDesk Service Management System | Confidential</div>
</body></html>`;

            // -----------------------

            // ── Render to PDF ────────────────────────────────────────────────────────
            const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');
            const pdfBuffer = await htmlToPdfBuffer(html, {
                format: paperSize || 'A4',
                landscape: orientation === 'Landscape',
                printBackground: true,
                margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
            });

            // ---------------------------

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=Master_Questions_Export.pdf');
            return res.send(pdfBuffer);
            
        } catch (error) {
            console.error('Export PDF error:', error);
            const fs = require('fs');
            try {
                fs.appendFileSync('/tmp/pdf_error.log', new Date().toISOString() + ': ' + (error.stack || error.message) + '\n');
            } catch (e) {}
            return next(error);
        }
    },

    /**
     * Download blank import template
     * GET /questions/template
     */
    async downloadTemplate(req, res, next) {
        try {
            const questionBulkService = require('../../services/service-form/questionBulkService');
            const csv = questionBulkService.generateTemplate();

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=questions_template.csv');
            return res.send(csv);
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Bulk import questions from CSV
     * POST /questions/import
     */
    async importQuestions(req, res, next) {
        try {
            const questionBulkService = require('../../services/service-form/questionBulkService');

            if (!req.file) {
                return next({ status: 400, message: 'No file uploaded' });
            }

            // Parse CSV content
            const csvContent = req.file.buffer.toString('utf-8');
            const rows = questionBulkService.parseCSV(csvContent);

            if (rows.length === 0) {
                return next({ status: 400, message: 'No data rows found in CSV' });
            }

            // Validate and resolve names to IDs
            const { valid, errors } = await questionBulkService.validateImportData(rows, req.user.id);

            if (errors.length > 0 && valid.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'All rows have validation errors',
                    errors
                });
            }

            // Import valid rows
            const results = await questionBulkService.importQuestions(valid, req.user);

            // Combine validation errors and import failures
            const allErrors = [
                ...errors,
                ...(results.failed || []).map(f => ({
                    row: f.row._rowNumber || 'Unknown',
                    error: f.error || 'Import failed'
                }))
            ];

            return res.json({
                success: results.success.length > 0,
                message: allErrors.length > 0
                    ? `Imported ${results.success.length} questions. ${allErrors.length} failed.`
                    : `Imported ${results.success.length} questions successfully`,
                created: results.success.length,
                updated: 0,
                imported: results.success,
                failed: results.failed,
                errors: allErrors
            });
        } catch (error) {
            return next(error);
        }
    },

    /**
     * Bulk import questions from JSON (for ImportModal)
     * POST /questions/bulk-import
     */
    async bulkImport(req, res, next) {
        try {
            const questionBulkService = require('../../services/service-form/questionBulkService');
            const { records } = req.body;

            if (!records || !Array.isArray(records) || records.length === 0) {
                return next({ status: 400, message: 'No records provided for import' });
            }

            // Validate and resolve names to IDs
            const { valid, errors } = await questionBulkService.validateImportData(records, req.user.id);

            if (errors.length > 0 && valid.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'All rows have validation errors',
                    errors
                });
            }

            // Import valid rows
            const results = await questionBulkService.importQuestions(valid, req.user);

            // Combine validation errors and import failures
            const allErrors = [
                ...errors,
                ...(results.failed || []).map(f => ({
                    row: f.row._rowNumber || 'Unknown',
                    error: f.error || 'Import failed'
                }))
            ];

            return res.json({
                success: results.success.length > 0,
                message: allErrors.length > 0
                    ? `Imported ${results.success.length} questions. ${allErrors.length} failed.`
                    : `Imported ${results.success.length} questions successfully`,
                created: results.success.length,
                updated: 0,
                imported: results.success,
                failed: results.failed,
                errors: allErrors
            });
        } catch (error) {
            return next(error);
        }
    }
};

module.exports = questionController;
