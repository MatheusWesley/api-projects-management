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
import { createBoardRoutes } from '../../src/controllers/boardController.js'

import {
	TestDataFactory,
	expectErrorResponse,
	expectValidationError,
} from './test-factories.js'

describe('Error Scenarios and Edge Cases Integration Tests', () => {
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
			.use(createBoardRoutes(workItemService))
	})

	afterEach(() => {
		mockDb.close()
	})

	describe('HTTP Protocol and Content Handling Errors', () => {
		it('should handle malformed JSON gracefully', async () => {
			const testUser = await testFactory.createTestUser()

			const malformedJsonScenarios = [
				'{ invalid json }',
				'{ "name": "test", }', // Trailing comma
				'{ "name": }', // Missing value
				'{ name: "test" }', // Unquoted key
				'{ "name": "test" "description": "test" }', // Missing comma
				'not json at all',
				'{ "name": "test", "nested": { invalid } }',
				'{ "name": "test\\', // Unterminated string
			]

			for (const malformedJson of malformedJsonScenarios) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: malformedJson,
					}),
				)

				expect(response.status).toBe(400)
			}
		})

		it('should handle missing and incorrect Content-Type headers', async () => {
			const testUser = await testFactory.createTestUser()
			const validData = JSON.stringify({
				name: 'Test Project',
				description: 'Test',
			})

			const contentTypeScenarios = [
				// Missing Content-Type
				{ headers: {}, expectedStatuses: [201, 400, 415, 422] },
				// Wrong Content-Type
				{
					headers: { 'Content-Type': 'text/plain' },
					expectedStatuses: [201, 400, 415, 422],
				},
				{
					headers: { 'Content-Type': 'application/xml' },
					expectedStatuses: [201, 400, 415, 422],
				},
				{
					headers: { 'Content-Type': 'multipart/form-data' },
					expectedStatuses: [201, 400, 415, 422],
				},
				// Malformed Content-Type
				{
					headers: { 'Content-Type': 'application/' },
					expectedStatuses: [201, 400, 415, 422],
				},
				{
					headers: { 'Content-Type': 'invalid-content-type' },
					expectedStatuses: [201, 400, 415, 422],
				},
			]

			for (const scenario of contentTypeScenarios) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							...scenario.headers,
						},
						body: validData,
					}),
				)

				expect(scenario.expectedStatuses).toContain(response.status)
			}
		})

		it('should handle oversized request bodies', async () => {
			const testUser = await testFactory.createTestUser()

			// Create very large request body
			const largeData = {
				name: 'Test Project',
				description: 'a'.repeat(100000), // Very large description
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUser.token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(largeData),
				}),
			)

			// Should either succeed or fail with appropriate error
			expect([201, 400, 413, 422]).toContain(response.status)
		})

		it('should handle empty request bodies where data is expected', async () => {
			const testUser = await testFactory.createTestUser()

			const emptyBodyScenarios = [
				{
					method: 'POST',
					url: 'http://localhost/projects',
					expectedStatus: 400,
				},
				{
					method: 'POST',
					url: 'http://localhost/auth/register',
					expectedStatus: 400,
				},
				{
					method: 'POST',
					url: 'http://localhost/auth/login',
					expectedStatus: 400,
				},
			]

			for (const scenario of emptyBodyScenarios) {
				const response = await app.handle(
					new Request(scenario.url, {
						method: scenario.method,
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: '',
					}),
				)

				expect([400, 422]).toContain(response.status)
			}
		})

		it('should handle unsupported HTTP methods', async () => {
			const testUser = await testFactory.createTestUser()

			const unsupportedMethods = [
				'PATCH',
				'HEAD',
				'OPTIONS',
				'TRACE',
				'CONNECT',
			]
			const endpoints = [
				'http://localhost/projects',
				'http://localhost/auth/login',
				'http://localhost/auth/register',
			]

			for (const method of unsupportedMethods) {
				for (const endpoint of endpoints) {
					const response = await app.handle(
						new Request(endpoint, {
							method,
							headers: { Authorization: `Bearer ${testUser.token}` },
						}),
					)

					// Should return method not allowed or not found
					expect([404, 405]).toContain(response.status)
				}
			}
		})
	})

	describe('Validation Error Scenarios', () => {
		it('should handle comprehensive validation errors for user registration', async () => {
			const validationScenarios = [
				// Email validation
				{
					data: {
						email: '',
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'email',
				},
				{
					data: {
						email: 'invalid',
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'email',
				},
				{
					data: {
						email: '@example.com',
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'email',
				},
				{
					data: {
						email: 'test@',
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'email',
				},
				{
					data: {
						email: 'test@.com',
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'email',
				},

				// Name validation
				{
					data: {
						email: 'test@example.com',
						name: '',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'name',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'a',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'name',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'a'.repeat(101),
						password: 'Password123!',
						role: 'developer',
					},
					field: 'name',
				},

				// Password validation
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: '',
						role: 'developer',
					},
					field: 'password',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: '1234567',
						role: 'developer',
					},
					field: 'password',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'short',
						role: 'developer',
					},
					field: 'password',
				},

				// Role validation
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
						role: '',
					},
					field: 'role',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
						role: 'invalid',
					},
					field: 'role',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
						role: 'superuser',
					},
					field: 'role',
				},

				// Missing fields
				{
					data: { name: 'Test', password: 'Password123!', role: 'developer' },
					field: 'email',
				},
				{
					data: {
						email: 'test@example.com',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'name',
				},
				{
					data: { email: 'test@example.com', name: 'Test', role: 'developer' },
					field: 'password',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
					},
					field: 'role',
				},

				// Type errors
				{
					data: {
						email: 123,
						name: 'Test',
						password: 'Password123!',
						role: 'developer',
					},
					field: 'email',
				},
				{
					data: {
						email: 'test@example.com',
						name: 123,
						password: 'Password123!',
						role: 'developer',
					},
					field: 'name',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 123,
						role: 'developer',
					},
					field: 'password',
				},
				{
					data: {
						email: 'test@example.com',
						name: 'Test',
						password: 'Password123!',
						role: 123,
					},
					field: 'role',
				},
			]

			for (const scenario of validationScenarios) {
				const response = await app.handle(
					new Request('http://localhost/auth/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(scenario.data),
					}),
				)

				expect(response.status).toBe(422)
				const result = (await response.json()) as any
				expectValidationError(result)
			}
		})

		it('should handle comprehensive validation errors for project creation', async () => {
			const testUser = await testFactory.createTestUser()

			const validationScenarios = [
				// Name validation
				{ data: {}, field: 'name' }, // Missing name
				{ data: { name: '' }, field: 'name' }, // Empty name
				{ data: { name: 'a'.repeat(201) }, field: 'name' }, // Name too long
				{ data: { name: 123 }, field: 'name' }, // Wrong type

				// Description validation
				{
					data: { name: 'Test', description: 'a'.repeat(1001) },
					field: 'description',
				}, // Description too long
				{ data: { name: 'Test', description: 123 }, field: 'description' }, // Wrong type

				// Status validation (for updates)
				{ data: { name: 'Test', status: 'invalid' }, field: 'status' },
				{ data: { name: 'Test', status: 123 }, field: 'status' },
			]

			for (const scenario of validationScenarios) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(scenario.data),
					}),
				)

				expect(response.status).toBe(422)
				const result = (await response.json()) as any
				expectValidationError(result)
			}
		})

		it('should handle comprehensive validation errors for work item creation', async () => {
			const testUser = await testFactory.createTestUser()
			const testProject = await testFactory.createTestProject(testUser)

			const validationScenarios = [
				// Title validation
				{ data: {}, field: 'title' }, // Missing title
				{ data: { title: '' }, field: 'title' }, // Empty title
				{ data: { title: 'a'.repeat(201) }, field: 'title' }, // Title too long
				{ data: { title: 123 }, field: 'title' }, // Wrong type

				// Type validation
				{ data: { title: 'Test' }, field: 'type' }, // Missing type
				{ data: { title: 'Test', type: '' }, field: 'type' }, // Empty type
				{ data: { title: 'Test', type: 'invalid' }, field: 'type' }, // Invalid type
				{ data: { title: 'Test', type: 123 }, field: 'type' }, // Wrong type

				// Description validation
				{
					data: { title: 'Test', type: 'task', description: 'a'.repeat(2001) },
					field: 'description',
				}, // Too long
				{
					data: { title: 'Test', type: 'task', description: 123 },
					field: 'description',
				}, // Wrong type

				// Priority validation
				{
					data: { title: 'Test', type: 'task', priority: 'invalid' },
					field: 'priority',
				},
				{
					data: { title: 'Test', type: 'task', priority: 123 },
					field: 'priority',
				},

				// Story points validation
				{
					data: { title: 'Test', type: 'task', storyPoints: 0 },
					field: 'storyPoints',
				}, // Too low
				{
					data: { title: 'Test', type: 'task', storyPoints: 101 },
					field: 'storyPoints',
				}, // Too high
				{
					data: { title: 'Test', type: 'task', storyPoints: 'invalid' },
					field: 'storyPoints',
				}, // Wrong type

				// Estimated hours validation
				{
					data: { title: 'Test', type: 'task', estimatedHours: 0 },
					field: 'estimatedHours',
				}, // Too low
				{
					data: { title: 'Test', type: 'task', estimatedHours: 1001 },
					field: 'estimatedHours',
				}, // Too high
				{
					data: { title: 'Test', type: 'task', estimatedHours: 'invalid' },
					field: 'estimatedHours',
				}, // Wrong type
			]

			for (const scenario of validationScenarios) {
				const response = await app.handle(
					new Request(
						`http://localhost/projects/${testProject.project.id}/items`,
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${testUser.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(scenario.data),
						},
					),
				)

				expect(response.status).toBe(422)
				const result = (await response.json()) as any
				expectValidationError(result)
			}
		})

		it('should handle nested validation errors', async () => {
			const testUser = await testFactory.createTestUser()

			// Complex nested validation scenario
			const complexInvalidData = {
				name: '', // Invalid
				description: 'a'.repeat(1001), // Invalid
				status: 'invalid-status', // Invalid
				extraField: 'should be ignored',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUser.token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(complexInvalidData),
				}),
			)

			expect(response.status).toBe(422)
			const result = (await response.json()) as any
			expectValidationError(result)
		})
	})

	describe('Business Logic Error Scenarios', () => {
		it('should handle invalid work item status transitions', async () => {
			const testUser = await testFactory.createTestUser()
			const testProject = await testFactory.createTestProject(testUser)
			const testWorkItem = await testFactory.createTestWorkItem(
				testProject,
				testUser,
			)

			const invalidTransitions = [
				// Direct todo -> done (should go through in_progress)
				{ from: 'todo', to: 'done' },
				// Invalid status values
				{ from: 'todo', to: 'invalid_status' },
				{ from: 'todo', to: 'pending' },
				{ from: 'todo', to: 'cancelled' },
			]

			for (const transition of invalidTransitions) {
				const response = await app.handle(
					new Request(
						`http://localhost/items/${testWorkItem.workItem.id}/status`,
						{
							method: 'PATCH',
							headers: {
								Authorization: `Bearer ${testUser.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ status: transition.to }),
						},
					),
				)

				if (transition.to === 'done') {
					expect(response.status).toBe(400)
					const result = (await response.json()) as any
					expectErrorResponse(result, 'BUSINESS_LOGIC_ERROR')
					expect(result.error.message).toContain('Cannot transition')
				} else {
					expect(response.status).toBe(422)
					const result = (await response.json()) as any
					expectValidationError(result)
				}
			}
		})

		it('should handle duplicate resource creation', async () => {
			const userData = {
				email: 'duplicate@example.com',
				name: 'Duplicate User',
				password: 'Password123!',
				role: 'developer' as const,
			}

			// Create first user
			const firstResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			expect(firstResponse.status).toBe(201)

			// Try to create duplicate user
			const duplicateResponse = await app.handle(
				new Request('http://localhost/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(userData),
				}),
			)

			expect(duplicateResponse.status).toBe(409)
			const duplicateResult = (await duplicateResponse.json()) as any
			expectErrorResponse(duplicateResult, 'CONFLICT')
			expect(duplicateResult.error.message).toContain('already exists')
		})

		it('should handle operations on non-existent resources', async () => {
			const testUser = await testFactory.createTestUser()

			const nonExistentOperations = [
				// Project operations
				{ method: 'GET', url: 'http://localhost/projects/non-existent-id' },
				{
					method: 'PUT',
					url: 'http://localhost/projects/non-existent-id',
					body: { name: 'Updated' },
				},
				{ method: 'DELETE', url: 'http://localhost/projects/non-existent-id' },

				// Work item operations
				{ method: 'GET', url: 'http://localhost/items/non-existent-id' },
				{
					method: 'PUT',
					url: 'http://localhost/items/non-existent-id',
					body: { title: 'Updated' },
				},
				{ method: 'DELETE', url: 'http://localhost/items/non-existent-id' },
				{
					method: 'PATCH',
					url: 'http://localhost/items/non-existent-id/status',
					body: { status: 'done' },
				},
				{
					method: 'PATCH',
					url: 'http://localhost/items/non-existent-id/priority',
					body: { priorityOrder: 1 },
				},

				// Project-scoped operations
				{
					method: 'GET',
					url: 'http://localhost/projects/non-existent-id/items',
				},
				{
					method: 'POST',
					url: 'http://localhost/projects/non-existent-id/items',
					body: { title: 'Test', type: 'task' },
				},
				{
					method: 'GET',
					url: 'http://localhost/projects/non-existent-id/kanban',
				},
				{
					method: 'GET',
					url: 'http://localhost/projects/non-existent-id/backlog',
				},
			]

			for (const operation of nonExistentOperations) {
				const response = await app.handle(
					new Request(operation.url, {
						method: operation.method,
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							...(operation.body ? { 'Content-Type': 'application/json' } : {}),
						},
						body: operation.body ? JSON.stringify(operation.body) : undefined,
					}),
				)

				// Should return 404 for non-existent resources or 403 for authorization failures
				expect([403, 404]).toContain(response.status)

				const result = (await response.json()) as any
				if (response.status === 404) {
					expectErrorResponse(result, 'NOT_FOUND')
				} else {
					expectErrorResponse(result, 'FORBIDDEN')
				}
			}
		})

		it('should handle circular dependencies and constraints', async () => {
			const testUser = await testFactory.createTestUser()
			const testProject = await testFactory.createTestProject(testUser)

			// Try to assign work item to non-existent user
			const invalidAssigneeResponse = await app.handle(
				new Request(
					`http://localhost/projects/${testProject.project.id}/items`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							title: 'Invalid Assignee Item',
							type: 'task',
							assigneeId: 'non-existent-user-id',
						}),
					},
				),
			)

			// Should either succeed (if validation is lenient) or fail with appropriate error
			expect([201, 400, 422]).toContain(invalidAssigneeResponse.status)
		})
	})

	describe('Concurrency and Race Condition Scenarios', () => {
		it('should handle concurrent resource creation', async () => {
			const testUser = await testFactory.createTestUser()

			// Create multiple projects concurrently
			const concurrentCreations = Array.from({ length: 10 }, (_, i) =>
				app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name: `Concurrent Project ${i}`,
							description: `Project created concurrently ${i}`,
						}),
					}),
				),
			)

			const results = await Promise.all(concurrentCreations)

			// All should succeed
			results.forEach((response) => {
				expect(response.status).toBe(201)
			})

			// Verify all projects were created
			const listResponse = await app.handle(
				new Request('http://localhost/projects', {
					method: 'GET',
					headers: { Authorization: `Bearer ${testUser.token}` },
				}),
			)

			const listResult = (await listResponse.json()) as any
			expect(listResult.data.projects).toHaveLength(10)
		})

		it('should handle concurrent updates to the same resource', async () => {
			const testUser = await testFactory.createTestUser()
			const testProject = await testFactory.createTestProject(testUser)

			// Update the same project concurrently
			const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
				app.handle(
					new Request(`http://localhost/projects/${testProject.project.id}`, {
						method: 'PUT',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name: `Updated Project ${i}`,
							description: `Updated concurrently ${i}`,
						}),
					}),
				),
			)

			const results = await Promise.all(concurrentUpdates)

			// All should succeed (last one wins)
			results.forEach((response) => {
				expect(response.status).toBe(200)
			})

			// Verify final state
			const finalResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.project.id}`, {
					method: 'GET',
					headers: { Authorization: `Bearer ${testUser.token}` },
				}),
			)

			expect(finalResponse.status).toBe(200)
		})

		it('should handle concurrent status transitions', async () => {
			const testUser = await testFactory.createTestUser()
			const testProject = await testFactory.createTestProject(testUser)
			const testWorkItem = await testFactory.createTestWorkItem(
				testProject,
				testUser,
			)

			// Try to transition status concurrently
			const concurrentTransitions = [
				app.handle(
					new Request(
						`http://localhost/items/${testWorkItem.workItem.id}/status`,
						{
							method: 'PATCH',
							headers: {
								Authorization: `Bearer ${testUser.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ status: 'in_progress' }),
						},
					),
				),
				app.handle(
					new Request(
						`http://localhost/items/${testWorkItem.workItem.id}/status`,
						{
							method: 'PATCH',
							headers: {
								Authorization: `Bearer ${testUser.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ status: 'in_progress' }),
						},
					),
				),
			]

			const results = await Promise.all(concurrentTransitions)

			// At least one should succeed
			const successCount = results.filter((r) => r.status === 200).length
			expect(successCount).toBeGreaterThanOrEqual(1)
		})
	})

	describe('Resource Limits and Edge Cases', () => {
		it('should handle extreme input values', async () => {
			const testUser = await testFactory.createTestUser()

			const extremeInputs = [
				// Very long strings
				{ name: 'a'.repeat(1000), description: 'b'.repeat(10000) },
				// Unicode and special characters
				{ name: '🚀 Project 测试 العربية', description: 'Unicode test 🎉' },
				// Empty strings where allowed
				{ name: 'Valid Name', description: '' },
				// Boundary values
				{ name: 'a'.repeat(200), description: 'b'.repeat(1000) }, // Max allowed lengths
			]

			for (const input of extremeInputs) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(input),
					}),
				)

				// Should either succeed or fail with validation error
				expect([201, 422]).toContain(response.status)
			}
		})

		it('should handle null and undefined values', async () => {
			const testUser = await testFactory.createTestUser()

			const nullUndefinedScenarios = [
				{ name: null, description: 'Test' },
				{ name: 'Test', description: null },
				{ name: undefined, description: 'Test' },
				{ name: 'Test', description: undefined },
			]

			for (const scenario of nullUndefinedScenarios) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${testUser.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(scenario),
					}),
				)

				// Should fail with validation error
				expect([400, 422]).toContain(response.status)
			}
		})

		it('should handle deeply nested or complex objects', async () => {
			const testUser = await testFactory.createTestUser()

			const complexObject = {
				name: 'Test Project',
				description: 'Test',
				nested: {
					level1: {
						level2: {
							level3: 'deep value',
						},
					},
				},
				array: [1, 2, 3, { nested: 'value' }],
				extraFields: 'should be ignored',
			}

			const response = await app.handle(
				new Request('http://localhost/projects', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${testUser.token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(complexObject),
				}),
			)

			// Should either succeed (ignoring extra fields) or fail with validation error
			expect([201, 400, 422]).toContain(response.status)
		})
	})

	describe('Network and Protocol Edge Cases', () => {
		it('should handle requests with unusual headers', async () => {
			const testUser = await testFactory.createTestUser()

			const unusualHeaders = [
				// Very long header values
				{ 'X-Custom-Header': 'a'.repeat(1000) },
				// Special characters in headers
				{ 'X-Unicode-Header': '测试 🚀' },
				// Multiple Authorization headers (should use first or fail)
				{ Authorization: [`Bearer ${testUser.token}`, 'Bearer invalid'] },
				// Case variations
				{ authorization: `Bearer ${testUser.token}` },
				{ AUTHORIZATION: `Bearer ${testUser.token}` },
			]

			for (const headers of unusualHeaders) {
				const response = await app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers,
					}),
				)

				// Should either work or fail with appropriate error
				expect([200, 400, 401]).toContain(response.status)
			}
		})

		it('should handle requests with unusual URLs', async () => {
			const testUser = await testFactory.createTestUser()

			const unusualUrls = [
				// URL with query parameters (should be ignored for most endpoints)
				'http://localhost/projects?param=value&other=test',
				// URL with fragments
				'http://localhost/projects#fragment',
				// URL with encoded characters
				'http://localhost/projects%2Ftest',
				// URL with double slashes
				'http://localhost//projects',
				// URL with trailing slash
				'http://localhost/projects/',
			]

			for (const url of unusualUrls) {
				const response = await app.handle(
					new Request(url, {
						method: 'GET',
						headers: { Authorization: `Bearer ${testUser.token}` },
					}),
				)

				// Should either work or return 404
				expect([200, 404]).toContain(response.status)
			}
		})
	})
})
