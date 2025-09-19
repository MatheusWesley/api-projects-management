import { Elysia, t } from 'elysia';
import type { IWorkItemService } from '../types/services.js';
import { 
  CreateWorkItemSchema, 
  UpdateWorkItemSchema, 
  UpdateWorkItemStatusSchema 
} from '../schemas/workItemSchemas.js';
import { authMiddleware } from '../middleware/auth.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  BusinessLogicError 
} from '../types/errors.js';

export class WorkItemController {
  constructor(private workItemService: IWorkItemService) {}

  /**
   * Creates Elysia routes for work item endpoints
   */
  createRoutes() {
    return new Elysia()
      .use(authMiddleware)
      
      // GET /projects/:projectId/items - List project work items
      .get('/projects/:projectId/items', async ({ params, user, set }) => {
        try {
          const { projectId } = params;
          const workItems = await this.workItemService.getProjectWorkItems(projectId, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedWorkItems = workItems.map(item => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString()
          }));
          
          set.status = 200;
          return {
            success: true,
            data: { workItems: serializedWorkItems },
            message: 'Work items retrieved successfully'
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message,
                details: error.details
              }
            };
          }
          
          if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof BusinessLogicError) {
            set.status = 500;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          // Log unexpected errors
          console.error('List work items error:', error);
          set.status = 500;
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          };
        }
      }, {
        params: t.Object({
          projectId: t.String({ description: 'Project ID' })
        }),
        detail: {
          summary: 'List project work items',
          description: 'Get all work items for a specific project',
          tags: ['Work Items']
        }
      })
      
      // POST /projects/:projectId/items - Create new work item
      .post('/projects/:projectId/items', async ({ params, body, user, set }) => {
        try {
          const { projectId } = params;
          const workItemData = body as any;
          const workItem = await this.workItemService.createWorkItem(workItemData, projectId, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedWorkItem = {
            ...workItem,
            createdAt: workItem.createdAt.toISOString(),
            updatedAt: workItem.updatedAt.toISOString()
          };
          
          set.status = 201;
          return {
            success: true,
            data: { workItem: serializedWorkItem },
            message: 'Work item created successfully'
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message,
                details: error.details
              }
            };
          }
          
          if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof BusinessLogicError) {
            set.status = 500;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          // Log unexpected errors
          console.error('Create work item error:', error);
          set.status = 500;
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          };
        }
      }, {
        params: t.Object({
          projectId: t.String({ description: 'Project ID' })
        }),
        body: t.Object({
          title: t.String({ 
            minLength: 1, 
            maxLength: 200,
            description: 'Work item title'
          }),
          description: t.Optional(t.String({ 
            maxLength: 2000,
            description: 'Work item description'
          })),
          type: t.Union([
            t.Literal('task'), 
            t.Literal('bug'), 
            t.Literal('story')
          ], {
            description: 'Type of work item'
          }),
          priority: t.Optional(t.Union([
            t.Literal('low'),
            t.Literal('medium'),
            t.Literal('high'),
            t.Literal('critical')
          ], {
            description: 'Work item priority',
            default: 'medium'
          })),
          assigneeId: t.Optional(t.String({
            description: 'ID of the assigned user'
          })),
          storyPoints: t.Optional(t.Integer({ 
            minimum: 1, 
            maximum: 100,
            description: 'Story points estimation'
          })),
          estimatedHours: t.Optional(t.Integer({ 
            minimum: 1, 
            maximum: 1000,
            description: 'Estimated hours to complete'
          }))
        }),
        detail: {
          summary: 'Create new work item',
          description: 'Create a new work item in the specified project',
          tags: ['Work Items']
        }
      })
      
      // GET /items/:id - Get specific work item
      .get('/items/:id', async ({ params, user, set }) => {
        try {
          const { id } = params;
          const workItem = await this.workItemService.getWorkItem(id, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedWorkItem = {
            ...workItem,
            createdAt: workItem.createdAt.toISOString(),
            updatedAt: workItem.updatedAt.toISOString()
          };
          
          set.status = 200;
          return {
            success: true,
            data: { workItem: serializedWorkItem },
            message: 'Work item retrieved successfully'
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message,
                details: error.details
              }
            };
          }
          
          if (error instanceof NotFoundError) {
            set.status = 404;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof BusinessLogicError) {
            set.status = 500;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          // Log unexpected errors
          console.error('Get work item error:', error);
          set.status = 500;
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          };
        }
      }, {
        params: t.Object({
          id: t.String({ description: 'Work item ID' })
        }),
        detail: {
          summary: 'Get work item by ID',
          description: 'Get a specific work item by its ID',
          tags: ['Work Items']
        }
      })
      
      // PUT /items/:id - Update work item
      .put('/items/:id', async ({ params, body, user, set }) => {
        try {
          const { id } = params;
          const updateData = body as any;
          const workItem = await this.workItemService.updateWorkItem(id, updateData, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedWorkItem = {
            ...workItem,
            createdAt: workItem.createdAt.toISOString(),
            updatedAt: workItem.updatedAt.toISOString()
          };
          
          set.status = 200;
          return {
            success: true,
            data: { workItem: serializedWorkItem },
            message: 'Work item updated successfully'
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message,
                details: error.details
              }
            };
          }
          
          if (error instanceof NotFoundError) {
            set.status = 404;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof BusinessLogicError) {
            set.status = 500;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          // Log unexpected errors
          console.error('Update work item error:', error);
          set.status = 500;
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          };
        }
      }, {
        params: t.Object({
          id: t.String({ description: 'Work item ID' })
        }),
        body: t.Object({
          title: t.Optional(t.String({ 
            minLength: 1, 
            maxLength: 200,
            description: 'Work item title'
          })),
          description: t.Optional(t.String({ 
            maxLength: 2000,
            description: 'Work item description'
          })),
          type: t.Optional(t.Union([
            t.Literal('task'), 
            t.Literal('bug'), 
            t.Literal('story')
          ], {
            description: 'Type of work item'
          })),
          status: t.Optional(t.Union([
            t.Literal('todo'),
            t.Literal('in_progress'),
            t.Literal('done')
          ], {
            description: 'Work item status'
          })),
          priority: t.Optional(t.Union([
            t.Literal('low'),
            t.Literal('medium'),
            t.Literal('high'),
            t.Literal('critical')
          ], {
            description: 'Work item priority'
          })),
          assigneeId: t.Optional(t.String({
            description: 'ID of the assigned user'
          })),
          storyPoints: t.Optional(t.Integer({ 
            minimum: 1, 
            maximum: 100,
            description: 'Story points estimation'
          })),
          estimatedHours: t.Optional(t.Integer({ 
            minimum: 1, 
            maximum: 1000,
            description: 'Estimated hours to complete'
          }))
        }),
        detail: {
          summary: 'Update work item',
          description: 'Update an existing work item',
          tags: ['Work Items']
        }
      })
      
      // DELETE /items/:id - Delete work item
      .delete('/items/:id', async ({ params, user, set }) => {
        try {
          const { id } = params;
          await this.workItemService.deleteWorkItem(id, user.userId);
          
          set.status = 200;
          return {
            success: true,
            data: null,
            message: 'Work item deleted successfully'
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message,
                details: error.details
              }
            };
          }
          
          if (error instanceof NotFoundError) {
            set.status = 404;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof BusinessLogicError) {
            set.status = 500;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          // Log unexpected errors
          console.error('Delete work item error:', error);
          set.status = 500;
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          };
        }
      }, {
        params: t.Object({
          id: t.String({ description: 'Work item ID' })
        }),
        detail: {
          summary: 'Delete work item',
          description: 'Delete an existing work item',
          tags: ['Work Items']
        }
      })
      
      // PATCH /items/:id/status - Update work item status
      .patch('/items/:id/status', async ({ params, body, user, set }) => {
        try {
          const { id } = params;
          const { status } = body as any;
          const workItem = await this.workItemService.updateWorkItemStatus(id, status, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedWorkItem = {
            ...workItem,
            createdAt: workItem.createdAt.toISOString(),
            updatedAt: workItem.updatedAt.toISOString()
          };
          
          set.status = 200;
          return {
            success: true,
            data: { workItem: serializedWorkItem },
            message: 'Work item status updated successfully'
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message,
                details: error.details
              }
            };
          }
          
          if (error instanceof NotFoundError) {
            set.status = 404;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof ForbiddenError) {
            set.status = 403;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          if (error instanceof BusinessLogicError) {
            set.status = 400;
            return {
              success: false,
              error: {
                code: error.code,
                message: error.message
              }
            };
          }
          
          // Log unexpected errors
          console.error('Update work item status error:', error);
          set.status = 500;
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          };
        }
      }, {
        params: t.Object({
          id: t.String({ description: 'Work item ID' })
        }),
        body: t.Object({
          status: t.Union([
            t.Literal('todo'),
            t.Literal('in_progress'),
            t.Literal('done')
          ], {
            description: 'New status for the work item'
          })
        }),
        detail: {
          summary: 'Update work item status',
          description: 'Update the status of a work item (for Kanban board movements)',
          tags: ['Work Items']
        }
      });
  }
}

/**
 * Factory function to create work item routes with dependency injection
 */
export function createWorkItemRoutes(workItemService: IWorkItemService) {
  const controller = new WorkItemController(workItemService);
  return controller.createRoutes();
}