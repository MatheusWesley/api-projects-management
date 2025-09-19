import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initializeDatabase } from '../config/database.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { AuthService } from '../services/AuthService.js';
import { createAuthRoutes } from '../controllers/authController.js';
import { config } from '../config/env.js';

/**
 * Example of how to set up the authentication routes in an Elysia app
 * This demonstrates the complete wiring of dependencies
 */
export function createAuthApp() {
  // Initialize database
  const database = initializeDatabase({
    filename: config.database.filename,
    verbose: config.database.verbose
  });

  // Initialize repositories
  const userRepository = new UserRepository(database);

  // Initialize services
  const authService = new AuthService(userRepository);

  // Create auth routes
  const authRoutes = createAuthRoutes(authService);

  // Create and configure Elysia app
  const app = new Elysia()
    .use(cors())
    .get('/', () => 'Project Management API - Authentication Example')
    .get('/health', () => ({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      features: ['authentication']
    }))
    .use(authRoutes);

  return app;
}

// Example usage (commented out to avoid conflicts)
/*
const app = createAuthApp();

app.listen(3001, () => {
  console.log('Auth API running on http://localhost:3001');
  console.log('Available endpoints:');
  console.log('  POST /auth/register - Register new user');
  console.log('  POST /auth/login - Login user');
});
*/