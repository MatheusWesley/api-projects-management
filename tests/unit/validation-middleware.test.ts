import { describe, it, expect, beforeEach } from 'bun:test'
import { Type } from '@sinclair/typebox'
import {
	validateData,
	validateBody,
	validateParams,
	validateQuery,
	validate,
	formatValidationError,
	type ValidationResult,
	type ValidationErrorDetail,
} from '../../src/middleware/validation'
import { ValidationError } from '../../src/types/errors'

describe('Validation Middleware', () => {
	describe('validateData', () => {
		const testSchema = Type.Object({
			name: Type.String({ minLength: 2, maxLength: 50 }),
			age: Type.Integer({ minimum: 0, maximum: 150 }),
			email: Type.Optional(
				Type.String({
					pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
				}),
			),
		})

		it('should validate correct data successfully', () => {
			const validData = {
				name: 'John Doe',
				age: 30,
				email: 'john@example.com',
			}

			const result = validateData(testSchema, validData)

			expect(result.success).toBe(true)
			expect(result.data).toEqual(validData)
			expect(result.errors).toBeUndefined()
		})

		it('should validate data without optional fields', () => {
			const validData = {
				name: 'Jane Doe',
				age: 25,
			}

			const result = validateData(testSchema, validData)

			expect(result.success).toBe(true)
			expect(result.data).toEqual(validData)
		})

		it('should fail validation for missing required fields', () => {
			const invalidData = {
				age: 30,
			}

			const result = validateData(testSchema, invalidData)

			expect(result.success).toBe(false)
			expect(result.data).toBeUndefined()
			expect(result.errors).toBeDefined()
			expect(result.errors!.length).toBeGreaterThan(0)
			expect(result.errors!.some((e) => e.path.includes('name'))).toBe(true)
		})

		it('should fail validation for invalid data types', () => {
			const invalidData = {
				name: 'John',
				age: 'thirty', // Should be number
				email: 'invalid-email',
			}

			const result = validateData(testSchema, invalidData)

			expect(result.success).toBe(false)
			expect(result.errors).toBeDefined()
			expect(result.errors!.length).toBeGreaterThan(0)
		})

		it('should fail validation for values outside constraints', () => {
			const invalidData = {
				name: 'A', // Too short
				age: -5, // Below minimum
				email: 'valid@email.com',
			}

			const result = validateData(testSchema, invalidData)

			expect(result.success).toBe(false)
			expect(result.errors).toBeDefined()
			expect(result.errors!.some((e) => e.path.includes('name'))).toBe(true)
			expect(result.errors!.some((e) => e.path.includes('age'))).toBe(true)
		})

		it('should handle null and undefined data', () => {
			const nullResult = validateData(testSchema, null)
			const undefinedResult = validateData(testSchema, undefined)

			expect(nullResult.success).toBe(false)
			expect(undefinedResult.success).toBe(false)
		})

		it('should clean extra properties from data', () => {
			const dataWithExtra = {
				name: 'John Doe',
				age: 30,
				email: 'john@example.com',
				extraField: 'should be removed',
			}

			const result = validateData(testSchema, dataWithExtra)

			expect(result.success).toBe(true)
			expect(result.data).not.toHaveProperty('extraField')
			expect(result.data).toEqual({
				name: 'John Doe',
				age: 30,
				email: 'john@example.com',
			})
		})
	})

	describe('validateBody middleware', () => {
		const bodySchema = Type.Object({
			title: Type.String({ minLength: 1, maxLength: 100 }),
			description: Type.Optional(Type.String({ maxLength: 500 })),
		})

		it('should validate valid request body', () => {
			const context = {
				body: {
					title: 'Test Title',
					description: 'Test description',
				},
			}

			const middleware = validateBody(bodySchema)
			const result = middleware(context)

			expect(result.validatedBody).toEqual(context.body)
		})

		it('should throw ValidationError for invalid body', () => {
			const context = {
				body: {
					title: '', // Too short
					description: 'A'.repeat(501), // Too long
				},
			}

			const middleware = validateBody(bodySchema)

			expect(() => middleware(context)).toThrow(ValidationError)
		})

		it('should throw ValidationError for missing required fields', () => {
			const context = {
				body: {
					description: 'Missing title',
				},
			}

			const middleware = validateBody(bodySchema)

			expect(() => middleware(context)).toThrow(ValidationError)
		})
	})

	describe('validateParams middleware', () => {
		const paramsSchema = Type.Object({
			id: Type.String({ minLength: 1 }),
			projectId: Type.Optional(Type.String({ minLength: 1 })),
		})

		it('should validate valid route parameters', () => {
			const context = {
				params: {
					id: 'user123',
					projectId: 'proj456',
				},
			}

			const middleware = validateParams(paramsSchema)
			const result = middleware(context)

			expect(result.validatedParams).toEqual(context.params)
		})

		it('should throw ValidationError for invalid params', () => {
			const context = {
				params: {
					id: '', // Empty string
					projectId: 'proj456',
				},
			}

			const middleware = validateParams(paramsSchema)

			expect(() => middleware(context)).toThrow(ValidationError)
		})
	})

	describe('validateQuery middleware', () => {
		const querySchema = Type.Object({
			limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
			offset: Type.Optional(Type.Integer({ minimum: 0 })),
			status: Type.Optional(
				Type.Union([Type.Literal('active'), Type.Literal('inactive')]),
			),
		})

		it('should validate valid query parameters', () => {
			const context = {
				query: {
					limit: '10',
					offset: '0',
					status: 'active',
				},
			}

			const middleware = validateQuery(querySchema)
			const result = middleware(context)

			expect(result.validatedQuery).toBeDefined()
			expect(result.validatedQuery.limit).toBe(10) // Should be converted to number
			expect(result.validatedQuery.offset).toBe(0) // Should be converted to number
		})

		it('should handle empty query parameters', () => {
			const context = {
				query: {},
			}

			const middleware = validateQuery(querySchema)
			const result = middleware(context)

			expect(result.validatedQuery).toEqual({})
		})

		it('should throw ValidationError for invalid query values', () => {
			const context = {
				query: {
					limit: '0', // Below minimum
					status: 'invalid',
				},
			}

			const middleware = validateQuery(querySchema)

			expect(() => middleware(context)).toThrow(ValidationError)
		})
	})

	describe('combined validate middleware', () => {
		const schemas = {
			body: Type.Object({
				name: Type.String({ minLength: 1 }),
			}),
			params: Type.Object({
				id: Type.String({ minLength: 1 }),
			}),
			query: Type.Object({
				include: Type.Optional(Type.String()),
			}),
		}

		it('should validate all targets successfully', () => {
			const context = {
				body: { name: 'Test' },
				params: { id: 'test123' },
				query: { include: 'details' },
			}

			const middleware = validate(schemas)
			const result = middleware(context)

			expect(result.validatedBody).toEqual(context.body)
			expect(result.validatedParams).toEqual(context.params)
			expect(result.validatedQuery).toEqual(context.query)
		})

		it('should validate only specified targets', () => {
			const context = {
				body: { name: 'Test' },
				params: { id: 'test123' },
				query: { include: 'details' },
			}

			const middleware = validate({ body: schemas.body })
			const result = middleware(context)

			expect(result.validatedBody).toEqual(context.body)
			expect(result.validatedParams).toBeUndefined()
			expect(result.validatedQuery).toBeUndefined()
		})

		it('should collect errors from multiple targets', () => {
			const context = {
				body: { name: '' }, // Invalid
				params: { id: '' }, // Invalid
				query: { include: 'details' },
			}

			const middleware = validate(schemas)

			expect(() => middleware(context)).toThrow(ValidationError)
		})

		it('should work with partial validation failures', () => {
			const context = {
				body: { name: 'Valid' },
				params: { id: '' }, // Invalid
				query: { include: 'details' },
			}

			const middleware = validate(schemas)

			expect(() => middleware(context)).toThrow(ValidationError)
		})
	})

	describe('formatValidationError', () => {
		it('should format validation error correctly', () => {
			const validationError = new ValidationError('Validation failed', {
				target: 'body',
				errors: [
					{
						path: '/name',
						message: 'Expected string length >= 1',
						value: '',
						expected: 'Valid name',
					},
				],
			})

			const formatted = formatValidationError(validationError)

			expect(formatted.code).toBe('VALIDATION_ERROR')
			expect(formatted.message).toBe('Validation failed')
			expect(formatted.details.target).toBe('body')
			expect(formatted.details.errors).toHaveLength(1)
			expect(formatted.details.errors[0].path).toBe('/name')
		})

		it('should handle validation error without details', () => {
			const validationError = new ValidationError('Simple validation error')

			const formatted = formatValidationError(validationError)

			expect(formatted.code).toBe('VALIDATION_ERROR')
			expect(formatted.message).toBe('Simple validation error')
			expect(formatted.details.errors).toEqual([])
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle schema validation with complex nested objects', () => {
			const nestedSchema = Type.Object({
				user: Type.Object({
					profile: Type.Object({
						name: Type.String({ minLength: 1 }),
						settings: Type.Object({
							theme: Type.Union([Type.Literal('light'), Type.Literal('dark')]),
						}),
					}),
				}),
			})

			const validData = {
				user: {
					profile: {
						name: 'John',
						settings: {
							theme: 'dark',
						},
					},
				},
			}

			const result = validateData(nestedSchema, validData)
			expect(result.success).toBe(true)

			const invalidData = {
				user: {
					profile: {
						name: '',
						settings: {
							theme: 'invalid',
						},
					},
				},
			}

			const invalidResult = validateData(nestedSchema, invalidData)
			expect(invalidResult.success).toBe(false)
			expect(invalidResult.errors!.length).toBeGreaterThan(0)
		})

		it('should handle array validation', () => {
			const arraySchema = Type.Object({
				items: Type.Array(
					Type.Object({
						id: Type.String(),
						value: Type.Number({ minimum: 0 }),
					}),
				),
			})

			const validData = {
				items: [
					{ id: '1', value: 10 },
					{ id: '2', value: 20 },
				],
			}

			const result = validateData(arraySchema, validData)
			expect(result.success).toBe(true)

			const invalidData = {
				items: [
					{ id: '1', value: -5 }, // Invalid value
					{ id: '', value: 20 }, // Invalid id
				],
			}

			const invalidResult = validateData(arraySchema, invalidData)
			expect(invalidResult.success).toBe(false)
		})

		it('should handle unexpected validation errors gracefully', () => {
			// Create a scenario that might cause unexpected errors
			const context = {
				body: Symbol('invalid'), // Symbols can't be validated
			}

			const schema = Type.Object({
				name: Type.String(),
			})

			const middleware = validateBody(schema)

			expect(() => middleware(context)).toThrow(ValidationError)
		})
	})
})
