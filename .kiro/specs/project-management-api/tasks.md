# Implementation Plan

- [x] 1. Setup project structure and dependencies
  - Initialize Bun project with package.json and TypeScript configuration
  - Install Elysia, TypeBox, JWT libraries, SQLite driver and testing dependencies
  - Create directory structure (controllers, services, repositories, middleware, schemas, types, utils, config)
  - _Requirements: 8.1, 8.2_

- [x] 2. Create core types and interfaces
  - Define TypeScript interfaces for User, Project, WorkItem, Sprint entities
  - Create repository interfaces (IUserRepository, IProjectRepository, IWorkItemRepository)
  - Define service interfaces (IAuthService, IProjectService, IWorkItemService)
  - Create custom error classes (AppError, ValidationError, NotFoundError, etc.)
  - _Requirements: 8.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Implement TypeBox validation schemas
  - Create user validation schemas (CreateUserSchema, LoginSchema, UpdateUserSchema)
  - Create project validation schemas (CreateProjectSchema, UpdateProjectSchema)
  - Create work item validation schemas (CreateWorkItemSchema, UpdateWorkItemSchema)
  - Create parameter validation schemas for route params and query strings
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Setup database and repository implementations
  - Create database connection utility and schema initialization
  - Implement UserRepository with CRUD operations and SQLite queries
  - Implement ProjectRepository with CRUD operations and user-project relationships
  - Implement WorkItemRepository with CRUD operations, filtering, and priority management
  - Write unit tests for all repository implementations
  - _Requirements: 8.3, 8.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Create authentication utilities and middleware
  - Implement JWT utility functions (generate, verify, decode tokens)
  - Create password hashing utilities using bcrypt or similar
  - Implement authentication middleware for protected routes
  - Write unit tests for authentication utilities and middleware
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Implement service layer
  - Create AuthService with login, register, token verification methods
  - Create ProjectService with CRUD operations and user authorization checks
  - Create WorkItemService with CRUD operations, status transitions, and board logic
  - Implement business logic for Kanban board data transformation
  - Implement backlog management and priority ordering logic
  - Write unit tests for all service implementations with mocked repositories
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [x] 7. Create validation middleware
  - Implement generic validation middleware that uses TypeBox schemas
  - Create middleware for validating request body, params, and query parameters
  - Implement error formatting for validation failures
  - Write unit tests for validation middleware with various invalid inputs
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Implement error handling middleware
  - Create global error handler middleware for Elysia
  - Implement error response formatting with consistent structure
  - Add error logging for debugging purposes
  - Handle different error types (validation, authentication, authorization, not found, internal)
  - Write unit tests for error handling scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Create authentication controllers and routes
  - Implement AuthController with login and register endpoints
  - Create POST /auth/login route with email/password validation
  - Create POST /auth/register route with user data validation
  - Add proper error handling and response formatting
  - Write integration tests for authentication endpoints
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 10. Create project controllers and routes
  - Implement ProjectController with CRUD operations
  - Create GET /projects route for listing user projects
  - Create POST /projects route for creating new projects
  - Create GET /projects/:id route for getting specific project
  - Create PUT /projects/:id route for updating projects
  - Create DELETE /projects/:id route for deleting projects
  - Add authentication middleware to all project routes
  - Write integration tests for all project endpoints
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 11. Create work item controllers and routes
  - Implement WorkItemController with CRUD operations
  - Create GET /projects/:projectId/items route for listing project items
  - Create POST /projects/:projectId/items route for creating new items
  - Create GET /items/:id route for getting specific item
  - Create PUT /items/:id route for updating items
  - Create DELETE /items/:id route for deleting items
  - Create PATCH /items/:id/status route for status updates
  - Add authentication and project access validation to all routes
  - Write integration tests for all work item endpoints
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 12. Create board and backlog controllers and routes
  - Implement BoardController for Kanban and backlog views
  - Create GET /projects/:projectId/kanban route returning items grouped by status
  - Create GET /projects/:projectId/backlog route returning prioritized todo items
  - Create PATCH /items/:id/priority route for reordering backlog items
  - Implement logic for moving items between Kanban columns
  - Add proper authorization checks for project access
  - Write integration tests for board and backlog endpoints
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [x] 13. Setup main Elysia application
  - Create main app.ts file with Elysia instance configuration
  - Register all middleware (error handling, authentication, validation)
  - Register all route controllers (auth, projects, work items, boards)
  - Configure CORS and other necessary plugins
  - Add request logging and health check endpoint
  - _Requirements: 8.1, 8.2_

- [x] 14. Create application configuration and environment setup
  - Create configuration module for database, JWT secrets, and app settings
  - Setup environment variable handling for different environments
  - Create database initialization script with table creation
  - Add seed data script for development and testing
  - _Requirements: 8.1, 8.2_

- [x] 15. Write comprehensive integration tests
  - Create test database setup and teardown utilities
  - Write end-to-end tests for complete user workflows (register -> login -> create project -> add items -> manage board)
  - Test authentication flows with valid and invalid tokens
  - Test authorization scenarios (users accessing other users' projects)
  - Test error scenarios and edge cases
  - Create test data factories for consistent test setup
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Add final optimizations and documentation
  - Create API documentation with endpoint descriptions and examples
  - Add input/output examples for all endpoints
  - Optimize database queries and add indexes where needed
  - Add rate limiting middleware for API protection
  - Create README with setup and usage instructions in portuguese brazil.
  - _Requirements: 8.1, 8.2_