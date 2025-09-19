// Base Application Error
export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation Error (400)
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// Authentication Error (401)
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// Authorization Error (403)
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

// Not Found Error (404)
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// Conflict Error (409)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// Internal Server Error (500)
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

// Database Error
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', originalError);
  }
}

// Business Logic Error
export class BusinessLogicError extends AppError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'BUSINESS_LOGIC_ERROR');
  }
}

// Token Error
export class TokenError extends AppError {
  constructor(message: string = 'Invalid or expired token') {
    super(message, 401, 'TOKEN_ERROR');
  }
}