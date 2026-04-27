class CategoryDTO {
    constructor(category) {
        this.categoryId = category.categoryId;
        this.name = category.name;
        this.description = category.description;
        this.isActive = category.isActive;
        this.createdAt = category.createdAt;
        this.updatedAt = category.updatedAt;
    }

    static fromModel(category) {
        return new CategoryDTO(category);
    }

    static fromModelArray(categories) {
        return categories.map(category => new CategoryDTO(category));
    }
}

module.exports = CategoryDTO;