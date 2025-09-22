import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { WorkItemRepository } from '../../src/repositories/WorkItemRepository.js'
import {
	createTestDatabase,
	cleanupTestDatabase,
	testWorkItemData,
	createTestUser,
	createTestProject,
} from './setup.js'
import type { MockDatabase } from './mock-database.js'

describe('WorkItemRepository', () => {
	let db: MockDatabase
	let workItemRepository: WorkItemRepository
	let testUserId: string
	let testProjectId: string

	beforeEach(() => {
		db = createTestDatabase()
		workItemRepository = new WorkItemRepository(db)
		testUserId = createTestUser(db)
		testProjectId = createTestProject(db, testUserId)
	})

	afterEach(() => {
		cleanupTestDatabase()
	})

	describe('create', () => {
		it('should create a work item successfully', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}
			const workItem = await workItemRepository.create(itemData)

			expect(workItem.id).toBeDefined()
			expect(workItem.title).toBe(testWorkItemData.title)
			expect(workItem.description).toBe(testWorkItemData.description)
			expect(workItem.type).toBe(testWorkItemData.type)
			expect(workItem.status).toBe('todo')
			expect(workItem.priority).toBe('medium')
			expect(workItem.projectId).toBe(testProjectId)
			expect(workItem.reporterId).toBe(testUserId)
			expect(workItem.priorityOrder).toBe(1)
			expect(workItem.createdAt).toBeInstanceOf(Date)
			expect(workItem.updatedAt).toBeInstanceOf(Date)
		})

		it('should assign incremental priority order', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Item 2',
			})

			expect(item1.priorityOrder).toBe(1)
			expect(item2.priorityOrder).toBe(2)
		})

		it('should create work item with optional fields', async () => {
			const assigneeId = createTestUser(db, { email: 'assignee@example.com' })
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
				assigneeId,
				storyPoints: 5,
				estimatedHours: 8,
			}

			const workItem = await workItemRepository.create(itemData)

			expect(workItem.assigneeId).toBe(assigneeId)
			expect(workItem.storyPoints).toBe(5)
			expect(workItem.estimatedHours).toBe(8)
		})

		it('should throw error when creating work item with invalid project ID', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: 'invalid-project-id',
				reporterId: testUserId,
			}

			await expect(workItemRepository.create(itemData)).rejects.toThrow(
				'Invalid project ID, assignee ID, or reporter ID',
			)
		})
	})

	describe('findById', () => {
		it('should find work item by id', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}
			const createdItem = await workItemRepository.create(itemData)
			const foundItem = await workItemRepository.findById(createdItem.id)

			expect(foundItem).not.toBeNull()
			expect(foundItem!.id).toBe(createdItem.id)
			expect(foundItem!.title).toBe(testWorkItemData.title)
		})

		it('should return null for non-existent work item', async () => {
			const foundItem = await workItemRepository.findById('non-existent-id')
			expect(foundItem).toBeNull()
		})
	})

	describe('findByProjectId', () => {
		it('should find work items by project id', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Item 2',
			})

			const items = await workItemRepository.findByProjectId(testProjectId)

			expect(items).toHaveLength(2)
			expect(items[0].priorityOrder).toBeLessThanOrEqual(items[1].priorityOrder)
		})

		it('should return empty array for project with no work items', async () => {
			const items = await workItemRepository.findByProjectId(testProjectId)
			expect(items).toEqual([])
		})
	})

	describe('findByAssigneeId', () => {
		it('should find work items by assignee id', async () => {
			const assigneeId = createTestUser(db, { email: 'assignee@example.com' })
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
				assigneeId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Item 2',
			})

			const items = await workItemRepository.findByAssigneeId(assigneeId)

			expect(items).toHaveLength(2)
			expect(items.every((item) => item.assigneeId === assigneeId)).toBe(true)
		})
	})

	describe('update', () => {
		it('should update work item successfully', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}
			const createdItem = await workItemRepository.create(itemData)
			const updateData = {
				title: 'Updated Title',
				status: 'in_progress' as const,
				priority: 'high' as const,
			}

			const updatedItem = await workItemRepository.update(
				createdItem.id,
				updateData,
			)

			expect(updatedItem.title).toBe(updateData.title)
			expect(updatedItem.status).toBe(updateData.status)
			expect(updatedItem.priority).toBe(updateData.priority)
			expect(updatedItem.description).toBe(testWorkItemData.description) // unchanged
			expect(updatedItem.updatedAt.getTime()).toBeGreaterThan(
				updatedItem.createdAt.getTime(),
			)
		})

		it('should throw error when updating non-existent work item', async () => {
			await expect(
				workItemRepository.update('non-existent-id', { title: 'New Title' }),
			).rejects.toThrow('Work item not found')
		})

		it('should return unchanged work item when no update data provided', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}
			const createdItem = await workItemRepository.create(itemData)
			const updatedItem = await workItemRepository.update(createdItem.id, {})

			expect(updatedItem).toEqual(createdItem)
		})
	})

	describe('delete', () => {
		it('should delete work item successfully', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}
			const createdItem = await workItemRepository.create(itemData)

			await workItemRepository.delete(createdItem.id)

			const foundItem = await workItemRepository.findById(createdItem.id)
			expect(foundItem).toBeNull()
		})

		it('should throw error when deleting non-existent work item', async () => {
			await expect(
				workItemRepository.delete('non-existent-id'),
			).rejects.toThrow('Work item not found')
		})
	})

	describe('findByStatus', () => {
		it('should find work items by status', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Item 2',
			})
			await workItemRepository.update(item2.id, { status: 'in_progress' })

			const todoItems = await workItemRepository.findByStatus(
				testProjectId,
				'todo',
			)
			const inProgressItems = await workItemRepository.findByStatus(
				testProjectId,
				'in_progress',
			)

			expect(todoItems).toHaveLength(1)
			expect(todoItems[0].id).toBe(item1.id)
			expect(inProgressItems).toHaveLength(1)
			expect(inProgressItems[0].id).toBe(item2.id)
		})
	})

	describe('updatePriority', () => {
		it('should update work item priority order', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}
			const createdItem = await workItemRepository.create(itemData)

			const updatedItem = await workItemRepository.updatePriority(
				createdItem.id,
				5,
			)

			expect(updatedItem.priorityOrder).toBe(5)
			expect(updatedItem.updatedAt.getTime()).toBeGreaterThan(
				updatedItem.createdAt.getTime(),
			)
		})

		it('should throw error when updating priority of non-existent work item', async () => {
			await expect(
				workItemRepository.updatePriority('non-existent-id', 5),
			).rejects.toThrow('Work item not found')
		})
	})

	describe('findBacklogItems', () => {
		it('should find backlog items (todo status)', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Item 2',
			})
			await workItemRepository.update(item2.id, { status: 'in_progress' })

			const backlogItems =
				await workItemRepository.findBacklogItems(testProjectId)

			expect(backlogItems).toHaveLength(1)
			expect(backlogItems[0].id).toBe(item1.id)
			expect(backlogItems[0].status).toBe('todo')
		})
	})

	describe('findWithFilters', () => {
		it('should find work items with multiple filters', async () => {
			const assigneeId = createTestUser(db, { email: 'assignee@example.com' })
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
				assigneeId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Bug Item',
				type: 'bug' as const,
			})
			await workItemRepository.update(item2.id, {
				status: 'in_progress',
				priority: 'high',
			})

			const filteredItems = await workItemRepository.findWithFilters(
				testProjectId,
				{
					status: 'in_progress',
					type: 'bug',
					priority: 'high',
				},
			)

			expect(filteredItems).toHaveLength(1)
			expect(filteredItems[0].id).toBe(item2.id)
		})
	})

	describe('reorderBacklogItems', () => {
		it('should reorder backlog items', async () => {
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
			}

			const item1 = await workItemRepository.create(itemData)
			const item2 = await workItemRepository.create({
				...itemData,
				title: 'Item 2',
			})
			const item3 = await workItemRepository.create({
				...itemData,
				title: 'Item 3',
			})

			// Reorder: item3, item1, item2
			await workItemRepository.reorderBacklogItems(testProjectId, [
				item3.id,
				item1.id,
				item2.id,
			])

			const reorderedItem1 = await workItemRepository.findById(item1.id)
			const reorderedItem2 = await workItemRepository.findById(item2.id)
			const reorderedItem3 = await workItemRepository.findById(item3.id)

			expect(reorderedItem3!.priorityOrder).toBe(1)
			expect(reorderedItem1!.priorityOrder).toBe(2)
			expect(reorderedItem2!.priorityOrder).toBe(3)
		})
	})

	describe('getItemsWithAssigneeInfo', () => {
		it('should get work items with assignee information', async () => {
			const assigneeId = createTestUser(db, {
				email: 'assignee@example.com',
				name: 'Assignee User',
			})
			const itemData = {
				...testWorkItemData,
				projectId: testProjectId,
				reporterId: testUserId,
				assigneeId,
			}

			await workItemRepository.create(itemData)
			await workItemRepository.create({
				...itemData,
				title: 'Unassigned Item',
				assigneeId: undefined,
			})

			const itemsWithAssignee =
				await workItemRepository.getItemsWithAssigneeInfo(testProjectId)

			expect(itemsWithAssignee).toHaveLength(2)

			const assignedItem = itemsWithAssignee.find(
				(item) => item.assigneeId === assigneeId,
			)
			const unassignedItem = itemsWithAssignee.find((item) => !item.assigneeId)

			expect(assignedItem!.assigneeName).toBe('Assignee User')
			expect(assignedItem!.assigneeEmail).toBe('assignee@example.com')
			expect(unassignedItem!.assigneeName).toBeUndefined()
			expect(unassignedItem!.assigneeEmail).toBeUndefined()
		})
	})
})
