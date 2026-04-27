const Vendor = require('../../models/master-data/Vendor');
const { FireSafetyForm, Technician } = require('../../models');
const { Op } = require('sequelize');
const { generateCode, ensureUniqueCode } = require('../../utils/codeGenerator');
const auditService = require('../../services/audit/audit_service');

class VendorService {
    /**
     * Get all vendors with optional filtering
     */
    async getAllVendors(filters = {}) {
        const { status, search, page = 1, limit = 50 } = filters;

        const whereClause = {};

        if (status) {
            whereClause.status = status;
        }

        if (search) {
            whereClause[Op.or] = [
                { vendor_name: { [Op.iLike]: `%${search}%` } },
                { vendor_code: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Vendor.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        return {
            vendors: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get active vendors
     */
    async getActiveVendors() {
        const vendors = await Vendor.findAll({
            where: { status: "Active" },
            order: [["vendor_name", "ASC"]]
        });

        return vendors;
    }

    /**
     * Get vendor by ID
     */
    async getVendorById(vendorId) {
        const vendor = await Vendor.findByPk(vendorId);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return vendor;
    }

    /**
     * Create vendor
     */
    async createVendor(vendorData, user) {
        console.log('🔵 Backend createVendor - Received data:', vendorData);
        console.log('📍 Backend - Address fields received:', {
            country: vendorData.country,
            state: vendorData.state,
            city: vendorData.city,
            zipcode: vendorData.zipcode
        });

        const {
            vendor_name,
            vendor_code,
            address,
            country,
            state,
            city,
            zipcode,
            contact_name,
            email,
            phone_no,
            status,
            created_by
        } = vendorData;

        // Check if vendor name already exists
        const existingByName = await Vendor.findOne({
            where: { vendor_name }
        });

        if (existingByName) {
            throw new Error('Vendor name already exists');
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingByEmail = await Vendor.findOne({
                where: { email }
            });

            if (existingByEmail) {
                throw new Error('Email already exists');
            }
        }

        // Auto-generate vendor code if not provided
        let finalVendorCode = vendor_code;
        if (!finalVendorCode) {
            const baseCode = generateCode(vendor_name);
            finalVendorCode = await ensureUniqueCode(baseCode, async (code) => {
                const existing = await Vendor.findOne({ where: { vendor_code: code } });
                return !!existing;
            });
        } else {
            // Check if manually provided code already exists
            const existingByCode = await Vendor.findOne({
                where: { vendor_code: finalVendorCode }
            });

            if (existingByCode) {
                throw new Error('Vendor code already exists');
            }
        }

        const vendor = await Vendor.create({
            vendor_name,
            vendor_code: finalVendorCode,
            address: address || null,
            country: country || null,
            state: state || null,
            city: city || null,
            zipcode: zipcode || null,
            contact_name: contact_name || null,
            email: email || null,
            phone_no: phone_no || null,
            status: status || 'Active',
            created_by
        });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'vendor',
                entityId: vendor.id,
                entityName: vendor.vendor_name,
                action: 'CREATE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for createVendor:', error.message);
        }

        return vendor;
    }

    /**
     * Update vendor
     */
    async updateVendor(vendorId, vendorData, user) {
        const vendor = await Vendor.findByPk(vendorId);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        const oldValues = vendor.toJSON();

        const {
            vendor_name,
            vendor_code,
            address,
            country,
            state,
            city,
            zipcode,
            contact_name,
            email,
            phone_no,
            status
        } = vendorData;

        // Check if new name already exists (excluding current vendor)
        if (vendor_name && vendor_name !== vendor.vendor_name) {
            const existingByName = await Vendor.findOne({
                where: {
                    vendor_name,
                    id: { [Op.ne]: vendorId }
                }
            });

            if (existingByName) {
                throw new Error('Vendor name already exists');
            }

            // Auto-generate new code if name changed and code not provided
            if (!vendor_code) {
                const baseCode = generateCode(vendor_name);
                const new_vendor_code = await ensureUniqueCode(baseCode, async (code) => {
                    const existing = await Vendor.findOne({
                        where: {
                            vendor_code: code,
                            id: { [Op.ne]: vendorId }
                        }
                    });
                    return !!existing;
                });

                await vendor.update({
                    vendor_name,
                    vendor_code: new_vendor_code,
                    address: address !== undefined ? address : vendor.address,
                    country: country !== undefined ? country : vendor.country,
                    state: state !== undefined ? state : vendor.state,
                    city: city !== undefined ? city : vendor.city,
                    zipcode: zipcode !== undefined ? zipcode : vendor.zipcode,
                    contact_name: contact_name !== undefined ? contact_name : vendor.contact_name,
                    email: email !== undefined ? email : vendor.email,
                    phone_no: phone_no !== undefined ? phone_no : vendor.phone_no,
                    status: status !== undefined ? status : vendor.status
                });

                try {
                    const changes = auditService.calculateChanges(oldValues, vendor.toJSON());
                    if (changes) {
                        await auditService.log({
                            entityType: 'vendor',
                            entityId: vendorId,
                            entityName: vendor.vendor_name,
                            action: 'UPDATE',
                            changes,
                            user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                            source: 'ui'
                        });
                    }
                } catch (error) {
                    console.error('Audit log failed for updateVendor (name change):', error.message);
                }

                return vendor;
            }
        }

        // Check if email changed and if it already exists
        if (email && email !== vendor.email) {
            const existingByEmail = await Vendor.findOne({
                where: {
                    email,
                    id: { [Op.ne]: vendorId }
                }
            });

            if (existingByEmail) {
                throw new Error('Email already exists');
            }
        }

        // Check if vendor code changed and if it already exists
        if (vendor_code && vendor_code !== vendor.vendor_code) {
            const existingByCode = await Vendor.findOne({
                where: {
                    vendor_code,
                    id: { [Op.ne]: vendorId }
                }
            });

            if (existingByCode) {
                throw new Error('Vendor code already exists');
            }
        }

        await vendor.update({
            vendor_name: vendor_name !== undefined ? vendor_name : vendor.vendor_name,
            vendor_code: vendor_code !== undefined ? vendor_code : vendor.vendor_code,
            address: address !== undefined ? address : vendor.address,
            country: country !== undefined ? country : vendor.country,
            state: state !== undefined ? state : vendor.state,
            city: city !== undefined ? city : vendor.city,
            zipcode: zipcode !== undefined ? zipcode : vendor.zipcode,
            contact_name: contact_name !== undefined ? contact_name : vendor.contact_name,
            email: email !== undefined ? email : vendor.email,
            phone_no: phone_no !== undefined ? phone_no : vendor.phone_no,
            status: status !== undefined ? status : vendor.status
        });

        try {
            const changes = auditService.calculateChanges(oldValues, vendor.toJSON());
            if (changes) {
                await auditService.log({
                    entityType: 'vendor',
                    entityId: vendorId,
                    entityName: vendor.vendor_name,
                    action: 'UPDATE',
                    changes,
                    user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                    source: 'ui'
                });
            }
        } catch (error) {
            console.error('Audit log failed for updateVendor:', error.message);
        }

        return vendor;
    }

    /**
     * Delete vendor
     */
    async deleteVendor(vendorId, user) {
        const vendor = await Vendor.findByPk(vendorId);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        // Capture old values for audit
        const oldStatus = vendor.status;

        // Soft delete by setting status to Inactive
        await vendor.update({ status: 'Inactive' });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'vendor',
                entityId: vendorId,
                entityName: vendor.vendor_name,
                action: 'ARCHIVE',
                changes: { status: { old: oldStatus, new: 'Inactive' } },
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for deleteVendor:', error.message);
        }

        return { message: 'Vendor archived successfully' };
    }

    /**
     * Permanent Delete vendor
     */
    async hardDeleteVendor(vendorId, user) {
        const vendor = await Vendor.findByPk(vendorId);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        // Capture name before delete for audit
        const vendorName = vendor.vendor_name;

        // Check if any technicians are associated with this vendor
        const techniciansUsingVendor = await Technician.count({
            where: { vendor_id: vendorId }
        });

        if (techniciansUsingVendor > 0) {
            throw new Error(`Cannot delete vendor. It is associated with ${techniciansUsingVendor} technician(s). Please reassign or remove these technicians first.`);
        }

        // Hard delete
        await Vendor.destroy({ where: { id: vendorId } });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'vendor',
                entityId: vendorId,
                entityName: vendorName,
                action: 'DELETE',
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for hardDeleteVendor:', error.message);
        }

        return { message: 'Vendor permanently deleted successfully' };
    }

    /**
     * Restore vendor
     */
    async restoreVendor(vendorId, user) {
        // Find the vendor (even if inactive)
        const vendor = await Vendor.findByPk(vendorId);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        // Capture old status for audit
        const oldStatus = vendor.status;

        // Just update status to Active
        await vendor.update({ status: 'Active' });

        // Audit Log
        try {
            await auditService.log({
                entityType: 'vendor',
                entityId: vendorId,
                entityName: vendor.vendor_name,
                action: 'RESTORE',
                changes: { status: { old: oldStatus, new: 'Active' } },
                user: user ? { id: user.id, name: user.name, type: user.userType } : null,
                source: 'ui'
            });
        } catch (error) {
            console.error('Audit log failed for restoreVendor:', error.message);
        }

        return { message: 'Vendor restored successfully' };
    }

    /**
     * Bulk import vendors from raw records
     * @param {Array} rawRecords - Raw records from import
     * @param {string} createdBy - User ID who is creating
     * @returns {Object} - Results with imported count and errors
     */
    async bulkImportVendors(rawRecords, createdBy) {
        const results = { imported: 0, errors: [] };

        // Helper to get field value from various name formats
        const getField = (record, ...keys) => {
            for (const key of keys) {
                if (record[key] !== undefined) return record[key];
                if (record[key + ' *'] !== undefined) return record[key + ' *'];
            }
            return undefined;
        };

        for (let i = 0; i < rawRecords.length; i++) {
            const record = rawRecords[i];
            try {
                // Normalize field names
                const vendorName = getField(record, 'vendor_name', 'vendorName', 'Vendor Name', 'vendor name');
                const vendorCode = getField(record, 'vendor_code', 'vendorCode', 'Vendor Code', 'vendor code');
                const address = getField(record, 'address', 'Address');
                const country = getField(record, 'country', 'Country');
                const state = getField(record, 'state', 'State');
                const city = getField(record, 'city', 'City');
                const zipcode = getField(record, 'zipcode', 'Zipcode', 'Zip Code', 'zip code');
                const contactName = getField(record, 'contact_name', 'contactName', 'Contact Name', 'contact name');
                const email = getField(record, 'email', 'Email');
                const phoneNo = getField(record, 'phone_no', 'phoneNo', 'Phone No', 'phone no', 'Phone');

                if (!vendorName) throw new Error('Vendor Name is required');

                const vendorData = {
                    vendor_name: vendorName,
                    vendor_code: vendorCode,
                    address,
                    country,
                    state,
                    city,
                    zipcode,
                    contact_name: contactName,
                    email,
                    phone_no: phoneNo,
                    created_by: createdBy
                };

                await this.createVendor(vendorData);
                results.imported++;

            } catch (err) {
                results.errors.push({
                    row: i + 1,
                    data: record,
                    error: err.message
                });
            }
        }

        return results;
    }
}

module.exports = new VendorService();