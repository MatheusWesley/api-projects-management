import { Type, type Static, type TSchema } from '@sinclair/typebox'

// Common parameter validation schemas for route params and query strings

// Route parameter schemas
export const IdParamSchema = Type.Object({
	id: Type.String({
		minLength: 1,
		description: 'Resource ID',
	}),
})

export const ProjectIdParamSchema = Type.Object({
	projectId: Type.String({
		minLength: 1,
		description: 'Project ID',
	}),
})

export const ProjectItemParamsSchema = Type.Object({
	projectId: Type.String({
		minLength: 1,
		description: 'Project ID',
	}),
	id: Type.Optional(
		Type.String({
			minLength: 1,
			description: 'Item ID',
		}),
	),
})

// Query parameter schemas
export const WorkItemQuerySchema = Type.Object({
	status: Type.Optional(
		Type.Union(
			[Type.Literal('todo'), Type.Literal('in_progress'), Type.Literal('done')],
			{
				description: 'Filter by work item status',
			},
		),
	),
	type: Type.Optional(
		Type.Union(
			[Type.Literal('task'), Type.Literal('bug'), Type.Literal('story')],
			{
				description: 'Filter by work item type',
			},
		),
	),
	assigneeId: Type.Optional(
		Type.String({
			description: 'Filter by assigned user ID',
		}),
	),
	priority: Type.Optional(
		Type.Union(
			[
				Type.Literal('low'),
				Type.Literal('medium'),
				Type.Literal('high'),
				Type.Literal('critical'),
			],
			{
				description: 'Filter by priority level',
			},
		),
	),
	limit: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: 100,
			default: 50,
			description: 'Maximum number of items to return',
		}),
	),
	offset: Type.Optional(
		Type.Integer({
			minimum: 0,
			default: 0,
			description: 'Number of items to skip',
		}),
	),
})

export const ProjectQuerySchema = Type.Object({
	status: Type.Optional(
		Type.Union(
			[
				Type.Literal('active'),
				Type.Literal('archived'),
				Type.Literal('completed'),
			],
			{
				description: 'Filter by project status',
			},
		),
	),
	limit: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: 100,
			default: 50,
			description: 'Maximum number of projects to return',
		}),
	),
	offset: Type.Optional(
		Type.Integer({
			minimum: 0,
			default: 0,
			description: 'Number of projects to skip',
		}),
	),
})

// Response schemas for consistent API responses
export const ErrorResponseSchema = Type.Object({
	error: Type.Object({
		code: Type.String({
			description: 'Error code',
		}),
		message: Type.String({
			description: 'Error message',
		}),
		details: Type.Optional(
			Type.Any({
				description: 'Additional error details',
			}),
		),
	}),
})

export const SuccessResponseSchema = <T extends TSchema>(dataSchema: T) =>
	Type.Object({
		data: dataSchema,
		message: Type.Optional(
			Type.String({
				description: 'Success message',
			}),
		),
	})

export const PaginatedResponseSchema = <T extends TSchema>(itemSchema: T) =>
	Type.Object({
		data: Type.Array(itemSchema),
		pagination: Type.Object({
			total: Type.Integer({
				minimum: 0,
				description: 'Total number of items',
			}),
			limit: Type.Integer({
				minimum: 1,
				description: 'Items per page',
			}),
			offset: Type.Integer({
				minimum: 0,
				description: 'Number of items skipped',
			}),
			hasMore: Type.Boolean({
				description: 'Whether there are more items available',
			}),
		}),
	})

// Type exports for TypeScript
export type IdParam = Static<typeof IdParamSchema>
export type ProjectIdParam = Static<typeof ProjectIdParamSchema>
export type ProjectItemParams = Static<typeof ProjectItemParamsSchema>
export type WorkItemQuery = Static<typeof WorkItemQuerySchema>
export type ProjectQuery = Static<typeof ProjectQuerySchema>
export type ErrorResponse = Static<typeof ErrorResponseSchema>
export type SuccessResponse<T> = {
	data: T
	message?: string
}
export type PaginatedResponse<T> = {
	data: T[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}
