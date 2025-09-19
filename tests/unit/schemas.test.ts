import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import {
  CreateUserSchema,
  LoginSchema,
  UpdateUserSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateWorkItemSchema,
  UpdateWorkItemSchema,
  UpdateWorkItemStatusSchema,
  UpdateWorkItemPrioritySchema,
  IdParamSchema,
  ProjectIdParamSchema,
  WorkItemQuerySchema,
  ProjectQuerySchema
} from '../../src/schemas';

describe('User Schemas', () => {
  it('should validate CreateUserSchema correctly', () => {
    const validUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
      role: 'developer' as const
    };

    const isValid = Value.Check(CreateUserSchema, validUser);
    expect(isValid).toBe(true);

    // Test invalid email
    const invalidUser = { ...validUser, email: 'invalid-email' };
    expect(Value.Check(CreateUserSchema, invalidUser)).toBe(false);

    // Test short password
    const shortPassword = { ...validUser, password: '123' };
    expect(Value.Check(CreateUserSchema, shortPassword)).toBe(false);
  });

  it('should validate LoginSchema correctly', () => {
    const validLogin = {
      email: 'test@example.com',
      password: 'password123'
    };

    expect(Value.Check(LoginSchema, validLogin)).toBe(true);
    expect(Value.Check(LoginSchema, { ...validLogin, email: 'invalid' })).toBe(false);
  });

  it('should validate UpdateUserSchema correctly', () => {
    const validUpdate = {
      name: 'Updated Name',
      role: 'manager' as const
    };

    expect(Value.Check(UpdateUserSchema, validUpdate)).toBe(true);
    expect(Value.Check(UpdateUserSchema, {})).toBe(true); // Empty update is valid
  });
});

describe('Project Schemas', () => {
  it('should validate CreateProjectSchema correctly', () => {
    const validProject = {
      name: 'Test Project',
      description: 'A test project'
    };

    expect(Value.Check(CreateProjectSchema, validProject)).toBe(true);
    expect(Value.Check(CreateProjectSchema, { name: 'Test Project' })).toBe(true); // Description optional
    expect(Value.Check(CreateProjectSchema, { description: 'No name' })).toBe(false); // Name required
  });

  it('should validate UpdateProjectSchema correctly', () => {
    const validUpdate = {
      name: 'Updated Project',
      status: 'completed' as const
    };

    expect(Value.Check(UpdateProjectSchema, validUpdate)).toBe(true);
    expect(Value.Check(UpdateProjectSchema, {})).toBe(true); // Empty update is valid
  });
});

describe('Work Item Schemas', () => {
  it('should validate CreateWorkItemSchema correctly', () => {
    const validWorkItem = {
      title: 'Test Task',
      description: 'A test task',
      type: 'task' as const,
      priority: 'high' as const,
      storyPoints: 5
    };

    expect(Value.Check(CreateWorkItemSchema, validWorkItem)).toBe(true);
    
    // Minimal valid work item
    const minimalWorkItem = {
      title: 'Test',
      type: 'bug' as const
    };
    expect(Value.Check(CreateWorkItemSchema, minimalWorkItem)).toBe(true);

    // Invalid type
    const invalidType = { ...validWorkItem, type: 'invalid' };
    expect(Value.Check(CreateWorkItemSchema, invalidType)).toBe(false);
  });

  it('should validate UpdateWorkItemStatusSchema correctly', () => {
    const validStatus = { status: 'in_progress' as const };
    expect(Value.Check(UpdateWorkItemStatusSchema, validStatus)).toBe(true);
    
    const invalidStatus = { status: 'invalid' };
    expect(Value.Check(UpdateWorkItemStatusSchema, invalidStatus)).toBe(false);
  });

  it('should validate UpdateWorkItemPrioritySchema correctly', () => {
    const validPriority = { priority: 1 };
    expect(Value.Check(UpdateWorkItemPrioritySchema, validPriority)).toBe(true);
    
    const invalidPriority = { priority: -1 };
    expect(Value.Check(UpdateWorkItemPrioritySchema, invalidPriority)).toBe(false);
  });
});

describe('Common Schemas', () => {
  it('should validate IdParamSchema correctly', () => {
    expect(Value.Check(IdParamSchema, { id: 'test-id' })).toBe(true);
    expect(Value.Check(IdParamSchema, { id: '' })).toBe(false);
    expect(Value.Check(IdParamSchema, {})).toBe(false);
  });

  it('should validate WorkItemQuerySchema correctly', () => {
    const validQuery = {
      status: 'todo' as const,
      type: 'task' as const,
      limit: 10,
      offset: 0
    };

    expect(Value.Check(WorkItemQuerySchema, validQuery)).toBe(true);
    expect(Value.Check(WorkItemQuerySchema, {})).toBe(true); // All fields optional
    
    const invalidQuery = { ...validQuery, limit: 0 };
    expect(Value.Check(WorkItemQuerySchema, invalidQuery)).toBe(false);
  });

  it('should validate ProjectQuerySchema correctly', () => {
    const validQuery = {
      status: 'active' as const,
      limit: 25
    };

    expect(Value.Check(ProjectQuerySchema, validQuery)).toBe(true);
    expect(Value.Check(ProjectQuerySchema, {})).toBe(true); // All fields optional
  });
});