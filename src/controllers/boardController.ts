import { Elysia, t } from 'elysia';
import type { IWorkItemService } from '../types/services.js';
import { authMiddleware } from '../middleware/auth.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  BusinessLogicError 
} from '../types/errors.js';

export class BoardController {
  constructor(private workItemService: IWorkItemService) {}

  /**
   * Creates Elysia routes for board and backlog endpoints
   */
  createRoutes() {
    return new Elysia()
      .use(authMiddleware)
      
      // GET /projects/:projectId/kanban - Get Kanban board for project
      .get('/projects/:projectId/kanban', async ({ params, user, set }) => {
        try {
          const { projectId } = params;
          const kanbanBoard = await this.workItemService.getKanbanBoard(projectId, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedKanbanBoard = {
            todo: kanbanBoard.todo.map(item => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString()
            })),
            in_progress: kanbanBoard.in_progress.map(item => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString()
            })),
            done: kanbanBoard.done.map(item => ({
              ...item,
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString()
            }))
          };
          
          set.status = 200;
          return {
            success: true,
            data: { kanbanBoard: serializedKanbanBoard },
            message: 'Kanban board retrieved successfully'
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
          console.error('Get Kanban board error:', error);
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
          summary: 'Get Kanban board',
          description: 'Get Kanban board with work items grouped by status for a specific project',
          tags: ['Boards']
        }
      })

      // GET /projects/:projectId/backlog - Get backlog for project
      .get('/projects/:projectId/backlog', async ({ params, user, set }) => {
        try {
          const { projectId } = params;
          const backlogItems = await this.workItemService.getBacklog(projectId, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedBacklogItems = backlogItems.map(item => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString()
          }));
          
          set.status = 200;
          return {
            success: true,
            data: { backlogItems: serializedBacklogItems },
            message: 'Backlog retrieved successfully'
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
          console.error('Get backlog error:', error);
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
          summary: 'Get project backlog',
          description: 'Get prioritized backlog items (todo status) for a specific project',
          tags: ['Boards']
        }
      })

      // PATCH /items/:id/priority - Update item priority for backlog reordering
      .patch('/items/:id/priority', async ({ params, body, user, set }) => {
        try {
          const { id } = params;
          const { priorityOrder } = body as any;
          const updatedItem = await this.workItemService.updatePriority(id, priorityOrder, user.userId);
          
          // Serialize dates to strings for response validation
          const serializedWorkItem = {
            ...updatedItem,
            createdAt: updatedItem.createdAt.toISOString(),
            updatedAt: updatedItem.updatedAt.toISOString()
          };
          
          set.status = 200;
          return {
            success: true,
            data: { workItem: serializedWorkItem },
            message: 'Work item priority updated successfully'
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
          console.error('Update item priority error:', error);
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
          priorityOrder: t.Number({ 
            minimum: 0,
            description: 'New priority order for backlog reordering'
          })
        }),
        detail: {
          summary: 'Update work item priority',
          description: 'Update the priority order of a work item for backlog reordering',
          tags: ['Boards']
        }
      });
  }
}

/**
 * Factory function to create board routes with dependency injection
 */
export function createBoardRoutes(workItemService: IWorkItemService) {
  const controller = new BoardController(workItemService);
  return controller.createRoutes();
}