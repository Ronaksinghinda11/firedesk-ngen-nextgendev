class ProductDTO {
    constructor(product) {
        this.productId = product.productId;
        this.name = product.name;
        this.categoryId = product.categoryId;
        this.description = product.description;
        this.specifications = product.specifications;
        this.isActive = product.isActive;
        this.createdAt = product.createdAt;
        this.updatedAt = product.updatedAt;

        // Include category details if populated
        if (product.Category) {
            this.category = {
                categoryId: product.Category.categoryId,
                name: product.Category.name
            };
        }
    }

    static fromModel(product) {
        return new ProductDTO(product);
    }

    static fromModelArray(products) {
        return products.map(product => new ProductDTO(product));
    }
}

module.exports = ProductDTO;