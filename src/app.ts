import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { initializeDatabase } from './config/database.js'
import { config } from './config/env.js'
// Import controllers
import { createAuthRoutes } from './controllers/authController.js'
import { createBoardRoutes } from './controllers/boardController.js'
import { createProjectRoutes } from './controllers/projectController.js'
import { createWorkItemRoutes } from './controllers/workItemController.js'
import { errorHandlerPlugin } from './middleware/errorHandler.js'
import { createApiRateLimit } from './middleware/rateLimit.js'
import { ProjectRepository } from './repositories/ProjectRepository.js'
// Import repositories
import { UserRepository } from './repositories/UserRepository.js'
import { WorkItemRepository } from './repositories/WorkItemRepository.js'
// Import services
import { AuthService } from './services/AuthService.js'
import { ProjectService } from './services/ProjectService.js'
import { WorkItemService } from './services/WorkItemService.js'

// Initialize database
const db = initializeDatabase({
	filename: config.database.filename,
	verbose: config.nodeEnv === 'development',
})

// Initialize repositories
const userRepository = new UserRepository(db)
const projectRepository = new ProjectRepository(db)
const workItemRepository = new WorkItemRepository(db)

// Initialize services
const authService = new AuthService(userRepository)
const projectService = new ProjectService(projectRepository)
const workItemService = new WorkItemService(workItemRepository, projectService)

// Request logging middleware
const requestLogger = new Elysia({ name: 'request-logger' })
	.onRequest(({ request, set }) => {
		const timestamp = new Date().toISOString()
		const method = request.method
		const url = new URL(request.url).pathname

		console.log(`[${timestamp}] ${method} ${url}`)

		// Add request ID for tracing
		set.headers['x-request-id'] = crypto.randomUUID()
	})
	.onAfterHandle(({ request, set }) => {
		const timestamp = new Date().toISOString()
		const method = request.method
		const url = new URL(request.url).pathname
		const status = set.status || 200

		console.log(`[${timestamp}] ${method} ${url} - ${status}`)
	})

// Create application
const app = new Elysia({ name: 'project-management-api' })
	// Configure CORS
	.use(
		cors({
			origin: config.nodeEnv === 'development' ? true : false,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
		}),
	)

	// Add Swagger documentation
	.use(
		swagger({
			documentation: {
				info: {
					title: 'Project Management API',
					description:
						'A comprehensive project management API built with Bun and Elysia',
					version: '1.0.0',
				},
				tags: [
					{
						name: 'Authentication',
						description: 'User authentication endpoints',
					},
					{ name: 'Projects', description: 'Project management endpoints' },
					{ name: 'Work Items', description: 'Work item management endpoints' },
					{ name: 'Boards', description: 'Kanban board and backlog endpoints' },
				],
				servers: [
					{
						url:
							config.nodeEnv === 'development'
								? `http://localhost:${config.port || 3001}`
								: 'https://api.example.com',
						description:
							config.nodeEnv === 'development'
								? 'Development server'
								: 'Production server',
					},
				],
			},
		}),
	)

	// Add request logging
	.use(requestLogger)

	// Add rate limiting (skip in test environment)
	.use(config.nodeEnv !== 'test' ? createApiRateLimit() : new Elysia())

	// Add global error handling
	.use(errorHandlerPlugin)

	// Health check and root endpoints
	.get(
		'/',
		() => ({
			name: 'Project Management API',
			version: '1.0.0',
			status: 'running',
			timestamp: new Date().toISOString(),
			environment: config.nodeEnv,
		}),
		{
			detail: {
				summary: 'API Information',
				description: 'Get basic information about the API',
				tags: ['General'],
			},
		},
	)

	.get(
		'/health',
		() => ({
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			environment: config.nodeEnv,
		}),
		{
			detail: {
				summary: 'Health Check',
				description: 'Check API health status and system information',
				tags: ['General'],
			},
		},
	)

	// Register route controllers
	.use(createAuthRoutes(authService))
	.use(createProjectRoutes(projectService))
	.use(createWorkItemRoutes(workItemService))
	.use(createBoardRoutes(workItemService))

	// Start server
	.listen({
		port: config.port || 3001,
		hostname: '0.0.0.0',
	})

console.log(`🚀 Project Management API is running!`)
console.log(`📍 Server: http://${app.server?.hostname}:${app.server?.port}`)
console.log(
	`📚 Documentation: http://${app.server?.hostname}:${app.server?.port}/swagger`,
)
console.log(
	`🏥 Health Check: http://${app.server?.hostname}:${app.server?.port}/health`,
)
console.log(`🌍 Environment: ${config.nodeEnv}`)

export default app
