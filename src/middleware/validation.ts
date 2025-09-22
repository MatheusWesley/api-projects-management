import { type TSchema, type Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { ValidationError } from '../types/errors'

// Types for validation targets
export type ValidationTarget = 'body' | 'params' | 'query'

// Validation result interface
interface ValidationResult<T> {
	success: boolean
	data?: T
	errors?: ValidationErrorDetail[]
}

// Detailed validation error
interface ValidationErrorDetail {
	path: string
	message: string
	value?: any
	expected?: string
}

/**
 * Generic validation function that validates data against a TypeBox schema
 */
export function validateData<T extends TSchema>(
	schema: T,
	data: unknown,
	target: ValidationTarget = 'body',
): ValidationResult<Static<T>> {
	try {
		// For query parameters, we need to convert string values to appropriate types
		let processedData = data
		if (target === 'query' && data && typeof data === 'object') {
			processedData = Value.Convert(schema, data)
		}

		// Check if the data matches the schema
		if (Value.Check(schema, processedData)) {
			// Clean and transform the data according to the schema
			const cleanedData = Value.Clean(schema, processedData)
			return {
				success: true,
				data: cleanedData as Static<T>,
			}
		}

		// If validation fails, collect detailed error information
		const errors: ValidationErrorDetail[] = []
		const errorIterator = Value.Errors(schema, processedData)

		for (const error of errorIterator) {
			errors.push({
				path: error.path,
				message: error.message,
				value: error.value,
				expected: error.schema?.description || 'Valid value',
			})
		}

		return {
			success: false,
			errors,
		}
	} catch (error) {
		// Handle unexpected validation errors
		return {
			success: false,
			errors: [
				{
					path: `/${target}`,
					message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					value: data,
				},
			],
		}
	}
}

/**
 * Creates a validation middleware for Elysia that validates request body
 */
export function validateBody<T extends TSchema>(schema: T) {
	return (context: any) => {
		const result = validateData(schema, context.body, 'body')

		if (!result.success) {
			throw new ValidationError('Request body validation failed', {
				target: 'body',
				errors: result.errors,
			})
		}

		// Attach validated data to context for use in handlers
		context.validatedBody = result.data
		return context
	}
}

/**
 * Creates a validation middleware for Elysia that validates route parameters
 */
export function validateParams<T extends TSchema>(schema: T) {
	return (context: any) => {
		const result = validateData(schema, context.params, 'params')

		if (!result.success) {
			throw new ValidationError('Route parameters validation failed', {
				target: 'params',
				errors: result.errors,
			})
		}

		// Attach validated data to context for use in handlers
		context.validatedParams = result.data
		return context
	}
}

/**
 * Creates a validation middleware for Elysia that validates query parameters
 */
export function validateQuery<T extends TSchema>(schema: T) {
	return (context: any) => {
		const result = validateData(schema, context.query, 'query')

		if (!result.success) {
			throw new ValidationError('Query parameters validation failed', {
				target: 'query',
				errors: result.errors,
			})
		}

		// Attach validated data to context for use in handlers
		context.validatedQuery = result.data
		return context
	}
}

/**
 * Combined validation middleware that can validate multiple targets at once
 */
export function validate<
	TBody extends TSchema = never,
	TParams extends TSchema = never,
	TQuery extends TSchema = never,
>(options: { body?: TBody; params?: TParams; query?: TQuery }) {
	return (context: any) => {
		const validationErrors: ValidationErrorDetail[] = []

		// Validate body if schema provided
		if (options.body) {
			const result = validateData(options.body, context.body, 'body')
			if (!result.success) {
				validationErrors.push(...(result.errors || []))
			} else {
				context.validatedBody = result.data
			}
		}

		// Validate params if schema provided
		if (options.params) {
			const result = validateData(options.params, context.params, 'params')
			if (!result.success) {
				validationErrors.push(...(result.errors || []))
			} else {
				context.validatedParams = result.data
			}
		}

		// Validate query if schema provided
		if (options.query) {
			const result = validateData(options.query, context.query, 'query')
			if (!result.success) {
				validationErrors.push(...(result.errors || []))
			} else {
				context.validatedQuery = result.data
			}
		}

		// If any validation failed, throw error with all details
		if (validationErrors.length > 0) {
			throw new ValidationError('Request validation failed', {
				errors: validationErrors,
			})
		}

		return context
	}
}

/**
 * Utility function to format validation errors for API responses
 */
export function formatValidationError(error: ValidationError): {
	code: string
	message: string
	details: {
		target?: string
		errors: ValidationErrorDetail[]
	}
} {
	return {
		code: error.code,
		message: error.message,
		details: {
			target: error.details?.target,
			errors: error.details?.errors || [],
		},
	}
}

// Export types for use in other modules
export type { ValidationResult, ValidationErrorDetail }
