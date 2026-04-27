/**
 * Phone Number Validation Utility
 * Validates Indian mobile phone numbers
 */

/**
 * Validate phone number format and check for dummy patterns
 * @param {string} phone - Phone number to validate
 * @returns {{ isValid: boolean, message?: string }}
 */
const validate_phone_number = (phone) => {
    if (!phone) return { isValid: true }; // Phone is optional

    const normalized_phone = phone.trim().replace(/\s+/g, '');

    // Check if it's exactly 10 digits
    if (!/^\d{10}$/.test(normalized_phone)) {
        return {
            isValid: false,
            message: "Please enter a valid 10-digit phone number"
        };
    }

    // Check if it starts with valid digits (6-9 for Indian mobile numbers)
    if (!/^[6-9]/.test(normalized_phone)) {
        return {
            isValid: false,
            message: "Please enter a valid phone number starting with 6, 7, 8, or 9"
        };
    }

    // Check for dummy/repetitive patterns
    const dummy_patterns = [
        /^(\d)\1{9}$/, // All same digits (e.g., 9999999999)
        /^0{10}$/, // All zeros
        /^1234567890$/, // Sequential ascending
        /^0987654321$/, // Sequential descending
        /^1111111111$/, // All ones
        /^2222222222$/, // All twos
        /^3333333333$/, // All threes
        /^4444444444$/, // All fours
        /^5555555555$/, // All fives
        /^6666666666$/, // All sixes
        /^7777777777$/, // All sevens
        /^8888888888$/, // All eights
        /^9999999999$/, // All nines
    ];

    for (const pattern of dummy_patterns) {
        if (pattern.test(normalized_phone)) {
            return {
                isValid: false,
                message: "Please enter a valid phone number. Test numbers and repetitive sequences are not allowed"
            };
        }
    }

    return { isValid: true };
};

/**
 * Normalize phone number by removing spaces
 * @param {string} phone - Phone number to normalize
 * @returns {string|null}
 */
const normalize_phone = (phone) => {
    if (!phone) return null;
    return phone.trim().replace(/\s+/g, '');
};

module.exports = {
    validate_phone_number,
    normalize_phone
};
