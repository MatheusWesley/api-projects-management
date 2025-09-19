import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js';
import { MockDatabase } from '../repositories/mock-database.js';

// Import repositories
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js';

// Import services
import { AuthService } from '../../src/services/AuthService.js';
import { ProjectService } from '../../src/services/ProjectService.js';

// Import controllers
import { createAuthRoutes } from '../../src/controllers/authController.js';
import { createProjectRoutes } from '../../src/controllers/projectController.js';

describe('App Integration Tests', () => {
  it('should create app with all routes integrated', async () => {
    // Setup mock database and repositories
    const mockDb = new MockDatabase();
    const userRepository = new UserRepository(mockDb as any);
    const projectRepository = new ProjectRepository(mockDb as any);

    // Initialize services
    const authService = new AuthService(userRepository);
    const projectService = new ProjectService(projectRepository);

    // Create application with all routes
    const app = new Elysia()
      .use(cors())
      .use(errorHandlerPlugin)
      .get('/', () => 'Project Management API')
      .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
      .use(createAuthRoutes(authService))
      .use(createProjectRoutes(projectService));

    // Test health endpoint
    const healthResponse = await app.handle(
      new Request('http://localhost/health', {
        method: 'GET'
      })
    );

    expect(healthResponse.status).toBe(200);
    const healthData = await healthResponse.json() as any;
    expect(healthData.status).toBe('ok');
    expect(healthData.timestamp).toBeDefined();

    // Test root endpoint
    const rootResponse = await app.handle(
      new Request('http://localhost/', {
        method: 'GET'
      })
    );

    expect(rootResponse.status).toBe(200);
    const rootText = await rootResponse.text();
    expect(rootText).toBe('Project Management API');

    // Test that project routes are accessible (should return 401 without auth)
    const projectsResponse = await app.handle(
      new Request('http://localhost/projects', {
        method: 'GET'
      })
    );

    expect(projectsResponse.status).toBe(401);

    // Test that auth routes are accessible
    const loginResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        })
      })
    );

    // Should return 401 for invalid credentials, not 404 (route exists)
    expect(loginResponse.status).toBe(401);

    mockDb.close();
  });
});