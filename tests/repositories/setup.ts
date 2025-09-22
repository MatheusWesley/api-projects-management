import { MockDatabase } from './mock-database.js'

export function createTestDatabase(): MockDatabase {
	// Use mock database for tests due to better-sqlite3 compatibility issues with Bun
	return new MockDatabase()
}

export function cleanupTestDatabase(): void {
	// No cleanup needed for mock database
}

// Test data factories
export const testUserData = {
	email: 'test@example.com',
	name: 'Test User',
	password: 'hashedpassword123',
	role: 'developer' as const,
}

export const testProjectData = {
	name: 'Test Project',
	description: 'A test project for unit testing',
}

export const testWorkItemData = {
	title: 'Test Work Item',
	description: 'A test work item for unit testing',
	type: 'task' as const,
}

export function createTestUser(
	db: any,
	overrides: Partial<typeof testUserData> = {},
) {
	const userData = { ...testUserData, ...overrides }
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	const stmt = db.prepare(`
    INSERT INTO users (id, email, name, password, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

	stmt.run(
		id,
		userData.email,
		userData.name,
		userData.password,
		userData.role,
		now,
		now,
	)
	return id
}

export function createTestProject(
	db: any,
	ownerId: string,
	overrides: Partial<typeof testProjectData> = {},
) {
	const projectData = { ...testProjectData, ...overrides }
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	const stmt = db.prepare(`
    INSERT INTO projects (id, name, description, owner_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?)
  `)

	stmt.run(id, projectData.name, projectData.description, ownerId, now, now)
	return id
}

export function createTestWorkItem(
	db: any,
	projectId: string,
	reporterId: string,
	overrides: Partial<typeof testWorkItemData> = {},
) {
	const itemData = { ...testWorkItemData, ...overrides }
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	const stmt = db.prepare(`
    INSERT INTO work_items (
      id, title, description, type, status, priority, project_id, 
      reporter_id, priority_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'todo', 'medium', ?, ?, 1, ?, ?)
  `)

	stmt.run(
		id,
		itemData.title,
		itemData.description,
		itemData.type,
		projectId,
		reporterId,
		now,
		now,
	)
	return id
}
