'use strict';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message)   { return new AppError(message, 400); }
  static unauthorized(message) { return new AppError(message, 401); }
  static forbidden(message)    { return new AppError(message, 403); }
  static notFound(entity)      { return new AppError(`${entity} not found.`, 404); }
  static conflict(message)     { return new AppError(message, 409); }
  static internal(message)     { return new AppError(message || 'Internal server error.', 500); }
  static serviceUnavailable(message) { return new AppError(message || 'Service temporarily unavailable.', 503); }
}

module.exports = AppError;
