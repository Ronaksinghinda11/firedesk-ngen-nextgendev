// src/components/generic/utils/exportImportUtils.ts
// Utility functions for export/import operations with CSV and Excel support

import * as XLSX from 'xlsx';
import type { FilterAttribute } from '../types/entity.types';

export type ExportFormat = 'csv' | 'excel';

export interface ExportColumn {
    id: string;
    label: string;
    required?: boolean;
}

/**
 * Escape a value for CSV format
 */
export const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    let strValue = String(value);
    if (typeof value === 'object' && !Array.isArray(value)) strValue = JSON.stringify(value);
    else if (Array.isArray(value)) strValue = value.join(', ');
    strValue = strValue.replace(/"/g, '""');
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue}"`;
    }
    return strValue;
};

// Known relationship fields that should resolve to nested object names
const RELATIONSHIP_FIELDS = [
    'manufacturer', 'category', 'product', 'plant', 'building', 'floor', 'wing',
    'vendor', 'industry', 'state', 'city', 'country', 'role', 'user', 'technician',
    'manager', 'condition', 'created_by', 'updated_by'
];

// Special field mappings where the export column name differs from the data field
// Format: { exportColumnId: actualDataFieldOrPath }
const SPECIAL_FIELD_MAPPINGS: Record<string, string | ((entity: any) => any)> = {
    // Asset code mapping - for import/export with 'Asset ID' label
    'asset_code': (entity) => entity.asset_code || entity.assetCode || entity.assetId,
    // Condition code mapping
    'condition_code': (entity) => entity.condition_code || entity.conditionCode,
    // Fields with 'Id' suffix
    'assetId': (entity) => entity.asset_code || entity.assetCode || entity.assetId,
    'industryId': (entity) => entity.industry?.industryName || entity.industry?.name || entity.industryName,
    'categoryId': (entity) => entity.category?.categoryName || entity.category?.category_name || entity.category?.name || entity.categoryName,
    'productId': (entity) => entity.product?.productName || entity.product?.product_name || entity.product?.name || entity.productName,
    'plantId': (entity) => entity.plant?.plantName || entity.plant?.plant_name || entity.plant?.name || entity.plantName,
    'buildingId': (entity) => entity.building?.buildingName || entity.building?.building_name || entity.building?.name || entity.buildingName,
    'stateId': (entity) => entity.state?.stateName || entity.state?.name || entity.stateName,
    'cityId': (entity) => entity.city?.cityName || entity.city?.name || entity.cityName,
    'vendorId': (entity) => entity.vendor?.vendorName || entity.vendor?.vendor_name || entity.vendor?.name || entity.vendorName,
    'roleId': (entity) => entity.role?.roleName || entity.role?.name || entity.roleName,
    'manufacturerId': (entity) => entity.manufacturer?.name || entity.manufacturerName,

    // Fields without 'Id' suffix - resolve nested objects or UUID to names
    'industry': (entity) => {
        if (entity.industry?.industryName) return entity.industry.industryName;
        if (entity.industry?.name) return entity.industry.name;
        if (entity.industryName) return entity.industryName;
        // If it's a UUID, return empty (we can't resolve it without the nested object)
        if (isUUID(entity.industry)) return '';
        return entity.industry;
    },
    'category': (entity) => {
        if (entity.category?.categoryName) return entity.category.categoryName;
        if (entity.category?.category_name) return entity.category.category_name;
        if (entity.category?.name) return entity.category.name;
        if (entity.categoryName) return entity.categoryName;
        if (isUUID(entity.category)) return '';
        return entity.category;
    },
    'product': (entity) => {
        if (entity.product?.productName) return entity.product.productName;
        if (entity.product?.product_name) return entity.product.product_name;
        if (entity.product?.name) return entity.product.name;
        if (entity.productName) return entity.productName;
        if (isUUID(entity.product)) return '';
        return entity.product;
    },
    'plant': (entity) => {
        if (entity.plant?.plantName) return entity.plant.plantName;
        if (entity.plant?.plant_name) return entity.plant.plant_name;
        if (entity.plant?.name) return entity.plant.name;
        if (entity.plantName) return entity.plantName;
        if (isUUID(entity.plant)) return '';
        return entity.plant;
    },
    'manufacturer': (entity) => {
        if (entity.manufacturer?.name) return entity.manufacturer.name;
        if (entity.manufacturerName) return entity.manufacturerName;
        if (isUUID(entity.manufacturer)) return '';
        return entity.manufacturer;
    },
    'state': (entity) => {
        if (entity.state?.stateName) return entity.state.stateName;
        if (entity.state?.name) return entity.state.name;
        if (entity.stateName) return entity.stateName;
        if (isUUID(entity.state)) return '';
        return entity.state;
    },
    'city': (entity) => {
        if (entity.city?.cityName) return entity.city.cityName;
        if (entity.city?.name) return entity.city.name;
        if (entity.cityName) return entity.cityName;
        if (isUUID(entity.city)) return '';
        return entity.city;
    },
};

// Helper to check if a value looks like a UUID
const isUUID = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

/**
 * Get the display value for a field from an entity
 * Enhanced to resolve relationship fields to human-readable names instead of UUIDs
 */
export const getEntityFieldValue = (entity: any, fieldName: string): any => {
    // Check for special field mappings first (e.g., assetId -> asset_code)
    if (SPECIAL_FIELD_MAPPINGS[fieldName]) {
        const mapping = SPECIAL_FIELD_MAPPINGS[fieldName];
        const value = typeof mapping === 'function' ? mapping(entity) : entity[mapping];
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }

    // Normalize field name for comparison
    const normalizedFieldName = fieldName.toLowerCase().replace(/_/g, '');
    const snakeCaseField = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    const camelCaseField = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Handle nested object references (e.g., categoryId -> category.name)
    if (fieldName.endsWith('Id')) {
        const baseFieldName = fieldName.slice(0, -2);
        const displayNameField = `${baseFieldName}Name`;
        if (entity[displayNameField]) return entity[displayNameField];
        const capitalizedName = baseFieldName.charAt(0).toUpperCase() + baseFieldName.slice(1);
        if (entity[capitalizedName]?.name) return entity[capitalizedName].name;
        if (entity[capitalizedName]?.[`${baseFieldName}Name`]) return entity[capitalizedName][`${baseFieldName}Name`];
    }

    // Check if this is a known relationship field (without 'Id' suffix)
    const isRelationshipField = RELATIONSHIP_FIELDS.some(rf =>
        normalizedFieldName === rf.replace(/_/g, '') ||
        fieldName === rf ||
        snakeCaseField === rf
    );

    if (isRelationshipField) {
        // Try to get the nested object from various possible keys
        const possibleObjectKeys = [fieldName, snakeCaseField, camelCaseField];

        for (const key of possibleObjectKeys) {
            const nestedObj = entity[key];
            if (nestedObj && typeof nestedObj === 'object') {
                // Look for common name fields in the nested object
                const nameFields = [
                    'name',
                    `${key}Name`,          // e.g., categoryName
                    `${key}_name`,          // e.g., category_name
                    `${snakeCaseField}_name`, // e.g., category_name (snake)
                    `${camelCaseField}Name`,  // e.g., categoryName (camel)
                    'displayName',
                    'label',
                    'title'
                ];

                for (const nameField of nameFields) {
                    if (nestedObj[nameField]) {
                        return nestedObj[nameField];
                    }
                }

                // Also try common variants based on field name
                // e.g., for 'plant', check 'plantName', 'plant_name'
                const baseName = fieldName.replace(/_/g, '');
                if (nestedObj[`${baseName}Name`]) return nestedObj[`${baseName}Name`];
                if (nestedObj[`${baseName}_name`]) return nestedObj[`${baseName}_name`];
            }
        }

        // Check for pre-flattened name fields (e.g., entity.categoryName, entity.category_name)
        const preResolvedFields = [
            `${fieldName}Name`,
            `${fieldName}_name`,
            `${snakeCaseField}_name`,
            `${camelCaseField}Name`
        ];

        for (const resolvedField of preResolvedFields) {
            if (entity[resolvedField]) {
                return entity[resolvedField];
            }
        }
    }

    // Direct field access
    const directValue = entity[fieldName];
    if (directValue !== undefined) {
        // If it's a relationship field and value is a UUID, try to find the nested object name
        if (isRelationshipField && isUUID(directValue)) {
            // UUID found but we want the name - check for nested object
            const nestedObj = entity[fieldName];
            if (typeof nestedObj === 'object' && nestedObj?.name) {
                return nestedObj.name;
            }
            // Can't resolve, but don't return raw UUID for relationship fields
            // Check if there's a _name or Name variant
            if (entity[`${fieldName}Name`]) return entity[`${fieldName}Name`];
            if (entity[`${fieldName}_name`]) return entity[`${fieldName}_name`];
        }
        return directValue;
    }

    // Try snake_case version
    if (entity[snakeCaseField] !== undefined) {
        const snakeValue = entity[snakeCaseField];
        if (isRelationshipField && isUUID(snakeValue)) {
            if (entity[`${snakeCaseField}_name`]) return entity[`${snakeCaseField}_name`];
        }
        return snakeValue;
    }

    // Try camelCase version
    if (entity[camelCaseField] !== undefined) {
        const camelValue = entity[camelCaseField];
        if (isRelationshipField && isUUID(camelValue)) {
            if (entity[`${camelCaseField}Name`]) return entity[`${camelCaseField}Name`];
        }
        return camelValue;
    }

    return '';
};

/**
 * Convert filterAttributes to export columns
 */
export const getExportColumns = (filterAttributes: FilterAttribute[]): ExportColumn[] => {
    return filterAttributes.map(attr => ({
        id: attr.id,
        label: attr.label,
        required: attr.mandatory
    }));
};

/**
 * Export data to CSV format
 */
export const exportToCSV = (
    data: any[],
    columns: ExportColumn[],
    filename: string
): void => {
    const headers = columns.map(col =>
        col.required ? `${col.label} *` : col.label
    );

    const csvContent = [
        headers.map(escapeCSVValue).join(','),
        ...data.map(entity =>
            columns.map(col => escapeCSVValue(getEntityFieldValue(entity, col.id))).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
};

/**
 * Export data to Excel format
 */
export const exportToExcel = (
    data: any[],
    columns: ExportColumn[],
    filename: string
): void => {
    const headers = columns.map(col =>
        col.required ? `${col.label} *` : col.label
    );

    const worksheetData = [
        headers,
        ...data.map(entity =>
            columns.map(col => {
                const value = getEntityFieldValue(entity, col.id);
                // Skip date formatting for ID/Code columns to preserve exact string
                const isCodeColumn = ['asset_code', 'assetid', 'asset id', 'id', 'code'].some(key =>
                    col.id.toLowerCase().includes(key) || col.label.toLowerCase().includes(key)
                );

                if (!isCodeColumn) {
                    // Handle date formatting
                    if (value instanceof Date) {
                        return value.toLocaleDateString();
                    }
                    if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) {
                        try {
                            // Only format if it looks like a full date (YYYY-MM-DD)
                            if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}-\d{2}-\d{4}/.test(value)) {
                                return new Date(value).toLocaleDateString();
                            }
                        } catch {
                            return value;
                        }
                    }
                }
                return value;
            })
        )
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Format code columns (asset_code, condition_code, etc.) as text to prevent Excel auto-formatting
    const codeColumns = ['asset_code', 'condition_code', 'question_code', 'asset id', 'condition code', 'question code', 'assetid', 'id'];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
        if (headerCell && headerCell.v) {
            const headerValue = String(headerCell.v).toLowerCase();
            const isCodeColumn = codeColumns.some(cc => headerValue.includes(cc));

            if (isCodeColumn) {
                // Format all cells in this column as text
                for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (worksheet[cellAddress]) {
                        worksheet[cellAddress].t = 's'; // Set cell type to string
                        worksheet[cellAddress].z = '@'; // Set number format to text
                    }
                }
            }
        }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Generate buffer and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, `${filename}.xlsx`);
};

/**
 * Generate an import template file
 */
export const generateTemplate = (
    columns: ExportColumn[],
    format: ExportFormat,
    entityName: string
): void => {
    const filename = `${entityName.toLowerCase()}_import_template`;

    // Create headers with * for mandatory fields
    const headers = columns.map(col =>
        col.required ? `${col.label} *` : col.label
    );

    if (format === 'csv') {
        const csvContent = headers.map(escapeCSVValue).join(',');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `${filename}.csv`);
    } else {
        const worksheet = XLSX.utils.aoa_to_sheet([headers]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, `${filename}.xlsx`);
    }
};

/**
 * Parse a CSV file to JSON array
 */
export const parseCSV = async (file: File): Promise<{ headers: string[]; data: Record<string, any>[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length === 0) {
                    reject(new Error('Empty file'));
                    return;
                }

                // Parse headers (remove * from mandatory markers)
                const headers = parseCSVLine(lines[0]).map(h => h.replace(' *', '').trim());

                // Parse data rows and filter out empty rows
                const data = lines.slice(1)
                    .map(line => {
                        const values = parseCSVLine(line);
                        const row: Record<string, any> = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index]?.trim() || '';
                        });
                        return row;
                    })
                    // Filter out rows where all values are empty/null/undefined
                    .filter(row => {
                        const values = Object.values(row);
                        return values.some(v => v !== '' && v !== null && v !== undefined);
                    });

                resolve({ headers, data });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};

/**
 * Parse a single CSV line handling quoted values
 */
const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
};

/**
 * Parse an Excel file to JSON array
 */
export const parseExcel = async (file: File): Promise<{ headers: string[]; data: Record<string, any>[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                // Read with cellDates to ensure dates are understood, but we will use raw: false to get strings
                const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON - using header: 1 to get array of arrays
                // raw: false forces XLSX to return the formatted string (what the user sees)
                // dateNF ensures that if it detects a date, it formats it as dd/mm/yyyy
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false,
                    dateNF: 'dd/mm/yyyy'
                }) as any[][];

                if (jsonData.length === 0) {
                    reject(new Error('Empty file'));
                    return;
                }

                // Parse headers (remove * from mandatory markers)
                const headers = (jsonData[0] as string[]).map(h =>
                    typeof h === 'string' ? h.replace(' *', '').trim() : String(h)
                );

                // Parse data rows and filter out empty rows
                const data = jsonData.slice(1)
                    .map(row => {
                        const obj: Record<string, any> = {};
                        headers.forEach((header, index) => {
                            // Since raw: false is used, values are already formatted strings
                            // No need for manual Date conversion logic here
                            obj[header] = row[index] !== undefined ? row[index] : '';
                        });
                        return obj;
                    })
                    // Filter out rows where all values are empty/null/undefined
                    .filter(row => {
                        const values = Object.values(row);
                        return values.some(v => v !== '' && v !== null && v !== undefined);
                    });

                resolve({ headers, data });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Parse any supported file (CSV or Excel)
 */
export const parseFile = async (file: File): Promise<{ headers: string[]; data: Record<string, any>[] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
        return parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
        return parseExcel(file);
    } else {
        throw new Error(`Unsupported file format: ${extension}. Please use CSV or Excel (.xlsx, .xls) files.`);
    }
};

/**
 * Validate imported data against expected columns
 */
export const validateImportData = (
    data: Record<string, any>[],
    columns: ExportColumn[],
    headers: string[]
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Create a map of labels to column IDs for matching
    const labelToId = new Map<string, ExportColumn>();
    columns.forEach(col => {
        labelToId.set(col.label.toLowerCase(), col);
        labelToId.set(col.id.toLowerCase(), col);
    });

    // Check if required columns are present in headers
    const requiredColumns = columns.filter(col => col.required);
    const normalizedHeaders = headers.map(h => h.toLowerCase());

    // Identify ID columns (for upsert detection)
    const idColumns = ['asset id', 'asset_code', 'condition code', 'condition_code', 'email', 'question code', 'question_code', 'user id'];

    // Check if we have ANY ID column in the header
    const hasIdHeader = normalizedHeaders.some(h => idColumns.some(idCol => h.includes(idCol)));

    // Only force required columns if we CANNOT find an ID column (meaning it's definitely a Create operation)
    // If ID column is present, we allow missing columns because it might be a partial update
    if (!hasIdHeader) {
        for (const required of requiredColumns) {
            const found = normalizedHeaders.some(h =>
                h === required.label.toLowerCase() || h === required.id.toLowerCase()
            );
            if (!found) {
                errors.push(`Missing required column: ${required.label}`);
            }
        }
    }

    // Validate each row for required fields with detailed error messages
    data.forEach((row, index) => {
        const rowErrors: string[] = [];

        // Identify ID columns (for upsert detection)
        const idColumns = ['asset id', 'asset_code', 'condition code', 'condition_code', 'email', 'question code', 'question_code', 'user id'];

        // Check if this row has an ID value populated
        const idKey = Object.keys(row).find(key => {
            const normalizedKey = key.toLowerCase();
            return idColumns.some(idCol => normalizedKey.includes(idCol));
        });

        const idValue = idKey ? row[idKey] : null;
        const isUpdate = idValue !== null && idValue !== undefined && String(idValue).trim() !== '';

        if (isUpdate) {
            // UPDATE: Only need the ID (which we found) and at least one other field to update
            // No mandatory field checks required
        } else {
            // CREATE: Full validation required
            for (const required of requiredColumns) {
                const matchingKey = Object.keys(row).find(key => {
                    const normalizedKey = key.toLowerCase().replace(/\*/g, '').trim();
                    const requiredLabel = required.label.toLowerCase().replace(/\*/g, '').trim();
                    const requiredId = required.id.toLowerCase().replace(/\*/g, '').trim();

                    return normalizedKey === requiredLabel || normalizedKey === requiredId;
                });

                if (matchingKey) {
                    const value = row[matchingKey];
                    if (value === undefined || value === null || value === '') {
                        rowErrors.push(`"${required.label}" is required but empty`);
                    }
                } else {
                    // Only complain about missing column if header is also missing
                    // Use a simple heuristic: if we have NO id column header, we expect all required columns
                    const headersLower = headers.map(h => h.toLowerCase().replace(/\*/g, '').trim());
                    const hasIdHeader = headersLower.some(h => idColumns.some(idCol => h.includes(idCol)));

                    if (!hasIdHeader) {
                        rowErrors.push(`"${required.label}" column not found`);
                    } else {
                        rowErrors.push(`"${required.label}" is required for creation`);
                    }
                }
            }
        }

        // If there are errors for this row, add them with row number
        if (rowErrors.length > 0) {
            // Re-calculate isUpdate for error context (since we can't access variable from above scope easily without restructuring)
            const idColumnsStr = ['asset id', 'asset_code', 'condition code', 'condition_code', 'email', 'question code', 'question_code', 'user id'];
            const idKeyStr = Object.keys(row).find(k => idColumnsStr.some(id => k.toLowerCase().includes(id)));
            const isUpdateStr = idKeyStr && row[idKeyStr];

            const operation = isUpdateStr ? 'Update' : 'Create';
            errors.push(`Row ${index + 2} (${operation}): ${rowErrors.join(', ')}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors: errors.slice(0, 10) // Limit errors shown to first 10
    };
};

/**
 * Map imported data headers to column IDs and normalize values to strings
 */
export const mapImportDataToColumns = (
    data: Record<string, any>[],
    columns: ExportColumn[]
): Record<string, any>[] => {
    // Create multiple mappings for flexible matching: label, id, and variations
    const labelToId = new Map<string, string>();
    columns.forEach(col => {
        // Add label and id mappings
        labelToId.set(col.label.toLowerCase(), col.id);
        labelToId.set(col.id.toLowerCase(), col.id);

        // Add variations: "role id" -> "role", "category name" -> "category_name"
        // Handle spaces by converting to underscores and removing them
        const labelNoSpaces = col.label.toLowerCase().replace(/\s+/g, '_');
        const labelNoSpacesCompact = col.label.toLowerCase().replace(/\s+/g, '');
        labelToId.set(labelNoSpaces, col.id);
        labelToId.set(labelNoSpacesCompact, col.id);

        // Same for id
        const idNoSpaces = col.id.toLowerCase().replace(/\s+/g, '_');
        const idNoSpacesCompact = col.id.toLowerCase().replace(/\s+/g, '');
        labelToId.set(idNoSpaces, col.id);
        labelToId.set(idNoSpacesCompact, col.id);

        // Handle "X ID" headers mapping to "x" field: "role id" -> "role", "category id" -> "category"
        const labelWithId = col.label.toLowerCase() + ' id';
        const labelWithIdUnderscore = col.label.toLowerCase() + '_id';
        const idWithId = col.id.toLowerCase() + ' id';
        const idWithIdUnderscore = col.id.toLowerCase() + '_id';
        labelToId.set(labelWithId, col.id);
        labelToId.set(labelWithIdUnderscore, col.id);
        labelToId.set(idWithId, col.id);
        labelToId.set(idWithIdUnderscore, col.id);
    });

    return data.map(row => {
        const mappedRow: Record<string, any> = {};
        Object.entries(row).forEach(([key, value]) => {
            // Normalize key: lowercase, trim, remove asterisks
            const normalizedKey = key.toLowerCase().replace(/\*/g, '').trim();

            // Try multiple variations to find a match
            let columnId = labelToId.get(normalizedKey);
            if (!columnId) {
                // Try without spaces
                columnId = labelToId.get(normalizedKey.replace(/\s+/g, '_'));
            }
            if (!columnId) {
                columnId = labelToId.get(normalizedKey.replace(/\s+/g, ''));
            }
            if (!columnId) {
                // Try removing "id" suffix: "role id" -> "role"
                const withoutId = normalizedKey.replace(/\s*id$/i, '').trim();
                columnId = labelToId.get(withoutId);
            }

            // If no match found for column, still pass it through to backend
            // Backend can handle it as potential tech spec column
            if (!columnId) {
                // Use original key (normalized) as the field name for unknown columns
                // This allows tech specs like "C1", "Pressure" to be passed to backend
                const cleanKey = normalizedKey.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
                if (cleanKey && value !== null && value !== undefined && value !== '') {
                    mappedRow[cleanKey] = value;
                    console.log(`[Import] Passing unknown column "${key}" as "${cleanKey}"`);
                }
                return;
            }

            // Convert value to string if not null/undefined
            // This handles Excel parsing numbers (e.g., phone numbers) as actual numbers
            let normalizedValue: any = value;
            if (value === null || value === undefined || value === '') {
                normalizedValue = null; // Send null for empty values, let backend handle defaults
            } else if (typeof value === 'number') {
                normalizedValue = String(value); // Convert numbers to strings
            } else if (typeof value === 'boolean') {
                normalizedValue = value; // Keep booleans as is
            } else if (typeof value === 'string') {
                normalizedValue = value.trim(); // Trim strings
                if (normalizedValue === '') normalizedValue = null;
            }

            mappedRow[columnId] = normalizedValue;
        });
        return mappedRow;
    });
};

/**
 * Helper function to download a Blob
 */
const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
