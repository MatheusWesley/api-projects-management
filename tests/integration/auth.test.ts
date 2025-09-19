import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { AuthController } from '../../src/controllers/authController.js';
import { AuthService } from '../../src/services/AuthService.js';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { MockDatabase } from '../repositories/mock-database.js';
import type { IUserRepository } from '../../src/types/repositories.js';
import type { IAuthService } from '../../src/types/services.js';

describe('Authentication Integration Tests', () => {
  let app: Elysia;
  let authService: IAuthService;
  let userRepository: IUserRepository;
  let mockDb: MockDatabase;

  beforeEach(() => {
    // Setup mock database and repositories
    mockDb = new MockDatabase();
    userRepository = new UserRepository(mockDb as any);
    authService = new AuthService(userRepository);
    
    // Create test app with auth routes
    const authController = new AuthController(authService);
    app = new Elysia().use(authController.createRoutes());
  });

  afterEach(() => {
    mockDb.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        role: 'developer' as const
      };

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(userData.email);
      expect(result.data.user.name).toBe(userData.name);
      expect(result.data.user.role).toBe(userData.role);
      expect(result.data.user.password).toBeUndefined(); // Password should not be in response
      expect(result.message).toBe('User registered successfully');
    });

    it('should return 422 for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'Password123!',
        role: 'developer' as const
      };

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      // Elysia validation returns different format
      expect(result.type).toBe('validation');
    });

    it('should return 422 for missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing name, password, role
      };

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });

    it('should return 422 for password too short', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: '123', // Too short
        role: 'developer' as const
      };

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });

    it('should return 422 for invalid role', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        role: 'invalid-role' as any
      };

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        role: 'developer' as const
      };

      // Register first user
      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      // Try to register with same email
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...userData,
            name: 'Another User'
          })
        })
      );

      expect(response.status).toBe(409);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CONFLICT');
      expect(result.error.message).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        role: 'developer' as const
      };

      await authService.register(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(loginData.email);
      expect(result.data.user.password).toBeUndefined(); // Password should not be in response
      expect(result.data.token).toBeDefined();
      expect(typeof result.data.token).toBe('string');
      expect(result.message).toBe('Login successful');
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('Invalid credentials');
    });

    it('should return 422 for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'Password123!'
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });

    it('should return 422 for missing email', async () => {
      const loginData = {
        password: 'Password123!'
        // Missing email
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });

    it('should return 422 for missing password', async () => {
      const loginData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });

    it('should return 422 for empty password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: ''
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json();
      expect(result.type).toBe('validation');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: 'invalid json'
        })
      );

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginData)
          // Missing Content-Type header
        })
      );

      // Should still work or return appropriate error
      expect([200, 400, 415, 422]).toContain(response.status);
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for successful registration', async () => {
      const userData = {
        email: 'format@example.com',
        name: 'Format User',
        password: 'Password123!',
        role: 'developer' as const
      };

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        })
      );

      const result = await response.json();
      
      // Check response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user');
      expect(result.data.user).toHaveProperty('id');
      expect(result.data.user).toHaveProperty('email');
      expect(result.data.user).toHaveProperty('name');
      expect(result.data.user).toHaveProperty('role');
      expect(result.data.user).toHaveProperty('createdAt');
      expect(result.data.user).toHaveProperty('updatedAt');
    });

    it('should return consistent response format for successful login', async () => {
      // First register a user
      await authService.register({
        email: 'format2@example.com',
        name: 'Format User 2',
        password: 'Password123!',
        role: 'developer'
      });

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'format2@example.com',
            password: 'Password123!'
          })
        })
      );

      const result = await response.json();
      
      // Check response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('token');
      expect(result.data.user).toHaveProperty('id');
      expect(result.data.user).toHaveProperty('email');
      expect(result.data.user).toHaveProperty('name');
      expect(result.data.user).toHaveProperty('role');
    });

    it('should return consistent error response format', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'invalid-email',
            password: 'Password123!'
          })
        })
      );

      const result = await response.json();
      
      // Check Elysia validation error response structure
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('validation');
    });
  });
});