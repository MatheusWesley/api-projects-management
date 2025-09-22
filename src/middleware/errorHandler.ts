import { Elysia } from 'elysia'
import {
	AppError,
	ValidationError,
	UnauthorizedError,
	ForbiddenError,
	NotFoundError,
	ConflictError,
	InternalServerError,
	DatabaseError,
	BusinessLogicError,
	TokenError,
} from '../types/errors.js'

// Error response interface
interface ErrorResponse {
	error: {
		code: string
		message: string
		details?: any
		timestamp: string
		path?: string
	}
}

// Logger utility for error logging
const logError = (error: Error, context?: any) => {
	const timestamp = new Date().toISOString()
	const logData = {
		timestamp,
		name: error.name,
		message: error.message,
		stack: error.stack,
		context,
	}

	if (error instanceof AppError) {
		console.error(`[${timestamp}] ${error.code}: ${error.message}`, {
			statusCode: error.statusCode,
			details: error.details,
			context,
		})
	} else {
		console.error(`[${timestamp}] Unexpected Error:`, logData)
	}
}

// Format error response
const formatErrorResponse = (error: Error, path?: string): ErrorResponse => {
	const timestamp = new Date().toISOString()

	if (error instanceof AppError) {
		return {
			error: {
				code: error.code,
				message: error.message,
				...(error.details && { details: error.details }),
				timestamp,
				...(path && { path }),
			},
		}
	}

	// Handle unexpected errors
	return {
		error: {
			code: 'INTERNAL_ERROR',
			message: 'Internal server error',
			timestamp,
			...(path && { path }),
		},
	}
}

// Global error handler middleware
export const errorHandler = (app: Elysia) =>
	app.onError(({ error, code, set, request }) => {
		const pathname = new URL(request.url).pathname

		// Log the error for debugging
		logError(error, { code, path: pathname })

		// Set content type for JSON responses
		set.headers['content-type'] = 'application/json'

		// Check if it's one of our custom error types by checking properties
		// This is more reliable than instanceof checks in some environments
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			'statusCode' in error
		) {
			const appError = error as AppError
			set.status = appError.statusCode
			return formatErrorResponse(appError, pathname)
		}

		// Handle different error types using instanceof as fallback
		if (error instanceof ValidationError) {
			set.status = 400
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof UnauthorizedError || error instanceof TokenError) {
			set.status = 401
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof ForbiddenError) {
			set.status = 403
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof NotFoundError) {
			set.status = 404
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof ConflictError) {
			set.status = 409
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof BusinessLogicError) {
			set.status = error.statusCode
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof DatabaseError) {
			set.status = 500
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof InternalServerError) {
			set.status = 500
			return formatErrorResponse(error, pathname)
		}

		// Handle Elysia built-in error codes
		switch (code) {
			case 'VALIDATION':
				set.status = 400
				return {
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Request validation failed',
						details: error?.message || 'Validation failed',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}

			case 'NOT_FOUND':
				set.status = 404
				return {
					error: {
						code: 'NOT_FOUND',
						message: 'Route not found',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}

			case 'PARSE':
				set.status = 400
				return {
					error: {
						code: 'PARSE_ERROR',
						message: 'Failed to parse request body',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}

			case 'INTERNAL_SERVER_ERROR':
			default:
				set.status = 500
				return {
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Internal server error',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}
		}
	})

// Helper function to throw formatted errors
export const throwError = (error: AppError): never => {
	throw error
}

// Helper functions for common error scenarios
export const throwValidationError = (message: string, details?: any): never => {
	throw new ValidationError(message, details)
}

export const throwUnauthorizedError = (message?: string): never => {
	throw new UnauthorizedError(message)
}

export const throwForbiddenError = (message?: string): never => {
	throw new ForbiddenError(message)
}

export const throwNotFoundError = (resource: string): never => {
	throw new NotFoundError(resource)
}

export const throwConflictError = (message: string): never => {
	throw new ConflictError(message)
}

export const throwInternalError = (message?: string): never => {
	throw new InternalServerError(message)
}

// Plugin-style export for consistency
export const errorHandlerPlugin = new Elysia({ name: 'error-handler' }).onError(
	({ error, code, set, request }) => {
		const pathname = new URL(request.url).pathname

		// Log the error for debugging
		logError(error, { code, path: pathname })

		// Set content type for JSON responses
		set.headers['content-type'] = 'application/json'

		// Check if it's one of our custom error types by checking properties
		// This is more reliable than instanceof checks in some environments
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			'statusCode' in error
		) {
			const appError = error as AppError
			set.status = appError.statusCode
			return formatErrorResponse(appError, pathname)
		}

		// Handle different error types using instanceof as fallback
		if (error instanceof ValidationError) {
			set.status = 400
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof UnauthorizedError || error instanceof TokenError) {
			set.status = 401
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof ForbiddenError) {
			set.status = 403
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof NotFoundError) {
			set.status = 404
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof ConflictError) {
			set.status = 409
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof BusinessLogicError) {
			set.status = error.statusCode
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof DatabaseError) {
			set.status = 500
			return formatErrorResponse(error, pathname)
		}

		if (error instanceof InternalServerError) {
			set.status = 500
			return formatErrorResponse(error, pathname)
		}

		// Handle Elysia built-in error codes
		switch (code) {
			case 'VALIDATION':
				set.status = 400
				return {
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Request validation failed',
						details: error?.message || 'Validation failed',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}

			case 'NOT_FOUND':
				set.status = 404
				return {
					error: {
						code: 'NOT_FOUND',
						message: 'Route not found',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}

			case 'PARSE':
				set.status = 400
				return {
					error: {
						code: 'PARSE_ERROR',
						message: 'Failed to parse request body',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}

			case 'INTERNAL_SERVER_ERROR':
			default:
				set.status = 500
				return {
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Internal server error',
						timestamp: new Date().toISOString(),
						path: pathname,
					},
				}
		}
	},
)
