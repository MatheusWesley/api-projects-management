import { Elysia, t } from 'elysia'
import type { IAuthService } from '../types/services.js'
import { CreateUserSchema, LoginSchema } from '../schemas/userSchemas.js'
import { validateBody } from '../middleware/validation.js'
import {
	ValidationError,
	UnauthorizedError,
	ConflictError,
	InternalServerError,
} from '../types/errors.js'
import { createAuthRateLimit } from '../middleware/rateLimit.js'

export class AuthController {
	constructor(private authService: IAuthService) {}

	/**
	 * Creates Elysia routes for authentication endpoints
	 */
	createRoutes() {
		return new Elysia({ prefix: '/auth' })
			.use(
				process.env.NODE_ENV !== 'test' ? createAuthRateLimit() : new Elysia(),
			)
			.post(
				'/login',
				async ({ body, set }) => {
					try {
						const { email, password } = body as any

						// Authenticate user
						const authResponse = await this.authService.login(email, password)

						// Serialize dates to strings for response validation
						const serializedAuthResponse = {
							user: {
								...authResponse.user,
								createdAt: authResponse.user.createdAt.toISOString(),
								updatedAt: authResponse.user.updatedAt.toISOString(),
							},
							token: authResponse.token,
						}

						set.status = 200
						return {
							success: true,
							data: serializedAuthResponse,
							message: 'Login successful',
						}
					} catch (error) {
						if (error instanceof ValidationError) {
							set.status = 400
							return {
								success: false,
								error: {
									code: error.code,
									message: error.message,
									details: error.details,
								},
							}
						}

						if (error instanceof UnauthorizedError) {
							set.status = 401
							return {
								success: false,
								error: {
									code: error.code,
									message: error.message,
								},
							}
						}

						// Log unexpected errors
						console.error('Login error:', error)
						set.status = 500
						return {
							success: false,
							error: {
								code: 'INTERNAL_ERROR',
								message: 'Internal server error',
							},
						}
					}
				},
				{
					body: t.Object({
						email: t.String({
							format: 'email',
							description: 'User email address',
							examples: ['user@example.com'],
						}),
						password: t.String({
							minLength: 1,
							description: 'User password',
							examples: ['mypassword123'],
						}),
					}),
					response: {
						200: t.Object({
							success: t.Boolean({ examples: [true] }),
							data: t.Object({
								user: t.Object({
									id: t.String({ examples: ['user-123'] }),
									email: t.String({ examples: ['user@example.com'] }),
									name: t.String({ examples: ['John Doe'] }),
									role: t.String({ examples: ['developer'] }),
									createdAt: t.String({
										examples: ['2024-01-15T10:30:00.000Z'],
									}),
									updatedAt: t.String({
										examples: ['2024-01-15T10:30:00.000Z'],
									}),
								}),
								token: t.String({
									examples: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'],
								}),
							}),
							message: t.String({ examples: ['Login successful'] }),
						}),
						400: t.Object({
							success: t.Boolean({ examples: [false] }),
							error: t.Object({
								code: t.String({ examples: ['VALIDATION_ERROR'] }),
								message: t.String({ examples: ['Validation failed'] }),
								details: t.Optional(t.Any()),
							}),
						}),
						401: t.Object({
							success: t.Boolean({ examples: [false] }),
							error: t.Object({
								code: t.String({ examples: ['UNAUTHORIZED'] }),
								message: t.String({ examples: ['Invalid credentials'] }),
							}),
						}),
					},
					detail: {
						summary: 'User login',
						description:
							'Authenticate user with email and password. Returns user information and JWT token for subsequent requests.',
						tags: ['Authentication'],
						examples: {
							'Valid login': {
								summary: 'Successful login',
								value: {
									email: 'john.doe@example.com',
									password: 'securepassword123',
								},
							},
						},
					},
				},
			)

			.post(
				'/register',
				async ({ body, set }) => {
					try {
						const userData = body as any

						// Register new user
						const user = await this.authService.register(userData)

						// Remove password from response and serialize dates
						const { password: _, ...userWithoutPassword } = user
						const serializedUser = {
							...userWithoutPassword,
							createdAt: userWithoutPassword.createdAt.toISOString(),
							updatedAt: userWithoutPassword.updatedAt.toISOString(),
						}

						set.status = 201
						return {
							success: true,
							data: { user: serializedUser },
							message: 'User registered successfully',
						}
					} catch (error) {
						if (error instanceof ValidationError) {
							set.status = 400
							return {
								success: false,
								error: {
									code: error.code,
									message: error.message,
									details: error.details,
								},
							}
						}

						if (error instanceof ConflictError) {
							set.status = 409
							return {
								success: false,
								error: {
									code: error.code,
									message: error.message,
								},
							}
						}

						// Log unexpected errors
						console.error('Registration error:', error)
						set.status = 500
						return {
							success: false,
							error: {
								code: 'INTERNAL_ERROR',
								message: 'Internal server error',
							},
						}
					}
				},
				{
					body: t.Object({
						email: t.String({
							format: 'email',
							description: 'User email address (must be unique)',
							examples: ['newuser@example.com'],
						}),
						name: t.String({
							minLength: 2,
							maxLength: 100,
							description: 'User full name',
							examples: ['Jane Smith'],
						}),
						password: t.String({
							minLength: 8,
							description: 'User password (minimum 8 characters)',
							examples: ['strongpassword123'],
						}),
						role: t.Union(
							[
								t.Literal('admin'),
								t.Literal('manager'),
								t.Literal('developer'),
							],
							{
								description: 'User role in the system',
								examples: ['developer'],
							},
						),
					}),
					response: {
						201: t.Object({
							success: t.Boolean({ examples: [true] }),
							data: t.Object({
								user: t.Object({
									id: t.String({ examples: ['user-456'] }),
									email: t.String({ examples: ['newuser@example.com'] }),
									name: t.String({ examples: ['Jane Smith'] }),
									role: t.String({ examples: ['developer'] }),
									createdAt: t.String({
										examples: ['2024-01-15T10:30:00.000Z'],
									}),
									updatedAt: t.String({
										examples: ['2024-01-15T10:30:00.000Z'],
									}),
								}),
							}),
							message: t.String({ examples: ['User registered successfully'] }),
						}),
						400: t.Object({
							success: t.Boolean({ examples: [false] }),
							error: t.Object({
								code: t.String({ examples: ['VALIDATION_ERROR'] }),
								message: t.String({ examples: ['Validation failed'] }),
								details: t.Optional(t.Any()),
							}),
						}),
						409: t.Object({
							success: t.Boolean({ examples: [false] }),
							error: t.Object({
								code: t.String({ examples: ['CONFLICT'] }),
								message: t.String({ examples: ['Email already exists'] }),
							}),
						}),
					},
					detail: {
						summary: 'User registration',
						description:
							'Register a new user account. Email must be unique. Password will be securely hashed before storage.',
						tags: ['Authentication'],
						examples: {
							'New developer': {
								summary: 'Register a new developer',
								value: {
									email: 'jane.smith@example.com',
									name: 'Jane Smith',
									password: 'strongpassword123',
									role: 'developer',
								},
							},
							'New manager': {
								summary: 'Register a new manager',
								value: {
									email: 'manager@example.com',
									name: 'Project Manager',
									password: 'managerpass456',
									role: 'manager',
								},
							},
						},
					},
				},
			)
	}
}

/**
 * Factory function to create auth routes with dependency injection
 */
export function createAuthRoutes(authService: IAuthService) {
	const controller = new AuthController(authService)
	return controller.createRoutes()
}
