const { AppError } = require('./errorHandler');

const validate = (schema) => (req, res, next) => {
    // Validate request body, query, and params against the schema
    const objectToValidate = {};
    if (Object.keys(req.body).length) objectToValidate.body = req.body;
    if (Object.keys(req.query).length) objectToValidate.query = req.query;
    if (Object.keys(req.params).length) objectToValidate.params = req.params;

    const { error } = schema.validate(objectToValidate, {
        abortEarly: false,
        allowUnknown: true
    });

    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }

    next();
};

module.exports = validate;
