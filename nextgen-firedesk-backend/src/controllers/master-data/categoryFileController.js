const fs = require("fs");
const path = require("path");
const categoryFileService = require("../../services/master-data/categoryFileService");

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

exports.uploadForCategory = async (req, res, next) => {
    try {
        const { id: categoryId } = req.params;
        const userId = req.user?.id || null;

        if (!req.file) return next({ status: 400, message: "No file uploaded" });

        // Handle file system operations
        const uploadsRoot = path.join(process.cwd(), "public", "uploads", "categories", categoryId);
        ensureDir(uploadsRoot);

        const finalPath = path.join(uploadsRoot, req.file.filename);

        // Move from temp to final
        const tempPath = req.file.path;
        fs.renameSync(tempPath, finalPath);

        const relPath = path.relative(path.join(process.cwd(), "public"), finalPath).replace(/\\/g, "/");

        // Prepare file data for service
        const fileData = {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            relativePath: relPath
        };

        // Call service to save to database
        const saved = await categoryFileService.uploadFile(categoryId, fileData, userId);

        return res.status(201).json({
            success: true,
            message: "File imported successfully and saved under this category.",
            file: saved,
        });
    } catch (error) {
        // Attempt rollback of temp file if still present
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch { }
        }

        if (error.message === 'Category not found') {
            return next({ status: 404, message: error.message });
        }
        return next(error);
    }
};

exports.listForCategory = async (req, res, next) => {
    try {
        const { id: categoryId } = req.params;

        const files = await categoryFileService.listFiles(categoryId);

        return res.json({ success: true, files });
    } catch (error) {
        if (error.message === 'Category not found') {
            return next({ status: 404, message: error.message });
        }
        return next(error);
    }
};

exports.deleteForCategory = async (req, res, next) => {
    try {
        const { id: categoryId, fileId } = req.params;

        const fileInfo = await categoryFileService.deleteFile(categoryId, fileId);

        // Delete physical file (file system operation stays in controller)
        const absPath = path.join(process.cwd(), "public", fileInfo.storage_path);
        if (fs.existsSync(absPath)) {
            try { fs.unlinkSync(absPath); } catch { }
        }

        return res.json({ success: true, message: "File deleted" });
    } catch (error) {
        if (error.message === 'File not found') {
            return next({ status: 404, message: error.message });
        }
        return next(error);
    }
};

module.exports = exports;