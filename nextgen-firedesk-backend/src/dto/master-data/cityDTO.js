class CityDTO {
    constructor(city) {
        this.cityId = city.cityId;
        this.name = city.name;
        this.stateId = city.stateId;
        this.pincode = city.pincode;
        this.latitude = city.latitude;
        this.longitude = city.longitude;
        this.isActive = city.isActive;
        this.createdAt = city.createdAt;
        this.updatedAt = city.updatedAt;

        // Include state details if populated
        if (city.State) {
            this.state = {
                stateId: city.State.stateId,
                name: city.State.name,
                stateCode: city.State.stateCode
            };
        }
    }

    static fromModel(city) {
        return new CityDTO(city);
    }

    static fromModelArray(cities) {
        return cities.map(city => new CityDTO(city));
    }
}

module.exports = CityDTO;