// src/pages/admin/VendorsPage.tsx
import React from 'react';
import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { TableCell } from '@/components/ui/table';
import { vendorService } from '@/services/vendor.service';
import { AddressInput } from '@/components/common/AddressInput';
import { Entity } from '@/types/permissions';

export const VendorsPage: React.FC = () => {
  const vendorConfig: EntityConfig = {
    entityName: 'Vendor',
    entityNamePlural: 'Vendors',
    apiEndpoint: '/master-data/vendors',
    responseKey: 'vendors',

    // Permission-based access control
    permissionEntity: Entity.VENDORS,
    enforcePermissions: true,

    // Plant filter support
    enablePlantFilter: true,

    // Archive configuration
    supportsArchive: true,
    excludeFields: ['status'], // Prevent auto-status column since customColumns already renders it
    archiveStatusValue: 'Inactive',
    archiveFields: ['vendor_name', 'email', 'phone_no', 'status'],
    hideCreateEditButtons: ['preview', 'documents', 'history', 'kebab'],
    hideListingRowKebab: true,
    limitTopMenuItems: ['export', 'bulkActions', 'history'],

    // Filter attributes for sorting and column visibility
    filterAttributes: [
      { id: 'vendor_name', label: 'Vendor Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'], mandatory: true },
      { id: 'vendor_code', label: 'Vendor Code', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'address', label: 'Address', type: 'text' as const, operators: ['contains', 'is', 'isNot'], hiddenByDefault: true },
      { id: 'contact_name', label: 'Contact Name', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'email', label: 'Email', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },
      { id: 'phone_no', label: 'Phone', type: 'text' as const, operators: ['contains', 'is', 'isNot'] },

      { id: 'created_at', label: 'Created At', type: 'date' as const, operators: ['before', 'after'] },
      { id: 'updated_at', label: 'Updated At', type: 'date' as const, operators: ['before', 'after'], hiddenByDefault: true },
    ],

    // Import fields - matching UI form fields
    importFields: [
      { id: 'vendor_name', label: 'Vendor Name', required: true },
      { id: 'vendor_code', label: 'Vendor Code' },
      { id: 'contact_name', label: 'Contact Name' },
      { id: 'email', label: 'Email' },
      { id: 'phone_no', label: 'Phone Number' },
      { id: 'address', label: 'Address' },
      { id: 'country', label: 'Country' },
      { id: 'state', label: 'State' },
      { id: 'city', label: 'City' },
      { id: 'zipcode', label: 'Zip Code' },
    ],

    fields: [
      {
        name: 'vendor_name',
        label: 'Vendor Name',
        type: 'text',
        required: true,
      },
      {
        name: 'vendor_code',
        label: 'Vendor Code',
        type: 'text',
        required: false,
        placeholder: 'Auto-generated if left blank',
      },
      {
        name: 'contact_name',
        label: 'Contact Name',
        type: 'text',
        required: false,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'text',
        required: false,
      },
      {
        name: 'phone_no',
        label: 'Phone Number',
        type: 'text',
        required: false,
      },
      {
        name: 'address',
        label: 'Address',
        type: 'text',
        required: false,
      },
      {
        name: 'country',
        label: 'Country',
        type: 'text',
        required: false,
      },
      {
        name: 'state',
        label: 'State',
        type: 'text',
        required: false,
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: false,
      },
      {
        name: 'zipcode',
        label: 'Zip Code',
        type: 'text',
        required: false,
      },
    ],

    formLayout: "sections",
    formSections: [
      {
        id: "basicInfo",
        title: "Basic Information",
        render: (formData: any, setFormData: (data: any) => void) => (
          <div className="space-y-2 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vendor_name || ''}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter vendor name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Vendor Code
                </label>
                <input
                  type="text"
                  value={formData.vendor_code || ''}
                  onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Auto-generated if left blank"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contact_name || ''}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter contact name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="text"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter email"
                />
                {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone_no || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, phone_no: val });
                  }}
                  className="w-full h-8 text-sm px-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="10-digit phone number"
                />
                {formData.phone_no && formData.phone_no.length < 10 && (
                  <p className="text-xs text-red-500 mt-1">Phone number must be 10 digits</p>
                )}
              </div>
              <div className="md:col-span-2 space-y-2 mt-2">
                <hr className="border-gray-100" />
                <h4 className="text-sm font-medium text-gray-900">Address Details</h4>

                <AddressInput
                  country={formData.country}
                  state={formData.state}
                  city={formData.city}
                  zipcode={formData.zipcode}
                  addressLines={formData.address}
                  onChange={(field, value) => {
                    // Use functional setState to avoid stale closure bug
                    setFormData(prevData => {
                      const updatedData = { ...prevData, [field]: value };
                      return updatedData;
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )
      }
    ],

    transformResponse: (response: any) => {
      let vendorsData = [];

      if (Array.isArray(response.vendors)) {
        vendorsData = response.vendors;
      } else if (Array.isArray(response.data?.vendors)) {
        vendorsData = response.data.vendors;
      } else if (response.success && Array.isArray(response.vendors)) {
        vendorsData = response.vendors;
      } else if (response.vendor) {
        // Single vendor response (when fetching by ID for edit)
        vendorsData = [response.vendor];
      } else if (response.success && response.vendor) {
        // Another variation of single vendor response
        vendorsData = [response.vendor];
      }

      const transformedData = vendorsData.map((item: any) => {
        const transformed = {
          id: item.id,
          name: item.vendor_name,
          vendor_name: item.vendor_name,
          vendor_code: item.vendor_code,
          contact_name: item.contact_name,
          email: item.email,
          phone_no: item.phone_no,
          address: item.address,
          country: item.country,
          state: item.state,
          city: item.city,
          zipcode: item.zipcode,
          status: item.status || 'Active',
          created_at: item.created_at,
          updated_at: item.updated_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          createdBy: item.created_by,
        };



        return transformed;
      });

      return {
        ...response,
        vendors: transformedData,
      };
    },

    transformData: (data: any) => {
      // Map frontend fields (camelCase or as defined in 'fields') to backend snake_case
      // 'fields' definition uses snake_case names (e.g. vendor_name), so data should match those keys
      // except 'name' which GenericEntityPage might populate if we used it.
      // But we used explicit keys in 'fields', so 'data' will have those keys.

      console.log('🔄 transformData - Raw form data:', data);
      console.log('📍 Address fields:', {
        country: data.country,
        state: data.state,
        city: data.city,
        zipcode: data.zipcode,
        address: data.address
      });

      const transformed = {
        vendor_name: data.vendor_name || data.name,
        vendor_code: data.vendor_code,
        contact_name: data.contact_name,
        email: data.email,
        phone_no: data.phone_no,
        address: data.address,
        country: data.country,
        state: data.state,
        city: data.city,
        zipcode: data.zipcode,
        status: data.status || 'Active',
      };

      console.log('✅ transformData - Transformed data being sent to backend:', transformed);

      return transformed;
    },

    // Ensure custom columns check visibility to support "Save View"
    customColumns: (entity: any, isVisible: (field: string) => boolean) => (
      <>
        {isVisible('vendor_name') && (
          <TableCell className="font-medium bg-white sticky left-0 z-10 min-w-[200px] border-r border-gray-100">{entity.vendor_name}</TableCell>
        )}
        {isVisible('vendor_code') && (
          <TableCell className="text-sm font-normal text-gray-700">{entity.vendor_code || '-'}</TableCell>
        )}
        {isVisible('address') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">{entity.address || '-'}</TableCell>
        )}
        {isVisible('contact_name') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">{entity.contact_name || '-'}</TableCell>
        )}
        {isVisible('email') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">{entity.email || '-'}</TableCell>
        )}
        {isVisible('phone_no') && (
          <TableCell className="text-sm font-normal text-gray-700">{entity.phone_no || '-'}</TableCell>
        )}
        {isVisible('status') && (
          <TableCell className="text-sm font-normal text-gray-700">
            <span className={entity.status === 'Active' ? 'text-green-600' : 'text-gray-500'}>
              {entity.status}
            </span>
          </TableCell>
        )}
        {isVisible('created_at') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
            {entity.createdAt ? new Date(entity.createdAt).toLocaleDateString() : 'N/A'}
          </TableCell>
        )}
        {isVisible('updated_at') && (
          <TableCell className="text-sm font-normal text-gray-700 whitespace-nowrap">
            {entity.updatedAt ? new Date(entity.updatedAt).toLocaleDateString() : 'N/A'}
          </TableCell>
        )}
      </>
    )
  };

  return <GenericEntityPage config={vendorConfig} />;
};

export default VendorsPage;
