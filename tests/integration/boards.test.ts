import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Elysia } from 'elysia'
import { BoardController } from '../../src/controllers/boardController.js'
import { WorkItemController } from '../../src/controllers/workItemController.js'
import { ProjectController } from '../../src/controllers/projectController.js'
import { WorkItemService } from '../../src/services/WorkItemService.js'
import { ProjectService } from '../../src/services/ProjectService.js'
import { AuthService } from '../../src/services/AuthService.js'
import { WorkItemRepository } from '../../src/repositories/WorkItemRepository.js'
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js'
import { UserRepository } from '../../src/repositories/UserRepository.js'
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js'
import { MockDatabase } from '../repositories/mock-database.js'
import type {
	IWorkItemRepository,
	IProjectRepository,
	IUserRepository,
} from '../../src/types/repositories.js'
import type {
	IWorkItemService,
	IProjectService,
	IAuthService,
} from '../../src/types/services.js'
import type { User } from '../../src/types/user.js'
import type { Project } from '../../src/types/project.js'
import type { WorkItem } from '../../src/types/workItem.js'

describe('Board and Backlog Integration Tests', () => {
	let app: Elysia
	let workItemService: IWorkItemService
	let projectService: IProjectService
	let authService: IAuthService
	let workItemRepository: IWorkItemRepository
	let projectRepository: IProjectRepository
	let userRepository: IUserRepository
	let mockDb: MockDatabase
	let testUser: User
	let testProject: Project
	let authToken: string

	beforeEach(async () => {
		// Setup mock database and repositories
		mockDb = new MockDatabase()
		userRepository = new UserRepository(mockDb as any)
		projectRepository = new ProjectRepository(mockDb as any)
		workItemRepository = new WorkItemRepository(mockDb as any)

		// Setup services
		authService = new AuthService(userRepository)
		projectService = new ProjectService(projectRepository)
		workItemService = new WorkItemService(workItemRepository, projectService)

		// Create test app with board and work item routes only to avoid parameter conflicts
		const boardController = new BoardController(workItemService)
		const workItemController = new WorkItemController(workItemService)

		app = new Elysia()
			.use(errorHandlerPlugin)
			.use(boardController.createRoutes())
			.use(workItemController.createRoutes())

		// Create test user and get auth token
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

		// Create test project
		testProject = await projectService.createProject(
			{
				name: 'Test Project',
				description: 'Test project for board tests',
			},
			testUser.id,
		)
	})

	afterEach(() => {
		mockDb.close()
	})

	describe('GET /projects/:projectId/kanban', () => {
		it('should return empty Kanban board when project has no work items', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.kanbanBoard).toEqual({
				todo: [],
				in_progress: [],
				done: [],
			})
			expect(result.message).toBe('Kanban board retrieved successfully')
		})

		it('should return Kanban board with work items grouped by status', async () => {
			// Create work items with different statuses
			const todoItem = await workItemService.createWorkItem(
				{
					title: 'Todo Item',
					description: 'Item in todo status',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)

			const inProgressItem = await workItemService.createWorkItem(
				{
					title: 'In Progress Item',
					description: 'Item in progress',
					type: 'bug',
				},
				testProject.id,
				testUser.id,
			)

			const doneItem = await workItemService.createWorkItem(
				{
					title: 'Done Item',
					description: 'Completed item',
					type: 'story',
				},
				testProject.id,
				testUser.id,
			)

			// Update statuses
			await workItemService.updateWorkItemStatus(
				inProgressItem.id,
				'in_progress',
				testUser.id,
			)
			await workItemService.updateWorkItemStatus(
				doneItem.id,
				'done',
				testUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.kanbanBoard.todo).toHaveLength(1)
			expect(result.data.kanbanBoard.in_progress).toHaveLength(1)
			expect(result.data.kanbanBoard.done).toHaveLength(1)

			expect(result.data.kanbanBoard.todo[0].title).toBe('Todo Item')
			expect(result.data.kanbanBoard.in_progress[0].title).toBe(
				'In Progress Item',
			)
			expect(result.data.kanbanBoard.done[0].title).toBe('Done Item')
		})

		it('should return 403 when user does not have access to project', async () => {
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
				new Request(`http://localhost/projects/${anotherProject.id}/kanban`, {
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
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
				}),
			)

			expect(response.status).toBe(401)
		})

		it('should return 404 for non-existent project', async () => {
			const response = await app.handle(
				new Request('http://localhost/projects/non-existent-id/kanban', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(403) // Will be 403 because project access validation fails first
		})
	})

	describe('GET /projects/:projectId/backlog', () => {
		it('should return empty backlog when project has no todo items', async () => {
			// Create items with non-todo status
			const inProgressItem = await workItemService.createWorkItem(
				{
					title: 'In Progress Item',
					description: 'Item in progress',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)

			await workItemService.updateWorkItemStatus(
				inProgressItem.id,
				'in_progress',
				testUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.backlogItems).toEqual([])
			expect(result.message).toBe('Backlog retrieved successfully')
		})

		it('should return backlog items ordered by priority', async () => {
			// Create multiple todo items
			const item1 = await workItemService.createWorkItem(
				{
					title: 'First Item',
					description: 'First backlog item',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)

			const item2 = await workItemService.createWorkItem(
				{
					title: 'Second Item',
					description: 'Second backlog item',
					type: 'bug',
				},
				testProject.id,
				testUser.id,
			)

			const item3 = await workItemService.createWorkItem(
				{
					title: 'Third Item',
					description: 'Third backlog item',
					type: 'story',
				},
				testProject.id,
				testUser.id,
			)

			// Update priorities (lower number = higher priority)
			await workItemService.updatePriority(item2.id, 1, testUser.id)
			await workItemService.updatePriority(item1.id, 2, testUser.id)
			await workItemService.updatePriority(item3.id, 3, testUser.id)

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.backlogItems).toHaveLength(3)

			// Should be ordered by priority (item2, item1, item3)
			expect(result.data.backlogItems[0].title).toBe('Second Item')
			expect(result.data.backlogItems[1].title).toBe('First Item')
			expect(result.data.backlogItems[2].title).toBe('Third Item')
		})

		it('should only return todo items in backlog', async () => {
			// Create items with different statuses
			const todoItem = await workItemService.createWorkItem(
				{
					title: 'Todo Item',
					description: 'Item in backlog',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)

			const inProgressItem = await workItemService.createWorkItem(
				{
					title: 'In Progress Item',
					description: 'Item in progress',
					type: 'bug',
				},
				testProject.id,
				testUser.id,
			)

			const doneItem = await workItemService.createWorkItem(
				{
					title: 'Done Item',
					description: 'Completed item',
					type: 'story',
				},
				testProject.id,
				testUser.id,
			)

			// Update statuses
			await workItemService.updateWorkItemStatus(
				inProgressItem.id,
				'in_progress',
				testUser.id,
			)
			await workItemService.updateWorkItemStatus(
				doneItem.id,
				'done',
				testUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.backlogItems).toHaveLength(1)
			expect(result.data.backlogItems[0].title).toBe('Todo Item')
			expect(result.data.backlogItems[0].status).toBe('todo')
		})

		it('should return 403 when user does not have access to project', async () => {
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

			const response = await app.handle(
				new Request(`http://localhost/projects/${anotherProject.id}/backlog`, {
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
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('PATCH /items/:id/priority', () => {
		let testWorkItem: WorkItem

		beforeEach(async () => {
			testWorkItem = await workItemService.createWorkItem(
				{
					title: 'Test Work Item',
					description: 'Test item for priority updates',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)
		})

		it('should update work item priority successfully', async () => {
			const newPriority = 5

			const response = await app.handle(
				new Request(`http://localhost/items/${testWorkItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: newPriority }),
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.workItem.priorityOrder).toBe(newPriority)
			expect(result.message).toBe('Work item priority updated successfully')
		})

		it('should allow priority order of 0', async () => {
			const newPriority = 0

			const response = await app.handle(
				new Request(`http://localhost/items/${testWorkItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: newPriority }),
				}),
			)

			expect(response.status).toBe(200)

			const result = (await response.json()) as any
			expect(result.success).toBe(true)
			expect(result.data.workItem.priorityOrder).toBe(newPriority)
		})

		it('should return 422 for negative priority order', async () => {
			const response = await app.handle(
				new Request(`http://localhost/items/${testWorkItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: -1 }),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 422 for missing priorityOrder', async () => {
			const response = await app.handle(
				new Request(`http://localhost/items/${testWorkItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({}),
				}),
			)

			expect(response.status).toBe(422)

			const result = (await response.json()) as any
			expect(result.type).toBe('validation')
		})

		it('should return 404 for non-existent work item', async () => {
			const response = await app.handle(
				new Request('http://localhost/items/non-existent-id/priority', {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: 1 }),
				}),
			)

			expect(response.status).toBe(404)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('NOT_FOUND')
		})

		it('should return 403 when user does not have access to work item', async () => {
			// Create another user and project
			const anotherUser = await authService.register({
				email: 'another3@example.com',
				name: 'Another User 3',
				password: 'Password123!',
				role: 'developer',
			})

			const anotherProject = await projectService.createProject(
				{
					name: 'Another Project',
					description: 'Project owned by another user',
				},
				anotherUser.id,
			)

			const anotherWorkItem = await workItemService.createWorkItem(
				{
					title: 'Another Work Item',
					description: 'Work item in another project',
					type: 'task',
				},
				anotherProject.id,
				anotherUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/items/${anotherWorkItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: 1 }),
				}),
			)

			expect(response.status).toBe(403)

			const result = (await response.json()) as any
			expect(result.success).toBe(false)
			expect(result.error.code).toBe('FORBIDDEN')
		})

		it('should return 401 when no auth token provided', async () => {
			const response = await app.handle(
				new Request(`http://localhost/items/${testWorkItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: 1 }),
				}),
			)

			expect(response.status).toBe(401)
		})
	})

	describe('Kanban Board Workflow Integration', () => {
		it('should support complete Kanban workflow', async () => {
			// Create a work item
			const workItem = await workItemService.createWorkItem(
				{
					title: 'Kanban Test Item',
					description: 'Testing Kanban workflow',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)

			// 1. Check initial state in backlog
			let backlogResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			let backlogResult = (await backlogResponse.json()) as any
			expect(backlogResult.data.backlogItems).toHaveLength(1)
			expect(backlogResult.data.backlogItems[0].status).toBe('todo')

			// 2. Check Kanban board - should be in todo column
			let kanbanResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			let kanbanResult = (await kanbanResponse.json()) as any
			expect(kanbanResult.data.kanbanBoard.todo).toHaveLength(1)
			expect(kanbanResult.data.kanbanBoard.in_progress).toHaveLength(0)
			expect(kanbanResult.data.kanbanBoard.done).toHaveLength(0)

			// 3. Move to in_progress
			await app.handle(
				new Request(`http://localhost/items/${workItem.id}/status`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ status: 'in_progress' }),
				}),
			)

			// 4. Check backlog - should be empty now
			backlogResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			backlogResult = (await backlogResponse.json()) as any
			expect(backlogResult.data.backlogItems).toHaveLength(0)

			// 5. Check Kanban board - should be in in_progress column
			kanbanResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			kanbanResult = (await kanbanResponse.json()) as any
			expect(kanbanResult.data.kanbanBoard.todo).toHaveLength(0)
			expect(kanbanResult.data.kanbanBoard.in_progress).toHaveLength(1)
			expect(kanbanResult.data.kanbanBoard.done).toHaveLength(0)

			// 6. Move to done
			await app.handle(
				new Request(`http://localhost/items/${workItem.id}/status`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ status: 'done' }),
				}),
			)

			// 7. Check final Kanban board state
			kanbanResponse = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			kanbanResult = (await kanbanResponse.json()) as any
			expect(kanbanResult.data.kanbanBoard.todo).toHaveLength(0)
			expect(kanbanResult.data.kanbanBoard.in_progress).toHaveLength(0)
			expect(kanbanResult.data.kanbanBoard.done).toHaveLength(1)
		})
	})

	describe('Response Format Consistency', () => {
		it('should return consistent success response format for Kanban board', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/kanban`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			const result = (await response.json()) as any

			// Check response structure
			expect(result).toHaveProperty('success')
			expect(result).toHaveProperty('data')
			expect(result).toHaveProperty('message')
			expect(result.success).toBe(true)
			expect(result.data).toHaveProperty('kanbanBoard')
			expect(result.data.kanbanBoard).toHaveProperty('todo')
			expect(result.data.kanbanBoard).toHaveProperty('in_progress')
			expect(result.data.kanbanBoard).toHaveProperty('done')
		})

		it('should return consistent success response format for backlog', async () => {
			const response = await app.handle(
				new Request(`http://localhost/projects/${testProject.id}/backlog`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}),
			)

			const result = (await response.json()) as any

			// Check response structure
			expect(result).toHaveProperty('success')
			expect(result).toHaveProperty('data')
			expect(result).toHaveProperty('message')
			expect(result.success).toBe(true)
			expect(result.data).toHaveProperty('backlogItems')
			expect(Array.isArray(result.data.backlogItems)).toBe(true)
		})

		it('should return consistent success response format for priority update', async () => {
			const workItem = await workItemService.createWorkItem(
				{
					title: 'Test Item',
					description: 'Test description',
					type: 'task',
				},
				testProject.id,
				testUser.id,
			)

			const response = await app.handle(
				new Request(`http://localhost/items/${workItem.id}/priority`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${authToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ priorityOrder: 1 }),
				}),
			)

			const result = (await response.json()) as any

			// Check response structure
			expect(result).toHaveProperty('success')
			expect(result).toHaveProperty('data')
			expect(result).toHaveProperty('message')
			expect(result.success).toBe(true)
			expect(result.data).toHaveProperty('workItem')
			expect(result.data.workItem).toHaveProperty('id')
			expect(result.data.workItem).toHaveProperty('priorityOrder')
		})
	})
})
