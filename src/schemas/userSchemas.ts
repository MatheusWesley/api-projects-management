import { Type, type Static } from '@sinclair/typebox';

// User validation schemas
export const CreateUserSchema = Type.Object({
  email: Type.String({ 
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    description: 'Valid email address'
  }),
  name: Type.String({ 
    minLength: 2, 
    maxLength: 100,
    description: 'User full name'
  }),
  password: Type.String({ 
    minLength: 8,
    description: 'Password with minimum 8 characters'
  }),
  role: Type.Union([
    Type.Literal('admin'), 
    Type.Literal('manager'), 
    Type.Literal('developer')
  ], {
    description: 'User role in the system'
  })
});

export const LoginSchema = Type.Object({
  email: Type.String({ 
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    description: 'User email address'
  }),
  password: Type.String({ 
    minLength: 1,
    description: 'User password'
  })
});

export const UpdateUserSchema = Type.Object({
  name: Type.Optional(Type.String({ 
    minLength: 2, 
    maxLength: 100,
    description: 'User full name'
  })),
  role: Type.Optional(Type.Union([
    Type.Literal('admin'), 
    Type.Literal('manager'), 
    Type.Literal('developer')
  ], {
    description: 'User role in the system'
  }))
});

// Type exports for TypeScript
export type CreateUserData = Static<typeof CreateUserSchema>;
export type LoginData = Static<typeof LoginSchema>;
export type UpdateUserData = Static<typeof UpdateUserSchema>;