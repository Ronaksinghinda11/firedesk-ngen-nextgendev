/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass them to error handling middleware
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        // If error has a statusCode property, use it
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    });
};

module.exports = { asyncHandler };
