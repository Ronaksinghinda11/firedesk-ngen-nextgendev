/**
 * Parse and validate column selections from query parameters
 * Ensures always-show columns are included and filters invalid columns
 *
 * @param {string} columnsParam - Comma-separated column names from query
 * @param {Object} availableColumns - Column definitions object with metadata
 * @param {Array<string>} defaultColumns - Default columns if none specified
 * @returns {Array<string>} - Array of validated column keys
 */
function parseColumns(columnsParam, availableColumns, defaultColumns = []) {
    // Use default columns if none specified
    if (!columnsParam) {
        return defaultColumns;
    }

    // Parse comma-separated column names and clean them
    const requestedColumns = columnsParam
        .split(',')
        .map(c => c.trim())
        .filter(c => c);

    // Get all columns marked as "alwaysShow"
    const alwaysShowColumns = Object.keys(availableColumns)
        .filter(key => availableColumns[key].alwaysShow);

    // Combine requested + always-show columns (remove duplicates)
    const columns = [...new Set([
        ...requestedColumns,
        ...alwaysShowColumns
    ])];

    // Filter to only valid column keys that exist in availableColumns
    return columns.filter(col => availableColumns[col]);
}

module.exports = parseColumns;
