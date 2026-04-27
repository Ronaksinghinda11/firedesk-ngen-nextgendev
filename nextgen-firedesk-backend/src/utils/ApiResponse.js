/**
 * API Response Utility
 * Standardizes API responses across the application
 */

class ApiResponse {
    /**
     * Send success response
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    /**
     * Send error response
     */
    static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
        const response = {
            success: false,
            message
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Send paginated response
     */
    static paginated(res, data, pagination, message = 'Success') {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination
        });
    }
}

module.exports = ApiResponse;
