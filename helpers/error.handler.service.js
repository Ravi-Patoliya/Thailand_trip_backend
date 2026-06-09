const message = require('../constants/message');
const logger = require('./logger.helper');

/**
 * Wrapper function to handle async service operations
 * @param {Function} serviceOperation - The async service operation
 * @param {string} entityName - Name of the entity for error context
 * @returns {Function} - Wrapped service function
 */
const withErrorHandling = (serviceOperation, entityName = 'Resource') => {
    return async (...args) => {
        try {
            return await serviceOperation(...args);
        } catch (error) {
            logger.error(`Service Error in ${entityName}:`, error);
            // Return a normalized error object so controllers can safely read `message`
            return { success: false, message: (error && error.message) ? error.message : 'Internal Server Error' };
        }
    };
};

module.exports = {
    withErrorHandling
};
