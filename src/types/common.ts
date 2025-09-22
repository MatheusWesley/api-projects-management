// Common types and interfaces
export interface BaseEntity {
	id: string
	createdAt: Date
	updatedAt: Date
}

export interface PaginationParams {
	page?: number
	limit?: number
}

export interface ApiResponse<T> {
	data: T
	message?: string
}

export interface ErrorResponse {
	error: {
		code: string
		message: string
		details?: any
	}
}

// Filter and query types
export interface WorkItemFilters {
	status?: 'todo' | 'in_progress' | 'done'
	type?: 'task' | 'bug' | 'story'
	assigneeId?: string
	priority?: 'low' | 'medium' | 'high' | 'critical'
}

export interface ProjectFilters {
	status?: 'active' | 'archived' | 'completed'
	ownerId?: string
}

// JWT Payload type
export interface JWTPayload {
	userId: string
	email: string
	role: 'admin' | 'manager' | 'developer'
	iat?: number
	exp?: number
}

// Database connection types
export interface DatabaseConfig {
	filename: string
	verbose?: boolean
}

// Request context type for middleware
export interface RequestContext {
	user?: {
		id: string
		email: string
		role: 'admin' | 'manager' | 'developer'
	}
}
