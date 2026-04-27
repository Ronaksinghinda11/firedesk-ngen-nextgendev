/**
 * Utility functions for auto-generating human-readable codes from names
 */

/**
 * Generate a code from a name by converting to uppercase and replacing spaces with underscores
 * @param {string} name - The name to convert to a code
 * @returns {string} - The generated code
 * @example generateCode('Fire Extinguisher') => 'FIRE_EXTINGUISHER'
 */
function generateCode(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Name is required and must be a string');
    }

    return name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generate a short code from a name using initials
 * @param {string} name - The name to convert to a short code
 * @returns {string} - The generated short code
 * @example generateShortCode('Fire Extinguisher') => 'FE'
 */
function generateShortCode(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Name is required and must be a string');
    }

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
        // Single word - take first 3-4 characters
        return name.substring(0, 4).toUpperCase();
    }

    // Multiple words - take first letter of each word
    return words
        .map(word => word[0])
        .join('')
        .toUpperCase();
}

/**
 * Check if a code already exists and append a number if needed
 * @param {string} baseCode - The base code to check
 * @param {Function} checkExists - Async function that checks if code exists
 * @returns {Promise<string>} - The final unique code
 */
async function ensureUniqueCode(baseCode, checkExists) {
    let code = baseCode;
    let counter = 1;

    while (await checkExists(code)) {
        code = `${baseCode}_${counter}`;
        counter++;
    }

    return code;
}

module.exports = {
    generateCode,
    generateShortCode,
    ensureUniqueCode
};
