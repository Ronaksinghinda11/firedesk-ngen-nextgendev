/**
 * Layout Storage Utility
 * Handles binary storage and retrieval of SVG files for floor layouts
 */

const fs = require('fs');
const path = require('path');

// Supported layout file types
const LAYOUT_MIME_TYPES = {
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf'
};

/**
 * Store file in database as binary
 * @param {string} filePath - Path to the temporary uploaded file
 * @param {string} fileName - Original filename
 * @returns {Object} Object containing binary data and metadata
 */
const storeFileInDatabase = async (filePath, fileName) => {
    try {
        // Read file as buffer
        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = fs.statSync(filePath).size;

        // Read as text for backward compatibility (SVG only)
        const ext = path.extname(fileName).toLowerCase();
        let svgText = null;
        if (ext === '.svg') {
            svgText = fs.readFileSync(filePath, 'utf8');
        }

        return {
            svg_binary: fileBuffer,
            svg_picture: svgText, // Keep for backward compatibility (null for PDF)
            file_name: fileName,
            file_size_bytes: fileSize,
            mime_type: LAYOUT_MIME_TYPES[ext] || 'application/octet-stream'
        };
    } catch (error) {
        console.error('Error reading file:', error);
        throw new Error('Failed to read file for database storage');
    }
};

/**
 * Retrieve binary data and convert to base64 data URL for frontend
 * @param {Object} layout - Layout object from database
 * @returns {string|null} Base64 data URL or null
 */
const getBinaryAsDataUrl = (layout) => {
    if (!layout.svg_binary) {
        return null;
    }

    // Convert buffer to base64
    const base64 = Buffer.from(layout.svg_binary).toString('base64');
    const mimeType = layout.mime_type || 'image/svg+xml';

    return `data:${mimeType};base64,${base64}`;
};

/**
 * Cleanup temporary uploaded files
 * @param {string} filePath - Path to temporary file
 */
const cleanupTempFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  Cleaned up temp file: ${filePath}`);
        }
    } catch (error) {
        console.error('Error cleaning up temp file:', error);
    }
};

/**
 * Validate layout file (SVG or PDF)
 * @param {Object} file - Multer file object
 * @throws {Error} If validation fails
 * @returns {boolean} True if valid
 */
const validateLayoutFile = (file) => {
    if (!file) {
        throw new Error('No file provided');
    }

    const allowedExtensions = ['.svg', '.pdf'];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Only SVG and PDF files are allowed');
    }

    // Check file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
        throw new Error('File size exceeds 20MB limit');
    }

    return true;
};

// Backward-compatible alias so any existing callers don't break
const validateSvgFile = validateLayoutFile;

/**
 * Get layout content as SVG text (for backward compatibility)
 * @param {Object} layout - Layout object from database
 * @returns {string|null} SVG text content
 */
const getLayoutAsSvgText = (layout) => {
    // Prefer svg_picture field
    if (layout.svg_picture) {
        return layout.svg_picture;
    }

    // Fallback to converting binary to text if it's SVG
    if (layout.svg_binary && layout.mime_type === 'image/svg+xml') {
        return Buffer.from(layout.svg_binary).toString('utf8');
    }

    return null;
};

module.exports = {
    storeFileInDatabase,
    getBinaryAsDataUrl,
    cleanupTempFile,
    validateSvgFile,    // backward-compat alias
    validateLayoutFile, // preferred name
    getLayoutAsSvgText
};
