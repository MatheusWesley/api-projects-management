import { Elysia, t } from 'elysia';
import type { IProjectService } from '../types/services.js';
import { CreateProjectSchema, UpdateProjectSchema } from '../schemas/projectSchemas.js';
import { authMiddleware } from '../middleware/auth.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  BusinessLogicError 
} from '../types/errors.js';

export class ProjectController {
  constructor(private projectService: IProjectService) {}

  /**
   * Creates Elysia routes for project endpoints
   */
  createRoutes() {
    return new Elysia({ prefix: '/projects' })
      .use(authMiddleware)
      
      // GET /projects - List user projects
      .get('/', async ({ user, set }) => {
        try {
          const projects = await this.projectService.listUserProjects(user.userId);
          
          // Ensure dates are serialized as strings for response validation
          const serializedProjects = projects.map(project => ({
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString()
          }));
          
          set.status = 200;
          return {
            success: true,
            data: { projects: serializedProjects },
            message: 'Projects retrieved successfully'
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
          console.error('List projects error:', error);
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
        response: {
          200: t.Object({
            success: t.Boolean({ examples: [true] }),
            data: t.Object({
              projects: t.Array(t.Object({
                id: t.String({ examples: ['proj-123'] }),
                name: t.String({ examples: ['My Project'] }),
                description: t.Optional(t.String({ examples: ['Project description'] })),
                ownerId: t.String({ examples: ['user-123'] }),
                status: t.String({ examples: ['active'] }),
                createdAt: t.String({ examples: ['2024-01-15T10:30:00.000Z'] }),
                updatedAt: t.String({ examples: ['2024-01-15T10:30:00.000Z'] })
              }))
            }),
            message: t.String({ examples: ['Projects retrieved successfully'] })
          })
        },
        detail: {
          summary: 'List user projects',
          description: 'Get all projects that the authenticated user has access to. Requires valid JWT token in Authorization header.',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }]
        }
      })
      
      // POST /projects - Create new project
      .post('/', async ({ body, user, set }) => {
        try {
          const projectData = body as any;
          const project = await this.projectService.createProject(projectData, user.userId);
          
          // Ensure dates are serialized as strings for response validation
          const serializedProject = {
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString()
          };
          
          set.status = 201;
          return {
            success: true,
            data: { project: serializedProject },
            message: 'Project created successfully'
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
          console.error('Create project error:', error);
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
        body: t.Object({
          name: t.String({ 
            minLength: 1, 
            maxLength: 200,
            description: 'Project name (required)',
            examples: ['E-commerce Platform']
          }),
          description: t.Optional(t.String({ 
            maxLength: 1000,
            description: 'Project description (optional)',
            examples: ['A modern e-commerce platform with React frontend and Node.js backend']
          }))
        }),
        response: {
          201: t.Object({
            success: t.Boolean({ examples: [true] }),
            data: t.Object({
              project: t.Object({
                id: t.String({ examples: ['proj-456'] }),
                name: t.String({ examples: ['E-commerce Platform'] }),
                description: t.Optional(t.String({ examples: ['A modern e-commerce platform'] })),
                ownerId: t.String({ examples: ['user-123'] }),
                status: t.String({ examples: ['active'] }),
                createdAt: t.String({ examples: ['2024-01-15T10:30:00.000Z'] }),
                updatedAt: t.String({ examples: ['2024-01-15T10:30:00.000Z'] })
              })
            }),
            message: t.String({ examples: ['Project created successfully'] })
          })
        },
        detail: {
          summary: 'Create new project',
          description: 'Create a new project for the authenticated user. The user becomes the project owner.',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          examples: {
            'Basic project': {
              summary: 'Create a basic project',
              value: {
                name: 'Mobile App',
                description: 'iOS and Android mobile application'
              }
            },
            'Minimal project': {
              summary: 'Create project with name only',
              value: {
                name: 'Quick Project'
              }
            }
          }
        }
      })
      
      // GET /projects/:projectId - Get specific project
      .get('/:projectId', async ({ params, user, set }) => {
        try {
          const { projectId } = params;
          const project = await this.projectService.getProject(projectId, user.userId);
          
          // Ensure dates are serialized as strings for response validation
          const serializedProject = {
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString()
          };
          
          set.status = 200;
          return {
            success: true,
            data: { project: serializedProject },
            message: 'Project retrieved successfully'
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
          console.error('Get project error:', error);
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
          summary: 'Get project by ID',
          description: 'Get a specific project by its ID',
          tags: ['Projects']
        }
      })
      
      // PUT /projects/:projectId - Update project
      .put('/:projectId', async ({ params, body, user, set }) => {
        try {
          const { projectId } = params;
          const updateData = body as any;
          const project = await this.projectService.updateProject(projectId, updateData, user.userId);
          
          // Ensure dates are serialized as strings for response validation
          const serializedProject = {
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString()
          };
          
          set.status = 200;
          return {
            success: true,
            data: { project: serializedProject },
            message: 'Project updated successfully'
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
          console.error('Update project error:', error);
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
          name: t.Optional(t.String({ 
            minLength: 1, 
            maxLength: 200,
            description: 'Project name'
          })),
          description: t.Optional(t.String({ 
            maxLength: 1000,
            description: 'Project description'
          })),
          status: t.Optional(t.Union([
            t.Literal('active'),
            t.Literal('archived'),
            t.Literal('completed')
          ], {
            description: 'Project status'
          }))
        }),
        detail: {
          summary: 'Update project',
          description: 'Update an existing project',
          tags: ['Projects']
        }
      })
      
      // DELETE /projects/:projectId - Delete project
      .delete('/:projectId', async ({ params, user, set }) => {
        try {
          const { projectId } = params;
          await this.projectService.deleteProject(projectId, user.userId);
          
          set.status = 200;
          return {
            success: true,
            data: null,
            message: 'Project deleted successfully'
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
          console.error('Delete project error:', error);
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
          summary: 'Delete project',
          description: 'Delete an existing project',
          tags: ['Projects']
        }
      });
  }
}

/**
 * Factory function to create project routes with dependency injection
 */
export function createProjectRoutes(projectService: IProjectService) {
  const controller = new ProjectController(projectService);
  return controller.createRoutes();
}