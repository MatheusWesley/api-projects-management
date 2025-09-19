import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { errorHandlerPlugin } from '../../src/middleware/errorHandler.js';
import { MockDatabase } from '../repositories/mock-database.js';

// Import repositories
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js';
import { WorkItemRepository } from '../../src/repositories/WorkItemRepository.js';

// Import services
import { AuthService } from '../../src/services/AuthService.js';
import { ProjectService } from '../../src/services/ProjectService.js';
import { WorkItemService } from '../../src/services/WorkItemService.js';

// Import controllers
import { createAuthRoutes } from '../../src/controllers/authController.js';
import { createProjectRoutes } from '../../src/controllers/projectController.js';
import { createWorkItemRoutes } from '../../src/controllers/workItemController.js';
import { createBoardRoutes } from '../../src/controllers/boardController.js';

import { 
  TestDataFactory, 
  expectSuccessResponse, 
  expectErrorResponse
} from './test-factories.js';

describe('Authorization Scenarios Integration Tests', () => {
  let app: Elysia;
  let mockDb: MockDatabase;
  let testFactory: TestDataFactory;

  beforeEach(() => {
    // Setup mock database and repositories
    mockDb = new MockDatabase();
    const userRepository = new UserRepository(mockDb as any);
    const projectRepository = new ProjectRepository(mockDb as any);
    const workItemRepository = new WorkItemRepository(mockDb as any);

    // Initialize services
    const authService = new AuthService(userRepository);
    const projectService = new ProjectService(projectRepository);
    const workItemService = new WorkItemService(workItemRepository, projectService);

    // Create test data factory
    testFactory = new TestDataFactory(authService, projectService, workItemService);

    // Create application with all routes
    app = new Elysia()
      .use(cors())
      .use(errorHandlerPlugin)
      .use(createAuthRoutes(authService))
      .use(createProjectRoutes(projectService))
      .use(createWorkItemRoutes(workItemService))
      .use(createBoardRoutes(workItemService));
  });

  afterEach(() => {
    mockDb.close();
  });

  describe('Project Access Authorization', () => {
    it('should allow project owners full access to their projects', async () => {
      const owner = await testFactory.createTestUser({ name: 'Project Owner' });
      const project = await testFactory.createTestProject(owner, {
        name: 'Owner Project',
        description: 'Project owned by the user'
      });

      // Owner should be able to read project
      const readResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${owner.token}` }
        })
      );

      expect(readResponse.status).toBe(200);
      const readResult = await readResponse.json() as any;
      expectSuccessResponse(readResult, 'Project retrieved successfully');

      // Owner should be able to update project
      const updateResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${owner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Updated Project Name',
            description: 'Updated description'
          })
        })
      );

      expect(updateResponse.status).toBe(200);
      const updateResult = await updateResponse.json() as any;
      expectSuccessResponse(updateResult, 'Project updated successfully');
      expect(updateResult.data.project.name).toBe('Updated Project Name');

      // Owner should be able to delete project
      const deleteResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${owner.token}` }
        })
      );

      expect(deleteResponse.status).toBe(200);
      const deleteResult = await deleteResponse.json() as any;
      expectSuccessResponse(deleteResult, 'Project deleted successfully');
    });

    it('should deny non-owners access to projects', async () => {
      const owner = await testFactory.createTestUser({ name: 'Project Owner' });
      const nonOwner = await testFactory.createTestUser({ name: 'Non Owner' });
      const project = await testFactory.createTestProject(owner, {
        name: 'Private Project'
      });

      // Non-owner should not be able to read project
      const readResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${nonOwner.token}` }
        })
      );

      expect(readResponse.status).toBe(403);
      const readResult = await readResponse.json() as any;
      expectErrorResponse(readResult, 'FORBIDDEN');

      // Non-owner should not be able to update project
      const updateResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${nonOwner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: 'Hacked Name' })
        })
      );

      expect(updateResponse.status).toBe(403);
      const updateResult = await updateResponse.json() as any;
      expectErrorResponse(updateResult, 'FORBIDDEN');

      // Non-owner should not be able to delete project
      const deleteResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${nonOwner.token}` }
        })
      );

      expect(deleteResponse.status).toBe(403);
      const deleteResult = await deleteResponse.json() as any;
      expectErrorResponse(deleteResult, 'FORBIDDEN');
    });

    it('should only show user their own projects in list', async () => {
      const user1 = await testFactory.createTestUser({ name: 'User 1' });
      const user2 = await testFactory.createTestUser({ name: 'User 2' });

      // Create projects for each user
      const user1Project1 = await testFactory.createTestProject(user1, { name: 'User 1 Project 1' });
      const user1Project2 = await testFactory.createTestProject(user1, { name: 'User 1 Project 2' });
      const user2Project1 = await testFactory.createTestProject(user2, { name: 'User 2 Project 1' });
      const user2Project2 = await testFactory.createTestProject(user2, { name: 'User 2 Project 2' });

      // User 1 should only see their projects
      const user1ProjectsResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user1.token}` }
        })
      );

      expect(user1ProjectsResponse.status).toBe(200);
      const user1ProjectsResult = await user1ProjectsResponse.json() as any;
      expectSuccessResponse(user1ProjectsResult, 'Projects retrieved successfully');
      expect(user1ProjectsResult.data.projects).toHaveLength(2);
      
      const user1ProjectNames = user1ProjectsResult.data.projects.map((p: any) => p.name);
      expect(user1ProjectNames).toContain('User 1 Project 1');
      expect(user1ProjectNames).toContain('User 1 Project 2');
      expect(user1ProjectNames).not.toContain('User 2 Project 1');
      expect(user1ProjectNames).not.toContain('User 2 Project 2');

      // User 2 should only see their projects
      const user2ProjectsResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user2.token}` }
        })
      );

      expect(user2ProjectsResponse.status).toBe(200);
      const user2ProjectsResult = await user2ProjectsResponse.json() as any;
      expectSuccessResponse(user2ProjectsResult, 'Projects retrieved successfully');
      expect(user2ProjectsResult.data.projects).toHaveLength(2);
      
      const user2ProjectNames = user2ProjectsResult.data.projects.map((p: any) => p.name);
      expect(user2ProjectNames).toContain('User 2 Project 1');
      expect(user2ProjectNames).toContain('User 2 Project 2');
      expect(user2ProjectNames).not.toContain('User 1 Project 1');
      expect(user2ProjectNames).not.toContain('User 1 Project 2');
    });
  });

  describe('Work Item Access Authorization', () => {
    it('should allow project owners to manage work items in their projects', async () => {
      const owner = await testFactory.createTestUser({ name: 'Project Owner' });
      const project = await testFactory.createTestProject(owner);

      // Owner should be able to create work items
      const createResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${owner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Owner Work Item',
            description: 'Work item created by owner',
            type: 'task'
          })
        })
      );

      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json() as any;
      expectSuccessResponse(createResult, 'Work item created successfully');
      const workItemId = createResult.data.workItem.id;

      // Owner should be able to read work item
      const readResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${owner.token}` }
        })
      );

      expect(readResponse.status).toBe(200);
      const readResult = await readResponse.json() as any;
      expectSuccessResponse(readResult, 'Work item retrieved successfully');

      // Owner should be able to update work item
      const updateResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${owner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Updated Work Item',
            description: 'Updated by owner'
          })
        })
      );

      expect(updateResponse.status).toBe(200);
      const updateResult = await updateResponse.json() as any;
      expectSuccessResponse(updateResult, 'Work item updated successfully');

      // Owner should be able to update status
      const statusResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${owner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'in_progress' })
        })
      );

      expect(statusResponse.status).toBe(200);
      const statusResult = await statusResponse.json() as any;
      expectSuccessResponse(statusResult, 'Work item status updated successfully');

      // Owner should be able to update priority
      const priorityResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}/priority`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${owner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ priorityOrder: 5 })
        })
      );

      expect(priorityResponse.status).toBe(200);
      const priorityResult = await priorityResponse.json() as any;
      expectSuccessResponse(priorityResult, 'Work item priority updated successfully');

      // Owner should be able to delete work item
      const deleteResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${owner.token}` }
        })
      );

      expect(deleteResponse.status).toBe(200);
      const deleteResult = await deleteResponse.json() as any;
      expectSuccessResponse(deleteResult, 'Work item deleted successfully');
    });

    it('should deny non-project-members access to work items', async () => {
      const owner = await testFactory.createTestUser({ name: 'Project Owner' });
      const nonMember = await testFactory.createTestUser({ name: 'Non Member' });
      const project = await testFactory.createTestProject(owner);
      const workItem = await testFactory.createTestWorkItem(project, owner);

      // Non-member should not be able to create work items
      const createResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nonMember.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Unauthorized Item',
            type: 'task'
          })
        })
      );

      expect(createResponse.status).toBe(403);
      const createResult = await createResponse.json() as any;
      expectErrorResponse(createResult, 'FORBIDDEN');

      // Non-member should not be able to read work item
      const readResponse = await app.handle(
        new Request(`http://localhost/items/${workItem.workItem.id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${nonMember.token}` }
        })
      );

      expect(readResponse.status).toBe(403);
      const readResult = await readResponse.json() as any;
      expectErrorResponse(readResult, 'FORBIDDEN');

      // Non-member should not be able to update work item
      const updateResponse = await app.handle(
        new Request(`http://localhost/items/${workItem.workItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${nonMember.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: 'Hacked Title' })
        })
      );

      expect(updateResponse.status).toBe(403);
      const updateResult = await updateResponse.json() as any;
      expectErrorResponse(updateResult, 'FORBIDDEN');

      // Non-member should not be able to update status
      const statusResponse = await app.handle(
        new Request(`http://localhost/items/${workItem.workItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${nonMember.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'done' })
        })
      );

      expect(statusResponse.status).toBe(403);
      const statusResult = await statusResponse.json() as any;
      expectErrorResponse(statusResult, 'FORBIDDEN');

      // Non-member should not be able to update priority
      const priorityResponse = await app.handle(
        new Request(`http://localhost/items/${workItem.workItem.id}/priority`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${nonMember.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ priorityOrder: 1 })
        })
      );

      expect(priorityResponse.status).toBe(403);
      const priorityResult = await priorityResponse.json() as any;
      expectErrorResponse(priorityResult, 'FORBIDDEN');

      // Non-member should not be able to delete work item
      const deleteResponse = await app.handle(
        new Request(`http://localhost/items/${workItem.workItem.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${nonMember.token}` }
        })
      );

      expect(deleteResponse.status).toBe(403);
      const deleteResult = await deleteResponse.json() as any;
      expectErrorResponse(deleteResult, 'FORBIDDEN');
    });

    it('should only show work items from accessible projects', async () => {
      const user1 = await testFactory.createTestUser({ name: 'User 1' });
      const user2 = await testFactory.createTestUser({ name: 'User 2' });
      
      const user1Project = await testFactory.createTestProject(user1, { name: 'User 1 Project' });
      const user2Project = await testFactory.createTestProject(user2, { name: 'User 2 Project' });

      // Create work items in each project
      const user1Item1 = await testFactory.createTestWorkItem(user1Project, user1, { title: 'User 1 Item 1' });
      const user1Item2 = await testFactory.createTestWorkItem(user1Project, user1, { title: 'User 1 Item 2' });
      const user2Item1 = await testFactory.createTestWorkItem(user2Project, user2, { title: 'User 2 Item 1' });

      // User 1 should only see items from their project
      const user1ItemsResponse = await app.handle(
        new Request(`http://localhost/projects/${user1Project.project.id}/items`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user1.token}` }
        })
      );

      expect(user1ItemsResponse.status).toBe(200);
      const user1ItemsResult = await user1ItemsResponse.json() as any;
      expectSuccessResponse(user1ItemsResult, 'Work items retrieved successfully');
      expect(user1ItemsResult.data.workItems).toHaveLength(2);
      
      const user1ItemTitles = user1ItemsResult.data.workItems.map((item: any) => item.title);
      expect(user1ItemTitles).toContain('User 1 Item 1');
      expect(user1ItemTitles).toContain('User 1 Item 2');

      // User 1 should not be able to access User 2's project items
      const unauthorizedItemsResponse = await app.handle(
        new Request(`http://localhost/projects/${user2Project.project.id}/items`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user1.token}` }
        })
      );

      expect(unauthorizedItemsResponse.status).toBe(403);
      const unauthorizedItemsResult = await unauthorizedItemsResponse.json() as any;
      expectErrorResponse(unauthorizedItemsResult, 'FORBIDDEN');
    });
  });

  describe('Board and Backlog Access Authorization', () => {
    it('should allow project owners to access Kanban board and backlog', async () => {
      const owner = await testFactory.createTestUser({ name: 'Board Owner' });
      const project = await testFactory.createTestProject(owner);
      
      // Create some work items for the board
      await testFactory.createTestWorkItem(project, owner, { title: 'Todo Item', type: 'task' });
      const inProgressItem = await testFactory.createTestWorkItem(project, owner, { title: 'In Progress Item', type: 'bug' });
      
      // Move one item to in_progress
      await app.handle(
        new Request(`http://localhost/items/${inProgressItem.workItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${owner.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'in_progress' })
        })
      );

      // Owner should be able to access Kanban board
      const kanbanResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}/kanban`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${owner.token}` }
        })
      );

      expect(kanbanResponse.status).toBe(200);
      const kanbanResult = await kanbanResponse.json() as any;
      expectSuccessResponse(kanbanResult, 'Kanban board retrieved successfully');
      expect(kanbanResult.data.kanbanBoard.todo).toHaveLength(1);
      expect(kanbanResult.data.kanbanBoard.in_progress).toHaveLength(1);

      // Owner should be able to access backlog
      const backlogResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}/backlog`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${owner.token}` }
        })
      );

      expect(backlogResponse.status).toBe(200);
      const backlogResult = await backlogResponse.json() as any;
      expectSuccessResponse(backlogResult, 'Backlog retrieved successfully');
      expect(backlogResult.data.backlogItems).toHaveLength(1); // Only todo items
    });

    it('should deny non-project-members access to boards and backlogs', async () => {
      const owner = await testFactory.createTestUser({ name: 'Board Owner' });
      const nonMember = await testFactory.createTestUser({ name: 'Non Member' });
      const project = await testFactory.createTestProject(owner);

      // Non-member should not be able to access Kanban board
      const kanbanResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}/kanban`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${nonMember.token}` }
        })
      );

      expect(kanbanResponse.status).toBe(403);
      const kanbanResult = await kanbanResponse.json() as any;
      expectErrorResponse(kanbanResult, 'FORBIDDEN');

      // Non-member should not be able to access backlog
      const backlogResponse = await app.handle(
        new Request(`http://localhost/projects/${project.project.id}/backlog`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${nonMember.token}` }
        })
      );

      expect(backlogResponse.status).toBe(403);
      const backlogResult = await backlogResponse.json() as any;
      expectErrorResponse(backlogResult, 'FORBIDDEN');
    });
  });

  describe('Cross-User Authorization Scenarios', () => {
    it('should handle complex multi-user authorization scenarios', async () => {
      // Create multiple users with different roles
      const developer = await testFactory.createTestUser({ 
        name: 'Developer User', 
        role: 'developer' 
      });
      const manager = await testFactory.createTestUser({ 
        name: 'Manager User', 
        role: 'manager' 
      });
      const admin = await testFactory.createTestUser({ 
        name: 'Admin User', 
        role: 'admin' 
      });

      // Create projects owned by different users
      const devProject = await testFactory.createTestProject(developer, { name: 'Dev Project' });
      const managerProject = await testFactory.createTestProject(manager, { name: 'Manager Project' });
      const adminProject = await testFactory.createTestProject(admin, { name: 'Admin Project' });

      // Create work items in each project
      const devItem = await testFactory.createTestWorkItem(devProject, developer);
      const managerItem = await testFactory.createTestWorkItem(managerProject, manager);
      const adminItem = await testFactory.createTestWorkItem(adminProject, admin);

      // Test cross-access scenarios
      const crossAccessTests = [
        // Developer trying to access manager's project
        {
          user: developer,
          projectId: managerProject.project.id,
          workItemId: managerItem.workItem.id,
          shouldHaveAccess: false
        },
        // Manager trying to access developer's project
        {
          user: manager,
          projectId: devProject.project.id,
          workItemId: devItem.workItem.id,
          shouldHaveAccess: false
        },
        // Admin trying to access developer's project (still should not have access - ownership based)
        {
          user: admin,
          projectId: devProject.project.id,
          workItemId: devItem.workItem.id,
          shouldHaveAccess: false
        },
        // Each user accessing their own resources
        {
          user: developer,
          projectId: devProject.project.id,
          workItemId: devItem.workItem.id,
          shouldHaveAccess: true
        },
        {
          user: manager,
          projectId: managerProject.project.id,
          workItemId: managerItem.workItem.id,
          shouldHaveAccess: true
        },
        {
          user: admin,
          projectId: adminProject.project.id,
          workItemId: adminItem.workItem.id,
          shouldHaveAccess: true
        }
      ];

      for (const test of crossAccessTests) {
        // Test project access
        const projectResponse = await app.handle(
          new Request(`http://localhost/projects/${test.projectId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${test.user.token}` }
          })
        );

        if (test.shouldHaveAccess) {
          expect(projectResponse.status).toBe(200);
        } else {
          expect(projectResponse.status).toBe(403);
        }

        // Test work item access
        const workItemResponse = await app.handle(
          new Request(`http://localhost/items/${test.workItemId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${test.user.token}` }
          })
        );

        if (test.shouldHaveAccess) {
          expect(workItemResponse.status).toBe(200);
        } else {
          expect(workItemResponse.status).toBe(403);
        }

        // Test board access
        const boardResponse = await app.handle(
          new Request(`http://localhost/projects/${test.projectId}/kanban`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${test.user.token}` }
          })
        );

        if (test.shouldHaveAccess) {
          expect(boardResponse.status).toBe(200);
        } else {
          expect(boardResponse.status).toBe(403);
        }
      }
    });

    it('should prevent privilege escalation attempts', async () => {
      const regularUser = await testFactory.createTestUser({ 
        name: 'Regular User', 
        role: 'developer' 
      });
      const adminUser = await testFactory.createTestUser({ 
        name: 'Admin User', 
        role: 'admin' 
      });

      const adminProject = await testFactory.createTestProject(adminUser, { name: 'Admin Project' });

      // Regular user should not be able to access admin's project even with different HTTP methods
      const privilegeEscalationAttempts = [
        { method: 'GET', url: `http://localhost/projects/${adminProject.project.id}` },
        { method: 'PUT', url: `http://localhost/projects/${adminProject.project.id}`, body: { name: 'Hacked' } },
        { method: 'DELETE', url: `http://localhost/projects/${adminProject.project.id}` },
        { method: 'POST', url: `http://localhost/projects/${adminProject.project.id}/items`, body: { title: 'Hack', type: 'task' } },
        { method: 'GET', url: `http://localhost/projects/${adminProject.project.id}/kanban` },
        { method: 'GET', url: `http://localhost/projects/${adminProject.project.id}/backlog` }
      ];

      for (const attempt of privilegeEscalationAttempts) {
        const response = await app.handle(
          new Request(attempt.url, {
            method: attempt.method,
            headers: {
              'Authorization': `Bearer ${regularUser.token}`,
              ...(attempt.body ? { 'Content-Type': 'application/json' } : {})
            },
            body: attempt.body ? JSON.stringify(attempt.body) : undefined
          })
        );

        expect(response.status).toBe(403);
        const result = await response.json() as any;
        expectErrorResponse(result, 'FORBIDDEN');
      }
    });

    it('should handle authorization with malformed or tampered tokens', async () => {
      const validUser = await testFactory.createTestUser();
      const project = await testFactory.createTestProject(validUser);

      const tamperedTokenScenarios = [
        // Token with modified payload (user ID changed)
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZWQtdXNlci1pZCIsImlhdCI6MTYzNDU2NzAwMH0.invalid',
        // Token with modified signature
        validUser.token.slice(0, -10) + 'tampered123',
        // Completely invalid token format
        'not.a.valid.jwt.token',
        // Empty token
        '',
        // Token with extra parts
        validUser.token + '.extra.part'
      ];

      for (const tamperedToken of tamperedTokenScenarios) {
        const response = await app.handle(
          new Request(`http://localhost/projects/${project.project.id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tamperedToken}` }
          })
        );

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Resource Ownership Validation', () => {
    it('should validate ownership at every level of nested resources', async () => {
      const owner = await testFactory.createTestUser({ name: 'Resource Owner' });
      const attacker = await testFactory.createTestUser({ name: 'Attacker' });
      
      const ownerProject = await testFactory.createTestProject(owner);
      const attackerProject = await testFactory.createTestProject(attacker);
      
      const ownerWorkItem = await testFactory.createTestWorkItem(ownerProject, owner);
      const attackerWorkItem = await testFactory.createTestWorkItem(attackerProject, attacker);

      // Test that attacker cannot access owner's resources through direct IDs
      const unauthorizedAccess = [
        // Direct work item access
        { url: `http://localhost/items/${ownerWorkItem.workItem.id}`, method: 'GET' },
        { url: `http://localhost/items/${ownerWorkItem.workItem.id}`, method: 'PUT', body: { title: 'Hacked' } },
        { url: `http://localhost/items/${ownerWorkItem.workItem.id}`, method: 'DELETE' },
        { url: `http://localhost/items/${ownerWorkItem.workItem.id}/status`, method: 'PATCH', body: { status: 'done' } },
        { url: `http://localhost/items/${ownerWorkItem.workItem.id}/priority`, method: 'PATCH', body: { priorityOrder: 1 } },
        
        // Project-scoped work item access
        { url: `http://localhost/projects/${ownerProject.project.id}/items`, method: 'GET' },
        { url: `http://localhost/projects/${ownerProject.project.id}/items`, method: 'POST', body: { title: 'Hack', type: 'task' } },
        
        // Board access
        { url: `http://localhost/projects/${ownerProject.project.id}/kanban`, method: 'GET' },
        { url: `http://localhost/projects/${ownerProject.project.id}/backlog`, method: 'GET' }
      ];

      for (const access of unauthorizedAccess) {
        const response = await app.handle(
          new Request(access.url, {
            method: access.method,
            headers: {
              'Authorization': `Bearer ${attacker.token}`,
              ...(access.body ? { 'Content-Type': 'application/json' } : {})
            },
            body: access.body ? JSON.stringify(access.body) : undefined
          })
        );

        expect(response.status).toBe(403);
        const result = await response.json() as any;
        expectErrorResponse(result, 'FORBIDDEN');
      }

      // Verify that owner can still access their own resources
      const authorizedAccess = [
        { url: `http://localhost/items/${ownerWorkItem.workItem.id}`, method: 'GET' },
        { url: `http://localhost/projects/${ownerProject.project.id}/items`, method: 'GET' },
        { url: `http://localhost/projects/${ownerProject.project.id}/kanban`, method: 'GET' },
        { url: `http://localhost/projects/${ownerProject.project.id}/backlog`, method: 'GET' }
      ];

      for (const access of authorizedAccess) {
        const response = await app.handle(
          new Request(access.url, {
            method: access.method,
            headers: { 'Authorization': `Bearer ${owner.token}` }
          })
        );

        expect(response.status).toBe(200);
      }
    });

    it('should prevent resource enumeration attacks', async () => {
      const user1 = await testFactory.createTestUser({ name: 'User 1' });
      const user2 = await testFactory.createTestUser({ name: 'User 2' });
      
      const user1Project = await testFactory.createTestProject(user1);
      const user2Project = await testFactory.createTestProject(user2);
      
      const user1WorkItem = await testFactory.createTestWorkItem(user1Project, user1);
      const user2WorkItem = await testFactory.createTestWorkItem(user2Project, user2);

      // User 1 tries to enumerate User 2's resources by guessing IDs
      const enumerationAttempts = [
        // Try to access User 2's project
        `http://localhost/projects/${user2Project.project.id}`,
        // Try to access User 2's work item
        `http://localhost/items/${user2WorkItem.workItem.id}`,
        // Try to access User 2's project items
        `http://localhost/projects/${user2Project.project.id}/items`,
        // Try to access User 2's board
        `http://localhost/projects/${user2Project.project.id}/kanban`
      ];

      for (const url of enumerationAttempts) {
        const response = await app.handle(
          new Request(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${user1.token}` }
          })
        );

        // Should return 403 (not 404) to prevent information disclosure
        expect(response.status).toBe(403);
        const result = await response.json() as any;
        expectErrorResponse(result, 'FORBIDDEN');
      }
    });
  });
});