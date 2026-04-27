class IndustryDTO {
    constructor(industry) {
        this.id = industry.id;
        this.name = industry.industry_name;
        this.code = industry.industry_code;
        this.isActive = industry.status === 'Active';
        this.createdAt = industry.created_at;
        this.updatedAt = industry.updated_at;
    }

    static fromModel(industry) {
        return new IndustryDTO(industry);
    }

    static fromModelArray(industries) {
        return industries.map(industry => new IndustryDTO(industry));
    }
}

module.exports = IndustryDTO;