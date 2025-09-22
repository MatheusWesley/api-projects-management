import type { Database } from 'bun:sqlite'
import type { IWorkItemRepository } from '../types/repositories.js'
import type {
	WorkItem,
	CreateWorkItemData,
	UpdateWorkItemData,
} from '../types/workItem.js'
import { generateId, mapWorkItemRow } from '../config/database.js'

export class WorkItemRepository implements IWorkItemRepository {
	constructor(private db: Database) {}

	async create(
		itemData: CreateWorkItemData & { projectId: string; reporterId: string },
	): Promise<WorkItem> {
		const id = generateId()
		const now = new Date().toISOString()

		// Get the next priority order for this project
		const maxPriorityStmt = this.db.prepare(`
      SELECT COALESCE(MAX(priority_order), 0) as max_priority 
      FROM work_items 
      WHERE project_id = ?
    `)
		const maxPriorityResult = maxPriorityStmt.get(itemData.projectId) as {
			max_priority: number
		}
		const nextPriorityOrder = maxPriorityResult.max_priority + 1

		const stmt = this.db.prepare(`
      INSERT INTO work_items (
        id, title, description, type, status, priority, project_id, 
        assignee_id, reporter_id, story_points, estimated_hours, 
        priority_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

		try {
			stmt.run(
				id,
				itemData.title,
				itemData.description || '',
				itemData.type,
				itemData.priority || 'medium',
				itemData.projectId,
				itemData.assigneeId || null,
				itemData.reporterId,
				itemData.storyPoints || null,
				itemData.estimatedHours || null,
				nextPriorityOrder,
				now,
				now,
			)

			const workItem = await this.findById(id)
			if (!workItem) {
				throw new Error('Failed to create work item')
			}

			return workItem
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
				throw new Error('Invalid project ID, assignee ID, or reporter ID')
			}
			throw error
		}
	}

	async findById(id: string): Promise<WorkItem | null> {
		const stmt = this.db.prepare('SELECT * FROM work_items WHERE id = ?')
		const row = stmt.get(id)

		return row ? mapWorkItemRow(row) : null
	}

	async findByProjectId(projectId: string): Promise<WorkItem[]> {
		const stmt = this.db.prepare(`
      SELECT * FROM work_items 
      WHERE project_id = ? 
      ORDER BY priority_order ASC, created_at DESC
    `)
		const rows = stmt.all(projectId)

		return rows.map(mapWorkItemRow)
	}

	async findByAssigneeId(assigneeId: string): Promise<WorkItem[]> {
		const stmt = this.db.prepare(`
      SELECT * FROM work_items 
      WHERE assignee_id = ? 
      ORDER BY priority_order ASC, created_at DESC
    `)
		const rows = stmt.all(assigneeId)

		return rows.map(mapWorkItemRow)
	}

	async update(id: string, data: UpdateWorkItemData): Promise<WorkItem> {
		const existingItem = await this.findById(id)
		if (!existingItem) {
			throw new Error('Work item not found')
		}

		const updateFields: string[] = []
		const updateValues: any[] = []

		if (data.title !== undefined) {
			updateFields.push('title = ?')
			updateValues.push(data.title)
		}
		if (data.description !== undefined) {
			updateFields.push('description = ?')
			updateValues.push(data.description)
		}
		if (data.type !== undefined) {
			updateFields.push('type = ?')
			updateValues.push(data.type)
		}
		if (data.status !== undefined) {
			updateFields.push('status = ?')
			updateValues.push(data.status)
		}
		if (data.priority !== undefined) {
			updateFields.push('priority = ?')
			updateValues.push(data.priority)
		}
		if (data.assigneeId !== undefined) {
			updateFields.push('assignee_id = ?')
			updateValues.push(data.assigneeId)
		}
		if (data.storyPoints !== undefined) {
			updateFields.push('story_points = ?')
			updateValues.push(data.storyPoints)
		}
		if (data.estimatedHours !== undefined) {
			updateFields.push('estimated_hours = ?')
			updateValues.push(data.estimatedHours)
		}

		if (updateFields.length === 0) {
			return existingItem
		}

		updateFields.push('updated_at = ?')
		updateValues.push(new Date().toISOString())
		updateValues.push(id)

		const stmt = this.db.prepare(`
      UPDATE work_items 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `)

		try {
			stmt.run(...updateValues)

			const updatedItem = await this.findById(id)
			if (!updatedItem) {
				throw new Error('Failed to update work item')
			}

			return updatedItem
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
				throw new Error('Invalid assignee ID')
			}
			throw error
		}
	}

	async delete(id: string): Promise<void> {
		const stmt = this.db.prepare('DELETE FROM work_items WHERE id = ?')
		const result = stmt.run(id)

		if (result.changes === 0) {
			throw new Error('Work item not found')
		}
	}

	async findByStatus(projectId: string, status: string): Promise<WorkItem[]> {
		const stmt = this.db.prepare(`
      SELECT * FROM work_items 
      WHERE project_id = ? AND status = ? 
      ORDER BY priority_order ASC, created_at DESC
    `)
		const rows = stmt.all(projectId, status)

		return rows.map(mapWorkItemRow)
	}

	async updatePriority(id: string, priorityOrder: number): Promise<WorkItem> {
		const existingItem = await this.findById(id)
		if (!existingItem) {
			throw new Error('Work item not found')
		}

		const stmt = this.db.prepare(`
      UPDATE work_items 
      SET priority_order = ?, updated_at = ? 
      WHERE id = ?
    `)

		stmt.run(priorityOrder, new Date().toISOString(), id)

		const updatedItem = await this.findById(id)
		if (!updatedItem) {
			throw new Error('Failed to update work item priority')
		}

		return updatedItem
	}

	async findBacklogItems(projectId: string): Promise<WorkItem[]> {
		const stmt = this.db.prepare(`
      SELECT * FROM work_items 
      WHERE project_id = ? AND status = 'todo' 
      ORDER BY priority_order ASC, created_at DESC
    `)
		const rows = stmt.all(projectId)

		return rows.map(mapWorkItemRow)
	}

	// Additional utility methods for filtering and advanced queries
	async findWithFilters(
		projectId: string,
		filters: {
			status?: string
			type?: string
			assigneeId?: string
			priority?: string
		},
	): Promise<WorkItem[]> {
		let query = 'SELECT * FROM work_items WHERE project_id = ?'
		const params: any[] = [projectId]

		if (filters.status) {
			query += ' AND status = ?'
			params.push(filters.status)
		}
		if (filters.type) {
			query += ' AND type = ?'
			params.push(filters.type)
		}
		if (filters.assigneeId) {
			query += ' AND assignee_id = ?'
			params.push(filters.assigneeId)
		}
		if (filters.priority) {
			query += ' AND priority = ?'
			params.push(filters.priority)
		}

		query += ' ORDER BY priority_order ASC, created_at DESC'

		const stmt = this.db.prepare(query)
		const rows = stmt.all(...params)

		return rows.map(mapWorkItemRow)
	}

	async reorderBacklogItems(
		projectId: string,
		itemIds: string[],
	): Promise<void> {
		// Use a prepared statement for better performance
		const stmt = this.db.prepare(`
      UPDATE work_items 
      SET priority_order = ?, updated_at = ? 
      WHERE id = ? AND project_id = ?
    `)

		itemIds.forEach((itemId, index) => {
			stmt.run(index + 1, new Date().toISOString(), itemId, projectId)
		})
	}

	async getItemsWithAssigneeInfo(
		projectId: string,
	): Promise<
		Array<WorkItem & { assigneeName?: string; assigneeEmail?: string }>
	> {
		const stmt = this.db.prepare(`
      SELECT wi.*, u.name as assignee_name, u.email as assignee_email
      FROM work_items wi
      LEFT JOIN users u ON wi.assignee_id = u.id
      WHERE wi.project_id = ?
      ORDER BY wi.priority_order ASC, wi.created_at DESC
    `)
		const rows = stmt.all(projectId)

		return rows.map((row) => {
			const workItem = mapWorkItemRow(row)
			return {
				...workItem,
				assigneeName: row.assignee_name || undefined,
				assigneeEmail: row.assignee_email || undefined,
			}
		})
	}
}
