/**
 * Route Validation Template
 * To be integrated into server/src/routes/
 */

const validateRequest = (schema) => (req, res, next) => {
    // In a real implementation, this would use Joi or Zod
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input parameters',
            details: error.details
        });
    }
    next();
};

module.exports = { validateRequest };
