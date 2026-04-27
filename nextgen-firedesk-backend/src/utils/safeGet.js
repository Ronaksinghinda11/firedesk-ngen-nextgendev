/**
 * Safely retrieve nested property values from objects
 * @param {Object} obj - The object to retrieve from
 * @param {string} path - Dot-separated path (e.g., 'asset.type')
 * @param {*} defaultValue - Default value if path not found (default: 'N/A')
 * @returns {*} - The value at the path or defaultValue
 */
function safeGet(obj, path, defaultValue = 'N/A') {
    if (!obj || !path) {
        return defaultValue;
    }

    const value = path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) {
            return undefined;
        }
        return acc[part];
    }, obj);

    // Return default value for null, undefined, or empty string
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    return value;
}

module.exports = safeGet;
