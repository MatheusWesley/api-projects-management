import type { IProjectService } from '../types/services.js';
import type { IProjectRepository } from '../types/repositories.js';
import type { Project, CreateProjectData, UpdateProjectData } from '../types/project.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  BusinessLogicError 
} from '../types/errors.js';

export class ProjectService implements IProjectService {
  constructor(private projectRepository: IProjectRepository) {}

  async createProject(data: CreateProjectData, userId: string): Promise<Project> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Project name is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate name length
    if (data.name.length > 200) {
      throw new ValidationError('Project name must be less than 200 characters');
    }

    // Validate description length if provided
    if (data.description && data.description.length > 1000) {
      throw new ValidationError('Project description must be less than 1000 characters');
    }

    try {
      const project = await this.projectRepository.create({
        ...data,
        ownerId: userId
      });

      return project;
    } catch (error) {
      throw new BusinessLogicError('Failed to create project');
    }
  }

  async getProject(id: string, userId: string): Promise<Project> {
    if (!id) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Check if user has access to this project
    const hasAccess = await this.validateProjectAccess(id, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    return project;
  }

  async updateProject(id: string, data: UpdateProjectData, userId: string): Promise<Project> {
    if (!id) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if project exists and user has access
    const existingProject = await this.getProject(id, userId);

    // Only project owner can update the project
    if (existingProject.ownerId !== userId) {
      throw new ForbiddenError('Only project owner can update the project');
    }

    // Validate update data
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Project name cannot be empty');
      }
      if (data.name.length > 200) {
        throw new ValidationError('Project name must be less than 200 characters');
      }
    }

    if (data.description !== undefined && data.description.length > 1000) {
      throw new ValidationError('Project description must be less than 1000 characters');
    }

    if (data.status !== undefined) {
      const validStatuses = ['active', 'archived', 'completed'];
      if (!validStatuses.includes(data.status)) {
        throw new ValidationError('Invalid project status');
      }
    }

    try {
      const updatedProject = await this.projectRepository.update(id, data);
      return updatedProject;
    } catch (error) {
      throw new BusinessLogicError('Failed to update project');
    }
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    if (!id) {
      throw new ValidationError('Project ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if project exists and user has access
    const existingProject = await this.getProject(id, userId);

    // Only project owner can delete the project
    if (existingProject.ownerId !== userId) {
      throw new ForbiddenError('Only project owner can delete the project');
    }

    try {
      await this.projectRepository.delete(id);
    } catch (error) {
      throw new BusinessLogicError('Failed to delete project');
    }
  }

  async listUserProjects(userId: string): Promise<Project[]> {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    try {
      const projects = await this.projectRepository.findByUserId(userId);
      return projects;
    } catch (error) {
      throw new BusinessLogicError('Failed to retrieve user projects');
    }
  }

  async validateProjectAccess(projectId: string, userId: string): Promise<boolean> {
    if (!projectId || !userId) {
      return false;
    }

    try {
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        return false;
      }

      // For now, only project owner has access
      // This can be extended to include team members in the future
      return project.ownerId === userId;
    } catch (error) {
      return false;
    }
  }
}