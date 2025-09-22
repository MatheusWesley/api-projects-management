import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
	afterEach,
} from 'bun:test'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js'

// Import all controllers
import { createAuthRoutes } from '../../src/controllers/authController.js'
import { createProjectRoutes } from '../../src/controllers/projectController.js'
import { createWorkItemRoutes } from '../../src/controllers/workItemController.js'
import { createBoardRoutes } from '../../src/controllers/boardController.js'

// Import test utilities
import {
	testDatabaseSetup,
	createMinimalTestSetup,
	createMultiUserTestSetup,
	cleanupAllTestDatabases,
	type TestDatabaseContext,
} from './test-database-setup.js'

import {
	TestDataFactory,
	expectSuccessResponse,
	expectErrorResponse,
	expectUserStructure,
	expectProjectStructure,
	expectWorkItemStructure,
	expectKanbanBoardStructure,
} from './test-factories.js'

describe('Comprehensive Integration Test Suite', () => {
	let globalContext: TestDatabaseContext

	beforeAll(() => {
		// Global setup if needed
	})

	afterAll(() => {
		// Clean up all test databases
		cleanupAllTestDatabases()
	})

	describe('Application Bootstrap and Health Checks', () => {
		it('should bootstrap application with all routes successfully', async () => {
			const { context } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.get('/', () => ({
						message: 'Project Management API',
						status: 'running',
					}))
					.get('/health', () => ({
						status: 'ok',
						timestamp: new Date().toISOString(),
					}))
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))
					.use(createWorkItemRoutes(context.services.workItemService))
					.use(createBoardRoutes(context.services.workItemService))

				// Test root endpoint
				const rootResponse = await app.handle(new Request('http://localhost/'))
				expect(rootResponse.status).toBe(200)

				const rootData = (await rootResponse.json()) as any
				expect(rootData.message).toBe('Project Management API')
				expect(rootData.status).toBe('running')

				// Test health endpoint
				const healthResponse = await app.handle(
					new Request('http://localhost/health'),
				)
				expect(healthResponse.status).toBe(200)

				const healthData = (await healthResponse.json()) as any
				expect(healthData.status).toBe('ok')
				expect(healthData.timestamp).toBeDefined()

				// Test CORS
				const corsResponse = await app.handle(
					new Request('http://localhost/health', {
						method: 'OPTIONS',
						headers: {
							Origin: 'http://localhost:3000',
							'Access-Control-Request-Method': 'GET',
						},
					}),
				)

				expect([200, 204]).toContain(corsResponse.status)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})

		it('should handle 404 for unknown routes', async () => {
			const { context } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))

				const response = await app.handle(
					new Request('http://localhost/unknown-route'),
				)
				expect(response.status).toBe(404)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})

		it('should verify database connectivity and state', async () => {
			const context = testDatabaseSetup.createContext()

			try {
				const dbState = await testDatabaseSetup.verifyDatabaseState(context)
				expect(dbState.isHealthy).toBe(true)
				expect(dbState.userCount).toBe(0)
				expect(dbState.projectCount).toBe(0)
				expect(dbState.workItemCount).toBe(0)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})
	})

	describe('Full System Integration Tests', () => {
		it('should handle complete project management workflow', async () => {
			const { context, users, projects } = await createMultiUserTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))
					.use(createWorkItemRoutes(context.services.workItemService))
					.use(createBoardRoutes(context.services.workItemService))

				const developer = users.find((u) => u.role === 'developer')!
				const manager = users.find((u) => u.role === 'manager')!
				const developerProject = projects[0]

				// 1. Developer creates work items
				const workItems = []
				const itemTypes = ['task', 'bug', 'story'] as const

				for (let i = 0; i < itemTypes.length; i++) {
					const type = itemTypes[i]
					const response = await app.handle(
						new Request(
							`http://localhost/projects/${developerProject.id}/items`,
							{
								method: 'POST',
								headers: {
									Authorization: `Bearer ${developer.token}`,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									title: `${type.charAt(0).toUpperCase() + type.slice(1)} Item ${i + 1}`,
									description: `A ${type} for testing`,
									type,
									priority: i === 1 ? 'critical' : 'medium',
									storyPoints: type === 'story' ? 8 : undefined,
									estimatedHours: type === 'task' ? 4 : undefined,
								}),
							},
						),
					)

					expect(response.status).toBe(201)
					const result = (await response.json()) as any
					workItems.push(result.data.workItem)
				}

				// 2. Check initial backlog
				const backlogResponse = await app.handle(
					new Request(
						`http://localhost/projects/${developerProject.id}/backlog`,
						{
							method: 'GET',
							headers: { Authorization: `Bearer ${developer.token}` },
						},
					),
				)

				expect(backlogResponse.status).toBe(200)
				const backlogResult = (await backlogResponse.json()) as any
				expect(backlogResult.data.backlogItems).toHaveLength(3)

				// 3. Prioritize critical bug
				const bugItem = workItems.find((item) => item.type === 'bug')!
				await app.handle(
					new Request(`http://localhost/items/${bugItem.id}/priority`, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${developer.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ priorityOrder: 1 }),
					}),
				)

				// 4. Start working on critical bug
				await app.handle(
					new Request(`http://localhost/items/${bugItem.id}/status`, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${developer.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ status: 'in_progress' }),
					}),
				)

				// 5. Complete the task
				const taskItem = workItems.find((item) => item.type === 'task')!
				await app.handle(
					new Request(`http://localhost/items/${taskItem.id}/status`, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${developer.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ status: 'in_progress' }),
					}),
				)

				await app.handle(
					new Request(`http://localhost/items/${taskItem.id}/status`, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${developer.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ status: 'done' }),
					}),
				)

				// 6. Check final Kanban board state
				const kanbanResponse = await app.handle(
					new Request(
						`http://localhost/projects/${developerProject.id}/kanban`,
						{
							method: 'GET',
							headers: { Authorization: `Bearer ${developer.token}` },
						},
					),
				)

				expect(kanbanResponse.status).toBe(200)
				const kanbanResult = (await kanbanResponse.json()) as any
				expectKanbanBoardStructure(kanbanResult.data.kanbanBoard)
				expect(kanbanResult.data.kanbanBoard.todo).toHaveLength(1) // story
				expect(kanbanResult.data.kanbanBoard.in_progress).toHaveLength(1) // bug
				expect(kanbanResult.data.kanbanBoard.done).toHaveLength(1) // task

				// 7. Manager should not be able to access developer's project
				const unauthorizedResponse = await app.handle(
					new Request(
						`http://localhost/projects/${developerProject.id}/kanban`,
						{
							method: 'GET',
							headers: { Authorization: `Bearer ${manager.token}` },
						},
					),
				)

				expect(unauthorizedResponse.status).toBe(403)

				// 8. Verify final database state
				const finalDbState =
					await testDatabaseSetup.verifyDatabaseState(context)
				expect(finalDbState.isHealthy).toBe(true)
				expect(finalDbState.userCount).toBe(3)
				expect(finalDbState.projectCount).toBe(3)
				expect(finalDbState.workItemCount).toBe(3)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})

		it('should handle stress testing with multiple concurrent operations', async () => {
			const { context, user } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))
					.use(createWorkItemRoutes(context.services.workItemService))

				// Create multiple projects concurrently
				const projectCreations = Array.from({ length: 20 }, (_, i) =>
					app.handle(
						new Request('http://localhost/projects', {
							method: 'POST',
							headers: {
								Authorization: `Bearer ${user.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								name: `Stress Test Project ${i}`,
								description: `Project ${i} for stress testing`,
							}),
						}),
					),
				)

				const projectResults = await Promise.all(projectCreations)

				// All should succeed
				projectResults.forEach((response) => {
					expect(response.status).toBe(201)
				})

				// Get created project IDs
				const projectIds = await Promise.all(
					projectResults.map(async (response) => {
						const result = (await response.json()) as any
						return result.data.project.id
					}),
				)

				// Create work items in each project concurrently
				const workItemCreations = projectIds.flatMap((projectId) =>
					Array.from({ length: 5 }, (_, i) =>
						app.handle(
							new Request(`http://localhost/projects/${projectId}/items`, {
								method: 'POST',
								headers: {
									Authorization: `Bearer ${user.token}`,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									title: `Work Item ${i}`,
									description: `Work item ${i} for stress testing`,
									type: ['task', 'bug', 'story'][i % 3],
								}),
							}),
						),
					),
				)

				const workItemResults = await Promise.all(workItemCreations)

				// All should succeed
				workItemResults.forEach((response) => {
					expect(response.status).toBe(201)
				})

				// Verify final state
				const finalDbState =
					await testDatabaseSetup.verifyDatabaseState(context)
				expect(finalDbState.isHealthy).toBe(true)
				expect(finalDbState.userCount).toBe(1)
				expect(finalDbState.projectCount).toBe(21) // 20 + 1 from setup
				expect(finalDbState.workItemCount).toBe(100) // 20 projects * 5 items each
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})

		it('should handle error recovery and resilience', async () => {
			const { context, user } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))

				// Normal operation should work
				const normalResponse = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${user.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name: 'Normal Project',
							description: 'Should work normally',
						}),
					}),
				)

				expect(normalResponse.status).toBe(201)

				// Simulate database error
				testDatabaseSetup.simulateDatabaseError(context, 'connection')

				// Operations should fail gracefully
				const errorResponse = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${user.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name: 'Error Project',
							description: 'Should fail due to database error',
						}),
					}),
				)

				expect(errorResponse.status).toBe(500)

				// Restore database operation
				testDatabaseSetup.restoreDatabaseOperation(context)

				// Normal operation should work again
				const recoveryResponse = await app.handle(
					new Request('http://localhost/projects', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${user.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							name: 'Recovery Project',
							description: 'Should work after recovery',
						}),
					}),
				)

				expect(recoveryResponse.status).toBe(201)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})
	})

	describe('Performance and Load Testing', () => {
		it('should handle reasonable load without degradation', async () => {
			const { context, user } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))

				// Measure response times for project creation
				const startTime = Date.now()

				const loadTestRequests = Array.from({ length: 50 }, (_, i) =>
					app.handle(
						new Request('http://localhost/projects', {
							method: 'POST',
							headers: {
								Authorization: `Bearer ${user.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								name: `Load Test Project ${i}`,
								description: `Project ${i} for load testing`,
							}),
						}),
					),
				)

				const results = await Promise.all(loadTestRequests)
				const endTime = Date.now()

				// All should succeed
				results.forEach((response) => {
					expect(response.status).toBe(201)
				})

				// Performance should be reasonable (less than 10 seconds for 50 requests)
				const totalTime = endTime - startTime
				expect(totalTime).toBeLessThan(10000)

				// Average response time should be reasonable (less than 200ms per request)
				const averageTime = totalTime / results.length
				expect(averageTime).toBeLessThan(200)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})

		it('should handle memory usage efficiently', async () => {
			const { context, user } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))

				// Create and clean up resources repeatedly
				for (let cycle = 0; cycle < 10; cycle++) {
					// Create resources
					const creationPromises = Array.from({ length: 10 }, (_, i) =>
						app.handle(
							new Request('http://localhost/projects', {
								method: 'POST',
								headers: {
									Authorization: `Bearer ${user.token}`,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									name: `Memory Test Project ${cycle}-${i}`,
									description: `Cycle ${cycle}, Project ${i}`,
								}),
							}),
						),
					)

					const results = await Promise.all(creationPromises)

					// All should succeed
					results.forEach((response) => {
						expect(response.status).toBe(201)
					})

					// Get project IDs for cleanup
					const projectIds = await Promise.all(
						results.map(async (response) => {
							const result = (await response.json()) as any
							return result.data.project.id
						}),
					)

					// Clean up resources
					const deletionPromises = projectIds.map((id) =>
						app.handle(
							new Request(`http://localhost/projects/${id}`, {
								method: 'DELETE',
								headers: { Authorization: `Bearer ${user.token}` },
							}),
						),
					)

					const deletionResults = await Promise.all(deletionPromises)

					// All deletions should succeed
					deletionResults.forEach((response) => {
						expect(response.status).toBe(200)
					})
				}

				// Verify clean state
				const finalListResponse = await app.handle(
					new Request('http://localhost/projects', {
						method: 'GET',
						headers: { Authorization: `Bearer ${user.token}` },
					}),
				)

				const finalListResult = (await finalListResponse.json()) as any
				expect(finalListResult.data.projects).toHaveLength(1) // Only the original project from setup
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})
	})

	describe('Data Integrity and Consistency', () => {
		it('should maintain referential integrity across operations', async () => {
			const { context, user, project } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))
					.use(createWorkItemRoutes(context.services.workItemService))

				// Create work items
				const workItemResponse = await app.handle(
					new Request(`http://localhost/projects/${project.id}/items`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${user.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							title: 'Integrity Test Item',
							description: 'Testing referential integrity',
							type: 'task',
						}),
					}),
				)

				expect(workItemResponse.status).toBe(201)
				const workItemResult = (await workItemResponse.json()) as any
				const workItemId = workItemResult.data.workItem.id

				// Verify work item references project correctly
				const itemResponse = await app.handle(
					new Request(`http://localhost/items/${workItemId}`, {
						method: 'GET',
						headers: { Authorization: `Bearer ${user.token}` },
					}),
				)

				expect(itemResponse.status).toBe(200)
				const itemResult = (await itemResponse.json()) as any
				expect(itemResult.data.workItem.projectId).toBe(project.id)
				expect(itemResult.data.workItem.reporterId).toBe(user.user.id)

				// Delete project should handle work items appropriately
				const deleteProjectResponse = await app.handle(
					new Request(`http://localhost/projects/${project.id}`, {
						method: 'DELETE',
						headers: { Authorization: `Bearer ${user.token}` },
					}),
				)

				expect(deleteProjectResponse.status).toBe(200)

				// Work item should no longer be accessible
				const orphanedItemResponse = await app.handle(
					new Request(`http://localhost/items/${workItemId}`, {
						method: 'GET',
						headers: { Authorization: `Bearer ${user.token}` },
					}),
				)

				expect(orphanedItemResponse.status).toBe(404)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})

		it('should handle concurrent modifications consistently', async () => {
			const { context, user, project } = await createMinimalTestSetup()

			try {
				const app = new Elysia()
					.use(cors())
					.use(errorHandlerPlugin)
					.use(createAuthRoutes(context.services.authService))
					.use(createProjectRoutes(context.services.projectService))
					.use(createWorkItemRoutes(context.services.workItemService))

				// Create a work item
				const workItemResponse = await app.handle(
					new Request(`http://localhost/projects/${project.id}/items`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${user.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							title: 'Concurrent Test Item',
							description: 'Testing concurrent modifications',
							type: 'task',
						}),
					}),
				)

				const workItemResult = (await workItemResponse.json()) as any
				const workItemId = workItemResult.data.workItem.id

				// Perform concurrent updates
				const concurrentUpdates = [
					app.handle(
						new Request(`http://localhost/items/${workItemId}`, {
							method: 'PUT',
							headers: {
								Authorization: `Bearer ${user.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								title: 'Updated by Request 1',
								description: 'First concurrent update',
							}),
						}),
					),
					app.handle(
						new Request(`http://localhost/items/${workItemId}`, {
							method: 'PUT',
							headers: {
								Authorization: `Bearer ${user.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								title: 'Updated by Request 2',
								description: 'Second concurrent update',
							}),
						}),
					),
					app.handle(
						new Request(`http://localhost/items/${workItemId}/priority`, {
							method: 'PATCH',
							headers: {
								Authorization: `Bearer ${user.token}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ priorityOrder: 5 }),
						}),
					),
				]

				const results = await Promise.all(concurrentUpdates)

				// All should succeed (last writer wins)
				results.forEach((response) => {
					expect(response.status).toBe(200)
				})

				// Verify final state is consistent
				const finalStateResponse = await app.handle(
					new Request(`http://localhost/items/${workItemId}`, {
						method: 'GET',
						headers: { Authorization: `Bearer ${user.token}` },
					}),
				)

				expect(finalStateResponse.status).toBe(200)
				const finalState = (await finalStateResponse.json()) as any

				// Should have one of the updated titles and the priority update
				expect(['Updated by Request 1', 'Updated by Request 2']).toContain(
					finalState.data.workItem.title,
				)
				expect(finalState.data.workItem.priorityOrder).toBe(5)
			} finally {
				testDatabaseSetup.cleanup(context)
			}
		})
	})
})
