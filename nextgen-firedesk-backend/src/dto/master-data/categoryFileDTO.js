class CategoryFileDTO {
    constructor(file) {
        this.fileId = file.fileId;
        this.categoryId = file.categoryId;
        this.fileName = file.fileName;
        this.fileUrl = file.fileUrl;
        this.fileType = file.fileType;
        this.fileSize = file.fileSize;
        this.description = file.description;
        this.uploadedBy = file.uploadedBy;
        this.isActive = file.isActive;
        this.createdAt = file.createdAt;
        this.updatedAt = file.updatedAt;

        // Include category details if populated
        if (file.Category) {
            this.category = {
                categoryId: file.Category.categoryId,
                name: file.Category.name
            };
        }
    }

    static fromModel(file) {
        return new CategoryFileDTO(file);
    }

    static fromModelArray(files) {
        return files.map(file => new CategoryFileDTO(file));
    }
}

module.exports = CategoryFileDTO;