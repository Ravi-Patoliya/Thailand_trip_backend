const { API_response, logger } = require('../helpers');

const validator = (schema) => async (req, res, next) => {
    const paths = Object.keys(schema);
    if (!paths.length) return next();
    if (!paths.includes('body') && !paths.includes('query') && !paths.includes('params')) return next();

    for (const path of paths) {
        const data_for_validation = req[path];
        const { value, error } = schema[path].validate(data_for_validation, {
            allowUnknown: false,
            stripUnknown: true,
        });

        if (error) {
            logger.error(`VALIDATION ERROR: ${error}`);
            const firstError = error?.details?.[0];
            const shortMessage = firstError?.message?.replace(/"/g, '') || 'Invalid input';

            return API_response.VALIDATION_ERROR({ res, message: shortMessage, payload: {}, });
        }

        // Date validation start
        if (path === 'query' && (value?.from || value?.to)) {
            if (value?.from) value.from = new Date(value.from).toISOString().split('T')[0];
            if (value?.to) value.to = new Date(value.to).toISOString().split('T')[0];

            if (value?.from && value?.to && new Date(value.from) > new Date(value.to)) {
                logger.error('VALIDATION ERROR: From date cannot be greater than to date');
                return API_response.VALIDATION_ERROR({ res, message: 'From date must be before to date', payload: {}, });
            }

            if (value?.to) {
                const to = new Date(value.to);
                to.setDate(to.getDate() + 1);
                value.to = to.toISOString().split('T')[0];
            }
        }
        // Date validation end

        req[path] = value;
    }
    next();
};

module.exports = { validator };
