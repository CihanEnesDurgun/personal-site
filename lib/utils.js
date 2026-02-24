const crypto = require('crypto');
const { AppError } = require('./errorHandler');

/**
 * Generates a unique request ID.
 * @returns {string} Unique ID
 */
const generateRequestId = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Validates that all required fields are present in the provided data object.
 * Throws a standardized AppError if validation fails.
 * 
 * @param {Object} data - The object to validate
 * @param {Array<string>} requiredFields - Array of required field keys
 * @throws {AppError} If any required field is missing
 */
const validateRequired = (data, requiredFields) => {
    const missing = [];

    requiredFields.forEach(field => {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missing.push(field);
        }
    });

    if (missing.length > 0) {
        throw new AppError('VAL-2002', null, `Missing fields: ${missing.join(', ')}`);
    }
};

module.exports = {
    generateRequestId,
    validateRequired
};
