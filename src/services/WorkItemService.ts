import type { IWorkItemService, IProjectService } from '../types/services.js';
import type { IWorkItemRepository } from '../types/repositories.js';
import type { WorkItem, CreateWorkItemData, UpdateWorkItemData, KanbanBoard } from '../types/workItem.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  BusinessLogicError 
} from '../types/errors.js';

export class WorkItemService implements IWorkItemService {
  constructor(
    private workItemRepository: IWorkItemRepository,
    private projectService: IProjectService
  ) {}

  async createWorkItem(data: CreateWorkItemData, projectId: string, userId: string): Promise<WorkItem> {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Work item title is required');
    }

    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate project access
    const hasAccess = await this.projectService.validateProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    // Validate input data
    if (data.title.length > 200) {
      throw new ValidationError('Work item title must be less than 200 characters');
    }

    if (data.description && data.description.length > 2000) {
      throw new ValidationError('Work item description must be less than 2000 characters');
    }

    const validTypes = ['task', 'bug', 'story'];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError('Invalid work item type');
    }

    if (data.storyPoints !== undefined && (data.storyPoints < 1 || data.storyPoints > 100)) {
      throw new ValidationError('Story points must be between 1 and 100');
    }

    if (data.estimatedHours !== undefined && (data.estimatedHours < 1 || data.estimatedHours > 1000)) {
      throw new ValidationError('Estimated hours must be between 1 and 1000');
    }

    try {
      const workItem = await this.workItemRepository.create({
        ...data,
        projectId,
        reporterId: userId
      });

      return workItem;
    } catch (error) {
      throw new BusinessLogicError('Failed to create work item');
    }
  }

  async getWorkItem(id: string, userId: string): Promise<WorkItem> {
    if (!id) {
      throw new ValidationError('Work item ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const workItem = await this.workItemRepository.findById(id);
    if (!workItem) {
      throw new NotFoundError('Work item');
    }

    // Validate project access
    const hasAccess = await this.projectService.validateProjectAccess(workItem.projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this work item');
    }

    return workItem;
  }

  async updateWorkItem(id: string, data: UpdateWorkItemData, userId: string): Promise<WorkItem> {
    if (!id) {
      throw new ValidationError('Work item ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if work item exists and user has access
    const existingWorkItem = await this.getWorkItem(id, userId);

    // Validate update data
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        throw new ValidationError('Work item title cannot be empty');
      }
      if (data.title.length > 200) {
        throw new ValidationError('Work item title must be less than 200 characters');
      }
    }

    if (data.description !== undefined && data.description.length > 2000) {
      throw new ValidationError('Work item description must be less than 2000 characters');
    }

    if (data.type !== undefined) {
      const validTypes = ['task', 'bug', 'story'];
      if (!validTypes.includes(data.type)) {
        throw new ValidationError('Invalid work item type');
      }
    }

    if (data.status !== undefined) {
      const validStatuses = ['todo', 'in_progress', 'done'];
      if (!validStatuses.includes(data.status)) {
        throw new ValidationError('Invalid work item status');
      }
    }

    if (data.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(data.priority)) {
        throw new ValidationError('Invalid work item priority');
      }
    }

    if (data.storyPoints !== undefined && (data.storyPoints < 1 || data.storyPoints > 100)) {
      throw new ValidationError('Story points must be between 1 and 100');
    }

    if (data.estimatedHours !== undefined && (data.estimatedHours < 1 || data.estimatedHours > 1000)) {
      throw new ValidationError('Estimated hours must be between 1 and 1000');
    }

    try {
      const updatedWorkItem = await this.workItemRepository.update(id, data);
      return updatedWorkItem;
    } catch (error) {
      throw new BusinessLogicError('Failed to update work item');
    }
  }

  async deleteWorkItem(id: string, userId: string): Promise<void> {
    if (!id) {
      throw new ValidationError('Work item ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if work item exists and user has access
    await this.getWorkItem(id, userId);

    try {
      await this.workItemRepository.delete(id);
    } catch (error) {
      throw new BusinessLogicError('Failed to delete work item');
    }
  }

  async getProjectWorkItems(projectId: string, userId: string): Promise<WorkItem[]> {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate project access
    const hasAccess = await this.projectService.validateProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    try {
      const workItems = await this.workItemRepository.findByProjectId(projectId);
      return workItems;
    } catch (error) {
      throw new BusinessLogicError('Failed to retrieve project work items');
    }
  }

  async getKanbanBoard(projectId: string, userId: string): Promise<KanbanBoard> {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate project access
    const hasAccess = await this.projectService.validateProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    try {
      // Get all work items for the project
      const workItems = await this.workItemRepository.findByProjectId(projectId);

      // Group items by status for Kanban board
      const kanbanBoard: KanbanBoard = {
        todo: workItems.filter(item => item.status === 'todo'),
        in_progress: workItems.filter(item => item.status === 'in_progress'),
        done: workItems.filter(item => item.status === 'done')
      };

      // Sort each column by priority order
      kanbanBoard.todo.sort((a, b) => a.priorityOrder - b.priorityOrder);
      kanbanBoard.in_progress.sort((a, b) => a.priorityOrder - b.priorityOrder);
      kanbanBoard.done.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Most recently completed first

      return kanbanBoard;
    } catch (error) {
      throw new BusinessLogicError('Failed to retrieve Kanban board');
    }
  }

  async updateWorkItemStatus(id: string, status: 'todo' | 'in_progress' | 'done', userId: string): Promise<WorkItem> {
    if (!id) {
      throw new ValidationError('Work item ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid work item status');
    }

    // Check if work item exists and user has access
    const existingWorkItem = await this.getWorkItem(id, userId);

    // Validate status transition
    if (!this.isValidStatusTransition(existingWorkItem.status, status)) {
      throw new BusinessLogicError(`Cannot transition from ${existingWorkItem.status} to ${status}`);
    }

    try {
      const updatedWorkItem = await this.workItemRepository.update(id, { status });
      return updatedWorkItem;
    } catch (error) {
      throw new BusinessLogicError('Failed to update work item status');
    }
  }

  async getBacklog(projectId: string, userId: string): Promise<WorkItem[]> {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate project access
    const hasAccess = await this.projectService.validateProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    try {
      // Get backlog items (todo status) ordered by priority
      const backlogItems = await this.workItemRepository.findBacklogItems(projectId);
      
      // Sort by priority order (lower number = higher priority)
      return backlogItems.sort((a, b) => a.priorityOrder - b.priorityOrder);
    } catch (error) {
      throw new BusinessLogicError('Failed to retrieve backlog');
    }
  }

  async updatePriority(id: string, priorityOrder: number, userId: string): Promise<WorkItem> {
    if (!id) {
      throw new ValidationError('Work item ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (priorityOrder < 0) {
      throw new ValidationError('Priority order must be a non-negative number');
    }

    // Check if work item exists and user has access
    const existingWorkItem = await this.getWorkItem(id, userId);

    try {
      // Update priority order in repository
      const updatedWorkItem = await this.workItemRepository.updatePriority(id, priorityOrder);
      return updatedWorkItem;
    } catch (error) {
      throw new BusinessLogicError('Failed to update work item priority');
    }
  }

  async assignWorkItem(id: string, assigneeId: string, userId: string): Promise<WorkItem> {
    if (!id) {
      throw new ValidationError('Work item ID is required');
    }

    if (!assigneeId) {
      throw new ValidationError('Assignee ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if work item exists and user has access
    await this.getWorkItem(id, userId);

    try {
      const updatedWorkItem = await this.workItemRepository.update(id, { assigneeId });
      return updatedWorkItem;
    } catch (error) {
      throw new BusinessLogicError('Failed to assign work item');
    }
  }

  /**
   * Validate if a status transition is allowed
   */
  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    // Define allowed transitions - allowing more flexible transitions for Kanban board
    const allowedTransitions: Record<string, string[]> = {
      'todo': ['in_progress', 'done'], // Allow direct completion from todo
      'in_progress': ['todo', 'done'],
      'done': ['in_progress', 'todo'] // Allow moving back to todo for re-prioritization
    };

    // Same status is always allowed
    if (currentStatus === newStatus) {
      return true;
    }

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }
}