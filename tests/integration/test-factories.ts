// Test data factories for consistent test setup
import type {
	IAuthService,
	IProjectService,
	IWorkItemService,
} from '../../src/types/services.js'
import type { User } from '../../src/types/user.js'
import type { Project } from '../../src/types/project.js'
import type { WorkItem } from '../../src/types/workItem.js'

export interface TestUser {
	user: User
	token: string
}

export interface TestProject {
	project: Project
	owner: TestUser
}

export interface TestWorkItem {
	workItem: WorkItem
	project: TestProject
	reporter: TestUser
}

export class TestDataFactory {
	constructor(
		private authService: IAuthService,
		private projectService: IProjectService,
		private workItemService: IWorkItemService,
	) {}

	async createTestUser(
		overrides: Partial<{
			email: string
			name: string
			password: string
			role: 'admin' | 'manager' | 'developer'
		}> = {},
	): Promise<TestUser> {
		const userData = {
			email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
			name: 'Test User',
			password: 'Password123!',
			role: 'developer' as const,
			...overrides,
		}

		const user = await this.authService.register(userData)
		const loginResult = await this.authService.login(
			userData.email,
			userData.password,
		)

		return {
			user,
			token: loginResult.token,
		}
	}

	async createTestProject(
		owner: TestUser,
		overrides: Partial<{
			name: string
			description: string
		}> = {},
	): Promise<TestProject> {
		const projectData = {
			name: `Test Project ${Date.now()}`,
			description: 'A test project for integration testing',
			...overrides,
		}

		const project = await this.projectService.createProject(
			projectData,
			owner.user.id,
		)

		return {
			project,
			owner,
		}
	}

	async createTestWorkItem(
		project: TestProject,
		reporter: TestUser,
		overrides: Partial<{
			title: string
			description: string
			type: 'task' | 'bug' | 'story'
			priority: 'low' | 'medium' | 'high' | 'critical'
			storyPoints: number
			estimatedHours: number
			assigneeId: string
		}> = {},
	): Promise<TestWorkItem> {
		const workItemData = {
			title: `Test Work Item ${Date.now()}`,
			description: 'A test work item for integration testing',
			type: 'task' as const,
			priority: 'medium' as const,
			...overrides,
		}

		const workItem = await this.workItemService.createWorkItem(
			workItemData,
			project.project.id,
			reporter.user.id,
		)

		return {
			workItem,
			project,
			reporter,
		}
	}

	async createCompleteTestSetup(): Promise<{
		users: {
			developer: TestUser
			manager: TestUser
			anotherDeveloper: TestUser
		}
		projects: {
			mainProject: TestProject
			secondaryProject: TestProject
		}
		workItems: {
			todoTask: TestWorkItem
			inProgressBug: TestWorkItem
			doneStory: TestWorkItem
		}
	}> {
		// Create users
		const developer = await this.createTestUser({
			name: 'Developer User',
			role: 'developer',
		})

		const manager = await this.createTestUser({
			name: 'Manager User',
			role: 'manager',
		})

		const anotherDeveloper = await this.createTestUser({
			name: 'Another Developer',
			role: 'developer',
		})

		// Create projects
		const mainProject = await this.createTestProject(developer, {
			name: 'Main Test Project',
			description: 'Primary project for testing',
		})

		const secondaryProject = await this.createTestProject(manager, {
			name: 'Secondary Test Project',
			description: 'Secondary project for authorization testing',
		})

		// Create work items with different statuses
		const todoTask = await this.createTestWorkItem(mainProject, developer, {
			title: 'Todo Task',
			description: 'A task in todo status',
			type: 'task',
			priority: 'high',
			storyPoints: 5,
		})

		const inProgressBug = await this.createTestWorkItem(
			mainProject,
			developer,
			{
				title: 'In Progress Bug',
				description: 'A bug being worked on',
				type: 'bug',
				priority: 'critical',
				estimatedHours: 8,
			},
		)

		const doneStory = await this.createTestWorkItem(mainProject, developer, {
			title: 'Done Story',
			description: 'A completed user story',
			type: 'story',
			priority: 'medium',
			storyPoints: 8,
		})

		// Update statuses to create realistic test data
		await this.workItemService.updateWorkItemStatus(
			inProgressBug.workItem.id,
			'in_progress',
			developer.user.id,
		)

		await this.workItemService.updateWorkItemStatus(
			doneStory.workItem.id,
			'done',
			developer.user.id,
		)

		return {
			users: {
				developer,
				manager,
				anotherDeveloper,
			},
			projects: {
				mainProject,
				secondaryProject,
			},
			workItems: {
				todoTask,
				inProgressBug,
				doneStory,
			},
		}
	}
}

// Utility functions for test assertions
export function expectSuccessResponse(response: any, expectedMessage?: string) {
	expect(response).toHaveProperty('success')
	expect(response).toHaveProperty('data')
	expect(response).toHaveProperty('message')
	expect(response.success).toBe(true)

	if (expectedMessage) {
		expect(response.message).toBe(expectedMessage)
	}
}

export function expectErrorResponse(
	response: any,
	expectedCode?: string,
	expectedMessage?: string,
) {
	expect(response).toHaveProperty('success')
	expect(response).toHaveProperty('error')
	expect(response.success).toBe(false)
	expect(response.error).toHaveProperty('code')
	expect(response.error).toHaveProperty('message')

	if (expectedCode) {
		expect(response.error.code).toBe(expectedCode)
	}

	if (expectedMessage) {
		expect(response.error.message).toBe(expectedMessage)
	}
}

export function expectValidationError(response: any) {
	expect(response).toHaveProperty('type')
	expect(response.type).toBe('validation')
}

export function expectUserStructure(user: any) {
	expect(user).toHaveProperty('id')
	expect(user).toHaveProperty('email')
	expect(user).toHaveProperty('name')
	expect(user).toHaveProperty('role')
	expect(user).toHaveProperty('createdAt')
	expect(user).toHaveProperty('updatedAt')
	expect(user).not.toHaveProperty('password') // Password should never be in response
}

export function expectProjectStructure(project: any) {
	expect(project).toHaveProperty('id')
	expect(project).toHaveProperty('name')
	expect(project).toHaveProperty('description')
	expect(project).toHaveProperty('ownerId')
	expect(project).toHaveProperty('status')
	expect(project).toHaveProperty('createdAt')
	expect(project).toHaveProperty('updatedAt')
}

export function expectWorkItemStructure(workItem: any) {
	expect(workItem).toHaveProperty('id')
	expect(workItem).toHaveProperty('title')
	expect(workItem).toHaveProperty('description')
	expect(workItem).toHaveProperty('type')
	expect(workItem).toHaveProperty('status')
	expect(workItem).toHaveProperty('priority')
	expect(workItem).toHaveProperty('projectId')
	expect(workItem).toHaveProperty('reporterId')
	expect(workItem).toHaveProperty('createdAt')
	expect(workItem).toHaveProperty('updatedAt')
}

export function expectKanbanBoardStructure(kanbanBoard: any) {
	expect(kanbanBoard).toHaveProperty('todo')
	expect(kanbanBoard).toHaveProperty('in_progress')
	expect(kanbanBoard).toHaveProperty('done')
	expect(Array.isArray(kanbanBoard.todo)).toBe(true)
	expect(Array.isArray(kanbanBoard.in_progress)).toBe(true)
	expect(Array.isArray(kanbanBoard.done)).toBe(true)
}
