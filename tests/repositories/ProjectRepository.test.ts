import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js';
import { createTestDatabase, cleanupTestDatabase, testProjectData, createTestUser } from './setup.js';
import type { MockDatabase } from './mock-database.js';

describe('ProjectRepository', () => {
  let db: MockDatabase;
  let projectRepository: ProjectRepository;
  let testUserId: string;

  beforeEach(() => {
    db = createTestDatabase();
    projectRepository = new ProjectRepository(db);
    testUserId = createTestUser(db);
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const project = await projectRepository.create(projectData);

      expect(project.id).toBeDefined();
      expect(project.name).toBe(testProjectData.name);
      expect(project.description).toBe(testProjectData.description);
      expect(project.ownerId).toBe(testUserId);
      expect(project.status).toBe('active');
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('should create project with empty description when not provided', async () => {
      const projectData = { name: 'Test Project', ownerId: testUserId };
      const project = await projectRepository.create(projectData);

      expect(project.description).toBe('');
    });

    it('should throw error when creating project with invalid owner ID', async () => {
      const projectData = { ...testProjectData, ownerId: 'invalid-user-id' };

      await expect(projectRepository.create(projectData)).rejects.toThrow(
        'Invalid owner ID'
      );
    });
  });

  describe('findById', () => {
    it('should find project by id', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);
      const foundProject = await projectRepository.findById(createdProject.id);

      expect(foundProject).not.toBeNull();
      expect(foundProject!.id).toBe(createdProject.id);
      expect(foundProject!.name).toBe(testProjectData.name);
    });

    it('should return null for non-existent project', async () => {
      const foundProject = await projectRepository.findById('non-existent-id');
      expect(foundProject).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find projects by user id', async () => {
      const project1Data = { ...testProjectData, ownerId: testUserId };
      const project2Data = { ...testProjectData, name: 'Project 2', ownerId: testUserId };
      
      const project1 = await projectRepository.create(project1Data);
      const project2 = await projectRepository.create(project2Data);

      const projects = await projectRepository.findByUserId(testUserId);

      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe(project2.id); // Most recent first
      expect(projects[1].id).toBe(project1.id);
    });

    it('should return empty array for user with no projects', async () => {
      const projects = await projectRepository.findByUserId(testUserId);
      expect(projects).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);
      const updateData = { 
        name: 'Updated Project Name', 
        status: 'completed' as const 
      };

      const updatedProject = await projectRepository.update(createdProject.id, updateData);

      expect(updatedProject.name).toBe(updateData.name);
      expect(updatedProject.status).toBe(updateData.status);
      expect(updatedProject.description).toBe(testProjectData.description); // unchanged
      expect(updatedProject.updatedAt.getTime()).toBeGreaterThan(updatedProject.createdAt.getTime());
    });

    it('should throw error when updating non-existent project', async () => {
      await expect(projectRepository.update('non-existent-id', { name: 'New Name' })).rejects.toThrow(
        'Project not found'
      );
    });

    it('should return unchanged project when no update data provided', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);
      const updatedProject = await projectRepository.update(createdProject.id, {});

      expect(updatedProject).toEqual(createdProject);
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);

      await projectRepository.delete(createdProject.id);

      const foundProject = await projectRepository.findById(createdProject.id);
      expect(foundProject).toBeNull();
    });

    it('should throw error when deleting non-existent project', async () => {
      await expect(projectRepository.delete('non-existent-id')).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('list', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await projectRepository.list();
      expect(projects).toEqual([]);
    });

    it('should return all projects ordered by creation date', async () => {
      const project1Data = { ...testProjectData, ownerId: testUserId };
      const project2Data = { ...testProjectData, name: 'Project 2', ownerId: testUserId };
      
      const project1 = await projectRepository.create(project1Data);
      const project2 = await projectRepository.create(project2Data);

      const projects = await projectRepository.list();

      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe(project2.id); // Most recent first
      expect(projects[1].id).toBe(project1.id);
    });
  });

  describe('isOwner', () => {
    it('should return true when user owns the project', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);

      const isOwner = await projectRepository.isOwner(createdProject.id, testUserId);
      expect(isOwner).toBe(true);
    });

    it('should return false when user does not own the project', async () => {
      const otherUserId = createTestUser(db, { email: 'other@example.com' });
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);

      const isOwner = await projectRepository.isOwner(createdProject.id, otherUserId);
      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent project', async () => {
      const isOwner = await projectRepository.isOwner('non-existent-id', testUserId);
      expect(isOwner).toBe(false);
    });
  });

  describe('findByIdWithOwner', () => {
    it('should find project with owner information', async () => {
      const projectData = { ...testProjectData, ownerId: testUserId };
      const createdProject = await projectRepository.create(projectData);

      const projectWithOwner = await projectRepository.findByIdWithOwner(createdProject.id);

      expect(projectWithOwner).not.toBeNull();
      expect(projectWithOwner!.id).toBe(createdProject.id);
      expect(projectWithOwner!.ownerName).toBeDefined();
      expect(projectWithOwner!.ownerEmail).toBeDefined();
    });

    it('should return null for non-existent project', async () => {
      const projectWithOwner = await projectRepository.findByIdWithOwner('non-existent-id');
      expect(projectWithOwner).toBeNull();
    });
  });
});