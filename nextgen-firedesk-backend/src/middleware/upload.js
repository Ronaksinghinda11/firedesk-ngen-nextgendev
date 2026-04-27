/**
 * File Upload Middleware
 * Configures multer for handling file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for layout uploads (SVG and PDF)
const layoutFileFilter = (req, file, cb) => {
    const allowedExtensions = ['.svg', '.pdf'];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only SVG and PDF files are allowed'), false);
    }
};

// General file filter
const generalFilter = (req, file, cb) => {
    cb(null, true);
};

// Create multer upload instances
const uploadLayout = multer({
    storage: storage,
    fileFilter: layoutFileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit (PDF floorplans can be large)
    }
});

const uploadGeneral = multer({
    storage: storage,
    fileFilter: generalFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = {
    uploadLayout,
    uploadGeneral
};
