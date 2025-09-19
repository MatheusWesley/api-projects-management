import { describe, it, expect } from 'bun:test';
import {
  validateBody,
  validateParams,
  validateQuery,
  validate
} from '../../src/middleware/validation';
import {
  CreateUserSchema,
  LoginSchema,
  UpdateUserSchema
} from '../../src/schemas/userSchemas';
import {
  CreateProjectSchema,
  UpdateProjectSchema
} from '../../src/schemas/projectSchemas';
import {
  CreateWorkItemSchema,
  UpdateWorkItemSchema,
  UpdateWorkItemStatusSchema
} from '../../src/schemas/workItemSchemas';
import {
  IdParamSchema,
  ProjectIdParamSchema,
  WorkItemQuerySchema,
  ProjectQuerySchema
} from '../../src/schemas/commonSchemas';
import { ValidationError } from '../../src/types/errors';

describe('Validation Middleware Integration', () => {
  describe('User Schema Validation', () => {
    it('should validate CreateUserSchema correctly', () => {
      const context = {
        body: {
          email: 'test@example.com',
          name: 'John Doe',
          password: 'password123',
          role: 'developer'
        }
      };

      const middleware = validateBody(CreateUserSchema);
      const result = middleware(context);

      expect(result.validatedBody).toEqual(context.body);
    });

    it('should reject invalid CreateUserSchema', () => {
      const context = {
        body: {
          email: 'invalid-email',
          name: 'A', // Too short
          password: '123', // Too short
          role: 'invalid-role'
        }
      };

      const middleware = validateBody(CreateUserSchema);

      expect(() => middleware(context)).toThrow(ValidationError);
    });

    it('should validate LoginSchema correctly', () => {
      const context = {
        body: {
          email: 'user@example.com',
          password: 'password'
        }
      };

      const middleware = validateBody(LoginSchema);
      const result = middleware(context);

      expect(result.validatedBody).toEqual(context.body);
    });

    it('should validate UpdateUserSchema with partial data', () => {
      const context = {
        body: {
          name: 'Updated Name'
          // role is optional
        }
      };

      const middleware = validateBody(UpdateUserSchema);
      const result = middleware(context);

      expect(result.validatedBody.name).toBe('Updated Name');
    });
  });

  describe('Project Schema Validation', () => {
    it('should validate CreateProjectSchema correctly', () => {
      const context = {
        body: {
          name: 'My Project',
          description: 'A test project'
        }
      };

      const middleware = validateBody(CreateProjectSchema);
      const result = middleware(context);

      expect(result.validatedBody).toEqual(context.body);
    });

    it('should validate CreateProjectSchema without description', () => {
      const context = {
        body: {
          name: 'My Project'
          // description is optional
        }
      };

      const middleware = validateBody(CreateProjectSchema);
      const result = middleware(context);

      expect(result.validatedBody.name).toBe('My Project');
      expect(result.validatedBody.description).toBeUndefined();
    });

    it('should validate UpdateProjectSchema with status', () => {
      const context = {
        body: {
          name: 'Updated Project',
          status: 'completed'
        }
      };

      const middleware = validateBody(UpdateProjectSchema);
      const result = middleware(context);

      expect(result.validatedBody).toEqual(context.body);
    });
  });

  describe('Work Item Schema Validation', () => {
    it('should validate CreateWorkItemSchema correctly', () => {
      const context = {
        body: {
          title: 'Fix bug in authentication',
          description: 'Users cannot login with valid credentials',
          type: 'bug',
          priority: 'high',
          assigneeId: 'user123',
          storyPoints: 5,
          estimatedHours: 8
        }
      };

      const middleware = validateBody(CreateWorkItemSchema);
      const result = middleware(context);

      expect(result.validatedBody).toEqual(context.body);
    });

    it('should validate minimal CreateWorkItemSchema', () => {
      const context = {
        body: {
          title: 'Simple task',
          type: 'task'
          // All other fields are optional
        }
      };

      const middleware = validateBody(CreateWorkItemSchema);
      const result = middleware(context);

      expect(result.validatedBody.title).toBe('Simple task');
      expect(result.validatedBody.type).toBe('task');
    });

    it('should validate UpdateWorkItemStatusSchema', () => {
      const context = {
        body: {
          status: 'in_progress'
        }
      };

      const middleware = validateBody(UpdateWorkItemStatusSchema);
      const result = middleware(context);

      expect(result.validatedBody.status).toBe('in_progress');
    });

    it('should reject invalid work item type', () => {
      const context = {
        body: {
          title: 'Test item',
          type: 'invalid-type'
        }
      };

      const middleware = validateBody(CreateWorkItemSchema);

      expect(() => middleware(context)).toThrow(ValidationError);
    });
  });

  describe('Common Schema Validation', () => {
    it('should validate IdParamSchema', () => {
      const context = {
        params: {
          id: 'user123'
        }
      };

      const middleware = validateParams(IdParamSchema);
      const result = middleware(context);

      expect(result.validatedParams.id).toBe('user123');
    });

    it('should validate ProjectIdParamSchema', () => {
      const context = {
        params: {
          projectId: 'proj456'
        }
      };

      const middleware = validateParams(ProjectIdParamSchema);
      const result = middleware(context);

      expect(result.validatedParams.projectId).toBe('proj456');
    });

    it('should validate WorkItemQuerySchema with filters', () => {
      const context = {
        query: {
          status: 'todo',
          type: 'bug',
          assigneeId: 'user123',
          priority: 'high',
          limit: '25',
          offset: '10'
        }
      };

      const middleware = validateQuery(WorkItemQuerySchema);
      const result = middleware(context);

      expect(result.validatedQuery.status).toBe('todo');
      expect(result.validatedQuery.type).toBe('bug');
      expect(result.validatedQuery.assigneeId).toBe('user123');
      expect(result.validatedQuery.priority).toBe('high');
      expect(result.validatedQuery.limit).toBe(25); // Converted to number
      expect(result.validatedQuery.offset).toBe(10); // Converted to number
    });

    it('should validate ProjectQuerySchema with defaults', () => {
      const context = {
        query: {
          status: 'active'
          // limit and offset should use defaults
        }
      };

      const middleware = validateQuery(ProjectQuerySchema);
      const result = middleware(context);

      expect(result.validatedQuery.status).toBe('active');
    });
  });

  describe('Combined Validation Scenarios', () => {
    it('should validate complete API request with body, params, and query', () => {
      const context = {
        body: {
          title: 'New work item',
          type: 'task',
          priority: 'medium'
        },
        params: {
          projectId: 'proj123'
        },
        query: {
          include: 'assignee'
        }
      };

      const middleware = validate({
        body: CreateWorkItemSchema,
        params: ProjectIdParamSchema,
        query: WorkItemQuerySchema
      });

      const result = middleware(context);

      expect(result.validatedBody.title).toBe('New work item');
      expect(result.validatedParams.projectId).toBe('proj123');
      expect(result.validatedQuery).toBeDefined();
    });

    it('should handle validation errors from multiple sources', () => {
      const context = {
        body: {
          title: '', // Invalid - too short
          type: 'invalid-type' // Invalid type
        },
        params: {
          projectId: '' // Invalid - empty
        },
        query: {
          limit: '0', // Invalid - below minimum
          status: 'invalid-status' // Invalid status
        }
      };

      const middleware = validate({
        body: CreateWorkItemSchema,
        params: ProjectIdParamSchema,
        query: WorkItemQuerySchema
      });

      expect(() => middleware(context)).toThrow(ValidationError);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide detailed error messages for validation failures', () => {
      const context = {
        body: {
          email: 'not-an-email',
          name: 'A',
          password: '123',
          role: 'invalid'
        }
      };

      const middleware = validateBody(CreateUserSchema);

      try {
        middleware(context);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details.errors).toBeDefined();
        expect(validationError.details.errors.length).toBeGreaterThan(0);
        
        // Check that error details contain path information
        const errorPaths = validationError.details.errors.map((e: any) => e.path);
        expect(errorPaths.some((path: string) => path.includes('email'))).toBe(true);
        expect(errorPaths.some((path: string) => path.includes('name'))).toBe(true);
        expect(errorPaths.some((path: string) => path.includes('password'))).toBe(true);
        expect(errorPaths.some((path: string) => path.includes('role'))).toBe(true);
      }
    });
  });

  describe('Data Transformation', () => {
    it('should properly transform query string numbers to integers', () => {
      const context = {
        query: {
          limit: '50',
          offset: '100',
          storyPoints: '8'
        }
      };

      const querySchema = WorkItemQuerySchema;
      const middleware = validateQuery(querySchema);
      const result = middleware(context);

      expect(typeof result.validatedQuery.limit).toBe('number');
      expect(typeof result.validatedQuery.offset).toBe('number');
      expect(result.validatedQuery.limit).toBe(50);
      expect(result.validatedQuery.offset).toBe(100);
    });

    it('should clean extra properties from request body', () => {
      const context = {
        body: {
          title: 'Valid title',
          type: 'task',
          extraField: 'should be removed',
          anotherExtra: 123
        }
      };

      const middleware = validateBody(CreateWorkItemSchema);
      const result = middleware(context);

      expect(result.validatedBody.title).toBe('Valid title');
      expect(result.validatedBody.type).toBe('task');
      expect(result.validatedBody).not.toHaveProperty('extraField');
      expect(result.validatedBody).not.toHaveProperty('anotherExtra');
    });
  });
});