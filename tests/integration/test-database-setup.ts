// Test database setup and teardown utilities for comprehensive integration tests
import { MockDatabase } from '../repositories/mock-database.js';
import type { IUserRepository, IProjectRepository, IWorkItemRepository } from '../../src/types/repositories.js';
import type { IAuthService, IProjectService, IWorkItemService } from '../../src/types/services.js';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { ProjectRepository } from '../../src/repositories/ProjectRepository.js';
import { WorkItemRepository } from '../../src/repositories/WorkItemRepository.js';
import { AuthService } from '../../src/services/AuthService.js';
import { ProjectService } from '../../src/services/ProjectService.js';
import { WorkItemService } from '../../src/services/WorkItemService.js';

export interface TestDatabaseContext {
  mockDb: MockDatabase;
  repositories: {
    userRepository: IUserRepository;
    projectRepository: IProjectRepository;
    workItemRepository: IWorkItemRepository;
  };
  services: {
    authService: IAuthService;
    projectService: IProjectService;
    workItemService: IWorkItemService;
  };
}

export class TestDatabaseSetup {
  private contexts: TestDatabaseContext[] = [];

  /**
   * Create a new test database context with all repositories and services
   */
  createContext(): TestDatabaseContext {
    const mockDb = new MockDatabase();
    
    // Create repositories
    const userRepository = new UserRepository(mockDb as any);
    const projectRepository = new ProjectRepository(mockDb as any);
    const workItemRepository = new WorkItemRepository(mockDb as any);
    
    // Create services
    const authService = new AuthService(userRepository);
    const projectService = new ProjectService(projectRepository);
    const workItemService = new WorkItemService(workItemRepository, projectService);
    
    const context: TestDatabaseContext = {
      mockDb,
      repositories: {
        userRepository,
        projectRepository,
        workItemRepository
      },
      services: {
        authService,
        projectService,
        workItemService
      }
    };
    
    this.contexts.push(context);
    return context;
  }

  /**
   * Clean up all created contexts
   */
  cleanupAll(): void {
    this.contexts.forEach(context => {
      context.mockDb.close();
    });
    this.contexts = [];
  }

  /**
   * Clean up a specific context
   */
  cleanup(context: TestDatabaseContext): void {
    context.mockDb.close();
    const index = this.contexts.indexOf(context);
    if (index > -1) {
      this.contexts.splice(index, 1);
    }
  }

  /**
   * Create a context with pre-populated test data
   */
  async createContextWithTestData(): Promise<TestDatabaseContext & {
    testData: {
      users: Array<{ user: any; token: string }>;
      projects: Array<any>;
      workItems: Array<any>;
    };
  }> {
    const context = this.createContext();
    const { authService, projectService, workItemService } = context.services;

    // Create test users
    const users = [];
    const userConfigs = [
      { email: 'developer@test.com', name: 'Test Developer', role: 'developer' as const },
      { email: 'manager@test.com', name: 'Test Manager', role: 'manager' as const },
      { email: 'admin@test.com', name: 'Test Admin', role: 'admin' as const }
    ];

    for (const config of userConfigs) {
      const userData = {
        ...config,
        password: 'TestPassword123!'
      };
      
      const user = await authService.register(userData);
      const loginResult = await authService.login(config.email, userData.password);
      
      users.push({
        user,
        token: loginResult.token
      });
    }

    // Create test projects
    const projects = [];
    const projectConfigs = [
      { name: 'Test Project 1', description: 'First test project', ownerIndex: 0 },
      { name: 'Test Project 2', description: 'Second test project', ownerIndex: 1 },
      { name: 'Test Project 3', description: 'Third test project', ownerIndex: 2 }
    ];

    for (const config of projectConfigs) {
      const project = await projectService.createProject({
        name: config.name,
        description: config.description
      }, users[config.ownerIndex].user.id);
      
      projects.push(project);
    }

    // Create test work items
    const workItems = [];
    const workItemConfigs = [
      { title: 'Todo Task', type: 'task' as const, projectIndex: 0, reporterIndex: 0 },
      { title: 'In Progress Bug', type: 'bug' as const, projectIndex: 0, reporterIndex: 0 },
      { title: 'Done Story', type: 'story' as const, projectIndex: 0, reporterIndex: 0 },
      { title: 'Manager Task', type: 'task' as const, projectIndex: 1, reporterIndex: 1 },
      { title: 'Admin Story', type: 'story' as const, projectIndex: 2, reporterIndex: 2 }
    ];

    for (const config of workItemConfigs) {
      const workItem = await workItemService.createWorkItem({
        title: config.title,
        description: `Description for ${config.title}`,
        type: config.type,
        priority: 'medium'
      }, projects[config.projectIndex].id, users[config.reporterIndex].user.id);
      
      workItems.push(workItem);
    }

    // Update some work item statuses to create realistic test data
    await workItemService.updateWorkItemStatus(workItems[1].id, 'in_progress', users[0].user.id);
    await workItemService.updateWorkItemStatus(workItems[2].id, 'done', users[0].user.id);

    return {
      ...context,
      testData: {
        users,
        projects,
        workItems
      }
    };
  }

  /**
   * Verify database state for testing
   */
  async verifyDatabaseState(context: TestDatabaseContext): Promise<{
    userCount: number;
    projectCount: number;
    workItemCount: number;
    isHealthy: boolean;
  }> {
    const { userRepository, projectRepository, workItemRepository } = context.repositories;

    try {
      const users = await userRepository.list();
      const projects = await projectRepository.list();
      
      // Get all work items by checking each project
      let totalWorkItems = 0;
      for (const project of projects) {
        const items = await workItemRepository.findByProjectId(project.id);
        totalWorkItems += items.length;
      }

      return {
        userCount: users.length,
        projectCount: projects.length,
        workItemCount: totalWorkItems,
        isHealthy: true
      };
    } catch (error) {
      return {
        userCount: 0,
        projectCount: 0,
        workItemCount: 0,
        isHealthy: false
      };
    }
  }

  /**
   * Reset database to clean state
   */
  resetDatabase(context: TestDatabaseContext): void {
    // Close and recreate the mock database
    context.mockDb.close();
    const newMockDb = new MockDatabase();
    
    // Update the context with new database
    context.mockDb = newMockDb;
    
    // Recreate repositories with new database
    context.repositories.userRepository = new UserRepository(newMockDb as any);
    context.repositories.projectRepository = new ProjectRepository(newMockDb as any);
    context.repositories.workItemRepository = new WorkItemRepository(newMockDb as any);
    
    // Recreate services with new repositories
    context.services.authService = new AuthService(context.repositories.userRepository);
    context.services.projectService = new ProjectService(context.repositories.projectRepository);
    context.services.workItemService = new WorkItemService(
      context.repositories.workItemRepository, 
      context.services.projectService
    );
  }

  /**
   * Create isolated test environment for parallel test execution
   */
  createIsolatedEnvironment(): TestDatabaseContext {
    return this.createContext();
  }

  /**
   * Simulate database connection issues
   */
  simulateDatabaseError(context: TestDatabaseContext, errorType: 'connection' | 'timeout' | 'constraint'): void {
    // Mock database errors by replacing methods with error-throwing versions
    const originalPrepare = context.mockDb.prepare;
    
    switch (errorType) {
      case 'connection':
        context.mockDb.prepare = () => {
          throw new Error('Database connection failed');
        };
        break;
      case 'timeout':
        context.mockDb.prepare = () => {
          throw new Error('Database operation timed out');
        };
        break;
      case 'constraint':
        context.mockDb.prepare = (sql: string) => {
          if (sql.toLowerCase().includes('insert')) {
            throw new Error('UNIQUE constraint failed');
          }
          return originalPrepare.call(context.mockDb, sql);
        };
        break;
    }
  }

  /**
   * Restore normal database operation after simulating errors
   */
  restoreDatabaseOperation(context: TestDatabaseContext): void {
    // Reset the database to restore normal operation
    this.resetDatabase(context);
  }
}

// Global test database setup instance
export const testDatabaseSetup = new TestDatabaseSetup();

// Utility functions for common test scenarios
export async function createMinimalTestSetup(): Promise<{
  context: TestDatabaseContext;
  user: { user: any; token: string };
  project: any;
}> {
  const context = testDatabaseSetup.createContext();
  const { authService, projectService } = context.services;

  // Create a single user
  const userData = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'TestPassword123!',
    role: 'developer' as const
  };

  const user = await authService.register(userData);
  const loginResult = await authService.login(userData.email, userData.password);
  const userWithToken = { user, token: loginResult.token };

  // Create a single project
  const project = await projectService.createProject({
    name: 'Test Project',
    description: 'A test project'
  }, user.id);

  return {
    context,
    user: userWithToken,
    project
  };
}

export async function createMultiUserTestSetup(): Promise<{
  context: TestDatabaseContext;
  users: Array<{ user: any; token: string; role: string }>;
  projects: Array<any>;
}> {
  const context = testDatabaseSetup.createContext();
  const { authService, projectService } = context.services;

  const users = [];
  const roles = ['developer', 'manager', 'admin'] as const;

  // Create users with different roles
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const userData = {
      email: `${role}${i}@example.com`,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${i}`,
      password: 'TestPassword123!',
      role
    };

    const user = await authService.register(userData);
    const loginResult = await authService.login(userData.email, userData.password);
    
    users.push({
      user,
      token: loginResult.token,
      role
    });
  }

  // Create projects for each user
  const projects = [];
  for (let i = 0; i < users.length; i++) {
    const project = await projectService.createProject({
      name: `${users[i].role} Project`,
      description: `Project owned by ${users[i].role}`
    }, users[i].user.id);
    
    projects.push(project);
  }

  return {
    context,
    users,
    projects
  };
}

// Cleanup function for test teardown
export function cleanupTestDatabase(context: TestDatabaseContext): void {
  testDatabaseSetup.cleanup(context);
}

// Global cleanup for all test databases
export function cleanupAllTestDatabases(): void {
  testDatabaseSetup.cleanupAll();
}