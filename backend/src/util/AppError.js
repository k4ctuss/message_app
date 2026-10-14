const status = require("http-status");

class AppError extends Error {
    constructor(message, statusCode = status.INTERNAL_SERVER_ERROR) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // an operational error is a expected event (input user, acces denied, not found, network...) ≠ bug
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, status.NOT_FOUND);
    }
}
class ValidationError extends AppError {
    constructor(message = "Invalid input") {
        super(message, status.BAD_REQUEST);
    }
}

module.exports = {
    AppError,
    NotFoundError,
    ValidationError,
};
