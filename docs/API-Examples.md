# API Usage Examples

This document provides comprehensive examples of how to use the Project Management API in various scenarios.

## Table of Contents

1. [Authentication Examples](#authentication-examples)
2. [Project Management Examples](#project-management-examples)
3. [Work Item Management Examples](#work-item-management-examples)
4. [Board Management Examples](#board-management-examples)
5. [Error Handling Examples](#error-handling-examples)
6. [SDK Examples](#sdk-examples)
7. [Integration Examples](#integration-examples)

## Authentication Examples

### User Registration

```bash
# Register a new developer
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "name": "John Developer",
    "password": "securepassword123",
    "role": "developer"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "developer@example.com",
      "name": "John Developer",
      "role": "developer",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "User registered successfully"
}
```

### User Login

```bash
# Login with credentials
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "developer@example.com",
      "name": "John Developer",
      "role": "developer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

## Project Management Examples

### Create a Project

```bash
# Create a new project
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "E-commerce Platform",
    "description": "A modern e-commerce platform with React frontend and Node.js backend"
  }'
```

### List User Projects

```bash
# Get all projects for the authenticated user
curl -X GET http://localhost:3001/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update a Project

```bash
# Update project status to completed
curl -X PUT http://localhost:3001/projects/proj-123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "completed",
    "description": "Updated description with final notes"
  }'
```

### Delete a Project

```bash
# Delete a project (this will also delete all work items)
curl -X DELETE http://localhost:3001/projects/proj-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Work Item Management Examples

### Create Work Items

```bash
# Create a task
curl -X POST http://localhost:3001/projects/proj-123/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system with login and registration",
    "type": "task",
    "storyPoints": 8,
    "estimatedHours": 16
  }'

# Create a bug report
curl -X POST http://localhost:3001/projects/proj-123/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Login form validation error",
    "description": "Email validation fails for valid email addresses with plus signs",
    "type": "bug",
    "priority": "high",
    "storyPoints": 3
  }'

# Create a user story
curl -X POST http://localhost:3001/projects/proj-123/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "User profile management",
    "description": "As a user, I want to manage my profile information so that I can keep my details up to date",
    "type": "story",
    "storyPoints": 5,
    "assigneeId": "user-456"
  }'
```

### List Work Items with Filters

```bash
# Get all work items for a project
curl -X GET http://localhost:3001/projects/proj-123/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by status
curl -X GET "http://localhost:3001/projects/proj-123/items?status=in_progress" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by type and assignee
curl -X GET "http://localhost:3001/projects/proj-123/items?type=bug&assigneeId=user-456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Work Item Status

```bash
# Move item to in progress
curl -X PATCH http://localhost:3001/items/item-123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "in_progress"
  }'

# Mark item as done
curl -X PATCH http://localhost:3001/items/item-123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "done"
  }'
```

### Update Work Item Details

```bash
# Update multiple fields
curl -X PUT http://localhost:3001/items/item-123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Updated task title",
    "description": "Updated description with more details",
    "priority": "high",
    "assigneeId": "user-789",
    "storyPoints": 5,
    "estimatedHours": 10
  }'
```

## Board Management Examples

### Get Kanban Board

```bash
# Get Kanban board view
curl -X GET http://localhost:3001/projects/proj-123/kanban \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "board": {
      "todo": [
        {
          "id": "item-123",
          "title": "New feature implementation",
          "type": "story",
          "priority": "medium",
          "assigneeId": "user-456",
          "storyPoints": 5
        }
      ],
      "in_progress": [
        {
          "id": "item-456",
          "title": "Bug fix for login",
          "type": "bug",
          "priority": "high",
          "assigneeId": "user-789",
          "storyPoints": 3
        }
      ],
      "done": [
        {
          "id": "item-789",
          "title": "Setup CI/CD pipeline",
          "type": "task",
          "priority": "low",
          "assigneeId": "user-123",
          "storyPoints": 2
        }
      ]
    }
  },
  "message": "Kanban board retrieved successfully"
}
```

### Get Project Backlog

```bash
# Get prioritized backlog
curl -X GET http://localhost:3001/projects/proj-123/backlog \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Item Priority

```bash
# Move item to top of backlog
curl -X PATCH http://localhost:3001/items/item-123/priority \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "priorityOrder": 1
  }'
```

## Error Handling Examples

### Validation Errors

```bash
# Invalid registration data
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "name": "",
    "password": "123",
    "role": "invalid-role"
  }'
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "name": "Name is required",
      "password": "Password must be at least 8 characters",
      "role": "Role must be one of: admin, manager, developer"
    }
  }
}
```

### Authentication Errors

```bash
# Request without token
curl -X GET http://localhost:3001/projects
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Authorization Errors

```bash
# Try to access another user's project
curl -X GET http://localhost:3001/projects/other-user-project \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

### Rate Limiting

```bash
# Too many requests
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# ... repeat many times quickly
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many authentication attempts, please try again in 15 minutes"
  }
}
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { ProjectManagementAPI } from './api-client';

// Initialize the API client
const api = new ProjectManagementAPI('http://localhost:3001');

async function completeWorkflow() {
  try {
    // 1. Register a new user
    const registrationResult = await api.register({
      email: 'newuser@example.com',
      name: 'New User',
      password: 'securepassword123',
      role: 'developer'
    });
    console.log('User registered:', registrationResult.data.user);

    // 2. Login
    const loginResult = await api.login('newuser@example.com', 'securepassword123');
    console.log('Login successful, token received');

    // 3. Create a project
    const project = await api.createProject({
      name: 'My First Project',
      description: 'Learning the API'
    });
    console.log('Project created:', project.data.project);

    // 4. Create work items
    const task = await api.createWorkItem(project.data.project.id, {
      title: 'Setup development environment',
      description: 'Install dependencies and configure development tools',
      type: 'task',
      storyPoints: 3
    });

    const bug = await api.createWorkItem(project.data.project.id, {
      title: 'Fix responsive design issue',
      description: 'Mobile layout breaks on small screens',
      type: 'bug',
      priority: 'high',
      storyPoints: 2
    });

    // 5. Update work item status
    await api.updateWorkItemStatus(task.data.item.id, 'in_progress');
    console.log('Task moved to in progress');

    // 6. Get Kanban board
    const board = await api.getKanbanBoard(project.data.project.id);
    console.log('Kanban board:', board.data.board);

    // 7. Get backlog
    const backlog = await api.getBacklog(project.data.project.id);
    console.log('Backlog items:', backlog.data.backlog);

  } catch (error) {
    console.error('API Error:', error.message);
  }
}

completeWorkflow();
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { ProjectManagementAPI } from './api-client';

const api = new ProjectManagementAPI('http://localhost:3001');

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const result = await api.getProjects();
        setProjects(result.data.projects);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const createProject = async (projectData) => {
    try {
      const result = await api.createProject(projectData);
      setProjects(prev => [result.data.project, ...prev]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { projects, loading, error, createProject };
}

// Usage in component
function ProjectList() {
  const { projects, loading, error, createProject } = useProjects();

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Projects</h2>
      {projects.map(project => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <span>Status: {project.status}</span>
        </div>
      ))}
    </div>
  );
}
```

## Integration Examples

### Express.js Middleware Integration

```javascript
const express = require('express');
const { ProjectManagementAPI } = require('./api-client');

const app = express();
const api = new ProjectManagementAPI('http://localhost:3001');

// Middleware to authenticate with the API
async function authenticateWithAPI(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await api.login(email, password);
    req.apiToken = result.data.token;
    req.user = result.data.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Route that uses the API
app.post('/sync-projects', authenticateWithAPI, async (req, res) => {
  try {
    api.setToken(req.apiToken);
    const projects = await api.getProjects();
    
    // Sync projects with local database
    await syncProjectsToDatabase(projects.data.projects);
    
    res.json({ message: 'Projects synced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Webhook Integration

```javascript
// Webhook handler for project updates
app.post('/webhooks/project-updated', express.json(), async (req, res) => {
  const { projectId, action, data } = req.body;
  
  try {
    switch (action) {
      case 'project.created':
        await handleProjectCreated(data);
        break;
      case 'project.updated':
        await handleProjectUpdated(data);
        break;
      case 'workitem.status_changed':
        await handleWorkItemStatusChanged(data);
        break;
      default:
        console.log('Unknown webhook action:', action);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

### Batch Operations

```javascript
// Batch create work items
async function batchCreateWorkItems(projectId, items) {
  const results = [];
  const errors = [];
  
  for (const item of items) {
    try {
      const result = await api.createWorkItem(projectId, item);
      results.push(result.data.item);
    } catch (error) {
      errors.push({ item, error: error.message });
    }
  }
  
  return { results, errors };
}

// Usage
const workItems = [
  { title: 'Task 1', type: 'task', storyPoints: 3 },
  { title: 'Task 2', type: 'task', storyPoints: 5 },
  { title: 'Bug Fix', type: 'bug', priority: 'high' }
];

const { results, errors } = await batchCreateWorkItems('proj-123', workItems);
console.log(`Created ${results.length} items, ${errors.length} errors`);
```

### Data Export

```javascript
// Export project data
async function exportProjectData(projectId) {
  try {
    const [project, workItems, kanbanBoard] = await Promise.all([
      api.getProject(projectId),
      api.getWorkItems(projectId),
      api.getKanbanBoard(projectId)
    ]);
    
    const exportData = {
      project: project.data.project,
      workItems: workItems.data.items,
      kanbanBoard: kanbanBoard.data.board,
      exportedAt: new Date().toISOString()
    };
    
    // Save to file or send to another system
    require('fs').writeFileSync(
      `project-${projectId}-export.json`,
      JSON.stringify(exportData, null, 2)
    );
    
    return exportData;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
```

### Performance Monitoring

```javascript
// Monitor API performance
class APIMonitor {
  constructor(api) {
    this.api = api;
    this.metrics = [];
  }
  
  async measureRequest(operation, ...args) {
    const start = Date.now();
    try {
      const result = await operation.apply(this.api, args);
      const duration = Date.now() - start;
      
      this.metrics.push({
        operation: operation.name,
        duration,
        success: true,
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.metrics.push({
        operation: operation.name,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  getAverageResponseTime(operation) {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }
}

// Usage
const monitor = new APIMonitor(api);
const projects = await monitor.measureRequest(api.getProjects);
console.log('Average response time:', monitor.getAverageResponseTime('getProjects'));
```

## Testing Examples

### Unit Test Example

```javascript
const { ProjectManagementAPI } = require('./api-client');

describe('ProjectManagementAPI', () => {
  let api;
  let authToken;
  
  beforeAll(async () => {
    api = new ProjectManagementAPI('http://localhost:3001');
    
    // Login for tests
    const loginResult = await api.login('test@example.com', 'testpassword');
    authToken = loginResult.data.token;
  });
  
  test('should create and retrieve project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A project for testing'
    };
    
    const createResult = await api.createProject(projectData);
    expect(createResult.success).toBe(true);
    expect(createResult.data.project.name).toBe(projectData.name);
    
    const getResult = await api.getProject(createResult.data.project.id);
    expect(getResult.success).toBe(true);
    expect(getResult.data.project.id).toBe(createResult.data.project.id);
  });
  
  test('should handle validation errors', async () => {
    await expect(api.createProject({ name: '' }))
      .rejects
      .toThrow('Validation failed');
  });
});
```

This comprehensive examples document shows how to use the API in various real-world scenarios, from basic CRUD operations to complex integrations and monitoring setups.