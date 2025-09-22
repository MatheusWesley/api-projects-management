import type { Database } from 'bun:sqlite'
import type { IUserRepository } from '../types/repositories.js'
import type { User, CreateUserData } from '../types/user.js'
import { generateId, mapUserRow } from '../config/database.js'

export class UserRepository implements IUserRepository {
	constructor(private db: Database) {}

	async create(userData: CreateUserData): Promise<User> {
		const id = generateId()
		const now = new Date().toISOString()

		const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

		try {
			stmt.run(
				id,
				userData.email,
				userData.name,
				userData.password,
				userData.role,
				now,
				now,
			)

			const user = await this.findById(id)
			if (!user) {
				throw new Error('Failed to create user')
			}

			return user
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
				throw new Error('User with this email already exists')
			}
			throw error
		}
	}

	async findById(id: string): Promise<User | null> {
		const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?')
		const row = stmt.get(id)

		return row ? mapUserRow(row) : null
	}

	async findByEmail(email: string): Promise<User | null> {
		const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?')
		const row = stmt.get(email)

		return row ? mapUserRow(row) : null
	}

	async update(id: string, data: Partial<User>): Promise<User> {
		const existingUser = await this.findById(id)
		if (!existingUser) {
			throw new Error('User not found')
		}

		const updateFields: string[] = []
		const updateValues: any[] = []

		if (data.email !== undefined) {
			updateFields.push('email = ?')
			updateValues.push(data.email)
		}
		if (data.name !== undefined) {
			updateFields.push('name = ?')
			updateValues.push(data.name)
		}
		if (data.password !== undefined) {
			updateFields.push('password = ?')
			updateValues.push(data.password)
		}
		if (data.role !== undefined) {
			updateFields.push('role = ?')
			updateValues.push(data.role)
		}

		if (updateFields.length === 0) {
			return existingUser
		}

		updateFields.push('updated_at = ?')
		updateValues.push(new Date().toISOString())
		updateValues.push(id)

		const stmt = this.db.prepare(`
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `)

		try {
			stmt.run(...updateValues)

			const updatedUser = await this.findById(id)
			if (!updatedUser) {
				throw new Error('Failed to update user')
			}

			return updatedUser
		} catch (error: any) {
			if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
				throw new Error('User with this email already exists')
			}
			throw error
		}
	}

	async delete(id: string): Promise<void> {
		const stmt = this.db.prepare('DELETE FROM users WHERE id = ?')
		const result = stmt.run(id)

		if (result.changes === 0) {
			throw new Error('User not found')
		}
	}

	async list(): Promise<User[]> {
		const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC')
		const rows = stmt.all()

		return rows.map(mapUserRow)
	}
}
