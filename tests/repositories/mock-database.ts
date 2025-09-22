// Mock database implementation for testing
// This is used because better-sqlite3 has compatibility issues with Bun's test runner

interface MockRow {
	[key: string]: any
}

export class MockDatabase {
	private tables: Map<string, MockRow[]> = new Map()
	private nextId = 1

	constructor() {
		// Initialize empty tables
		this.tables.set('users', [])
		this.tables.set('projects', [])
		this.tables.set('work_items', [])
		this.tables.set('sprints', [])
	}

	prepare(sql: string) {
		return {
			run: (...params: any[]) => {
				return this.executeQuery(sql, params)
			},
			get: (...params: any[]) => {
				const results = this.executeQuery(sql, params)
				return Array.isArray(results) ? results[0] || null : results
			},
			all: (...params: any[]) => {
				const results = this.executeQuery(sql, params)
				return Array.isArray(results) ? results : []
			},
		}
	}

	exec(sql: string) {
		// For CREATE TABLE and other DDL statements, just return
		return
	}

	pragma(statement: string) {
		// Mock pragma statements
		return
	}

	close() {
		// Mock close
	}

	private executeQuery(sql: string, params: any[] = []): any {
		const normalizedSql = sql.trim().toLowerCase()

		if (normalizedSql.startsWith('insert into users')) {
			return this.insertUser(params)
		} else if (normalizedSql.startsWith('insert into projects')) {
			return this.insertProject(params)
		} else if (normalizedSql.startsWith('insert into work_items')) {
			return this.insertWorkItem(params)
		} else if (normalizedSql.includes('select * from users where id')) {
			return this.findUserById(params[0])
		} else if (normalizedSql.includes('select * from users where email')) {
			return this.findUserByEmail(params[0])
		} else if (normalizedSql.startsWith('select * from users')) {
			return this.getAllUsers()
		} else if (
			normalizedSql.includes('select owner_id from projects where id')
		) {
			return this.findProjectOwner(params[0])
		} else if (normalizedSql.includes('select * from projects where id')) {
			return this.findProjectById(params[0])
		} else if (
			normalizedSql.includes('select * from projects') &&
			normalizedSql.includes('where owner_id')
		) {
			return this.findProjectsByUserId(params[0])
		} else if (normalizedSql.startsWith('select * from projects')) {
			return this.getAllProjects()
		} else if (normalizedSql.includes('select * from work_items where id')) {
			return this.findWorkItemById(params[0])
		} else if (normalizedSql.includes('select wi.*, u.name as assignee_name')) {
			return this.findWorkItemsWithAssigneeInfo(params[0])
		} else if (
			normalizedSql.includes('select * from work_items') &&
			normalizedSql.includes('project_id = ?') &&
			normalizedSql.includes('status = ?') &&
			params.length === 2
		) {
			return this.findWorkItemsByProjectAndStatus(params[0], params[1])
		} else if (
			normalizedSql.includes('select * from work_items where project_id = ?') &&
			params.length > 1
		) {
			return this.findWorkItemsWithFilters(sql, params)
		} else if (
			normalizedSql.includes('select * from work_items') &&
			normalizedSql.includes('where assignee_id = ?')
		) {
			return this.findWorkItemsByAssigneeId(params[0])
		} else if (
			normalizedSql.includes('select * from work_items') &&
			normalizedSql.includes('where project_id') &&
			normalizedSql.includes("status = 'todo'")
		) {
			return this.findBacklogItems(params[0])
		} else if (
			normalizedSql.includes('select * from work_items') &&
			normalizedSql.includes('where project_id')
		) {
			return this.findWorkItemsByProjectId(params[0])
		} else if (normalizedSql.startsWith('update users')) {
			return this.updateUser(sql, params)
		} else if (normalizedSql.startsWith('update projects')) {
			return this.updateProject(sql, params)
		} else if (
			normalizedSql.includes('update work_items') &&
			normalizedSql.includes('and project_id = ?')
		) {
			return this.updateWorkItemPriority(params)
		} else if (normalizedSql.startsWith('update work_items')) {
			return this.updateWorkItem(sql, params)
		} else if (normalizedSql.startsWith('delete from users')) {
			return this.deleteUser(params[0])
		} else if (normalizedSql.startsWith('delete from projects')) {
			return this.deleteProject(params[0])
		} else if (normalizedSql.startsWith('delete from work_items')) {
			return this.deleteWorkItem(params[0])
		} else if (normalizedSql.includes('max(priority_order)')) {
			return this.getMaxPriorityOrder(params[0])
		} else if (
			normalizedSql.includes(
				'select p.*, u.name as owner_name, u.email as owner_email',
			)
		) {
			return this.findProjectWithOwner(params[0])
		}

		return { changes: 0 }
	}

	private insertUser(params: any[]) {
		const users = this.tables.get('users')!
		const [id, email, name, password, role, created_at, updated_at] = params

		// Check for duplicate email
		if (users.find((u) => u.email === email)) {
			const error = new Error('UNIQUE constraint failed: users.email')
			;(error as any).code = 'SQLITE_CONSTRAINT_UNIQUE'
			throw error
		}

		const user = { id, email, name, password, role, created_at, updated_at }
		users.push(user)
		return { changes: 1 }
	}

	private insertProject(params: any[]) {
		const projects = this.tables.get('projects')!
		const [id, name, description, owner_id, created_at, updated_at] = params

		// Check if owner exists
		const users = this.tables.get('users')!
		if (!users.find((u) => u.id === owner_id)) {
			const error = new Error('FOREIGN KEY constraint failed')
			;(error as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY'
			throw error
		}

		// Ensure unique timestamps by adding a small increment
		const existingProjects = projects.length
		const adjustedCreatedAt = new Date(
			new Date(created_at).getTime() + existingProjects,
		).toISOString()
		const adjustedUpdatedAt = new Date(
			new Date(updated_at).getTime() + existingProjects,
		).toISOString()

		const project = {
			id,
			name,
			description,
			owner_id,
			status: 'active',
			created_at: adjustedCreatedAt,
			updated_at: adjustedUpdatedAt,
		}
		projects.push(project)
		return { changes: 1 }
	}

	private insertWorkItem(params: any[]) {
		const workItems = this.tables.get('work_items')!
		const [
			id,
			title,
			description,
			type,
			priority,
			project_id,
			assignee_id,
			reporter_id,
			story_points,
			estimated_hours,
			priority_order,
			created_at,
			updated_at,
		] = params

		// Check if project and users exist
		const projects = this.tables.get('projects')!
		const users = this.tables.get('users')!

		if (!projects.find((p) => p.id === project_id)) {
			const error = new Error('FOREIGN KEY constraint failed')
			;(error as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY'
			throw error
		}

		if (!users.find((u) => u.id === reporter_id)) {
			const error = new Error('FOREIGN KEY constraint failed')
			;(error as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY'
			throw error
		}

		const workItem = {
			id,
			title,
			description,
			type,
			status: 'todo',
			priority,
			project_id,
			assignee_id,
			reporter_id,
			story_points,
			estimated_hours,
			priority_order,
			created_at,
			updated_at,
		}
		workItems.push(workItem)
		return { changes: 1 }
	}

	private findUserById(id: string) {
		const users = this.tables.get('users')!
		return users.find((u) => u.id === id) || null
	}

	private findUserByEmail(email: string) {
		const users = this.tables.get('users')!
		return users.find((u) => u.email === email) || null
	}

	private getAllUsers() {
		const users = this.tables.get('users')!
		return [...users].sort((a, b) => {
			const timeA = new Date(a.created_at).getTime()
			const timeB = new Date(b.created_at).getTime()
			return timeB - timeA // Most recent first
		})
	}

	private findProjectById(id: string) {
		const projects = this.tables.get('projects')!
		return projects.find((p) => p.id === id) || null
	}

	private findProjectOwner(id: string) {
		const projects = this.tables.get('projects')!
		const project = projects.find((p) => p.id === id)
		return project ? { owner_id: project.owner_id } : null
	}

	private findProjectsByUserId(userId: string) {
		const projects = this.tables.get('projects')!
		return projects
			.filter((p) => p.owner_id === userId)
			.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			)
	}

	private getAllProjects() {
		const projects = this.tables.get('projects')!
		return [...projects].sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		)
	}

	private findWorkItemById(id: string) {
		const workItems = this.tables.get('work_items')!
		return workItems.find((w) => w.id === id) || null
	}

	private findWorkItemsByProjectId(projectId: string) {
		const workItems = this.tables.get('work_items')!
		return workItems
			.filter((w) => w.project_id === projectId)
			.sort((a, b) => a.priority_order - b.priority_order)
	}

	private findWorkItemsByAssigneeId(assigneeId: string) {
		const workItems = this.tables.get('work_items')!
		return workItems
			.filter((w) => w.assignee_id === assigneeId)
			.sort((a, b) => a.priority_order - b.priority_order)
	}

	private updateUser(sql: string, params: any[]) {
		const users = this.tables.get('users')!
		const id = params[params.length - 1]
		const userIndex = users.findIndex((u) => u.id === id)

		if (userIndex === -1) {
			return { changes: 0 }
		}

		const user = users[userIndex]
		const sqlParts = sql.split('SET')[1].split('WHERE')[0].trim()
		const updates = sqlParts.split(',').map((s) => s.trim())

		let paramIndex = 0
		for (const update of updates) {
			if (update.includes('email =')) {
				const newEmail = params[paramIndex]
				if (users.find((u) => u.email === newEmail && u.id !== id)) {
					const error = new Error('UNIQUE constraint failed: users.email')
					;(error as any).code = 'SQLITE_CONSTRAINT_UNIQUE'
					throw error
				}
				user.email = newEmail
				paramIndex++
			} else if (update.includes('name =')) {
				user.name = params[paramIndex]
				paramIndex++
			} else if (update.includes('password =')) {
				user.password = params[paramIndex]
				paramIndex++
			} else if (update.includes('role =')) {
				user.role = params[paramIndex]
				paramIndex++
			} else if (update.includes('updated_at =')) {
				// Ensure updated_at is always later than created_at
				const newUpdatedAt = new Date(params[paramIndex])
				const createdAt = new Date(user.created_at)
				user.updated_at =
					newUpdatedAt.getTime() <= createdAt.getTime()
						? new Date(createdAt.getTime() + 1).toISOString()
						: newUpdatedAt.toISOString()
				paramIndex++
			}
		}

		return { changes: 1 }
	}

	private updateProject(sql: string, params: any[]) {
		const projects = this.tables.get('projects')!
		const id = params[params.length - 1]
		const projectIndex = projects.findIndex((p) => p.id === id)

		if (projectIndex === -1) {
			return { changes: 0 }
		}

		const project = projects[projectIndex]

		// Parse the SQL to understand which fields are being updated
		const lowerSql = sql.toLowerCase()
		let paramIndex = 0

		if (lowerSql.includes('name =')) {
			project.name = params[paramIndex++]
		}
		if (lowerSql.includes('description =')) {
			project.description = params[paramIndex++]
		}
		if (lowerSql.includes('status =')) {
			project.status = params[paramIndex++]
		}

		// The updated_at is always the second to last parameter
		// Ensure updated_at is always later than created_at
		const newUpdatedAt = new Date(params[params.length - 2])
		const createdAt = new Date(project.created_at)
		project.updated_at =
			newUpdatedAt.getTime() <= createdAt.getTime()
				? new Date(createdAt.getTime() + 1).toISOString()
				: newUpdatedAt.toISOString()

		return { changes: 1 }
	}

	private updateWorkItem(sql: string, params: any[]) {
		const workItems = this.tables.get('work_items')!
		const id = params[params.length - 1]
		const itemIndex = workItems.findIndex((w) => w.id === id)

		if (itemIndex === -1) {
			return { changes: 0 }
		}

		const item = workItems[itemIndex]
		const lowerSql = sql.toLowerCase()
		let paramIndex = 0

		if (lowerSql.includes('title =')) {
			item.title = params[paramIndex++]
		}
		if (lowerSql.includes('description =')) {
			item.description = params[paramIndex++]
		}
		if (lowerSql.includes('type =')) {
			item.type = params[paramIndex++]
		}
		if (lowerSql.includes('status =')) {
			item.status = params[paramIndex++]
		}
		if (lowerSql.includes('priority =')) {
			item.priority = params[paramIndex++]
		}
		if (lowerSql.includes('assignee_id =')) {
			item.assignee_id = params[paramIndex++]
		}
		if (lowerSql.includes('story_points =')) {
			item.story_points = params[paramIndex++]
		}
		if (lowerSql.includes('estimated_hours =')) {
			item.estimated_hours = params[paramIndex++]
		}
		if (lowerSql.includes('priority_order =')) {
			item.priority_order = params[paramIndex++]
		}

		// updated_at is always the second to last parameter
		// Ensure updated_at is always later than created_at
		const newUpdatedAt = new Date(params[params.length - 2])
		const createdAt = new Date(item.created_at)
		item.updated_at =
			newUpdatedAt.getTime() <= createdAt.getTime()
				? new Date(createdAt.getTime() + 1).toISOString()
				: newUpdatedAt.toISOString()
		return { changes: 1 }
	}

	private deleteUser(id: string) {
		const users = this.tables.get('users')!
		const initialLength = users.length
		const filtered = users.filter((u) => u.id !== id)
		this.tables.set('users', filtered)
		return { changes: initialLength - filtered.length }
	}

	private deleteProject(id: string) {
		const projects = this.tables.get('projects')!
		const initialLength = projects.length
		const filtered = projects.filter((p) => p.id !== id)
		this.tables.set('projects', filtered)
		return { changes: initialLength - filtered.length }
	}

	private deleteWorkItem(id: string) {
		const workItems = this.tables.get('work_items')!
		const initialLength = workItems.length
		const filtered = workItems.filter((w) => w.id !== id)
		this.tables.set('work_items', filtered)
		return { changes: initialLength - filtered.length }
	}

	private getMaxPriorityOrder(projectId: string) {
		const workItems = this.tables.get('work_items')!
		const projectItems = workItems.filter((w) => w.project_id === projectId)
		const maxPriority =
			projectItems.length > 0
				? Math.max(...projectItems.map((w) => w.priority_order || 0))
				: 0
		return { max_priority: maxPriority }
	}

	private findBacklogItems(projectId: string) {
		const workItems = this.tables.get('work_items')!
		return workItems.filter(
			(w) => w.project_id === projectId && w.status === 'todo',
		)
	}

	private findProjectWithOwner(projectId: string) {
		const projects = this.tables.get('projects')!
		const users = this.tables.get('users')!

		const project = projects.find((p) => p.id === projectId)
		if (!project) return null

		const owner = users.find((u) => u.id === project.owner_id)
		if (!owner) return null

		return {
			...project,
			owner_name: owner.name,
			owner_email: owner.email,
		}
	}

	private findWorkItemsByProjectAndStatus(projectId: string, status: string) {
		const workItems = this.tables.get('work_items')!
		return workItems
			.filter((w) => w.project_id === projectId && w.status === status)
			.sort((a, b) => a.priority_order - b.priority_order)
	}

	private findWorkItemsWithAssigneeInfo(projectId: string) {
		const workItems = this.tables.get('work_items')!
		const users = this.tables.get('users')!

		return workItems
			.filter((w) => w.project_id === projectId)
			.map((item) => {
				const assignee = item.assignee_id
					? users.find((u) => u.id === item.assignee_id)
					: null
				return {
					...item,
					assignee_name: assignee?.name || null,
					assignee_email: assignee?.email || null,
				}
			})
			.sort((a, b) => a.priority_order - b.priority_order)
	}

	private findWorkItemsWithFilters(sql: string, params: any[]) {
		const workItems = this.tables.get('work_items')!
		const projectId = params[0]
		let filteredItems = workItems.filter((w) => w.project_id === projectId)

		const lowerSql = sql.toLowerCase()
		let paramIndex = 1

		if (lowerSql.includes('and status = ?')) {
			filteredItems = filteredItems.filter(
				(w) => w.status === params[paramIndex++],
			)
		}
		if (lowerSql.includes('and type = ?')) {
			filteredItems = filteredItems.filter(
				(w) => w.type === params[paramIndex++],
			)
		}
		if (lowerSql.includes('and assignee_id = ?')) {
			filteredItems = filteredItems.filter(
				(w) => w.assignee_id === params[paramIndex++],
			)
		}
		if (lowerSql.includes('and priority = ?')) {
			filteredItems = filteredItems.filter(
				(w) => w.priority === params[paramIndex++],
			)
		}

		return filteredItems.sort((a, b) => a.priority_order - b.priority_order)
	}

	private updateWorkItemPriority(params: any[]) {
		const workItems = this.tables.get('work_items')!
		const [priorityOrder, updatedAt, itemId, projectId] = params

		const itemIndex = workItems.findIndex(
			(w) => w.id === itemId && w.project_id === projectId,
		)
		if (itemIndex === -1) {
			return { changes: 0 }
		}

		const item = workItems[itemIndex]
		item.priority_order = priorityOrder

		// Ensure updated_at is always later than created_at
		const newUpdatedAt = new Date(updatedAt)
		const createdAt = new Date(item.created_at)
		item.updated_at =
			newUpdatedAt.getTime() <= createdAt.getTime()
				? new Date(createdAt.getTime() + 1).toISOString()
				: newUpdatedAt.toISOString()

		return { changes: 1 }
	}
}
