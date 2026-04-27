/**
 * Service Form Routes
 * API routes for the service form module
 * 
 * New flow: Questions are created first, then forms are generated from questions
 */

const express = require('express');
const router = express.Router();

// Controllers
const questionController = require('../controllers/service-form/questionController');
const formController = require('../controllers/service-form/formController');
const serviceSubmissionController = require('../controllers/service-form/serviceSubmissionController');
const frequencyController = require('../controllers/service-form/frequencyController');

// Middleware
const auth = require('../middleware/auth');
const multer = require('multer');

// Configure multer for CSV/Excel file uploads (memory storage)
const uploadCSV = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'), false);
        }
    }
});

// Apply authentication to all routes
router.use(auth);

// ============================================
// QUESTION ROUTES
// ============================================

// Export questions as CSV
router.get('/questions/export', questionController.exportQuestions);
router.post('/questions/export-pdf', questionController.exportPdf);

// Download blank import template
router.get('/questions/template', questionController.downloadTemplate);

// Bulk import questions from CSV
router.post('/questions/import', uploadCSV.single('file'), questionController.importQuestions);

// Create a new question with associations
router.post('/questions', questionController.create);

// Get all questions with optional filters
router.get('/questions', questionController.getAll);

// Get questions by criteria (for form generation)
router.get('/questions/criteria', questionController.getByCriteria);

// Bulk create questions
router.post('/questions/bulk', questionController.bulkCreate);

// Bulk update questions
router.put('/questions/bulk', questionController.bulkUpdate);

// Bulk import questions from JSON (for ImportModal)
router.post('/questions/bulk-import', questionController.bulkImport);

// Get questions by category
router.get('/questions/category/:categoryId', questionController.getByCategory);

// Get question by ID
router.get('/questions/:id', questionController.getById);

// Update question
router.put('/questions/:id', questionController.update);

// Delete question (soft delete)
router.delete('/questions/:id', questionController.delete);

// ============================================
// FORM ROUTES
// ============================================

// Auto-generate form from criteria
router.post('/forms/generate', formController.generateFromCriteria);

// Create a new form by selecting questions
router.post('/forms', formController.create);

// Get all forms with optional filters
router.get('/forms', formController.getAll);

// Get forms by category
router.get('/forms/category/:categoryId', formController.getByCategory);

// Get form by ID
router.get('/forms/:id', formController.getById);

// Get form for submission (filtered by frequency if specified)
router.get('/forms/:id/for-submission', formController.getFormForSubmission);

// Update form
router.put('/forms/:id', formController.update);

// Delete form (soft delete)
router.delete('/forms/:id', formController.delete);

// Cleanup empty forms (forms with no questions)
router.post('/forms/cleanup-empty', formController.cleanupEmptyForms);

// Sync form questions - populate form with matching questions
router.post('/forms/:id/sync', formController.syncQuestions);

// Sync all forms with matching questions
router.post('/forms/sync-all', formController.syncAllQuestions);

// Get PDF preview of form
router.get('/forms/:id/pdf-preview', formController.getPDFPreview);

// ============================================
// SUBMISSION ROUTES
// ============================================

// Create a new service submission
router.post('/submissions', serviceSubmissionController.create);

// Get all submissions with optional filters
router.get('/submissions', serviceSubmissionController.getAll);

// Get submission view (structured for frontend display)
router.get('/submissions/:id/view', serviceSubmissionController.getSubmissionView);

// Get submission by ID
router.get('/submissions/:id', serviceSubmissionController.getById);

// Get submission as PDF
router.get('/submissions/:id/pdf', serviceSubmissionController.getSubmissionPDF);

// Get form for a specific submission
router.get('/submissions/:id/form', serviceSubmissionController.getFormForSubmission);

// Save an answer to a question
router.put('/submissions/:id/answer', serviceSubmissionController.saveAnswer);

// Submit the service (mark as completed)
router.post('/submissions/:id/submit', serviceSubmissionController.submit);

// ============================================
// FREQUENCY ROUTES
// ============================================

// Get all inspection frequencies
router.get('/frequencies', frequencyController.getAll);

// Get frequency by ID
router.get('/frequencies/:id', frequencyController.getById);

module.exports = router;
