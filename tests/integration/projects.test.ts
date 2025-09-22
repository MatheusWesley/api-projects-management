import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Elysia } from 'elysia'
import { ProjectController } from '../../src/controllers/projectController.js'
import { ProjectService } from '../../src/services/ProjectService.js'
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js'
import { UserRepository } from '../../src/repositories/UserRepository.js'
import { AuthService } from '../../src/services/AuthService.js'
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js'
import { MockDatabase } from '../repositories/mock-database.js'
import type {
	IProjectRepository,
	IUserRepository,
} from '../../src/types/repositories.js'
import type { IProjectService, IAuthService } from '../../src/types/services.js'
import type { User } from '../../src/types/user.js'

describe('Project Integration Tests', () => {
	let app: Elysia
	let projectService: IProjectService
	let authService: IAuthService
	let projectRepository: IProjectRepository
	let userRepository: IUserRepository
	let mockDb: MockDatabase
	let testUser: User
	let authToken: string

	beforeEach(async () => {
		// Setup mock database and repositories
		mockDb = new MockDatabase()
		userRepository = new UserRepository(mockDb as any)
		projectRepository = new ProjectRepository(mockDb as any)
		authService = new AuthService(userRepository)
		projectService = new ProjectService(projectRepository)

		// Create test app with project routes and error handler
		const projectController = new ProjectController(projectService)
		app = new Elysia()
			.use(errorHandlerPlugin)
			.use(projectController.createRoutes())

		// Create a test user and get auth token
		testUser = await authService.register({
			email: 'test@example.com',
			name: 'Test User',
			password: 'Password123!',
			role: 'developer',
		})

		const loginResult = await authService.login(
			'test@example.com',
			'Password123!',
		)
		authToken = loginResult.token
	})

	afterEach(() => {
		mockDb.close()
	})

	describe('GET /projects', () => {
		it('should return empty list when user has no projects', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.projects).toEqual([])
			expect(result.message).toBe('Projects retrieved successfully')
		})

		it('should return user projects when they exist', async () => {
			// Create test projects
			const project1 = await projectService.createProject(
				{
					name: 'Project 1',
					description: 'First project',
				},
				testUser.id,
			)

			const project2 = await projectService.createProject(
				{
					name: 'Project 2',
					description: 'Second project',
				},
				testUser.id,
			)

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.projects).toHaveLength(2)
			expect(result.data.projects[0].name).toBe('Project 2') // Most recent first
			expect(result.data.projects[1].name).toBe('Project 1')
		})

		it('should return 401 when no auth token provided', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'GET',
				}),
			)

			expect(response.status).toBe(401)
		})

		it('should return 401 when invalid auth token provided', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'GET',
					headers: {
						Authorization: 'Bearer invalid-token',
					},
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('POST /projects', () => {
		it('should create project successfully with valid data', async () => {
			const projectData = {
				name: 'New Project',
				description: 'A new project description',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(201)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.project.name).toBe(projectData.name)
			expect(result.data.project.description).toBe(projectData.description)
			expect(result.data.project.ownerId).toBe(testUser.id)
			expect(result.data.project.status).toBe('active')
			expect(result.data.project.id).toBeDefined()
			expect(result.message).toBe('Project created successfully')
		})

		it('should create project successfully without description', async () => {
			const projectData = {
				name: 'Project Without Description',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(201)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.project.name).toBe(projectData.name)
			expect(result.data.project.description).toBe('')
		})

		it('should return 422 for missing name', async () => {
			const projectData = {
				description: 'Project without name',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 422 for empty name', async () => {
			const projectData = {
				name: '',
				description: 'Project with empty name',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 422 for name too long', async () => {
			const projectData = {
				name: 'a'.repeat(201), // Exceeds 200 character limit
				description: 'Project with long name',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 422 for description too long', async () => {
			const projectData = {
				name: 'Valid Project Name',
				description: 'a'.repeat(1001), // Exceeds 1000 character limit
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 401 when no auth token provided', async () => {
			const projectData = {
				name: 'Unauthorized Project',
				description: 'This should fail',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('GET /projects/:id', () => {
		let testProject: any

		beforeEach(async () => {
			testProject = await projectService.createProject(
				{
					name: 'Test Project',
					description: 'Test project for GET tests',
				},
				testUser.id,
			)
		})

		it('should return project successfully when user owns it', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.project.id).toBe(testProject.id)
			expect(result.data.project.name).toBe(testProject.name)
			expect(result.data.project.description).toBe(testProject.description)
			expect(result.data.project.ownerId).toBe(testUser.id)
			expect(result.message).toBe('Project retrieved successfully')
		})

		it('should return 404 for non-existent project', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects/non-existent-id', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(404)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('NOT_FOUND')
		})

		it('should return 403 when user does not own project', async () => {
			// Create another user
			const anotherUser = await authService.register({
				email: 'another@example.com',
				name: 'Another User',
				password: 'Password123!',
				role: 'developer',
			})

			// Create project owned by another user
			const anotherProject = await projectService.createProject(
				{
					name: 'Another Project',
					description: 'Project owned by another user',
				},
				anotherUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/projects/${anotherProject.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(403)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('FORBIDDEN')
		})

		it('should return 401 when no auth token provided', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'GET',
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('PUT /projects/:id', () => {
		let testProject: any

		beforeEach(async () => {
			testProject = await projectService.createProject(
				{
					name: 'Test Project',
					description: 'Test project for PUT tests',
				},
				testUser.id,
			)
		})

		it('should update project successfully with valid data', async () => {
			const updateData = {
				name: 'Updated Project Name',
				description: 'Updated description',
				status: 'completed' as const,
			}

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.project.id).toBe(testProject.id)
			expect(result.data.project.name).toBe(updateData.name)
			expect(result.data.project.description).toBe(updateData.description)
			expect(result.data.project.status).toBe(updateData.status)
			expect(result.message).toBe('Project updated successfully')
		})

		it('should update project with partial data', async () => {
			const updateData = {
				name: 'Partially Updated Name',
			}

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.project.name).toBe(updateData.name)
			expect(result.data.project.description).toBe(testProject.description) // Should remain unchanged
		})

		it('should return 404 for non-existent project', async () => {
			const updateData = {
				name: 'Updated Name',
			}

			const response = await app.handle(
				new Request('http://localhost/projects/non-existent-id', {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(404)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('NOT_FOUND')
		})

		it('should return 403 when user does not own project', async () => {
			// Create another user
			const anotherUser = await authService.register({
				email: 'another2@example.com',
				name: 'Another User 2',
				password: 'Password123!',
				role: 'developer',
			})

			// Create project owned by another user
			const anotherProject = await projectService.createProject(
				{
					name: 'Another Project',
					description: 'Project owned by another user',
				},
				anotherUser.id,
			)

			const updateData = {
				name: 'Trying to update',
			}

			const response = await app.handle(
				new Request(`http://localhost/projects/${anotherProject.id}`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(403)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('FORBIDDEN')
		})

		it('should return 422 for invalid status', async () => {
			const updateData = {
				status: 'invalid-status',
			}

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 422 for name too long', async () => {
			const updateData = {
				name: 'a'.repeat(201), // Exceeds 200 character limit
			}

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 401 when no auth token provided', async () => {
			const updateData = {
				name: 'Unauthorized Update',
			}

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(updateData),
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('DELETE /projects/:id', () => {
		let testProject: any

		beforeEach(async () => {
			testProject = await projectService.createProject(
				{
					name: 'Test Project',
					description: 'Test project for DELETE tests',
				},
				testUser.id,
			)
		})

		it('should delete project successfully when user owns it', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data).toBe(null)
			expect(result.message).toBe('Project deleted successfully')

			// Verify project is actually deleted
			const getResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(getResponse.status).toBe(404)
		})

		it('should return 404 for non-existent project', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects/non-existent-id', {
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(404)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('NOT_FOUND')
		})

		it('should return 403 when user does not own project', async () => {
			// Create another user
			const anotherUser = await authService.register({
				email: 'another3@example.com',
				name: 'Another User 3',
				password: 'Password123!',
				role: 'developer',
			})

			// Create project owned by another user
			const anotherProject = await projectService.createProject(
				{
					name: 'Another Project',
					description: 'Project owned by another user',
				},
				anotherUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/projects/${anotherProject.id}`, {
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(403)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('FORBIDDEN')
		})

		it('should return 401 when no auth token provided', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}`, {
					method: 'DELETE',
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('Response Format Consistency', () => {
		it('should return consistent success response format', async () => {
			const projectData = {
				name: 'Format Test Project',
				description: 'Testing response format',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(projectData),
				}),
			)

			const result = (await response.json()) as any

			// Check response structure
			expect(result).toHaveProperty('success')
			expect(result).toHaveProperty('data')
			expect(result).toHaveProperty('message')
			expect(result.success).toBe(true)
			expect(result.data).toHaveProperty('project')
			expect(result.data.project).toHaveProperty('id')
			expect(result.data.project).toHaveProperty('name')
			expect(result.data.project).toHaveProperty('description')
			expect(result.data.project).toHaveProperty('ownerId')
			expect(result.data.project).toHaveProperty('status')
			expect(result.data.project).toHaveProperty('createdAt')
			expect(result.data.project).toHaveProperty('updatedAt')
		})

		it('should return consistent error response format', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects/non-existent', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			const result = (await response.json()) as any

			// Check error response structure
			expect(result).toHaveProperty('success')
			expect(result).toHaveProperty('error')
			expect(result.success).toBe(false)
			expect(result.error).toHaveProperty('code')
			expect(result.error).toHaveProperty('message')
		})
	})

	describe('Error Handling', () => {
		it('should handle malformed JSON gracefully', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: 'invalid json',
				}),
			)

			expect(response.status).toBe(400)
		})

		it('should handle missing Content-Type header', async () => {
			const projectData = {
				name: 'Test Project',
				description: 'Test description',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
					body: JSON.stringify(projectData),
				}),
			)

			// Should still work or return appropriate error
			expect([201, 400, 415, 422]).toContain(response.status)
		})
	})
})
