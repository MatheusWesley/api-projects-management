import { Type, type Static } from '@sinclair/typebox';

// Project validation schemas
export const CreateProjectSchema = Type.Object({
  name: Type.String({ 
    minLength: 1, 
    maxLength: 200,
    description: 'Project name'
  }),
  description: Type.Optional(Type.String({ 
    maxLength: 1000,
    description: 'Project description'
  }))
});

export const UpdateProjectSchema = Type.Object({
  name: Type.Optional(Type.String({ 
    minLength: 1, 
    maxLength: 200,
    description: 'Project name'
  })),
  description: Type.Optional(Type.String({ 
    maxLength: 1000,
    description: 'Project description'
  })),
  status: Type.Optional(Type.Union([
    Type.Literal('active'),
    Type.Literal('archived'),
    Type.Literal('completed')
  ], {
    description: 'Project status'
  }))
});

// Type exports for TypeScript
export type CreateProjectData = Static<typeof CreateProjectSchema>;
export type UpdateProjectData = Static<typeof UpdateProjectSchema>;