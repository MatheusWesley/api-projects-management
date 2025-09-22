/**
 * Utility functions for serializing data for API responses
 */

import type { User } from '../types/user.js'
import type { Project } from '../types/project.js'
import type { WorkItem, KanbanBoard } from '../types/workItem.js'

/**
 * Serialize a user object by converting dates to ISO strings
 */
export function serializeUser(
	user: User,
): Omit<User, 'password'> & { createdAt: string; updatedAt: string } {
	const { password: _, ...userWithoutPassword } = user
	return {
		...userWithoutPassword,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	}
}

/**
 * Serialize a project object by converting dates to ISO strings
 */
export function serializeProject(
	project: Project,
): Project & { createdAt: string; updatedAt: string } {
	return {
		...project,
		createdAt: project.createdAt.toISOString(),
		updatedAt: project.updatedAt.toISOString(),
	}
}

/**
 * Serialize a work item object by converting dates to ISO strings
 */
export function serializeWorkItem(
	workItem: WorkItem,
): WorkItem & { createdAt: string; updatedAt: string } {
	return {
		...workItem,
		createdAt: workItem.createdAt.toISOString(),
		updatedAt: workItem.updatedAt.toISOString(),
	}
}

/**
 * Serialize an array of projects
 */
export function serializeProjects(
	projects: Project[],
): (Project & { createdAt: string; updatedAt: string })[] {
	return projects.map(serializeProject)
}

/**
 * Serialize an array of work items
 */
export function serializeWorkItems(
	workItems: WorkItem[],
): (WorkItem & { createdAt: string; updatedAt: string })[] {
	return workItems.map(serializeWorkItem)
}

/**
 * Serialize a Kanban board by converting all work item dates to ISO strings
 */
export function serializeKanbanBoard(kanbanBoard: KanbanBoard): {
	todo: (WorkItem & { createdAt: string; updatedAt: string })[]
	in_progress: (WorkItem & { createdAt: string; updatedAt: string })[]
	done: (WorkItem & { createdAt: string; updatedAt: string })[]
} {
	return {
		todo: serializeWorkItems(kanbanBoard.todo),
		in_progress: serializeWorkItems(kanbanBoard.in_progress),
		done: serializeWorkItems(kanbanBoard.done),
	}
}
