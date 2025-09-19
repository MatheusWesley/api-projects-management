# Implementation Plan

- [x] 1. Fix date serialization in repositories
  - Implement date parsing utility in base repository class
  - Update UserRepository to convert string dates to Date objects
  - Update ProjectRepository to convert string dates to Date objects  
  - Update WorkItemRepository to convert string dates to Date objects
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Fix UserRepository query and data handling issues
  - [x] 2.1 Fix date serialization in UserRepository methods
    - Update create method to return Date objects for createdAt/updatedAt
    - Update update method to return Date objects for createdAt/updatedAt
    - Update findById and findByEmail to return Date objects
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Fix ProjectRepository query and authorization issues
  - [x] 3.1 Fix date serialization in ProjectRepository methods
    - Update create method to return Date objects for createdAt/updatedAt
    - Update update method to return Date objects for createdAt/updatedAt
    - Update all find methods to return Date objects
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Fix project ownership and listing queries
    - Fix isOwner method to correctly verify project ownership
    - Fix findByUserId to return projects in correct order (most recent first)
    - Fix list method to return projects in correct order
    - Fix findByIdWithOwner to properly join user data and handle non-existent projects
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3_

- [ ] 4. Fix WorkItemRepository query and filtering issues
  - [ ] 4.1 Fix date serialization in WorkItemRepository methods
    - Update create method to return Date objects for createdAt/updatedAt
    - Update update and updatePriority methods to return Date objects
    - Update all find methods to return Date objects
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 4.2 Fix work item query methods
    - Fix findByAssigneeId to properly filter by assignee
    - Fix findByStatus to correctly filter by status
    - Fix findWithFilters to apply multiple filters correctly
    - Fix getItemsWithAssigneeInfo to properly join user data
    - Fix reorderBacklogItems to correctly update priority orders
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. Fix business logic validation in services
  - [ ] 5.1 Implement work item status transition validation
    - Create status transition matrix with valid transitions
    - Update WorkItemService.updateWorkItemStatus to validate transitions
    - Ensure done → todo transitions are blocked with BusinessLogicError
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 5.2 Fix AuthService token generation
    - Update generateToken method to return string instead of object
    - Ensure JWT tokens are properly formatted as strings
    - _Requirements: 7.1, 7.2_

  - [ ] 5.3 Fix WorkItemService priority handling
    - Remove automatic priorityOrder assignment in createWorkItem
    - Let repository handle priority order assignment
    - _Requirements: 4.1, 4.2_

- [ ] 6. Fix input validation and error handling
  - [ ] 6.1 Fix validation schemas and middleware
    - Review and fix project creation validation to reject invalid data
    - Ensure validation errors return 422 status code consistently
    - Fix work item status transition validation to return 400 for invalid transitions
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 6.2 Fix HTTP method and header handling
    - Update error handling for unsupported HTTP methods
    - Fix header validation to handle invalid Unicode characters gracefully
    - Ensure proper error responses for malformed requests
    - _Requirements: 6.1, 6.2_

- [ ] 7. Fix authorization and access control
  - [ ] 7.1 Fix project access authorization
    - Ensure users only see their own projects in list operations
    - Fix project ownership verification logic
    - Update authorization middleware to properly validate access
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8. Fix test configuration and data isolation
  - [ ] 8.1 Fix test data management
    - Improve test data cleanup between tests
    - Ensure test users and projects don't interfere with each other
    - Fix test factories to generate consistent data
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 8.2 Fix HTTP test scenarios
    - Remove invalid Unicode headers from test cases
    - Fix unsupported HTTP method test expectations
    - Ensure test requests use valid HTTP protocol
    - _Requirements: 6.1, 6.2_

- [ ] 9. Verify and validate all fixes
  - [ ] 9.1 Run repository tests and verify fixes
    - Execute UserRepository tests and confirm all pass
    - Execute ProjectRepository tests and confirm all pass
    - Execute WorkItemRepository tests and confirm all pass
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 4.1, 4.2, 4.3_

  - [ ] 9.2 Run service tests and verify fixes
    - Execute AuthService tests and confirm token generation works
    - Execute WorkItemService tests and confirm status transitions work
    - Execute ProjectService tests and confirm no regressions
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2_

  - [ ] 9.3 Run integration tests and verify fixes
    - Execute authorization scenario tests and confirm access control works
    - Execute error scenario tests and confirm proper error handling
    - Execute end-to-end workflow tests and confirm complete functionality
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3, 6.1, 6.2_