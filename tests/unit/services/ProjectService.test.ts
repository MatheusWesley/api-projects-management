import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ProjectService } from '../../../src/services/ProjectService.js';
import type { IProjectRepository } from '../../../src/types/repositories.js';
import type { Project, CreateProjectData, UpdateProjectData } from '../../../src/types/project.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  BusinessLogicError 
} from '../../../src/types/errors.js';

// Mock project data
const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  description: 'Test Description',
  ownerId: 'user1',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCreateProjectData: CreateProjectData = {
  name: 'New Project',
  description: 'New Description'
};

const mockUpdateProjectData: UpdateProjectData = {
  name: 'Updated Project',
  description: 'Updated Description',
  status: 'completed'
};

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: IProjectRepository;

  beforeEach(() => {
    // Create mock repository
    mockProjectRepository = {
      create: mock(() => Promise.resolve(mockProject)),
      findById: mock(() => Promise.resolve(mockProject)),
      findByUserId: mock(() => Promise.resolve([mockProject])),
      update: mock(() => Promise.resolve({ ...mockProject, ...mockUpdateProjectData })),
      delete: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve([mockProject]))
    };

    projectService = new ProjectService(mockProjectRepository);
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const result = await projectService.createProject(mockCreateProjectData, 'user1');

      expect(result).toEqual(mockProject);
      expect(mockProjectRepository.create).toHaveBeenCalledWith({
        ...mockCreateProjectData,
        ownerId: 'user1'
      });
    });

    it('should throw ValidationError when name is missing', async () => {
      const invalidData = { ...mockCreateProjectData, name: '' };
      await expect(projectService.createProject(invalidData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when userId is missing', async () => {
      await expect(projectService.createProject(mockCreateProjectData, '')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name is too long', async () => {
      const longNameData = { ...mockCreateProjectData, name: 'a'.repeat(201) };
      await expect(projectService.createProject(longNameData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when description is too long', async () => {
      const longDescData = { ...mockCreateProjectData, description: 'a'.repeat(1001) };
      await expect(projectService.createProject(longDescData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessLogicError when repository fails', async () => {
      mockProjectRepository.create = mock(() => Promise.reject(new Error('Database error')));
      
      await expect(projectService.createProject(mockCreateProjectData, 'user1')).rejects.toThrow(BusinessLogicError);
    });
  });

  describe('getProject', () => {
    it('should get a project successfully when user has access', async () => {
      const result = await projectService.getProject('1', 'user1');

      expect(result).toEqual(mockProject);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(projectService.getProject('', 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when userId is missing', async () => {
      await expect(projectService.getProject('1', '')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockProjectRepository.findById = mock(() => Promise.resolve(null));
      
      await expect(projectService.getProject('1', 'user1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not have access', async () => {
      const otherUserProject = { ...mockProject, ownerId: 'user2' };
      mockProjectRepository.findById = mock(() => Promise.resolve(otherUserProject));
      
      await expect(projectService.getProject('1', 'user1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully when user is owner', async () => {
      const result = await projectService.updateProject('1', mockUpdateProjectData, 'user1');

      expect(result).toEqual({ ...mockProject, ...mockUpdateProjectData });
      expect(mockProjectRepository.update).toHaveBeenCalledWith('1', mockUpdateProjectData);
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(projectService.updateProject('', mockUpdateProjectData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when userId is missing', async () => {
      await expect(projectService.updateProject('1', mockUpdateProjectData, '')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError when user is not owner', async () => {
      const otherUserProject = { ...mockProject, ownerId: 'user2' };
      mockProjectRepository.findById = mock(() => Promise.resolve(otherUserProject));
      
      await expect(projectService.updateProject('1', mockUpdateProjectData, 'user1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError when name is empty', async () => {
      const invalidData = { name: '' };
      await expect(projectService.updateProject('1', invalidData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name is too long', async () => {
      const invalidData = { name: 'a'.repeat(201) };
      await expect(projectService.updateProject('1', invalidData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when description is too long', async () => {
      const invalidData = { description: 'a'.repeat(1001) };
      await expect(projectService.updateProject('1', invalidData, 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when status is invalid', async () => {
      const invalidData = { status: 'invalid' as any };
      await expect(projectService.updateProject('1', invalidData, 'user1')).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully when user is owner', async () => {
      await projectService.deleteProject('1', 'user1');

      expect(mockProjectRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(projectService.deleteProject('', 'user1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when userId is missing', async () => {
      await expect(projectService.deleteProject('1', '')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError when user is not owner', async () => {
      const otherUserProject = { ...mockProject, ownerId: 'user2' };
      mockProjectRepository.findById = mock(() => Promise.resolve(otherUserProject));
      
      await expect(projectService.deleteProject('1', 'user1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listUserProjects', () => {
    it('should list user projects successfully', async () => {
      const result = await projectService.listUserProjects('user1');

      expect(result).toEqual([mockProject]);
      expect(mockProjectRepository.findByUserId).toHaveBeenCalledWith('user1');
    });

    it('should throw ValidationError when userId is missing', async () => {
      await expect(projectService.listUserProjects('')).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessLogicError when repository fails', async () => {
      mockProjectRepository.findByUserId = mock(() => Promise.reject(new Error('Database error')));
      
      await expect(projectService.listUserProjects('user1')).rejects.toThrow(BusinessLogicError);
    });
  });

  describe('validateProjectAccess', () => {
    it('should return true when user is project owner', async () => {
      const result = await projectService.validateProjectAccess('1', 'user1');

      expect(result).toBe(true);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return false when user is not project owner', async () => {
      const otherUserProject = { ...mockProject, ownerId: 'user2' };
      mockProjectRepository.findById = mock(() => Promise.resolve(otherUserProject));
      
      const result = await projectService.validateProjectAccess('1', 'user1');

      expect(result).toBe(false);
    });

    it('should return false when project does not exist', async () => {
      mockProjectRepository.findById = mock(() => Promise.resolve(null));
      
      const result = await projectService.validateProjectAccess('1', 'user1');

      expect(result).toBe(false);
    });

    it('should return false when projectId or userId is missing', async () => {
      expect(await projectService.validateProjectAccess('', 'user1')).toBe(false);
      expect(await projectService.validateProjectAccess('1', '')).toBe(false);
    });

    it('should return false when repository throws error', async () => {
      mockProjectRepository.findById = mock(() => Promise.reject(new Error('Database error')));
      
      const result = await projectService.validateProjectAccess('1', 'user1');

      expect(result).toBe(false);
    });
  });
});