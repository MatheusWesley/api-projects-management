import type { User, CreateUserData, LoginData, AuthResponse } from './user.js'
import type {
	Project,
	CreateProjectData,
	UpdateProjectData,
} from './project.js'
import type {
	WorkItem,
	CreateWorkItemData,
	UpdateWorkItemData,
	KanbanBoard,
} from './workItem.js'
import type { Sprint, CreateSprintData, UpdateSprintData } from './sprint.js'

// Authentication Service Interface
export interface IAuthService {
	login(email: string, password: string): Promise<AuthResponse>
	register(userData: CreateUserData): Promise<User>
	verifyToken(token: string): Promise<User>
	hashPassword(password: string): Promise<string>
	comparePassword(password: string, hash: string): Promise<boolean>
	generateToken(user: User): string
}

// Project Service Interface
export interface IProjectService {
	createProject(data: CreateProjectData, userId: string): Promise<Project>
	getProject(id: string, userId: string): Promise<Project>
	updateProject(
		id: string,
		data: UpdateProjectData,
		userId: string,
	): Promise<Project>
	deleteProject(id: string, userId: string): Promise<void>
	listUserProjects(userId: string): Promise<Project[]>
	validateProjectAccess(projectId: string, userId: string): Promise<boolean>
}

// Work Item Service Interface
export interface IWorkItemService {
	createWorkItem(
		data: CreateWorkItemData,
		projectId: string,
		userId: string,
	): Promise<WorkItem>
	getWorkItem(id: string, userId: string): Promise<WorkItem>
	updateWorkItem(
		id: string,
		data: UpdateWorkItemData,
		userId: string,
	): Promise<WorkItem>
	deleteWorkItem(id: string, userId: string): Promise<void>
	getProjectWorkItems(projectId: string, userId: string): Promise<WorkItem[]>
	getKanbanBoard(projectId: string, userId: string): Promise<KanbanBoard>
	updateWorkItemStatus(
		id: string,
		status: 'todo' | 'in_progress' | 'done',
		userId: string,
	): Promise<WorkItem>
	getBacklog(projectId: string, userId: string): Promise<WorkItem[]>
	updatePriority(
		id: string,
		priorityOrder: number,
		userId: string,
	): Promise<WorkItem>
	assignWorkItem(
		id: string,
		assigneeId: string,
		userId: string,
	): Promise<WorkItem>
}

// Sprint Service Interface
export interface ISprintService {
	createSprint(data: CreateSprintData, userId: string): Promise<Sprint>
	getSprint(id: string, userId: string): Promise<Sprint>
	updateSprint(
		id: string,
		data: UpdateSprintData,
		userId: string,
	): Promise<Sprint>
	deleteSprint(id: string, userId: string): Promise<void>
	getProjectSprints(projectId: string, userId: string): Promise<Sprint[]>
	getActiveSprint(projectId: string, userId: string): Promise<Sprint | null>
	startSprint(id: string, userId: string): Promise<Sprint>
	completeSprint(id: string, userId: string): Promise<Sprint>
}
