import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Elysia } from 'elysia';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  DatabaseError,
  BusinessLogicError,
  TokenError
} from '../../src/types/errors.js';

describe('Error Handler Middleware', () => {
  let app: Elysia;
  let consoleSpy: any;

  beforeEach(() => {
    app = errorHandler(new Elysia());
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('ValidationError handling', () => {
    it('should handle ValidationError with 400 status', async () => {
      app.get('/test', () => {
        throw new ValidationError('Invalid input data', { field: 'email' });
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid input data');
      expect(body.error.details).toEqual({ field: 'email' });
      expect(body.error.timestamp).toBeDefined();
      expect(body.error.path).toBe('/test');
    });

    it('should handle ValidationError without details', async () => {
      app.get('/test', () => {
        throw new ValidationError('Invalid input');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid input');
      expect(body.error.details).toBeUndefined();
    });
  });

  describe('UnauthorizedError handling', () => {
    it('should handle UnauthorizedError with 401 status', async () => {
      app.get('/test', () => {
        throw new UnauthorizedError('Invalid credentials');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Invalid credentials');
      expect(body.error.timestamp).toBeDefined();
    });

    it('should handle UnauthorizedError with default message', async () => {
      app.get('/test', () => {
        throw new UnauthorizedError();
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.message).toBe('Unauthorized');
    });
  });

  describe('TokenError handling', () => {
    it('should handle TokenError with 401 status', async () => {
      app.get('/test', () => {
        throw new TokenError('Token expired');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('TOKEN_ERROR');
      expect(body.error.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError handling', () => {
    it('should handle ForbiddenError with 403 status', async () => {
      app.get('/test', () => {
        throw new ForbiddenError('Access denied');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toBe('Access denied');
    });
  });

  describe('NotFoundError handling', () => {
    it('should handle NotFoundError with 404 status', async () => {
      app.get('/test', () => {
        throw new NotFoundError('User');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('User not found');
    });
  });

  describe('ConflictError handling', () => {
    it('should handle ConflictError with 409 status', async () => {
      app.get('/test', () => {
        throw new ConflictError('Email already exists');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toBe('Email already exists');
    });
  });

  describe('BusinessLogicError handling', () => {
    it('should handle BusinessLogicError with custom status', async () => {
      app.get('/test', () => {
        throw new BusinessLogicError('Cannot delete project with active items', 422);
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(body.error.message).toBe('Cannot delete project with active items');
    });

    it('should handle BusinessLogicError with default status 400', async () => {
      app.get('/test', () => {
        throw new BusinessLogicError('Invalid operation');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('BUSINESS_LOGIC_ERROR');
    });
  });

  describe('DatabaseError handling', () => {
    it('should handle DatabaseError with 500 status', async () => {
      app.get('/test', () => {
        throw new DatabaseError('Connection failed');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('DATABASE_ERROR');
      expect(body.error.message).toBe('Connection failed');
    });
  });

  describe('InternalServerError handling', () => {
    it('should handle InternalServerError with 500 status', async () => {
      app.get('/test', () => {
        throw new InternalServerError('Something went wrong');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Something went wrong');
    });
  });

  describe('Elysia built-in error codes', () => {
    it('should handle VALIDATION error code', async () => {
      // This would typically be triggered by Elysia's built-in validation
      app.get('/test', () => {
        const error = new Error('Validation failed');
        (error as any).code = 'VALIDATION';
        throw error;
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Request validation failed');
      expect(body.error.details).toBe('Validation failed');
    });

    it('should handle NOT_FOUND error code', async () => {
      app.get('/test', () => {
        const error = new Error('Route not found');
        (error as any).code = 'NOT_FOUND';
        throw error;
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Route not found');
    });

    it('should handle PARSE error code', async () => {
      app.get('/test', () => {
        const error = new Error('Parse failed');
        (error as any).code = 'PARSE';
        throw error;
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('PARSE_ERROR');
      expect(body.error.message).toBe('Failed to parse request body');
    });
  });

  describe('Unexpected errors', () => {
    it('should handle unexpected errors with 500 status', async () => {
      app.get('/test', () => {
        throw new Error('Unexpected error');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.timestamp).toBeDefined();
    });

    it('should handle string errors', async () => {
      app.get('/test', () => {
        throw 'String error';
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Error logging', () => {
    it('should log AppError with structured data', async () => {
      app.get('/test', () => {
        throw new ValidationError('Test error', { field: 'test' });
      });

      await app.handle(new Request('http://localhost/test'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('VALIDATION_ERROR: Test error'),
        expect.objectContaining({
          statusCode: 400,
          details: { field: 'test' },
          context: expect.objectContaining({ path: '/test' })
        })
      );
    });

    it('should log unexpected errors with full details', async () => {
      const unexpectedError = new Error('Unexpected');
      app.get('/test', () => {
        throw unexpectedError;
      });

      await app.handle(new Request('http://localhost/test'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected Error:'),
        expect.objectContaining({
          name: 'Error',
          message: 'Unexpected',
          stack: expect.any(String)
        })
      );
    });
  });

  describe('Response format consistency', () => {
    it('should always include timestamp in error response', async () => {
      app.get('/test', () => {
        throw new ValidationError('Test');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(body.error.timestamp).toBeDefined();
      expect(new Date(body.error.timestamp)).toBeInstanceOf(Date);
    });

    it('should include path in error response', async () => {
      app.get('/api/test', () => {
        throw new NotFoundError('Resource');
      });

      const response = await app.handle(new Request('http://localhost/api/test'));
      const body = await response.json();

      expect(body.error.path).toBe('/api/test');
    });

    it('should have consistent error response structure', async () => {
      app.get('/test', () => {
        throw new ForbiddenError('Access denied');
      });

      const response = await app.handle(new Request('http://localhost/test'));
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('timestamp');
      expect(body.error).toHaveProperty('path');
    });
  });
});