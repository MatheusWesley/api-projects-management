import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthService } from '../../../src/services/AuthService.js';
import type { IUserRepository } from '../../../src/types/repositories.js';
import type { User, CreateUserData } from '../../../src/types/user.js';
import { 
  UnauthorizedError, 
  ConflictError, 
  ValidationError,
  TokenError 
} from '../../../src/types/errors.js';

// Mock user data
const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2a$10$hashedpassword',
  role: 'developer',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCreateUserData: CreateUserData = {
  email: 'new@example.com',
  name: 'New User',
  password: 'StrongPassword123!',
  role: 'developer'
};

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // Create mock repository
    mockUserRepository = {
      create: mock(() => Promise.resolve(mockUser)),
      findById: mock(() => Promise.resolve(mockUser)),
      findByEmail: mock(() => Promise.resolve(mockUser)),
      update: mock(() => Promise.resolve(mockUser)),
      delete: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve([mockUser]))
    };

    authService = new AuthService(mockUserRepository);
  });

  describe('login', () => {
    it('should throw ValidationError when email is missing', async () => {
      await expect(authService.login('', 'password')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when password is missing', async () => {
      await expect(authService.login('test@example.com', '')).rejects.toThrow(ValidationError);
    });

    it('should throw UnauthorizedError when user not found', async () => {
      mockUserRepository.findByEmail = mock(() => Promise.resolve(null));
      
      await expect(authService.login('nonexistent@example.com', 'password')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('register', () => {
    it('should throw ValidationError when required fields are missing', async () => {
      const invalidData = { ...mockCreateUserData, email: '' };
      await expect(authService.register(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when user already exists', async () => {
      mockUserRepository.findByEmail = mock(() => Promise.resolve(mockUser));
      
      await expect(authService.register(mockCreateUserData)).rejects.toThrow(ConflictError);
    });

    it('should validate password strength', async () => {
      // Ensure user doesn't exist for this test
      mockUserRepository.findByEmail = mock(() => Promise.resolve(null));
      
      const weakPasswordData = { ...mockCreateUserData, password: '123' };
      await expect(authService.register(weakPasswordData)).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyToken', () => {
    it('should throw TokenError when token is missing', async () => {
      await expect(authService.verifyToken('')).rejects.toThrow(TokenError);
    });
  });

  describe('generateToken', () => {
    it('should generate a token successfully', () => {
      const result = authService.generateToken(mockUser);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});