class ConditionDTO {
    constructor(condition) {
        this.conditionId = condition.conditionId;
        this.name = condition.name;
        this.description = condition.description;
        this.severity = condition.severity;
        this.colorCode = condition.colorCode;
        this.isActive = condition.isActive;
        this.createdAt = condition.createdAt;
        this.updatedAt = condition.updatedAt;
    }

    static fromModel(condition) {
        return new ConditionDTO(condition);
    }

    static fromModelArray(conditions) {
        return conditions.map(condition => new ConditionDTO(condition));
    }
}

module.exports = ConditionDTO;