import type { User, CreateUserData } from './user.js';
import type { Project, CreateProjectData, UpdateProjectData } from './project.js';
import type { WorkItem, CreateWorkItemData, UpdateWorkItemData } from './workItem.js';
import type { Sprint, CreateSprintData, UpdateSprintData } from './sprint.js';

// User Repository Interface
export interface IUserRepository {
  create(user: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  list(): Promise<User[]>;
}

// Project Repository Interface
export interface IProjectRepository {
  create(project: CreateProjectData & { ownerId: string }): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  update(id: string, data: UpdateProjectData): Promise<Project>;
  delete(id: string): Promise<void>;
  list(): Promise<Project[]>;
}

// Work Item Repository Interface
export interface IWorkItemRepository {
  create(item: CreateWorkItemData & { projectId: string; reporterId: string }): Promise<WorkItem>;
  findById(id: string): Promise<WorkItem | null>;
  findByProjectId(projectId: string): Promise<WorkItem[]>;
  findByAssigneeId(assigneeId: string): Promise<WorkItem[]>;
  update(id: string, data: UpdateWorkItemData): Promise<WorkItem>;
  delete(id: string): Promise<void>;
  findByStatus(projectId: string, status: string): Promise<WorkItem[]>;
  updatePriority(id: string, priorityOrder: number): Promise<WorkItem>;
  findBacklogItems(projectId: string): Promise<WorkItem[]>;
}

// Sprint Repository Interface
export interface ISprintRepository {
  create(sprint: CreateSprintData): Promise<Sprint>;
  findById(id: string): Promise<Sprint | null>;
  findByProjectId(projectId: string): Promise<Sprint[]>;
  update(id: string, data: UpdateSprintData): Promise<Sprint>;
  delete(id: string): Promise<void>;
  findActiveSprint(projectId: string): Promise<Sprint | null>;
}