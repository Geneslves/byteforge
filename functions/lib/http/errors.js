/**
 * Custom error classes for HTTP responses
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = {}) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
      retryAfter: Math.ceil(retryAfter)
    });
    this.retryAfter = Math.ceil(retryAfter);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super('DATABASE_ERROR', message, 500);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super('CONFLICT', message, 409);
  }
}
