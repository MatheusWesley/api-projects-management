import { Type, type Static } from '@sinclair/typebox'

// Work item validation schemas
export const CreateWorkItemSchema = Type.Object({
	title: Type.String({
		minLength: 1,
		maxLength: 200,
		description: 'Work item title',
	}),
	description: Type.Optional(
		Type.String({
			maxLength: 2000,
			description: 'Work item description',
		}),
	),
	type: Type.Union(
		[Type.Literal('task'), Type.Literal('bug'), Type.Literal('story')],
		{
			description: 'Type of work item',
		},
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
				description: 'Work item priority',
				default: 'medium',
			},
		),
	),
	assigneeId: Type.Optional(
		Type.String({
			description: 'ID of the assigned user',
		}),
	),
	storyPoints: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: 100,
			description: 'Story points estimation',
		}),
	),
	estimatedHours: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: 1000,
			description: 'Estimated hours to complete',
		}),
	),
})

export const UpdateWorkItemSchema = Type.Object({
	title: Type.Optional(
		Type.String({
			minLength: 1,
			maxLength: 200,
			description: 'Work item title',
		}),
	),
	description: Type.Optional(
		Type.String({
			maxLength: 2000,
			description: 'Work item description',
		}),
	),
	type: Type.Optional(
		Type.Union(
			[Type.Literal('task'), Type.Literal('bug'), Type.Literal('story')],
			{
				description: 'Type of work item',
			},
		),
	),
	status: Type.Optional(
		Type.Union(
			[Type.Literal('todo'), Type.Literal('in_progress'), Type.Literal('done')],
			{
				description: 'Work item status',
			},
		),
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
				description: 'Work item priority',
			},
		),
	),
	assigneeId: Type.Optional(
		Type.String({
			description: 'ID of the assigned user',
		}),
	),
	storyPoints: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: 100,
			description: 'Story points estimation',
		}),
	),
	estimatedHours: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: 1000,
			description: 'Estimated hours to complete',
		}),
	),
})

export const UpdateWorkItemStatusSchema = Type.Object({
	status: Type.Union(
		[Type.Literal('todo'), Type.Literal('in_progress'), Type.Literal('done')],
		{
			description: 'New status for the work item',
		},
	),
})

export const UpdateWorkItemPrioritySchema = Type.Object({
	priority: Type.Integer({
		minimum: 0,
		description: 'Priority order number (lower numbers = higher priority)',
	}),
})

// Type exports for TypeScript
export type CreateWorkItemData = Static<typeof CreateWorkItemSchema>
export type UpdateWorkItemData = Static<typeof UpdateWorkItemSchema>
export type UpdateWorkItemStatusData = Static<typeof UpdateWorkItemStatusSchema>
export type UpdateWorkItemPriorityData = Static<
	typeof UpdateWorkItemPrioritySchema
>
