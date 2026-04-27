class StateDTO {
    constructor(state) {
        this.stateId = state.stateId;
        this.name = state.name;
        this.stateCode = state.stateCode;
        this.countryId = state.countryId;
        this.isActive = state.isActive;
        this.createdAt = state.createdAt;
        this.updatedAt = state.updatedAt;

        // Include city count if populated
        if (state.cities) {
            this.cityCount = state.cities.length;
        }
    }

    static fromModel(state) {
        return new StateDTO(state);
    }

    static fromModelArray(states) {
        return states.map(state => new StateDTO(state));
    }
}

module.exports = StateDTO;