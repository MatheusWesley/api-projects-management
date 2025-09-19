import { describe, it, expect, beforeAll } from 'bun:test';
import { JWTUtils, type JWTPayload } from '../../src/utils/jwt.js';
import type { User } from '../../src/types/user.js';

describe('JWTUtils', () => {
  const mockUser: Pick<User, 'id' | 'email' | 'role'> = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'developer',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const result = await JWTUtils.generateToken(mockUser);
      
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3); // JWT has 3 parts
      expect(result.expiresIn).toBeDefined();
    });

    it('should include user data in token payload', async () => {
      const result = await JWTUtils.generateToken(mockUser);
      const decoded = JWTUtils.decodeToken(result.token);
      
      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(mockUser.id);
      expect(decoded!.email).toBe(mockUser.email);
      expect(decoded!.role).toBe(mockUser.role);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const { token } = await JWTUtils.generateToken(mockUser);
      const payload = await JWTUtils.verifyToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(JWTUtils.verifyToken(invalidToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error for malformed token', async () => {
      const malformedToken = 'not-a-jwt-token';
      
      await expect(JWTUtils.verifyToken(malformedToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error for empty token', async () => {
      await expect(JWTUtils.verifyToken('')).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', async () => {
      const { token } = await JWTUtils.generateToken(mockUser);
      const decoded = JWTUtils.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(mockUser.id);
      expect(decoded!.email).toBe(mockUser.email);
      expect(decoded!.role).toBe(mockUser.role);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token';
      const decoded = JWTUtils.decodeToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not-a-jwt';
      const decoded = JWTUtils.decodeToken(malformedToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', async () => {
      const { token } = await JWTUtils.generateToken(mockUser);
      const isExpired = JWTUtils.isTokenExpired(token);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const isExpired = JWTUtils.isTokenExpired(invalidToken);
      
      expect(isExpired).toBe(true);
    });

    it('should return true for malformed token', () => {
      const malformedToken = 'not-a-jwt';
      const isExpired = JWTUtils.isTokenExpired(malformedToken);
      
      expect(isExpired).toBe(true);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;
      
      const extracted = JWTUtils.extractTokenFromHeader(authHeader);
      
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(undefined);
      
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted = JWTUtils.extractTokenFromHeader('InvalidHeader token');
      
      expect(extracted).toBeNull();
    });

    it('should return null for header without token', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Bearer');
      
      expect(extracted).toBeNull();
    });

    it('should return null for header with extra parts', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Bearer token extra');
      
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = JWTUtils.extractTokenFromHeader('');
      
      expect(extracted).toBeNull();
    });
  });
});