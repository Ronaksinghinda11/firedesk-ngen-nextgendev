const multer = require('multer');
const path = require('path');


// Configure storage (Memory Storage for DB BLOB)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images, pdfs, docs
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'), false);
    }
};

// Initialize upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Controller method: Upload File
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Save to Database (BLOB)
        // Direct import to ensure logic correct
        const UploadedFile = require('../models/common/UploadedFile');

        // Generate a fake path for reference or leave empty since it is in DB
        const storedName = `${Date.now()}-${req.file.originalname}`;

        const uploadedFile = await UploadedFile.create({
            original_name: req.file.originalname,
            stored_name: storedName,
            mime_type: req.file.mimetype,
            size: req.file.size,
            path: 'DB_BLOB', // Placeholder
            url: '', // Will update ID based URL
            data: req.file.buffer, // Save binary data
            uploaded_by: req.user.id
        });

        // Update URL to point to retrieval endpoint
        const baseUrl = process.env.API_URL || 'http://localhost:3001/api';
        const fileUrl = `/upload/${uploadedFile.id}`; // Relative API path

        await uploadedFile.update({ url: fileUrl });

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully to Database',
            data: {
                id: uploadedFile.id,
                filename: uploadedFile.stored_name,
                originalName: uploadedFile.original_name,
                mimetype: uploadedFile.mime_type,
                size: uploadedFile.size,
                url: fileUrl
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'File upload failed',
            error: error.message
        });
    }
};

// Controller method: Get File
exports.getFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const UploadedFile = require('../models/common/UploadedFile');

        const file = await UploadedFile.findByPk(fileId);

        if (!file || !file.data) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
        res.send(file.data);

    } catch (error) {
        console.error('File retrieval error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving file'
        });
    }
};

// Export the multer middleware for use in routes
exports.uploadMiddleware = upload.single('file');
