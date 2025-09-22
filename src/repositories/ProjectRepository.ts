import type { Database } from 'bun:sqlite'
import type { IProjectRepository } from '../types/repositories.js'
import type {
	Project,
	CreateProjectData,
	UpdateProjectData,
} from '../types/project.js'
import { generateId, mapProjectRow } from '../config/database.js'

export class ProjectRepository implements IProjectRepository {
	constructor(private db: Database) {}

	async create(
		projectData: CreateProjectData & { ownerId: string },
	): Promise<Project> {
		const id = generateId()
		const now = new Date().toISOString()

		const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, owner_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `)

		try {
			stmt.run(
				id,
				projectData.name,
				projectData.description || '',
				projectData.ownerId,
				now,
				now,
			)

			const project = await this.findById(id)
			if (!project) {
				throw new Error('Failed to create project')
			}

			return project
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
				throw new Error('Invalid owner ID')
			}
			throw error
		}
	}

	async findById(id: string): Promise<Project | null> {
		const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
		const row = stmt.get(id)

		return row ? mapProjectRow(row) : null
	}

	async findByUserId(userId: string): Promise<Project[]> {
		const stmt = this.db.prepare(`
      SELECT * FROM projects 
      WHERE owner_id = ? 
      ORDER BY created_at DESC
    `)
		const rows = stmt.all(userId)

		return rows.map(mapProjectRow)
	}

	async update(id: string, data: UpdateProjectData): Promise<Project> {
		const existingProject = await this.findById(id)
		if (!existingProject) {
			throw new Error('Project not found')
		}

		const updateFields: string[] = []
		const updateValues: any[] = []

		if (data.name !== undefined) {
			updateFields.push('name = ?')
			updateValues.push(data.name)
		}
		if (data.description !== undefined) {
			updateFields.push('description = ?')
			updateValues.push(data.description)
		}
		if (data.status !== undefined) {
			updateFields.push('status = ?')
			updateValues.push(data.status)
		}

		if (updateFields.length === 0) {
			return existingProject
		}

		updateFields.push('updated_at = ?')
		updateValues.push(new Date().toISOString())
		updateValues.push(id)

		const stmt = this.db.prepare(`
      UPDATE projects 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `)

		stmt.run(...updateValues)

		const updatedProject = await this.findById(id)
		if (!updatedProject) {
			throw new Error('Failed to update project')
		}

		return updatedProject
	}

	async delete(id: string): Promise<void> {
		const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
		const result = stmt.run(id)

		if (result.changes === 0) {
			throw new Error('Project not found')
		}
	}

	async list(): Promise<Project[]> {
		const stmt = this.db.prepare(
			'SELECT * FROM projects ORDER BY created_at DESC',
		)
		const rows = stmt.all()

		return rows.map(mapProjectRow)
	}

	// Additional method to check if user owns project
	async isOwner(projectId: string, userId: string): Promise<boolean> {
		const stmt = this.db.prepare('SELECT owner_id FROM projects WHERE id = ?')
		const row = stmt.get(projectId) as { owner_id: string } | undefined

		return row ? row.owner_id === userId : false
	}

	// Additional method to get project with owner info
	async findByIdWithOwner(
		id: string,
	): Promise<(Project & { ownerName: string; ownerEmail: string }) | null> {
		const stmt = this.db.prepare(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `)
		const row = stmt.get(id) as any

		if (!row) return null

		const project = mapProjectRow(row)
		return {
			...project,
			ownerName: row.owner_name,
			ownerEmail: row.owner_email,
		}
	}
}
