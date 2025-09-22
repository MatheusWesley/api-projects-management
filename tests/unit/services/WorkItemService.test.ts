import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { WorkItemService } from '../../../src/services/WorkItemService.js'
import type { IWorkItemRepository } from '../../../src/types/repositories.js'
import type { IProjectService } from '../../../src/types/services.js'
import type {
	WorkItem,
	CreateWorkItemData,
	UpdateWorkItemData,
	KanbanBoard,
} from '../../../src/types/workItem.js'
import {
	ValidationError,
	NotFoundError,
	ForbiddenError,
	BusinessLogicError,
} from '../../../src/types/errors.js'

// Mock work item data
const mockWorkItem: WorkItem = {
	id: '1',
	title: 'Test Task',
	description: 'Test Description',
	type: 'task',
	status: 'todo',
	priority: 'medium',
	projectId: 'project1',
	assigneeId: 'user2',
	reporterId: 'user1',
	storyPoints: 5,
	estimatedHours: 8,
	priorityOrder: 1,
	createdAt: new Date(),
	updatedAt: new Date(),
}

const mockCreateWorkItemData: CreateWorkItemData = {
	title: 'New Task',
	description: 'New Description',
	type: 'task',
	assigneeId: 'user2',
	storyPoints: 3,
	estimatedHours: 5,
}

const mockUpdateWorkItemData: UpdateWorkItemData = {
	title: 'Updated Task',
	description: 'Updated Description',
	status: 'in_progress',
	priority: 'high',
}

describe('WorkItemService', () => {
	let workItemService: WorkItemService
	let mockWorkItemRepository: IWorkItemRepository
	let mockProjectService: IProjectService

	beforeEach(() => {
		// Create mock repository
		mockWorkItemRepository = {
			create: mock(() => Promise.resolve(mockWorkItem)),
			findById: mock(() => Promise.resolve(mockWorkItem)),
			findByProjectId: mock(() => Promise.resolve([mockWorkItem])),
			findByAssigneeId: mock(() => Promise.resolve([mockWorkItem])),
			update: mock(() =>
				Promise.resolve({ ...mockWorkItem, ...mockUpdateWorkItemData }),
			),
			delete: mock(() => Promise.resolve()),
			findByStatus: mock(() => Promise.resolve([mockWorkItem])),
			updatePriority: mock(() =>
				Promise.resolve({ ...mockWorkItem, priorityOrder: 2 }),
			),
			findBacklogItems: mock(() => Promise.resolve([mockWorkItem])),
		}

		// Create mock project service
		mockProjectService = {
			validateProjectAccess: mock(() => Promise.resolve(true)),
			createProject: mock(),
			getProject: mock(),
			updateProject: mock(),
			deleteProject: mock(),
			listUserProjects: mock(),
		}

		workItemService = new WorkItemService(
			mockWorkItemRepository,
			mockProjectService,
		)
	})

	describe('createWorkItem', () => {
		it('should create a work item successfully', async () => {
			const result = await workItemService.createWorkItem(
				mockCreateWorkItemData,
				'project1',
				'user1',
			)

			expect(result).toEqual(mockWorkItem)
			expect(mockProjectService.validateProjectAccess).toHaveBeenCalledWith(
				'project1',
				'user1',
			)
			expect(mockWorkItemRepository.create).toHaveBeenCalledWith({
				...mockCreateWorkItemData,
				projectId: 'project1',
				reporterId: 'user1',
				priorityOrder: 2, // Max + 1
			})
		})

		it('should throw ValidationError when title is missing', async () => {
			const invalidData = { ...mockCreateWorkItemData, title: '' }
			await expect(
				workItemService.createWorkItem(invalidData, 'project1', 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when projectId is missing', async () => {
			await expect(
				workItemService.createWorkItem(mockCreateWorkItemData, '', 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when userId is missing', async () => {
			await expect(
				workItemService.createWorkItem(mockCreateWorkItemData, 'project1', ''),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ForbiddenError when user does not have project access', async () => {
			mockProjectService.validateProjectAccess = mock(() =>
				Promise.resolve(false),
			)

			await expect(
				workItemService.createWorkItem(
					mockCreateWorkItemData,
					'project1',
					'user1',
				),
			).rejects.toThrow(ForbiddenError)
		})

		it('should throw ValidationError when title is too long', async () => {
			const invalidData = { ...mockCreateWorkItemData, title: 'a'.repeat(201) }
			await expect(
				workItemService.createWorkItem(invalidData, 'project1', 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when description is too long', async () => {
			const invalidData = {
				...mockCreateWorkItemData,
				description: 'a'.repeat(2001),
			}
			await expect(
				workItemService.createWorkItem(invalidData, 'project1', 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when type is invalid', async () => {
			const invalidData = { ...mockCreateWorkItemData, type: 'invalid' as any }
			await expect(
				workItemService.createWorkItem(invalidData, 'project1', 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when story points are out of range', async () => {
			const invalidData = { ...mockCreateWorkItemData, storyPoints: 101 }
			await expect(
				workItemService.createWorkItem(invalidData, 'project1', 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when estimated hours are out of range', async () => {
			const invalidData = { ...mockCreateWorkItemData, estimatedHours: 1001 }
			await expect(
				workItemService.createWorkItem(invalidData, 'project1', 'user1'),
			).rejects.toThrow(ValidationError)
		})
	})

	describe('getWorkItem', () => {
		it('should get a work item successfully when user has access', async () => {
			const result = await workItemService.getWorkItem('1', 'user1')

			expect(result).toEqual(mockWorkItem)
			expect(mockWorkItemRepository.findById).toHaveBeenCalledWith('1')
			expect(mockProjectService.validateProjectAccess).toHaveBeenCalledWith(
				'project1',
				'user1',
			)
		})

		it('should throw ValidationError when id is missing', async () => {
			await expect(workItemService.getWorkItem('', 'user1')).rejects.toThrow(
				ValidationError,
			)
		})

		it('should throw ValidationError when userId is missing', async () => {
			await expect(workItemService.getWorkItem('1', '')).rejects.toThrow(
				ValidationError,
			)
		})

		it('should throw NotFoundError when work item does not exist', async () => {
			mockWorkItemRepository.findById = mock(() => Promise.resolve(null))

			await expect(workItemService.getWorkItem('1', 'user1')).rejects.toThrow(
				NotFoundError,
			)
		})

		it('should throw ForbiddenError when user does not have project access', async () => {
			mockProjectService.validateProjectAccess = mock(() =>
				Promise.resolve(false),
			)

			await expect(workItemService.getWorkItem('1', 'user1')).rejects.toThrow(
				ForbiddenError,
			)
		})
	})

	describe('updateWorkItem', () => {
		it('should update a work item successfully', async () => {
			const result = await workItemService.updateWorkItem(
				'1',
				mockUpdateWorkItemData,
				'user1',
			)

			expect(result).toEqual({ ...mockWorkItem, ...mockUpdateWorkItemData })
			expect(mockWorkItemRepository.update).toHaveBeenCalledWith(
				'1',
				mockUpdateWorkItemData,
			)
		})

		it('should throw ValidationError when title is empty', async () => {
			const invalidData = { title: '' }
			await expect(
				workItemService.updateWorkItem('1', invalidData, 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when status is invalid', async () => {
			const invalidData = { status: 'invalid' as any }
			await expect(
				workItemService.updateWorkItem('1', invalidData, 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw ValidationError when priority is invalid', async () => {
			const invalidData = { priority: 'invalid' as any }
			await expect(
				workItemService.updateWorkItem('1', invalidData, 'user1'),
			).rejects.toThrow(ValidationError)
		})
	})

	describe('deleteWorkItem', () => {
		it('should delete a work item successfully', async () => {
			await workItemService.deleteWorkItem('1', 'user1')

			expect(mockWorkItemRepository.delete).toHaveBeenCalledWith('1')
		})

		it('should throw ValidationError when id is missing', async () => {
			await expect(workItemService.deleteWorkItem('', 'user1')).rejects.toThrow(
				ValidationError,
			)
		})
	})

	describe('getProjectWorkItems', () => {
		it('should get project work items successfully', async () => {
			const result = await workItemService.getProjectWorkItems(
				'project1',
				'user1',
			)

			expect(result).toEqual([mockWorkItem])
			expect(mockProjectService.validateProjectAccess).toHaveBeenCalledWith(
				'project1',
				'user1',
			)
			expect(mockWorkItemRepository.findByProjectId).toHaveBeenCalledWith(
				'project1',
			)
		})

		it('should throw ForbiddenError when user does not have project access', async () => {
			mockProjectService.validateProjectAccess = mock(() =>
				Promise.resolve(false),
			)

			await expect(
				workItemService.getProjectWorkItems('project1', 'user1'),
			).rejects.toThrow(ForbiddenError)
		})
	})

	describe('getKanbanBoard', () => {
		it('should get Kanban board successfully', async () => {
			const todoItem = { ...mockWorkItem, status: 'todo' as const }
			const inProgressItem = {
				...mockWorkItem,
				id: '2',
				status: 'in_progress' as const,
			}
			const doneItem = { ...mockWorkItem, id: '3', status: 'done' as const }

			mockWorkItemRepository.findByProjectId = mock(() =>
				Promise.resolve([todoItem, inProgressItem, doneItem]),
			)

			const result = await workItemService.getKanbanBoard('project1', 'user1')

			expect(result).toEqual({
				todo: [todoItem],
				in_progress: [inProgressItem],
				done: [doneItem],
			})
			expect(mockProjectService.validateProjectAccess).toHaveBeenCalledWith(
				'project1',
				'user1',
			)
		})

		it('should throw ForbiddenError when user does not have project access', async () => {
			mockProjectService.validateProjectAccess = mock(() =>
				Promise.resolve(false),
			)

			await expect(
				workItemService.getKanbanBoard('project1', 'user1'),
			).rejects.toThrow(ForbiddenError)
		})
	})

	describe('updateWorkItemStatus', () => {
		it('should update work item status successfully', async () => {
			// Mock the repository to return only the status update
			mockWorkItemRepository.update = mock(() =>
				Promise.resolve({ ...mockWorkItem, status: 'in_progress' }),
			)

			const result = await workItemService.updateWorkItemStatus(
				'1',
				'in_progress',
				'user1',
			)

			expect(result.status).toBe('in_progress')
			expect(mockWorkItemRepository.update).toHaveBeenCalledWith('1', {
				status: 'in_progress',
			})
		})

		it('should throw ValidationError when status is invalid', async () => {
			await expect(
				workItemService.updateWorkItemStatus('1', 'invalid' as any, 'user1'),
			).rejects.toThrow(ValidationError)
		})

		it('should throw BusinessLogicError when status transition is invalid', async () => {
			const doneItem = { ...mockWorkItem, status: 'done' as const }
			mockWorkItemRepository.findById = mock(() => Promise.resolve(doneItem))

			await expect(
				workItemService.updateWorkItemStatus('1', 'todo', 'user1'),
			).rejects.toThrow(BusinessLogicError)
		})
	})

	describe('getBacklog', () => {
		it('should get backlog successfully', async () => {
			const result = await workItemService.getBacklog('project1', 'user1')

			expect(result).toEqual([mockWorkItem])
			expect(mockProjectService.validateProjectAccess).toHaveBeenCalledWith(
				'project1',
				'user1',
			)
			expect(mockWorkItemRepository.findBacklogItems).toHaveBeenCalledWith(
				'project1',
			)
		})

		it('should throw ForbiddenError when user does not have project access', async () => {
			mockProjectService.validateProjectAccess = mock(() =>
				Promise.resolve(false),
			)

			await expect(
				workItemService.getBacklog('project1', 'user1'),
			).rejects.toThrow(ForbiddenError)
		})
	})

	describe('updatePriority', () => {
		it('should update priority successfully', async () => {
			const result = await workItemService.updatePriority('1', 2, 'user1')

			expect(result).toEqual({ ...mockWorkItem, priorityOrder: 2 })
			expect(mockWorkItemRepository.updatePriority).toHaveBeenCalledWith('1', 2)
		})

		it('should throw ValidationError when priority order is negative', async () => {
			await expect(
				workItemService.updatePriority('1', -1, 'user1'),
			).rejects.toThrow(ValidationError)
		})
	})

	describe('assignWorkItem', () => {
		it('should assign work item successfully', async () => {
			// Mock the repository to return only the assignee update
			mockWorkItemRepository.update = mock(() =>
				Promise.resolve({ ...mockWorkItem, assigneeId: 'user2' }),
			)

			const result = await workItemService.assignWorkItem('1', 'user2', 'user1')

			expect(result.assigneeId).toBe('user2')
			expect(mockWorkItemRepository.update).toHaveBeenCalledWith('1', {
				assigneeId: 'user2',
			})
		})

		it('should throw ValidationError when assigneeId is missing', async () => {
			await expect(
				workItemService.assignWorkItem('1', '', 'user1'),
			).rejects.toThrow(ValidationError)
		})
	})
})
