const Logger = require('./logger');
const { getErrorDef } = require('./errorRegistry');

/**
 * Standardized Application Error
 * Represents an operational error within the application.
 */
class AppError extends Error {
    constructor(errorCode, originalError = null, additionalDetails = null) {
        super(errorCode);

        const errorDef = getErrorDef(errorCode);

        this.name = this.constructor.name;
        this.code = errorDef.type; // Equivalent to 'type' in RFC 7807 (e.g., 'VAL-2001')
        this.statusCode = errorDef.status;
        this.title = errorDef.title;
        // Construct the detail message. Use definition default, append specific details if provided.
        this.detail = additionalDetails ? `${errorDef.detail} Details: ${additionalDetails}` : errorDef.detail;

        // Ensure the error is explicitly an operational error (not a programmer bug)
        this.isOperational = true;

        // If an original Error object is passed, keep its stack trace, otherwise capture new one
        if (originalError && originalError.stack) {
            this.originalStack = originalError.stack;
        }
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global Error Handling Middleware for Express
 * Must be defined with 4 arguments: (err, req, res, next)
 */
const globalErrorHandler = (err, req, res, next) => {
    // 1. Prepare Error Context
    let errorToHandle = err;
    const context = {
        requestId: req.headers['x-request-id'] || 'system',
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.username : 'anonymous'
    };

    // 2. Normalize Error
    // If it's a generic JS Error (programmer error or unhandled exception), convert it to AppError
    if (!(err instanceof AppError)) {
        // Special case: JSON parsing errors from body-parser
        if (err.type === 'entity.parse.failed') {
            errorToHandle = new AppError('VAL-2003', err, err.message);
        } else {
            // Fallback to generic system error for unhandled native JS errors
            errorToHandle = new AppError('SYS-3001', err, err.message);
            // Ensure we flag it correctly so we know it wasn't an operational error
            errorToHandle.isOperational = false;
        }
    }

    // 3. Log Error
    if (errorToHandle.isOperational) {
        // Operational errors (validation, auth) are typical, warn level might be sufficient depending on severity
        const logLevel = errorToHandle.statusCode >= 500 ? 'error' : 'warn';
        Logger[logLevel](`[${errorToHandle.code}] ${errorToHandle.title}`, {
            ...context,
            detail: errorToHandle.detail,
            error: err // Pass original error object to logger for stack trace
        });
    } else {
        // Programming or unknown errors are FATAL
        Logger.fatal(`[UNHANDLED] ${errorToHandle.message}`, {
            ...context,
            error: err
        });
    }

    // 4. Construct RFC 7807 Problem Details Response
    const problemDetails = {
        type: `https://cihanenesdurgun.com/docs/errors#${errorToHandle.code}`, // Best practice: URI pointing to docs
        title: errorToHandle.title,
        status: errorToHandle.statusCode,
        detail: errorToHandle.detail,
        instance: req.originalUrl, // The specific endpoint that triggered it
        requestId: context.requestId, // Useful for support
        code: errorToHandle.code // Extension: Easy access for frontend code mapper
    };

    // 5. Send Response
    res.set('Content-Type', 'application/problem+json');
    res.status(errorToHandle.statusCode).json(problemDetails);
};

/**
 * Handle unhandled promise rejections and uncaught exceptions gracefully
 */
const setupProcessErrorHandlers = (server) => {
    process.on('unhandledRejection', (reason, promise) => {
        Logger.fatal('UNHANDLED REJECTION! Shutting down...', { error: reason });
        // Give time for logs to flush before exiting
        if (server) {
            server.close(() => {
                process.exit(1);
            });
        } else {
            // Wait 1 sec for FS operations
            setTimeout(() => process.exit(1), 1000);
        }
    });

    process.on('uncaughtException', (err) => {
        Logger.fatal('UNCAUGHT EXCEPTION! Shutting down...', { error: err });
        setTimeout(() => process.exit(1), 1000);
    });
};

module.exports = {
    AppError,
    globalErrorHandler,
    setupProcessErrorHandlers
};
