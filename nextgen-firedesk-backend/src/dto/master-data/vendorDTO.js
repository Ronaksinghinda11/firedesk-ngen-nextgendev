class VendorDTO {
    constructor(vendor) {
        this.vendorId = vendor.vendorId;
        this.name = vendor.name;
        this.contactPerson = vendor.contactPerson;
        this.email = vendor.email;
        this.phone = vendor.phone;
        this.address = vendor.address;
        this.city = vendor.city;
        this.state = vendor.state;
        this.pincode = vendor.pincode;
        this.gstNumber = vendor.gstNumber;
        this.isActive = vendor.isActive;
        this.createdAt = vendor.createdAt;
        this.updatedAt = vendor.updatedAt;
    }

    static fromModel(vendor) {
        return new VendorDTO(vendor);
    }

    static fromModelArray(vendors) {
        return vendors.map(vendor => new VendorDTO(vendor));
    }
}

module.exports = VendorDTO;