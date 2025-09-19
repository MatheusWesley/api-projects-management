import { describe, it, expect, beforeAll } from 'bun:test';
import { Elysia } from 'elysia';
import { 
  authMiddleware, 
  optionalAuthMiddleware, 
  requireRole, 
  requireAdmin, 
  requireManagerOrAdmin,
  extractUserIdFromParams 
} from '../../src/middleware/auth.js';
import { JWTUtils } from '../../src/utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../../src/types/errors.js';

// Helper function to create app with error handling
const createTestApp = (middleware: (app: Elysia) => Elysia, handler: any) => {
  return middleware(new Elysia())
    .get('/test', handler)
    .onError(({ error, set }) => {
      // The status should already be set by the middleware
      if (!set.status || set.status === 200) {
        set.status = 500;
      }
      return { error: { message: error.message || 'Internal server error' } };
    });
};

describe('Authentication Middleware', () => {
  let validToken: string;
  let adminToken: string;
  let managerToken: string;
  let developerToken: string;

  beforeAll(async () => {
    // Generate test tokens
    const developerUser = { id: 'dev-1', email: 'dev@test.com', role: 'developer' };
    const managerUser = { id: 'mgr-1', email: 'mgr@test.com', role: 'manager' };
    const adminUser = { id: 'admin-1', email: 'admin@test.com', role: 'admin' };

    const devResult = await JWTUtils.generateToken(developerUser);
    const mgrResult = await JWTUtils.generateToken(managerUser);
    const adminResult = await JWTUtils.generateToken(adminUser);

    validToken = devResult.token;
    developerToken = devResult.token;
    managerToken = mgrResult.token;
    adminToken = adminResult.token;
  });

  describe('authMiddleware', () => {
    it('should allow access with valid token', async () => {
      const app = createTestApp(authMiddleware, ({ user }) => ({ userId: user.userId, role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${validToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe('dev-1');
      expect(data.role).toBe('developer');
    });

    it('should reject request without token', async () => {
      const app = createTestApp(authMiddleware, ({ user }) => ({ userId: user.userId }));

      const response = await app.handle(
        new Request('http://localhost/test')
      );

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const app = createTestApp(authMiddleware, ({ user }) => ({ userId: user.userId }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: 'Bearer invalid-token' }
        })
      );

      expect(response.status).toBe(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      const app = createTestApp(authMiddleware, ({ user }) => ({ userId: user.userId }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: 'InvalidFormat token' }
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should provide user data when token is valid', async () => {
      const app = createTestApp(optionalAuthMiddleware, ({ user }) => ({ 
        authenticated: !!user, 
        userId: user?.userId 
      }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${validToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(true);
      expect(data.userId).toBe('dev-1');
    });

    it('should allow access without token', async () => {
      const app = createTestApp(optionalAuthMiddleware, ({ user }) => ({ 
        authenticated: !!user, 
        userId: user?.userId 
      }));

      const response = await app.handle(
        new Request('http://localhost/test')
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
      expect(data.userId).toBeUndefined();
    });

    it('should not provide user data for invalid token', async () => {
      const app = createTestApp(optionalAuthMiddleware, ({ user }) => ({ 
        authenticated: !!user, 
        userId: user?.userId 
      }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: 'Bearer invalid-token' }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
      expect(data.userId).toBeUndefined();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', async () => {
      const app = createTestApp(requireRole(['developer', 'manager']), ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${developerToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('developer');
    });

    it('should deny access for user without required role', async () => {
      const app = createTestApp(requireRole(['admin']), ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${developerToken}` }
        })
      );

      expect(response.status).toBe(403);
    });

    it('should allow access for multiple valid roles', async () => {
      const managerApp = createTestApp(requireRole(['manager', 'admin']), ({ user }) => ({ role: user.role }));
      const adminApp = createTestApp(requireRole(['manager', 'admin']), ({ user }) => ({ role: user.role }));

      const managerResponse = await managerApp.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${managerToken}` }
        })
      );

      const adminResponse = await adminApp.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );

      expect(managerResponse.status).toBe(200);
      expect(adminResponse.status).toBe(200);
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', async () => {
      const app = createTestApp(requireAdmin, ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('admin');
    });

    it('should deny access for non-admin user', async () => {
      const app = createTestApp(requireAdmin, ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${developerToken}` }
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('requireManagerOrAdmin', () => {
    it('should allow access for manager user', async () => {
      const app = createTestApp(requireManagerOrAdmin, ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${managerToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('manager');
    });

    it('should allow access for admin user', async () => {
      const app = createTestApp(requireManagerOrAdmin, ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('admin');
    });

    it('should deny access for developer user', async () => {
      const app = createTestApp(requireManagerOrAdmin, ({ user }) => ({ role: user.role }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${developerToken}` }
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('extractUserIdFromParams', () => {
    it('should extract userId from params', () => {
      const context = { params: { userId: 'user-123' } } as any;
      const userId = extractUserIdFromParams(context);
      
      expect(userId).toBe('user-123');
    });

    it('should extract id from params when userId is not present', () => {
      const context = { params: { id: 'user-456' } } as any;
      const userId = extractUserIdFromParams(context);
      
      expect(userId).toBe('user-456');
    });

    it('should return undefined when no relevant params exist', () => {
      const context = { params: { otherId: 'other-123' } } as any;
      const userId = extractUserIdFromParams(context);
      
      expect(userId).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const context = {} as any;
      const userId = extractUserIdFromParams(context);
      
      expect(userId).toBeUndefined();
    });
  });
});