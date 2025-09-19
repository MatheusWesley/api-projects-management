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
  expectErrorResponse,
  expectUserStructure,
  expectProjectStructure,
  expectWorkItemStructure,
  expectKanbanBoardStructure
} from './test-factories.js';

describe('End-to-End Workflow Integration Tests', () => {
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
      .get('/', () => ({ message: 'Project Management API', status: 'running' }))
      .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
      .use(createAuthRoutes(authService))
      .use(createProjectRoutes(projectService))
      .use(createWorkItemRoutes(workItemService))
      .use(createBoardRoutes(workItemService));
  });

  afterEach(() => {
    mockDb.close();
  });

  describe('Complete User Journey: Register -> Login -> Create Project -> Add Items -> Manage Board', () => {
    it('should support complete user workflow from registration to board management', async () => {
      // Step 1: Register a new user
      const registerData = {
        email: 'workflow@example.com',
        name: 'Workflow User',
        password: 'Password123!',
        role: 'developer'
      };

      const registerResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerData)
        })
      );

      expect(registerResponse.status).toBe(201);
      const registerResult = await registerResponse.json() as any;
      expectSuccessResponse(registerResult, 'User registered successfully');
      expectUserStructure(registerResult.data.user);
      expect(registerResult.data.user.email).toBe(registerData.email);

      // Step 2: Login with the registered user
      const loginData = {
        email: registerData.email,
        password: registerData.password
      };

      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      );

      expect(loginResponse.status).toBe(200);
      const loginResult = await loginResponse.json() as any;
      expectSuccessResponse(loginResult, 'Login successful');
      expectUserStructure(loginResult.data.user);
      expect(loginResult.data.token).toBeDefined();
      expect(typeof loginResult.data.token).toBe('string');

      const authToken = loginResult.data.token;

      // Step 3: Create a new project
      const projectData = {
        name: 'Workflow Test Project',
        description: 'Project created during workflow testing'
      };

      const createProjectResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(projectData)
        })
      );

      expect(createProjectResponse.status).toBe(201);
      const createProjectResult = await createProjectResponse.json() as any;
      expectSuccessResponse(createProjectResult, 'Project created successfully');
      expectProjectStructure(createProjectResult.data.project);
      expect(createProjectResult.data.project.name).toBe(projectData.name);

      const projectId = createProjectResult.data.project.id;

      // Step 4: Add multiple work items to the project
      const workItems = [
        {
          title: 'Setup Development Environment',
          description: 'Configure development tools and dependencies',
          type: 'task',
          priority: 'high',
          storyPoints: 3
        },
        {
          title: 'Fix Login Bug',
          description: 'Users cannot login with special characters in password',
          type: 'bug',
          priority: 'critical',
          estimatedHours: 4
        },
        {
          title: 'User Profile Feature',
          description: 'As a user, I want to manage my profile information',
          type: 'story',
          priority: 'medium',
          storyPoints: 8
        }
      ];

      const createdWorkItems = [];
      for (const itemData of workItems) {
        const createItemResponse = await app.handle(
          new Request(`http://localhost/projects/${projectId}/items`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
          })
        );

        expect(createItemResponse.status).toBe(201);
        const createItemResult = await createItemResponse.json() as any;
        expectSuccessResponse(createItemResult, 'Work item created successfully');
        expectWorkItemStructure(createItemResult.data.workItem);
        expect(createItemResult.data.workItem.title).toBe(itemData.title);
        expect(createItemResult.data.workItem.type).toBe(itemData.type);
        expect(createItemResult.data.workItem.status).toBe('todo');

        createdWorkItems.push(createItemResult.data.workItem);
      }

      // Step 5: Check initial backlog (all items should be in todo status)
      const initialBacklogResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}/backlog`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );

      expect(initialBacklogResponse.status).toBe(200);
      const initialBacklogResult = await initialBacklogResponse.json() as any;
      expectSuccessResponse(initialBacklogResult, 'Backlog retrieved successfully');
      expect(initialBacklogResult.data.backlogItems).toHaveLength(3);

      // Step 6: Check initial Kanban board
      const initialKanbanResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}/kanban`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );

      expect(initialKanbanResponse.status).toBe(200);
      const initialKanbanResult = await initialKanbanResponse.json() as any;
      expectSuccessResponse(initialKanbanResult, 'Kanban board retrieved successfully');
      expectKanbanBoardStructure(initialKanbanResult.data.kanbanBoard);
      expect(initialKanbanResult.data.kanbanBoard.todo).toHaveLength(3);
      expect(initialKanbanResult.data.kanbanBoard.in_progress).toHaveLength(0);
      expect(initialKanbanResult.data.kanbanBoard.done).toHaveLength(0);

      // Step 7: Move critical bug to in_progress
      const bugItem = createdWorkItems.find(item => item.type === 'bug');
      const moveToProgressResponse = await app.handle(
        new Request(`http://localhost/items/${bugItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'in_progress' })
        })
      );

      expect(moveToProgressResponse.status).toBe(200);
      const moveToProgressResult = await moveToProgressResponse.json() as any;
      expectSuccessResponse(moveToProgressResult, 'Work item status updated successfully');
      expect(moveToProgressResult.data.workItem.status).toBe('in_progress');

      // Step 8: Complete the task
      const taskItem = createdWorkItems.find(item => item.type === 'task');
      
      // First move to in_progress
      await app.handle(
        new Request(`http://localhost/items/${taskItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'in_progress' })
        })
      );

      // Then move to done
      const completeTaskResponse = await app.handle(
        new Request(`http://localhost/items/${taskItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'done' })
        })
      );

      expect(completeTaskResponse.status).toBe(200);
      const completeTaskResult = await completeTaskResponse.json() as any;
      expectSuccessResponse(completeTaskResult, 'Work item status updated successfully');
      expect(completeTaskResult.data.workItem.status).toBe('done');

      // Step 9: Reorder backlog items by priority
      const storyItem = createdWorkItems.find(item => item.type === 'story');
      const reorderResponse = await app.handle(
        new Request(`http://localhost/items/${storyItem.id}/priority`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ priorityOrder: 1 })
        })
      );

      expect(reorderResponse.status).toBe(200);
      const reorderResult = await reorderResponse.json() as any;
      expectSuccessResponse(reorderResult, 'Work item priority updated successfully');
      expect(reorderResult.data.workItem.priorityOrder).toBe(1);

      // Step 10: Check final state of backlog (should only have story item)
      const finalBacklogResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}/backlog`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );

      expect(finalBacklogResponse.status).toBe(200);
      const finalBacklogResult = await finalBacklogResponse.json() as any;
      expectSuccessResponse(finalBacklogResult, 'Backlog retrieved successfully');
      expect(finalBacklogResult.data.backlogItems).toHaveLength(1);
      expect(finalBacklogResult.data.backlogItems[0].type).toBe('story');

      // Step 11: Check final Kanban board state
      const finalKanbanResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}/kanban`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );

      expect(finalKanbanResponse.status).toBe(200);
      const finalKanbanResult = await finalKanbanResponse.json() as any;
      expectSuccessResponse(finalKanbanResult, 'Kanban board retrieved successfully');
      expectKanbanBoardStructure(finalKanbanResult.data.kanbanBoard);
      expect(finalKanbanResult.data.kanbanBoard.todo).toHaveLength(1); // story
      expect(finalKanbanResult.data.kanbanBoard.in_progress).toHaveLength(1); // bug
      expect(finalKanbanResult.data.kanbanBoard.done).toHaveLength(1); // task

      // Verify the items are in correct columns
      expect(finalKanbanResult.data.kanbanBoard.todo[0].type).toBe('story');
      expect(finalKanbanResult.data.kanbanBoard.in_progress[0].type).toBe('bug');
      expect(finalKanbanResult.data.kanbanBoard.done[0].type).toBe('task');

      // Step 12: Update project information
      const updateProjectResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Updated Workflow Project',
            description: 'Project updated during workflow testing',
            status: 'active'
          })
        })
      );

      expect(updateProjectResponse.status).toBe(200);
      const updateProjectResult = await updateProjectResponse.json() as any;
      expectSuccessResponse(updateProjectResult, 'Project updated successfully');
      expect(updateProjectResult.data.project.name).toBe('Updated Workflow Project');

      // Step 13: List all user projects
      const listProjectsResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );

      expect(listProjectsResponse.status).toBe(200);
      const listProjectsResult = await listProjectsResponse.json() as any;
      expectSuccessResponse(listProjectsResult, 'Projects retrieved successfully');
      expect(listProjectsResult.data.projects).toHaveLength(1);
      expect(listProjectsResult.data.projects[0].name).toBe('Updated Workflow Project');
    });

    it('should handle workflow with multiple users and authorization', async () => {
      // Create two users
      const user1Data = {
        email: 'user1@example.com',
        name: 'User One',
        password: 'Password123!',
        role: 'developer'
      };

      const user2Data = {
        email: 'user2@example.com',
        name: 'User Two',
        password: 'Password123!',
        role: 'manager'
      };

      // Register both users
      const user1RegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user1Data)
        })
      );

      const user2RegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user2Data)
        })
      );

      expect(user1RegisterResponse.status).toBe(201);
      expect(user2RegisterResponse.status).toBe(201);

      // Login both users
      const user1LoginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user1Data.email, password: user1Data.password })
        })
      );

      const user2LoginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user2Data.email, password: user2Data.password })
        })
      );

      const user1LoginResult = await user1LoginResponse.json() as any;
      const user2LoginResult = await user2LoginResponse.json() as any;
      const user1Token = user1LoginResult.data.token;
      const user2Token = user2LoginResult.data.token;

      // User 1 creates a project
      const projectResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user1Token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'User 1 Project',
            description: 'Project owned by user 1'
          })
        })
      );

      const projectResult = await projectResponse.json() as any;
      const projectId = projectResult.data.project.id;

      // User 2 tries to access User 1's project (should fail)
      const unauthorizedAccessResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user2Token}` }
        })
      );

      expect(unauthorizedAccessResponse.status).toBe(403);
      const unauthorizedResult = await unauthorizedAccessResponse.json() as any;
      expectErrorResponse(unauthorizedResult, 'FORBIDDEN');

      // User 2 tries to create work item in User 1's project (should fail)
      const unauthorizedCreateResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user2Token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Unauthorized Item',
            type: 'task'
          })
        })
      );

      expect(unauthorizedCreateResponse.status).toBe(403);

      // User 1 creates work item in their own project (should succeed)
      const authorizedCreateResponse = await app.handle(
        new Request(`http://localhost/projects/${projectId}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user1Token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: 'Authorized Item',
            type: 'task'
          })
        })
      );

      expect(authorizedCreateResponse.status).toBe(201);
      const authorizedCreateResult = await authorizedCreateResponse.json() as any;
      const workItemId = authorizedCreateResult.data.workItem.id;

      // User 2 tries to access User 1's work item (should fail)
      const unauthorizedItemResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user2Token}` }
        })
      );

      expect(unauthorizedItemResponse.status).toBe(403);

      // User 1 can access their own work item (should succeed)
      const authorizedItemResponse = await app.handle(
        new Request(`http://localhost/items/${workItemId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user1Token}` }
        })
      );

      expect(authorizedItemResponse.status).toBe(200);

      // User 2 creates their own project
      const user2ProjectResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user2Token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'User 2 Project',
            description: 'Project owned by user 2'
          })
        })
      );

      expect(user2ProjectResponse.status).toBe(201);

      // Each user should only see their own projects
      const user1ProjectsResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user1Token}` }
        })
      );

      const user2ProjectsResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user2Token}` }
        })
      );

      const user1ProjectsResult = await user1ProjectsResponse.json() as any;
      const user2ProjectsResult = await user2ProjectsResponse.json() as any;

      expect(user1ProjectsResult.data.projects).toHaveLength(1);
      expect(user1ProjectsResult.data.projects[0].name).toBe('User 1 Project');

      expect(user2ProjectsResult.data.projects).toHaveLength(1);
      expect(user2ProjectsResult.data.projects[0].name).toBe('User 2 Project');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle invalid token scenarios gracefully', async () => {
      // Test with malformed token
      const malformedTokenResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer invalid-token-format' }
        })
      );

      expect(malformedTokenResponse.status).toBe(401);

      // Test with expired token (simulate by using a token from non-existent user)
      const expiredTokenResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJub24tZXhpc3RlbnQiLCJpYXQiOjE2MzQ1NjcwMDB9.invalid' }
        })
      );

      expect(expiredTokenResponse.status).toBe(401);

      // Test with missing Authorization header
      const noAuthResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET'
        })
      );

      expect(noAuthResponse.status).toBe(401);

      // Test with wrong Authorization scheme
      const wrongSchemeResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'GET',
          headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
        })
      );

      expect(wrongSchemeResponse.status).toBe(401);
    });

    it('should handle malformed JSON and content type issues', async () => {
      // Create a valid user first
      const testUser = await testFactory.createTestUser();

      // Test malformed JSON
      const malformedJsonResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
            'Content-Type': 'application/json'
          },
          body: '{ invalid json }'
        })
      );

      expect(malformedJsonResponse.status).toBe(400);

      // Test missing Content-Type header
      const missingContentTypeResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${testUser.token}` },
          body: JSON.stringify({ name: 'Test Project' })
        })
      );

      // Should still work or return appropriate error
      expect([201, 400, 415, 422]).toContain(missingContentTypeResponse.status);

      // Test wrong Content-Type
      const wrongContentTypeResponse = await app.handle(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify({ name: 'Test Project' })
        })
      );

      expect([201, 400, 415, 422]).toContain(wrongContentTypeResponse.status);
    });

    it('should handle resource not found scenarios', async () => {
      const testUser = await testFactory.createTestUser();

      // Test non-existent project
      const nonExistentProjectResponse = await app.handle(
        new Request('http://localhost/projects/non-existent-id', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${testUser.token}` }
        })
      );

      expect(nonExistentProjectResponse.status).toBe(404);

      // Test non-existent work item
      const nonExistentItemResponse = await app.handle(
        new Request('http://localhost/items/non-existent-id', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${testUser.token}` }
        })
      );

      expect(nonExistentItemResponse.status).toBe(404);

      // Test operations on non-existent resources
      const updateNonExistentResponse = await app.handle(
        new Request('http://localhost/projects/non-existent-id', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: 'Updated Name' })
        })
      );

      expect(updateNonExistentResponse.status).toBe(404);

      const deleteNonExistentResponse = await app.handle(
        new Request('http://localhost/projects/non-existent-id', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${testUser.token}` }
        })
      );

      expect(deleteNonExistentResponse.status).toBe(404);
    });

    it('should handle business logic violations', async () => {
      const testSetup = await testFactory.createCompleteTestSetup();
      const { users, projects, workItems } = testSetup;

      // Test invalid status transition (todo -> done without going through in_progress)
      const invalidTransitionResponse = await app.handle(
        new Request(`http://localhost/items/${workItems.todoTask.workItem.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${users.developer.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'done' })
        })
      );

      expect(invalidTransitionResponse.status).toBe(400);
      const invalidTransitionResult = await invalidTransitionResponse.json() as any;
      expectErrorResponse(invalidTransitionResult, 'BUSINESS_LOGIC_ERROR');
      expect(invalidTransitionResult.error.message).toContain('Cannot transition');

      // Test duplicate email registration
      const duplicateEmailResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: users.developer.user.email, // Same email as existing user
            name: 'Duplicate User',
            password: 'Password123!',
            role: 'developer'
          })
        })
      );

      expect(duplicateEmailResponse.status).toBe(409);
      const duplicateEmailResult = await duplicateEmailResponse.json() as any;
      expectErrorResponse(duplicateEmailResult, 'CONFLICT');
    });

    it('should handle concurrent operations gracefully', async () => {
      const testUser = await testFactory.createTestUser();
      const testProject = await testFactory.createTestProject(testUser);

      // Create multiple work items concurrently
      const concurrentCreations = Array.from({ length: 5 }, (_, i) =>
        app.handle(
          new Request(`http://localhost/projects/${testProject.project.id}/items`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${testUser.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: `Concurrent Item ${i + 1}`,
              type: 'task'
            })
          })
        )
      );

      const results = await Promise.all(concurrentCreations);
      
      // All should succeed
      results.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all items were created
      const listItemsResponse = await app.handle(
        new Request(`http://localhost/projects/${testProject.project.id}/items`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${testUser.token}` }
        })
      );

      const listItemsResult = await listItemsResponse.json() as any;
      expect(listItemsResult.data.workItems).toHaveLength(5);
    });
  });
});