import { Elysia, type Context } from 'elysia'
import { JWTUtils, type JWTPayload } from '../utils/jwt.js'
import { UnauthorizedError, ForbiddenError } from '../types/errors.js'

export interface AuthContext {
	user: JWTPayload
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authMiddleware = (app: Elysia) =>
	app.derive(async ({ headers, set }) => {
		const authHeader = headers.authorization
		const token = JWTUtils.extractTokenFromHeader(authHeader)

		if (!token) {
			set.status = 401
			throw new Error('Authorization token is required')
		}

		try {
			const payload = await JWTUtils.verifyToken(token)
			return { user: payload }
		} catch (error) {
			set.status = 401
			throw new Error('Invalid or expired token')
		}
	})

/**
 * Optional authentication middleware that doesn't throw if no token is provided
 */
export const optionalAuthMiddleware = (app: Elysia) =>
	app.derive(async ({ headers }) => {
		const authHeader = headers.authorization
		const token = JWTUtils.extractTokenFromHeader(authHeader)

		if (!token) {
			return { user: undefined }
		}

		try {
			const payload = await JWTUtils.verifyToken(token)
			return { user: payload }
		} catch (error) {
			return { user: undefined }
		}
	})

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => (app: Elysia) =>
	authMiddleware(app).derive(({ user, set }) => {
		if (!user || !allowedRoles.includes(user.role)) {
			set.status = 403
			throw new Error(
				`Access denied. Required roles: ${allowedRoles.join(', ')}`,
			)
		}
		return { user }
	})

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole(['admin'])

/**
 * Manager or Admin middleware
 */
export const requireManagerOrAdmin = requireRole(['manager', 'admin'])

/**
 * Any authenticated user middleware (alias for authMiddleware)
 */
export const requireAuth = authMiddleware

/**
 * Middleware to check if user owns a resource or is admin
 */
export const requireOwnershipOrAdmin =
	(getUserIdFromParams: (context: any) => string) => (app: Elysia) =>
		authMiddleware(app).derive(({ user, set, ...context }) => {
			const resourceUserId = getUserIdFromParams(context)

			if (!user || (user.role !== 'admin' && user.userId !== resourceUserId)) {
				set.status = 403
				throw new Error(
					'Access denied. You can only access your own resources.',
				)
			}

			return { user }
		})

/**
 * Utility function to extract user ID from route parameters
 */
export const extractUserIdFromParams = (context: Context) => {
	return context.params?.userId || context.params?.id
}

/**
 * Utility function to extract project owner ID (would need to query database)
 * This is a placeholder - actual implementation would query the project
 */
export const extractProjectOwnerIdFromParams = async (
	context: Context,
	projectRepository: any,
) => {
	const projectId = context.params?.projectId || context.params?.id
	if (!projectId) {
		throw new Error('Project ID not found in parameters')
	}

	const project = await projectRepository.findById(projectId)
	if (!project) {
		throw new Error('Project not found')
	}

	return project.ownerId
}
