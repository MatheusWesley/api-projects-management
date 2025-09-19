import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { WorkItemController } from '../../src/controllers/workItemController.js';
import { WorkItemService } from '../../src/services/WorkItemService.js';
import { ProjectService } from '../../src/services/ProjectService.js';
import { AuthService } from '../../src/services/AuthService.js';
import { WorkItemRepository } from '../../src/repositories/WorkItemRepository.js';
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js';
import { MockDatabase } from '../repositories/mock-database.js';
import type { 
  IWorkItemRepository, 
  IProjectRepository, 
  IUserRepository 
} from '../../src/types/repositories.js';
import type { 
  IWorkItemService, 
  IProjectService, 
  IAuthService 
} from '../../src/types/services.js';
import type { User } from '../../src/types/user.js';
import type { Project } from '../../src/types/project.js';
import type { WorkItem } from '../../src/types/workItem.js';

describe('Work Item Integration Tests', () => {
  let app: Elysia;
  let workItemService: IWorkItemService;
  let projectService: IProjectService;
  let authService: IAuthService;
  let workItemRepository: IWorkItemRepository;
  let projectRepository: IProjectRepository;
  let userRepository: IUserRepository;
  let mockDb: MockDatabase;
  let testUser: User;
  let anotherUser: User;
  let testProject: Project;
  let anotherProject: Project;
  let authToken: string;
  let anotherAuthToken: string;

  beforeEach(async () => {
    // Setup mock database and repositories
    mockDb = new MockDatabase();
    userRepository = new UserRepository(mockDb as any);
    projectRepository = new ProjectRepository(mockDb as any);
    workItemRepository = new WorkItemRepository(mockDb as any);
    
    // Setup services
    authService = new AuthService(userRepository);
    projectService = new ProjectService(projectRepository);
    workItemService = new WorkItemService(workItemRepository, projectService);
    
    // Create test app with work item routes and error handler
    const workItemController = new WorkItemController(workItemService);
    app = new Elysia()
      .use(errorHandlerPlugin)
      .use(workItemController.createRoutes());

    // Create test users and get auth tokens
    testUser = await authService.register({
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
      role: 'developer'
    });

    anotherUser = await authService.register({
      email: 'another@example.com',
      name: 'Another User',
      password: 'Password123!',
      role: 'developer'
    });

    const loginResult = await authService.login('test@example.com', 'Password123!');
    authToken = loginResult.token;

    const anotherLoginResult = await authService.login('another@example.com', 'Password123!');
    anotherAuthToken = anotherLoginResult.token;

    // Create test projects
    testProject = await projectService.createProject({
      name: 'Test Project',
      description: 'Test project for work items'
    }, testUser.id);

    anotherProject = await projectService.createProject({
      name: 'Another Project',
      description: 'Project owned by another user'
    }, anotherUser.id);
  });

  afterEach(() => {
    mockDb.close();
  });

  describe('GET /projects/:projectId/items', () => {
    it('should return empty list when project has no work items', async () => {
      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItems).toEqual([]);
      expect(result.message).toBe('Work items retrieved successfully');
    });

    it('should return project work items when they exist', async () => {
      // Create test work items
      const workItem1 = await workItemService.createWorkItem({
        title: 'Task 1',
        description: 'First task',
        type: 'task',
        priority: 'high'
      }, testProject.id, testUser.id);

      const workItem2 = await workItemService.createWorkItem({
        title: 'Bug 1',
        description: 'First bug',
        type: 'bug',
        priority: 'critical'
      }, testProject.id, testUser.id);

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItems).toHaveLength(2);
      expect(result.data.workItems[0].title).toBe('Task 1');
      expect(result.data.workItems[1].title).toBe('Bug 1');
    });

    it('should return 403 when user does not have access to project', async () => {
      const response = await app.handle(
        new Request(`http://localhost/projects/${anotherProject.id}/items`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(403);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 when no auth token provided', async () => {
      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'GET'
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /projects/:projectId/items', () => {
    it('should create work item successfully with valid data', async () => {
      const workItemData = {
        title: 'New Task',
        description: 'A new task description',
        type: 'task' as const,
        priority: 'medium' as const,
        storyPoints: 5,
        estimatedHours: 8
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(201);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.title).toBe(workItemData.title);
      expect(result.data.workItem.description).toBe(workItemData.description);
      expect(result.data.workItem.type).toBe(workItemData.type);
      expect(result.data.workItem.priority).toBe(workItemData.priority);
      expect(result.data.workItem.storyPoints).toBe(workItemData.storyPoints);
      expect(result.data.workItem.estimatedHours).toBe(workItemData.estimatedHours);
      expect(result.data.workItem.projectId).toBe(testProject.id);
      expect(result.data.workItem.reporterId).toBe(testUser.id);
      expect(result.data.workItem.status).toBe('todo');
      expect(result.data.workItem.id).toBeDefined();
      expect(result.message).toBe('Work item created successfully');
    });

    it('should create work item successfully with minimal data', async () => {
      const workItemData = {
        title: 'Minimal Task',
        type: 'story' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(201);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.title).toBe(workItemData.title);
      expect(result.data.workItem.type).toBe(workItemData.type);
      expect(result.data.workItem.priority).toBe('medium'); // Default priority
      expect(result.data.workItem.status).toBe('todo');
    });

    it('should return 422 for missing title', async () => {
      const workItemData = {
        type: 'task' as const,
        description: 'Task without title'
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for missing type', async () => {
      const workItemData = {
        title: 'Task without type',
        description: 'This should fail'
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for invalid type', async () => {
      const workItemData = {
        title: 'Invalid Type Task',
        type: 'invalid-type' as any,
        description: 'This should fail'
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for invalid priority', async () => {
      const workItemData = {
        title: 'Invalid Priority Task',
        type: 'task' as const,
        priority: 'invalid-priority' as any
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for story points out of range', async () => {
      const workItemData = {
        title: 'Invalid Story Points Task',
        type: 'story' as const,
        storyPoints: 101 // Exceeds maximum of 100
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for estimated hours out of range', async () => {
      const workItemData = {
        title: 'Invalid Hours Task',
        type: 'task' as const,
        estimatedHours: 1001 // Exceeds maximum of 1000
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 403 when user does not have access to project', async () => {
      const workItemData = {
        title: 'Unauthorized Task',
        type: 'task' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${anotherProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(403);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 when no auth token provided', async () => {
      const workItemData = {
        title: 'Unauthenticated Task',
        type: 'task' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /items/:id', () => {
    let testWorkItem: WorkItem;

    beforeEach(async () => {
      testWorkItem = await workItemService.createWorkItem({
        title: 'Test Work Item',
        description: 'Test work item for GET tests',
        type: 'task',
        priority: 'medium'
      }, testProject.id, testUser.id);
    });

    it('should return work item successfully when user has access', async () => {
      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.id).toBe(testWorkItem.id);
      expect(result.data.workItem.title).toBe(testWorkItem.title);
      expect(result.data.workItem.description).toBe(testWorkItem.description);
      expect(result.data.workItem.type).toBe(testWorkItem.type);
      expect(result.data.workItem.priority).toBe(testWorkItem.priority);
      expect(result.data.workItem.projectId).toBe(testProject.id);
      expect(result.message).toBe('Work item retrieved successfully');
    });

    it('should return 404 for non-existent work item', async () => {
      const response = await app.handle(
        new Request('http://localhost/items/non-existent-id', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not have access to work item project', async () => {
      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${anotherAuthToken}`
          }
        })
      );

      expect(response.status).toBe(403);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 when no auth token provided', async () => {
      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'GET'
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /items/:id', () => {
    let testWorkItem: WorkItem;

    beforeEach(async () => {
      testWorkItem = await workItemService.createWorkItem({
        title: 'Test Work Item',
        description: 'Test work item for PUT tests',
        type: 'task',
        priority: 'medium',
        storyPoints: 3
      }, testProject.id, testUser.id);
    });

    it('should update work item successfully with valid data', async () => {
      const updateData = {
        title: 'Updated Work Item',
        description: 'Updated description',
        type: 'bug' as const,
        status: 'in_progress' as const,
        priority: 'high' as const,
        storyPoints: 8,
        estimatedHours: 16
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.id).toBe(testWorkItem.id);
      expect(result.data.workItem.title).toBe(updateData.title);
      expect(result.data.workItem.description).toBe(updateData.description);
      expect(result.data.workItem.type).toBe(updateData.type);
      expect(result.data.workItem.status).toBe(updateData.status);
      expect(result.data.workItem.priority).toBe(updateData.priority);
      expect(result.data.workItem.storyPoints).toBe(updateData.storyPoints);
      expect(result.data.workItem.estimatedHours).toBe(updateData.estimatedHours);
      expect(result.message).toBe('Work item updated successfully');
    });

    it('should update work item with partial data', async () => {
      const updateData = {
        title: 'Partially Updated Title'
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.title).toBe(updateData.title);
      expect(result.data.workItem.description).toBe(testWorkItem.description); // Should remain unchanged
      expect(result.data.workItem.type).toBe(testWorkItem.type); // Should remain unchanged
    });

    it('should return 404 for non-existent work item', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await app.handle(
        new Request('http://localhost/items/non-existent-id', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not have access to work item', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${anotherAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(403);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should return 422 for invalid status', async () => {
      const updateData = {
        status: 'invalid-status' as any
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for empty title', async () => {
      const updateData = {
        title: ''
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 401 when no auth token provided', async () => {
      const updateData = {
        title: 'Unauthenticated Update'
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /items/:id', () => {
    let testWorkItem: WorkItem;

    beforeEach(async () => {
      testWorkItem = await workItemService.createWorkItem({
        title: 'Test Work Item',
        description: 'Test work item for DELETE tests',
        type: 'task',
        priority: 'medium'
      }, testProject.id, testUser.id);
    });

    it('should delete work item successfully when user has access', async () => {
      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
      expect(result.message).toBe('Work item deleted successfully');

      // Verify work item is actually deleted
      const getResponse = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent work item', async () => {
      const response = await app.handle(
        new Request('http://localhost/items/non-existent-id', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not have access to work item', async () => {
      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${anotherAuthToken}`
          }
        })
      );

      expect(response.status).toBe(403);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 when no auth token provided', async () => {
      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}`, {
          method: 'DELETE'
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /items/:id/status', () => {
    let testWorkItem: WorkItem;

    beforeEach(async () => {
      testWorkItem = await workItemService.createWorkItem({
        title: 'Test Work Item',
        description: 'Test work item for status update tests',
        type: 'task',
        priority: 'medium'
      }, testProject.id, testUser.id);
    });

    it('should update work item status successfully with valid transition', async () => {
      const statusData = {
        status: 'in_progress' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.id).toBe(testWorkItem.id);
      expect(result.data.workItem.status).toBe(statusData.status);
      expect(result.message).toBe('Work item status updated successfully');
    });

    it('should update status from in_progress to done', async () => {
      // First move to in_progress
      await workItemService.updateWorkItemStatus(testWorkItem.id, 'in_progress', testUser.id);

      const statusData = {
        status: 'done' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json() as any;
      expect(result.success).toBe(true);
      expect(result.data.workItem.status).toBe(statusData.status);
    });

    it('should return 400 for invalid status transition', async () => {
      // Try to move directly from todo to done (invalid transition)
      const statusData = {
        status: 'done' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(400);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(result.error.message).toContain('Cannot transition');
    });

    it('should return 404 for non-existent work item', async () => {
      const statusData = {
        status: 'in_progress' as const
      };

      const response = await app.handle(
        new Request('http://localhost/items/non-existent-id/status', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when user does not have access to work item', async () => {
      const statusData = {
        status: 'in_progress' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${anotherAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(403);
      
      const result = await response.json() as any;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should return 422 for invalid status value', async () => {
      const statusData = {
        status: 'invalid-status' as any
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 422 for missing status', async () => {
      const statusData = {};

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(422);
      
      const result = await response.json() as any;
      expect(result.type).toBe('validation');
    });

    it('should return 401 when no auth token provided', async () => {
      const statusData = {
        status: 'in_progress' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/items/${testWorkItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const workItemData = {
        title: 'Format Test Work Item',
        description: 'Testing response format',
        type: 'task' as const,
        priority: 'medium' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workItemData)
        })
      );

      const result = await response.json() as any;
      
      // Check response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('workItem');
      expect(result.data.workItem).toHaveProperty('id');
      expect(result.data.workItem).toHaveProperty('title');
      expect(result.data.workItem).toHaveProperty('description');
      expect(result.data.workItem).toHaveProperty('type');
      expect(result.data.workItem).toHaveProperty('status');
      expect(result.data.workItem).toHaveProperty('priority');
      expect(result.data.workItem).toHaveProperty('projectId');
      expect(result.data.workItem).toHaveProperty('reporterId');
      expect(result.data.workItem).toHaveProperty('createdAt');
      expect(result.data.workItem).toHaveProperty('updatedAt');
    });

    it('should return consistent error response format', async () => {
      const response = await app.handle(
        new Request('http://localhost/items/non-existent', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      const result = await response.json() as any;
      
      // Check error response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: 'invalid json'
        })
      );

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const workItemData = {
        title: 'Test Work Item',
        type: 'task' as const
      };

      const response = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(workItemData)
        })
      );

      // Should still work or return appropriate error
      expect([201, 400, 415, 422]).toContain(response.status);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should support complete work item lifecycle', async () => {
      // 1. Create work item
      const createResponse = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Lifecycle Test Item',
            description: 'Testing complete lifecycle',
            type: 'story' as const,
            priority: 'high' as const,
            storyPoints: 5
          })
        })
      );

      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json() as any;
      const workItemId = createResult.data.workItem.id;

      // 2. Get work item
      const getResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(getResponse.status).toBe(200);
      const getResult = await getResponse.json() as any;
      expect(getResult.data.workItem.status).toBe('todo');

      // 3. Move to in_progress
      const statusResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'in_progress' })
        })
      );

      expect(statusResponse.status).toBe(200);
      const statusResult = await statusResponse.json() as any;
      expect(statusResult.data.workItem.status).toBe('in_progress');

      // 4. Update work item details
      const updateResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Updated Lifecycle Test Item',
            estimatedHours: 10
          })
        })
      );

      expect(updateResponse.status).toBe(200);
      const updateResult = await updateResponse.json() as any;
      expect(updateResult.data.workItem.title).toBe('Updated Lifecycle Test Item');
      expect(updateResult.data.workItem.estimatedHours).toBe(10);

      // 5. Complete work item
      const completeResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'done' })
        })
      );

      expect(completeResponse.status).toBe(200);
      const completeResult = await completeResponse.json() as any;
      expect(completeResult.data.workItem.status).toBe('done');

      // 6. Verify in project items list
      const listResponse = await app.handle(
        new Request(`http://localhost/projects/${testProject.id}/items`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      );

      expect(listResponse.status).toBe(200);
      const listResult = await listResponse.json() as any;
      expect(listResult.data.workItems).toHaveLength(1);
      expect(listResult.data.workItems[0].id).toBe(workItemId);
      expect(listResult.data.workItems[0].status).toBe('done');
    });
  });
});