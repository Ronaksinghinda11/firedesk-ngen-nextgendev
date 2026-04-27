const fs = require("fs");
const path = require("path");
const CategoryFile = require('../../models/master-data/CategoryFile');
const Category = require('../../models/master-data/category');

class CategoryFileService {
    /**
     * Upload file for category
     */
    async uploadFile(categoryId, fileData, userId) {
        // Check if category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new Error('Category not found');
        }

        // Create file record
        const saved = await CategoryFile.create({
            category_id: categoryId,
            file_name: fileData.originalname,
            mime_type: fileData.mimetype,
            file_size: fileData.size,
            storage_path: fileData.relativePath,
            uploaded_by: userId,
        });

        return saved;
    }

    /**
     * List files for category
     */
    async listFiles(categoryId) {
        // Check if category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new Error('Category not found');
        }

        const files = await CategoryFile.findAll({
            where: { category_id: categoryId },
            order: [["created_at", "DESC"]],
        });

        return files;
    }

    /**
     * Delete file for category
     */
    async deleteFile(categoryId, fileId) {
        const file = await CategoryFile.findOne({
            where: {
                id: fileId,
                category_id: categoryId
            }
        });

        if (!file) {
            throw new Error('File not found');
        }

        // Return file info for physical deletion
        const fileInfo = {
            id: file.id,
            storage_path: file.storage_path
        };

        // Delete from database
        await CategoryFile.destroy({ where: { id: fileId } });

        return fileInfo;
    }

    /**
     * Get all files with optional filtering
     */
    async getAllFiles(filters = {}) {
        const { category_id, mime_type, page = 1, limit = 50 } = filters;

        const whereClause = {};

        if (category_id) {
            whereClause.category_id = category_id;
        }

        if (mime_type) {
            whereClause.mime_type = { [require('sequelize').Op.iLike]: `%${mime_type}%` };
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await CategoryFile.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        return {
            files: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get file by ID
     */
    async getFileById(fileId) {
        const file = await CategoryFile.findByPk(fileId);

        if (!file) {
            throw new Error('File not found');
        }

        return file;
    }

    /**
     * Get files by category
     */
    async getFilesByCategory(categoryId) {
        // Verify category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new Error('Category not found');
        }

        const files = await CategoryFile.findAll({
            where: { category_id: categoryId },
            order: [['created_at', 'DESC']]
        });

        return files;
    }

    /**
     * Update file
     */
    async updateFile(fileId, fileData) {
        const file = await CategoryFile.findByPk(fileId);

        if (!file) {
            throw new Error('File not found');
        }

        const { file_name } = fileData;

        await file.update({
            file_name: file_name || file.file_name
        });

        return file;
    }
}

module.exports = new CategoryFileService();