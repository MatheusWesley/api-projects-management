import { Elysia } from 'elysia'

interface RateLimitOptions {
	windowMs: number // Time window in milliseconds
	maxRequests: number // Maximum requests per window
	message?: string // Custom error message
	skipSuccessfulRequests?: boolean // Don't count successful requests
	skipFailedRequests?: boolean // Don't count failed requests
}

interface RateLimitStore {
	[key: string]: {
		count: number
		resetTime: number
	}
}

/**
 * Simple in-memory rate limiting middleware
 * For production, consider using Redis or other distributed storage
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
	const {
		windowMs,
		maxRequests,
		message = 'Too many requests, please try again later',
		skipSuccessfulRequests = false,
		skipFailedRequests = false,
	} = options

	const store: RateLimitStore = {}

	// Clean up expired entries every minute
	setInterval(() => {
		const now = Date.now()
		Object.keys(store).forEach((key) => {
			if (store[key].resetTime < now) {
				delete store[key]
			}
		})
	}, 60000)

	return new Elysia({ name: 'rate-limit' })
		.onRequest(({ request, set }) => {
			const clientId = getClientIdentifier(request)
			const now = Date.now()

			// Initialize or get existing record
			if (!store[clientId] || store[clientId].resetTime < now) {
				store[clientId] = {
					count: 0,
					resetTime: now + windowMs,
				}
			}

			// Check if limit exceeded
			if (store[clientId].count >= maxRequests) {
				set.status = 429
				set.headers['Retry-After'] = Math.ceil(
					(store[clientId].resetTime - now) / 1000,
				).toString()
				set.headers['X-RateLimit-Limit'] = maxRequests.toString()
				set.headers['X-RateLimit-Remaining'] = '0'
				set.headers['X-RateLimit-Reset'] = new Date(
					store[clientId].resetTime,
				).toISOString()

				throw new Error(message)
			}

			// Increment counter
			store[clientId].count++

			// Set rate limit headers
			set.headers['X-RateLimit-Limit'] = maxRequests.toString()
			set.headers['X-RateLimit-Remaining'] = (
				maxRequests - store[clientId].count
			).toString()
			set.headers['X-RateLimit-Reset'] = new Date(
				store[clientId].resetTime,
			).toISOString()
		})
		.onAfterHandle(({ request, set }) => {
			// Optionally skip counting successful requests
			if (skipSuccessfulRequests && set.status && set.status < 400) {
				const clientId = getClientIdentifier(request)
				if (store[clientId]) {
					store[clientId].count = Math.max(0, store[clientId].count - 1)
				}
			}
		})
		.onError(({ request, set, error }) => {
			// Optionally skip counting failed requests
			if (skipFailedRequests && set.status && set.status >= 400) {
				const clientId = getClientIdentifier(request)
				if (store[clientId]) {
					store[clientId].count = Math.max(0, store[clientId].count - 1)
				}
			}

			// Handle rate limit errors
			if (error.message === message) {
				return {
					success: false,
					error: {
						code: 'RATE_LIMIT_EXCEEDED',
						message: error.message,
					},
				}
			}
		})
}

/**
 * Get client identifier for rate limiting
 * Uses IP address as the primary identifier
 */
function getClientIdentifier(request: Request): string {
	// Try to get real IP from headers (for reverse proxy setups)
	const forwardedFor = request.headers.get('x-forwarded-for')
	const realIp = request.headers.get('x-real-ip')
	const cfConnectingIp = request.headers.get('cf-connecting-ip')

	// Use the first available IP
	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim()
	}
	if (realIp) {
		return realIp
	}
	if (cfConnectingIp) {
		return cfConnectingIp
	}

	// Fallback to a default identifier
	return 'unknown'
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
	// Strict rate limiting for authentication endpoints
	auth: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5, // 5 attempts per 15 minutes
		message: 'Too many authentication attempts, please try again in 15 minutes',
	},

	// General API rate limiting
	api: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 100, // 100 requests per 15 minutes
		message: 'Too many API requests, please try again later',
	},

	// Lenient rate limiting for read operations
	read: {
		windowMs: 1 * 60 * 1000, // 1 minute
		maxRequests: 60, // 60 requests per minute
		message: 'Too many requests, please slow down',
	},

	// Strict rate limiting for write operations
	write: {
		windowMs: 1 * 60 * 1000, // 1 minute
		maxRequests: 20, // 20 requests per minute
		message: 'Too many write operations, please slow down',
	},
}

/**
 * Create rate limit middleware with predefined config
 */
export function createAuthRateLimit() {
	return createRateLimitMiddleware(rateLimitConfigs.auth)
}

export function createApiRateLimit() {
	return createRateLimitMiddleware(rateLimitConfigs.api)
}

export function createReadRateLimit() {
	return createRateLimitMiddleware(rateLimitConfigs.read)
}

export function createWriteRateLimit() {
	return createRateLimitMiddleware(rateLimitConfigs.write)
}
