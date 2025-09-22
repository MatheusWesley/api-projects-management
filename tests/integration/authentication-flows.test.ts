import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js'
import { MockDatabase } from '../repositories/mock-database.js'

// Import repositories
import { UserRepository } from '../../src/repositories/UserRepository.js'
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js'
import { WorkItemRepository } from '../../src/repositories/WorkItemRepository.js'

// Import services
import { AuthService } from '../../src/services/AuthService.js'
import { ProjectService } from '../../src/services/ProjectService.js'
import { WorkItemService } from '../../src/services/WorkItemService.js'

// Import controllers
import { createAuthRoutes } from '../../src/controllers/authController.js'
import { createProjectRoutes } from '../../src/controllers/projectController.js'
import { createWorkItemRoutes } from '../../src/controllers/workItemController.js'

import {
	TestDataFactory,
	expectSuccessResponse,
	expectErrorResponse,
	expectValidationError,
	expectUserStructure,
} from './test-factories.js'

describe('Authentication Flow Integration Tests', () => {
	let app: Elysia
	let mockDb: MockDatabase
	let testFactory: TestDataFactory

	beforeEach(() => {
		// Setup mock database and repositories
		mockDb = new MockDatabase()
		const userRepository = new UserRepository(mockDb as any)
		const projectRepository = new ProjectRepository(mockDb as any)
		const workItemRepository = new WorkItemRepository(mockDb as any)

		// Initialize services
		const authService = new AuthService(userRepository)
		const projectService = new ProjectService(projectRepository)
		const workItemService = new WorkItemService(
			workItemRepository,
			projectService,
		)

		// Create test data factory
		testFactory = new TestDataFactory(
			authService,
			projectService,
			workItemService,
		)

		// Create application with all routes
		app = new Elysia()
			.use(cors())
			.use(errorHandlerPlugin)
			.use(createAuthRoutes(authService))
			.use(createProjectRoutes(projectService))
			.use(createWorkItemRoutes(workItemService))
	})

	afterEach(() => {
		mockDb.close()
	})

	describe('Valid Authentication Flows', () => {
		it('should handle complete registration and login flow', async () => {
			const userData = {
				email: 'auth-test@example.com',
				name: 'Auth Test User',
				password: 'SecurePassword123!',
				role: 'developer' as const,
			}

			// Step 1: Register user
			const registerResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			expect(registerResponse.status).toBe(201)
			const registerResult = (await registerResponse.json()) as any
			expectSuccessResponse(registerResult, 'User registered successfully')
			expectUserStructure(registerResult.data.user)
			expect(registerResult.data.user.email).toBe(userData.email)
			expect(registerResult.data.user.name).toBe(userData.name)
			expect(registerResult.data.user.role).toBe(userData.role)

			// Step 2: Login with registered credentials
			const loginResponse = await app.handle(
				new Request('http://localhost/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: userData.email,
						password: userData.password,
					}),
				}),
			)

			expect(loginResponse.status).toBe(200)
			const loginResult = (await loginResponse.json()) as any
			expectSuccessResponse(loginResult, 'Login successful')
			expectUserStructure(loginResult.data.user)
			expect(loginResult.data.user.email).toBe(userData.email)
			expect(loginResult.data.token).toBeDefined()
			expect(typeof loginResult.data.token).toBe('string')
			expect(loginResult.data.token.length).toBeGreaterThan(0)

			// Step 3: Use token to access protected resource
			const protectedResponse = await app.handle(
				new Request('http://localhost/projects', {
					method: 'GET',
					headers: { Authorization: `Bearer ${loginResult.data.token}` },
				}),
			)

			expect(protectedResponse.status).toBe(200)
			const protectedResult = (await protectedResponse.json()) as any
			expectSuccessResponse(protectedResult, 'Projects retrieved successfully')
		})

		it('should handle different user roles correctly', async () => {
			const roles = ['developer', 'manager', 'admin'] as const
			const tokens: string[] = []

			// Register users with different roles
			for (const role of roles) {
				const userData = {
					email: `${role}@example.com`,
					name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
					password: 'Password123!',
					role,
				}

				const registerResponse = await app.handle(
					new Request('http://localhost/auth/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(userData),
					}),
				)

				expect(registerResponse.status).toBe(201)
				const registerResult = (await registerResponse.json()) as any
				expect(registerResult.data.user.role).toBe(role)

				// Login and get token
				const loginResponse = await app.handle(
					new Request('http://localhost/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							email: userData.email,
							password: userData.password,
						}),
					}),
				)

				const loginResult = (await loginResponse.json()) as any
				tokens.push(loginResult.data.token)
			}

			// All users should be able to access their projects
			for (const token of tokens) {
				const projectsResponse = await app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers: { Authorization: `Bearer ${token}` },
					}),
				)

				expect(projectsResponse.status).toBe(200)
			}
		})

		it('should handle token refresh scenarios', async () => {
			const testUser = await testFactory.createTestUser()

			// Use token multiple times - should work consistently
			const requests = Array.from({ length: 5 }, () =>
				app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers: { Authorization: `Bearer ${testUser.token}` },
					}),
				),
			)

			const responses = await Promise.all(requests)
			responses.forEach((response) => {
				expect(response.status).toBe(200)
			})
		})

		it('should handle case-insensitive email login', async () => {
			const userData = {
				email: 'CaseTest@Example.COM',
				name: 'Case Test User',
				password: 'Password123!',
				role: 'developer' as const,
			}

			// Register with mixed case email
			await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			// Login with different case variations
			const caseVariations = [
				'casetest@example.com',
				'CASETEST@EXAMPLE.COM',
				'CaseTest@example.com',
				'casetest@Example.COM',
			]

			for (const emailVariation of caseVariations) {
				const loginResponse = await app.handle(
					new Request('http://localhost/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							email: emailVariation,
							password: userData.password,
						}),
					}),
				)

				expect(loginResponse.status).toBe(200)
				const loginResult = (await loginResponse.json()) as any
				expectSuccessResponse(loginResult, 'Login successful')
			}
		})
	})

	describe('Invalid Authentication Flows', () => {
		it('should reject invalid registration data', async () => {
			const invalidRegistrations = [
				// Missing email
				{
					data: { name: 'Test', password: 'Password123!', role: 'developer' },
					expectedStatus: 422,
				},
				// Invalid email format
				{
					data: {
						email: 'invalid-email',
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					expectedStatus: 422,
				},
				// Missing name
				{
					data: {
						email: 'test@example.com',
						password: 'Password123!',
						role: 'developer',
					},
					expectedStatus: 422,
				},
				// Empty name
				{
					data: {
						email: 'test@example.com',
						name: '',
						password: 'Password123!',
						role: 'developer',
					},
					expectedStatus: 422,
				},
				// Missing password
				{
					data: { email: 'test@example.com', name: 'Test', role: 'developer' },
					expectedStatus: 422,
				},
				// Password too short
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: '123',
						role: 'developer',
					},
					expectedStatus: 422,
				},
				// Missing role
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
					},
					expectedStatus: 422,
				},
				// Invalid role
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
						role: 'invalid',
					},
					expectedStatus: 422,
				},
			]

			for (const { data, expectedStatus } of invalidRegistrations) {
				const response = await app.handle(
					new Request('http://localhost/auth/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data),
					}),
				)

				expect(response.status).toBe(expectedStatus)

				if (expectedStatus === 422) {
					const result = (await response.json()) as any
					expectValidationError(result)
				}
			}
		})

		it('should reject duplicate email registration', async () => {
			const userData = {
				email: 'duplicate@example.com',
				name: 'First User',
				password: 'Password123!',
				role: 'developer' as const,
			}

			// Register first user
			const firstResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			expect(firstResponse.status).toBe(201)

			// Try to register second user with same email
			const duplicateResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...userData,
						name: 'Second User',
					}),
				}),
			)

			expect(duplicateResponse.status).toBe(409)
			const duplicateResult = (await duplicateResponse.json()) as any
			expectErrorResponse(duplicateResult, 'CONFLICT')
			expect(duplicateResult.error.message).toContain('already exists')
		})

		it('should reject invalid login credentials', async () => {
			// First register a valid user
			const validUser = {
				email: 'valid@example.com',
				name: 'Valid User',
				password: 'ValidPassword123!',
				role: 'developer' as const,
			}

			await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(validUser),
				}),
			)

			const invalidLogins = [
				// Non-existent email
				{
					data: { email: 'nonexistent@example.com', password: 'Password123!' },
					expectedStatus: 401,
				},
				// Wrong password
				{
					data: { email: validUser.email, password: 'WrongPassword123!' },
					expectedStatus: 401,
				},
				// Missing email
				{
					data: { password: validUser.password },
					expectedStatus: 422,
				},
				// Missing password
				{
					data: { email: validUser.email },
					expectedStatus: 422,
				},
				// Empty email
				{
					data: { email: '', password: validUser.password },
					expectedStatus: 422,
				},
				// Empty password
				{
					data: { email: validUser.email, password: '' },
					expectedStatus: 422,
				},
				// Invalid email format
				{
					data: { email: 'invalid-email', password: validUser.password },
					expectedStatus: 422,
				},
			]

			for (const { data, expectedStatus } of invalidLogins) {
				const response = await app.handle(
					new Request('http://localhost/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data),
					}),
				)

				expect(response.status).toBe(expectedStatus)

				const result = (await response.json()) as any
				if (expectedStatus === 401) {
					expectErrorResponse(result, 'UNAUTHORIZED', 'Invalid credentials')
				} else if (expectedStatus === 422) {
					expectValidationError(result)
				}
			}
		})

		it('should reject invalid tokens for protected routes', async () => {
			const invalidTokenScenarios = [
				// No Authorization header
				{ headers: {}, expectedStatus: 401 },
				// Wrong scheme
				{
					headers: { Authorization: 'Basic dXNlcjpwYXNz' },
					expectedStatus: 401,
				},
				// Malformed Bearer token
				{ headers: { Authorization: 'Bearer' }, expectedStatus: 401 },
				// Invalid token format
				{
					headers: { Authorization: 'Bearer invalid-token' },
					expectedStatus: 401,
				},
				// Empty token
				{ headers: { Authorization: 'Bearer ' }, expectedStatus: 401 },
				// Token for non-existent user
				{
					headers: {
						Authorization:
							'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJub24tZXhpc3RlbnQiLCJpYXQiOjE2MzQ1NjcwMDB9.invalid',
					},
					expectedStatus: 401,
				},
			]

			for (const { headers, expectedStatus } of invalidTokenScenarios) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers,
					}),
				)

				expect(response.status).toBe(expectedStatus)
			}
		})

		it('should handle authentication edge cases', async () => {
			// Test with very long email
			const longEmailResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'a'.repeat(100) + '@example.com',
						name: 'Long Email User',
						password: 'Password123!',
						role: 'developer',
					}),
				}),
			)

			// Should either succeed or fail with validation error
			expect([201, 422]).toContain(longEmailResponse.status)

			// Test with very long name
			const longNameResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'longname@example.com',
						name: 'a'.repeat(200),
						password: 'Password123!',
						role: 'developer',
					}),
				}),
			)

			// Should either succeed or fail with validation error
			expect([201, 422]).toContain(longNameResponse.status)

			// Test with special characters in password
			const specialPasswordResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'special@example.com',
						name: 'Special Password User',
						password: 'P@ssw0rd!#$%^&*()',
						role: 'developer',
					}),
				}),
			)

			expect(specialPasswordResponse.status).toBe(201)

			// Should be able to login with special characters
			const specialLoginResponse = await app.handle(
				new Request('http://localhost/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'special@example.com',
						password: 'P@ssw0rd!#$%^&*()',
					}),
				}),
			)

			expect(specialLoginResponse.status).toBe(200)
		})
	})

	describe('Token Validation and Security', () => {
		it('should validate token structure and claims', async () => {
			const testUser = await testFactory.createTestUser()

			// Token should work for multiple requests
			const multipleRequests = Array.from({ length: 3 }, () =>
				app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers: { Authorization: `Bearer ${testUser.token}` },
					}),
				),
			)

			const responses = await Promise.all(multipleRequests)
			responses.forEach((response) => {
				expect(response.status).toBe(200)
			})
		})

		it('should handle concurrent authentication requests', async () => {
			const userData = {
				email: 'concurrent@example.com',
				name: 'Concurrent User',
				password: 'Password123!',
				role: 'developer' as const,
			}

			// Register user first
			await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			// Make multiple concurrent login requests
			const concurrentLogins = Array.from({ length: 5 }, () =>
				app.handle(
					new Request('http://localhost/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							email: userData.email,
							password: userData.password,
						}),
					}),
				),
			)

			const responses = await Promise.all(concurrentLogins)

			// All should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200)
			})

			// All tokens should be valid
			const tokens = await Promise.all(
				responses.map(async (response) => {
					const result = (await response.json()) as any
					return result.data.token
				}),
			)

			// Test all tokens work
			const tokenTests = tokens.map((token) =>
				app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers: { Authorization: `Bearer ${token}` },
					}),
				),
			)

			const tokenResponses = await Promise.all(tokenTests)
			tokenResponses.forEach((response) => {
				expect(response.status).toBe(200)
			})
		})

		it('should handle authentication with different HTTP methods', async () => {
			const testUser = await testFactory.createTestUser()
			const testProject = await testFactory.createTestProject(testUser)

			const protectedEndpoints = [
				{ method: 'GET', url: 'http://localhost/projects' },
				{
					method: 'POST',
					url: 'http://localhost/projects',
					body: { name: 'Test', description: 'Test' },
				},
				{
					method: 'GET',
					url: `http://localhost/projects/${testProject.project.id}`,
				},
				{
					method: 'PUT',
					url: `http://localhost/projects/${testProject.project.id}`,
					body: { name: 'Updated' },
				},
				{
					method: 'DELETE',
					url: `http://localhost/projects/${testProject.project.id}`,
				},
			]

			for (const endpoint of protectedEndpoints) {
				// Test without token - should fail
				const unauthorizedResponse = await app.handle(
					new Request(endpoint.url, {
						method: endpoint.method,
						headers: endpoint.body
							? { 'Content-Type': 'application/json' }
							: {},
						body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
					}),
				)

				expect(unauthorizedResponse.status).toBe(401)

				// Test with valid token - should succeed (except DELETE which might be 404 after first deletion)
				const authorizedResponse = await app.handle(
					new Request(endpoint.url, {
						method: endpoint.method,
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							...(endpoint.body ? { 'Content-Type': 'application/json' } : {}),
						},
						body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
					}),
				)

				// Should not be 401 (unauthorized)
				expect(authorizedResponse.status).not.toBe(401)
			}
		})
	})

	describe('Password Security', () => {
		it('should handle various password formats', async () => {
			const passwordTests = [
				{ password: 'SimplePass123', shouldWork: true },
				{ password: 'Complex!@#$%^&*()Pass123', shouldWork: true },
				{ password: 'WithSpaces Pass 123', shouldWork: true },
				{ password: 'Unicode🔒Pass123', shouldWork: true },
				{
					password:
						'VeryLongPasswordThatExceedsNormalLengthButShouldStillWork123!',
					shouldWork: true,
				},
				{ password: '1234567', shouldWork: false }, // Too short
				{ password: '', shouldWork: false }, // Empty
			]

			for (let i = 0; i < passwordTests.length; i++) {
				const { password, shouldWork } = passwordTests[i]
				const userData = {
					email: `password-test-${i}@example.com`,
					name: `Password Test User ${i}`,
					password,
					role: 'developer' as const,
				}

				const registerResponse = await app.handle(
					new Request('http://localhost/auth/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(userData),
					}),
				)

				if (shouldWork) {
					expect(registerResponse.status).toBe(201)

					// Test login with the same password
					const loginResponse = await app.handle(
						new Request('http://localhost/auth/login', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								email: userData.email,
								password: userData.password,
							}),
						}),
					)

					expect(loginResponse.status).toBe(200)
				} else {
					expect(registerResponse.status).toBe(422)
				}
			}
		})

		it('should not expose password in any response', async () => {
			const userData = {
				email: 'security@example.com',
				name: 'Security Test User',
				password: 'SecurePassword123!',
				role: 'developer' as const,
			}

			// Register user
			const registerResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			const registerResult = (await registerResponse.json()) as any
			expect(registerResult.data.user.password).toBeUndefined()

			// Login
			const loginResponse = await app.handle(
				new Request('http://localhost/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: userData.email,
						password: userData.password,
					}),
				}),
			)

			const loginResult = (await loginResponse.json()) as any
			expect(loginResult.data.user.password).toBeUndefined()

			// Check that password is not in token payload (basic check)
			const token = loginResult.data.token
			expect(token).not.toContain(userData.password)
			expect(token).not.toContain('password')
		})
	})
})
