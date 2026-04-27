/**
 * Asset Code Generator Utility
 * Generates unique asset codes in format: CATEGORY-PRODUCT-LETTER-NUMBER
 * 
 * Format: FE-JP-A-0001
 * - Category: First 2 letters of each word (e.g., "Fire Extinguisher" -> "FE")
 * - Product: First 2 letters (e.g., "Jockey Pump" -> "JP")
 * - Letter: A-Z (cycles through alphabet)
 * - Number: 0001-9999 (4 digits), then 10001+ (5+ digits)
 */

const { Asset, InventoryAsset, Category, Product } = require('../models');
const { Op } = require('sequelize');

/**
 * Extract code from category or product name
 * @param {string} name - Category or product name
 * @returns {string} - 2-letter code
 */
const extractCode = (name) => {
    if (!name || typeof name !== 'string') {
        return 'XX';
    }

    const cleaned = name.trim();
    
    // Split by spaces to check if multiple words
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length >= 2) {
        // Multiple words: take first letter of first two words
        const first = words[0].substring(0, 1).toUpperCase();
        const second = words[1].substring(0, 1).toUpperCase();
        return first + second;
    } else {
        // Single word: take first 2 letters
        return cleaned.substring(0, 2).toUpperCase();
    }
};

/**
 * Get the next letter in sequence (A-Z)
 * @param {string} currentLetter - Current letter (or null for first)
 * @returns {string|null} - Next letter or null if Z is exceeded
 */
const getNextLetter = (currentLetter) => {
    if (!currentLetter) return 'A';
    
    const charCode = currentLetter.charCodeAt(0);
    if (charCode >= 90) return null; // Z exceeded
    
    return String.fromCharCode(charCode + 1);
};

/**
 * Format number with appropriate padding
 * @param {number} num - Number to format
 * @returns {string} - Formatted number (0001-9999 or 10001+)
 */
const formatNumber = (num) => {
    if (num <= 9999) {
        return String(num).padStart(4, '0');
    }
    return String(num);
};

/**
 * Parse existing asset code to extract components
 * @param {string} assetCode - Asset code to parse (e.g., "FE-JP-A-0001")
 * @returns {object} - { categoryCode, productCode, letter, number }
 */
const parseAssetCode = (assetCode) => {
    if (!assetCode || typeof assetCode !== 'string') {
        return null;
    }

    const parts = assetCode.split('-');
    if (parts.length !== 4) {
        return null;
    }

    return {
        categoryCode: parts[0],
        productCode: parts[1],
        letter: parts[2],
        number: parseInt(parts[3], 10)
    };
};

/**
 * Generate unique asset code
 * @param {string} categoryId - UUID of category
 * @param {string} productId - UUID of product
 * @param {object} transaction - Optional Sequelize transaction
 * @returns {Promise<string>} - Generated unique asset code
 */
const generateAssetCode = async (categoryId, productId, transaction = null) => {
    try {
        // Fetch category and product details
        const [category, product] = await Promise.all([
            Category.findByPk(categoryId, { 
                attributes: ['id', 'category_name', 'category_code'],
                transaction 
            }),
            Product.findByPk(productId, { 
                attributes: ['id', 'product_name', 'product_code'],
                transaction 
            })
        ]);

        if (!category || !product) {
            throw new Error('Category or Product not found');
        }

        // Generate category and product codes
        const categoryCode = extractCode(category.category_name);
        const productCode = extractCode(product.product_name);

        // Find the latest asset code for this category-product combination
        const prefix = `${categoryCode}-${productCode}-`;
        
        const existingAssets = await Asset.findAll({
            where: {
                asset_code: {
                    [Op.like]: `${prefix}%`
                }
            },
            attributes: ['asset_code'],
            transaction
        });

        // Also check InventoryAsset where codes might be reserved/generated but not moved
        const existingInventoryAssets = await InventoryAsset.findAll({
            where: {
                asset_code: {
                    [Op.like]: `${prefix}%`
                }
            },
            attributes: ['asset_code'],
            transaction
        });

        const allCodes = [...existingAssets, ...existingInventoryAssets].map(a => a.asset_code);
        
        let latestParsed = null;
        for (const code of allCodes) {
            const parsed = parseAssetCode(code);
            if (parsed && parsed.categoryCode === categoryCode && parsed.productCode === productCode) {
                if (!latestParsed) {
                    latestParsed = parsed;
                } else {
                    // Compare letters
                    if (parsed.letter > latestParsed.letter) {
                        latestParsed = parsed;
                    } else if (parsed.letter === latestParsed.letter) {
                        if (parsed.number > latestParsed.number) {
                            latestParsed = parsed;
                        }
                    }
                }
            }
        }

        let letter = 'A';
        let number = 1;

        if (latestParsed) {
            // Increment the sequence
            if (latestParsed.number >= 9999) {
                // Current letter series is full (exceeded 9999)
                const nextLetter = getNextLetter(latestParsed.letter);
                if (nextLetter) {
                    letter = nextLetter;
                    number = 1; // Start from 1 with new letter
                } else {
                    // All letters exhausted, continue with Z and higher numbers
                    letter = 'Z';
                    number = latestParsed.number + 1;
                }
            } else {
                // Same letter, increment number
                letter = latestParsed.letter;
                number = latestParsed.number + 1;
            }
        }

        // Generate the asset code
        const assetCode = `${categoryCode}-${productCode}-${letter}-${formatNumber(number)}`;

        // Verify uniqueness (safety check)
        const existsInAsset = await Asset.findOne({
            where: { asset_code: assetCode },
            transaction
        });
        const existsInInventory = await InventoryAsset.findOne({
            where: { asset_code: assetCode },
            transaction
        });

        if (existsInAsset || existsInInventory) {
            // If by some chance it exists, try to find the next available code
            return await findNextAvailableCode(categoryCode, productCode, letter, number, transaction);
        }

        return assetCode;

    } catch (error) {
        console.error('Error generating asset code:', error);
        throw error;
    }
};

/**
 * Find next available code when collision occurs
 * @param {string} categoryCode - Category code prefix
 * @param {string} productCode - Product code prefix
 * @param {string} startLetter - Starting letter
 * @param {number} startNumber - Starting number
 * @param {object} transaction - Optional Sequelize transaction
 * @returns {Promise<string>} - Next available asset code
 */
const findNextAvailableCode = async (categoryCode, productCode, startLetter, startNumber, transaction = null) => {
    let letter = startLetter;
    let number = startNumber;
    let maxAttempts = 100;

    while (maxAttempts > 0) {
        number++;
        
        if (number > 9999 && number === 10000) {
            // Move to next letter
            const nextLetter = getNextLetter(letter);
            if (nextLetter) {
                letter = nextLetter;
                number = 1;
            } else {
                // Continue with Z
                letter = 'Z';
            }
        }

        const assetCode = `${categoryCode}-${productCode}-${letter}-${formatNumber(number)}`;
        
        const existsInAsset = await Asset.findOne({
            where: { asset_code: assetCode },
            transaction
        });
        const existsInInventory = await InventoryAsset.findOne({
            where: { asset_code: assetCode },
            transaction
        });

        if (!existsInAsset && !existsInInventory) {
            return assetCode;
        }

        maxAttempts--;
    }

    // Fallback to timestamp-based code
    return `${categoryCode}-${productCode}-Z-${Date.now()}`;
};

/**
 * Validate asset code format
 * @param {string} assetCode - Asset code to validate
 * @returns {boolean} - Whether the code is valid
 */
const validateAssetCodeFormat = (assetCode) => {
    if (!assetCode || typeof assetCode !== 'string') {
        return false;
    }

    const parts = assetCode.split('-');
    if (parts.length !== 4) {
        return false;
    }

    const [categoryCode, productCode, letter, numberStr] = parts;

    // Category and product codes should be 2 uppercase letters
    if (!/^[A-Z]{2}$/.test(categoryCode) || !/^[A-Z]{2}$/.test(productCode)) {
        return false;
    }

    // Letter should be A-Z
    if (!/^[A-Z]$/.test(letter)) {
        return false;
    }

    // Number should be digits
    if (!/^\d+$/.test(numberStr)) {
        return false;
    }

    return true;
};

module.exports = {
    generateAssetCode,
    validateAssetCodeFormat,
    extractCode,
    parseAssetCode,
    formatNumber,
    getNextLetter
};
