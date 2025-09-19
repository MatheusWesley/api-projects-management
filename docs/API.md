# Project Management API Documentation

## Overview

The Project Management API is a comprehensive REST API built with Bun and Elysia for managing projects, work items, and team collaboration. It provides features for project creation, task management, Kanban boards, and user authentication.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.example.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API endpoints**: 100 requests per 15 minutes
- **Read operations**: 60 requests per minute
- **Write operations**: 20 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: When the rate limit resets

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional additional error details
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Endpoints

### Authentication

#### POST /auth/login

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "developer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Errors:**
- `400`: Invalid email format or missing fields
- `401`: Invalid credentials

#### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "password": "strongpassword123",
  "role": "developer"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-456",
      "email": "newuser@example.com",
      "name": "Jane Smith",
      "role": "developer",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "User registered successfully"
}
```

**Errors:**
- `400`: Validation failed (invalid email, weak password, etc.)
- `409`: Email already exists

### Projects

#### GET /projects

List all projects for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "proj-123",
        "name": "E-commerce Platform",
        "description": "Modern e-commerce solution",
        "ownerId": "user-123",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "message": "Projects retrieved successfully"
}
```

#### POST /projects

Create a new project.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Mobile App",
  "description": "iOS and Android mobile application"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "proj-456",
      "name": "Mobile App",
      "description": "iOS and Android mobile application",
      "ownerId": "user-123",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Project created successfully"
}
```

#### GET /projects/:projectId

Get a specific project by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "proj-123",
      "name": "E-commerce Platform",
      "description": "Modern e-commerce solution",
      "ownerId": "user-123",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Project retrieved successfully"
}
```

**Errors:**
- `404`: Project not found
- `403`: Access denied

#### PUT /projects/:projectId

Update an existing project.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "proj-123",
      "name": "Updated Project Name",
      "description": "Updated description",
      "ownerId": "user-123",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  },
  "message": "Project updated successfully"
}
```

#### DELETE /projects/:projectId

Delete a project and all its work items.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Project deleted successfully"
}
```

### Work Items

#### GET /projects/:projectId/items

List all work items for a project.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`todo`, `in_progress`, `done`)
- `type` (optional): Filter by type (`task`, `bug`, `story`)
- `assigneeId` (optional): Filter by assignee

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-123",
        "title": "Implement user authentication",
        "description": "Add JWT-based authentication system",
        "type": "task",
        "status": "in_progress",
        "priority": "high",
        "projectId": "proj-123",
        "assigneeId": "user-456",
        "reporterId": "user-123",
        "storyPoints": 8,
        "estimatedHours": 16,
        "priorityOrder": 1,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T11:00:00.000Z"
      }
    ]
  },
  "message": "Work items retrieved successfully"
}
```

#### POST /projects/:projectId/items

Create a new work item.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Fix login bug",
  "description": "Users cannot login with special characters in password",
  "type": "bug",
  "assigneeId": "user-456",
  "storyPoints": 3,
  "estimatedHours": 4
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "item-456",
      "title": "Fix login bug",
      "description": "Users cannot login with special characters in password",
      "type": "bug",
      "status": "todo",
      "priority": "medium",
      "projectId": "proj-123",
      "assigneeId": "user-456",
      "reporterId": "user-123",
      "storyPoints": 3,
      "estimatedHours": 4,
      "priorityOrder": 0,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Work item created successfully"
}
```

#### GET /items/:id

Get a specific work item by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "item-123",
      "title": "Implement user authentication",
      "description": "Add JWT-based authentication system",
      "type": "task",
      "status": "in_progress",
      "priority": "high",
      "projectId": "proj-123",
      "assigneeId": "user-456",
      "reporterId": "user-123",
      "storyPoints": 8,
      "estimatedHours": 16,
      "priorityOrder": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  },
  "message": "Work item retrieved successfully"
}
```

#### PUT /items/:id

Update a work item.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "done",
  "priority": "low",
  "assigneeId": "user-789",
  "storyPoints": 5
}
```

#### PATCH /items/:id/status

Update only the status of a work item.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "in_progress"
}
```

#### DELETE /items/:id

Delete a work item.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Work item deleted successfully"
}
```

### Boards

#### GET /projects/:projectId/kanban

Get Kanban board view with items grouped by status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "board": {
      "todo": [
        {
          "id": "item-123",
          "title": "New feature",
          "type": "story",
          "priority": "medium",
          "assigneeId": "user-456",
          "storyPoints": 5
        }
      ],
      "in_progress": [
        {
          "id": "item-456",
          "title": "Bug fix",
          "type": "bug",
          "priority": "high",
          "assigneeId": "user-789",
          "storyPoints": 3
        }
      ],
      "done": [
        {
          "id": "item-789",
          "title": "Completed task",
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

#### GET /projects/:projectId/backlog

Get project backlog with items ordered by priority.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "backlog": [
      {
        "id": "item-123",
        "title": "High priority task",
        "type": "task",
        "priority": "high",
        "storyPoints": 8,
        "priorityOrder": 1
      },
      {
        "id": "item-456",
        "title": "Medium priority story",
        "type": "story",
        "priority": "medium",
        "storyPoints": 5,
        "priorityOrder": 2
      }
    ]
  },
  "message": "Backlog retrieved successfully"
}
```

#### PATCH /items/:id/priority

Update the priority order of a work item in the backlog.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "priorityOrder": 3
}
```

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'developer';
  createdAt: Date;
  updatedAt: Date;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkItem
```typescript
interface WorkItem {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'bug' | 'story';
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  storyPoints?: number;
  estimatedHours?: number;
  priorityOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class ProjectManagementAPI {
  constructor(private baseUrl: string, private token?: string) {}

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  }

  // Authentication
  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.data.token);
    return data;
  }

  async register(userData: {
    email: string;
    name: string;
    password: string;
    role: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async createProject(projectData: { name: string; description?: string }) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProject(projectId: string) {
    return this.request(`/projects/${projectId}`);
  }

  // Work Items
  async getWorkItems(projectId: string, filters?: {
    status?: string;
    type?: string;
    assigneeId?: string;
  }) {
    const params = new URLSearchParams(filters as any);
    return this.request(`/projects/${projectId}/items?${params}`);
  }

  async createWorkItem(projectId: string, itemData: {
    title: string;
    description?: string;
    type: string;
    assigneeId?: string;
    storyPoints?: number;
  }) {
    return this.request(`/projects/${projectId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  // Boards
  async getKanbanBoard(projectId: string) {
    return this.request(`/projects/${projectId}/kanban`);
  }

  async getBacklog(projectId: string) {
    return this.request(`/projects/${projectId}/backlog`);
  }
}

// Usage example
const api = new ProjectManagementAPI('http://localhost:3001');

// Login
await api.login('user@example.com', 'password123');

// Create project
const project = await api.createProject({
  name: 'My New Project',
  description: 'A sample project'
});

// Create work item
const workItem = await api.createWorkItem(project.data.project.id, {
  title: 'Implement feature X',
  type: 'task',
  storyPoints: 5
});

// Get Kanban board
const board = await api.getKanbanBoard(project.data.project.id);
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Create project (with token)
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"My Project","description":"Project description"}'

# Get projects
curl -X GET http://localhost:3001/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create work item
curl -X POST http://localhost:3001/projects/proj-123/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"New task","type":"task","storyPoints":3}'

# Get Kanban board
curl -X GET http://localhost:3001/projects/proj-123/kanban \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

The API includes comprehensive test coverage:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test complete API workflows
- **Authentication Tests**: Test login, registration, and token validation
- **Authorization Tests**: Test access control and permissions
- **Error Handling Tests**: Test error scenarios and edge cases

Run tests with:
```bash
bun test
```

## Development

### Setup
```bash
# Install dependencies
bun install

# Setup environment
bun run setup

# Start development server
bun run dev
```

### Environment Variables
```bash
NODE_ENV=development
PORT=3001
DB_PATH=./data/database.sqlite
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

## Production Deployment

### Environment Setup
```bash
# Production setup
bun run setup:prod

# Start production server
bun start
```

### Performance Considerations

1. **Database Optimization**: Indexes are automatically created for frequently queried columns
2. **Rate Limiting**: Prevents API abuse and ensures fair usage
3. **Connection Pooling**: SQLite handles connections efficiently
4. **Caching**: Consider adding Redis for session storage in production
5. **Monitoring**: Add application monitoring and logging

### Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: Bcrypt for secure password storage
3. **Rate Limiting**: Prevents brute force attacks
4. **Input Validation**: TypeBox schemas validate all inputs
5. **SQL Injection Protection**: Parameterized queries prevent SQL injection
6. **CORS Configuration**: Configurable cross-origin resource sharing

## Support

For issues and questions:
1. Check the API documentation
2. Review error messages and status codes
3. Ensure proper authentication headers
4. Verify request format and required fields
5. Check rate limiting headers if receiving 429 errors