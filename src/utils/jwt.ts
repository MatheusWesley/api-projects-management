import { config } from '../config/env.js'
import type { User } from '../types/user.js'

export interface JWTPayload {
	userId: string
	email: string
	role: string
	iat?: number
	exp?: number
}

export interface TokenResult {
	token: string
	expiresIn: string
}

/**
 * JWT utility class for token operations
 */
export class JWTUtils {
	/**
	 * Generate a JWT token for a user
	 */
	static async generateToken(
		user: Pick<User, 'id' | 'email' | 'role'>,
	): Promise<TokenResult> {
		const now = Math.floor(Date.now() / 1000)
		const expiresInSeconds = this.parseExpiresIn(config.jwtExpiresIn)

		const payload: JWTPayload = {
			userId: user.id,
			email: user.email,
			role: user.role,
			iat: now,
			exp: now + expiresInSeconds,
		}

		const token = await this.signToken(payload)

		return {
			token,
			expiresIn: config.jwtExpiresIn,
		}
	}

	/**
	 * Verify and decode a JWT token
	 */
	static async verifyToken(token: string): Promise<JWTPayload> {
		try {
			const payload = await this.verifyTokenSignature(token)

			if (!payload || typeof payload !== 'object') {
				throw new Error('Invalid token payload')
			}

			// Check expiration
			if (payload.exp && Date.now() >= payload.exp * 1000) {
				throw new Error('Token expired')
			}

			// Validate required fields
			if (!payload.userId || !payload.email || !payload.role) {
				throw new Error('Invalid token structure')
			}

			return payload as JWTPayload
		} catch (error) {
			throw new Error('Invalid or expired token')
		}
	}

	/**
	 * Sign a JWT token using HMAC SHA256
	 */
	private static async signToken(payload: JWTPayload): Promise<string> {
		const header = {
			alg: 'HS256',
			typ: 'JWT',
		}

		const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
		const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))

		const data = `${encodedHeader}.${encodedPayload}`
		const signature = await this.createSignature(data, config.jwtSecret)

		return `${data}.${signature}`
	}

	/**
	 * Verify JWT token signature
	 */
	private static async verifyTokenSignature(
		token: string,
	): Promise<JWTPayload> {
		const parts = token.split('.')
		if (parts.length !== 3) {
			throw new Error('Invalid token format')
		}

		const [encodedHeader, encodedPayload, signature] = parts
		const data = `${encodedHeader}.${encodedPayload}`

		const expectedSignature = await this.createSignature(data, config.jwtSecret)

		if (signature !== expectedSignature) {
			throw new Error('Invalid token signature')
		}

		const payload = JSON.parse(this.base64UrlDecode(encodedPayload))
		return payload
	}

	/**
	 * Create HMAC SHA256 signature
	 */
	private static async createSignature(
		data: string,
		secret: string,
	): Promise<string> {
		const encoder = new TextEncoder()
		const keyData = encoder.encode(secret)
		const messageData = encoder.encode(data)

		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			keyData,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		)

		const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
		return this.base64UrlEncode(new Uint8Array(signature))
	}

	/**
	 * Base64 URL encode
	 */
	private static base64UrlEncode(data: string | Uint8Array): string {
		const base64 =
			typeof data === 'string' ? btoa(data) : btoa(String.fromCharCode(...data))

		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
	}

	/**
	 * Base64 URL decode
	 */
	private static base64UrlDecode(data: string): string {
		let base64 = data.replace(/-/g, '+').replace(/_/g, '/')

		// Add padding if needed
		while (base64.length % 4) {
			base64 += '='
		}

		return atob(base64)
	}

	/**
	 * Parse expires in string to seconds
	 */
	private static parseExpiresIn(expiresIn: string): number {
		const match = expiresIn.match(/^(\d+)([smhd])$/)
		if (!match) {
			return 24 * 60 * 60 // Default to 24 hours
		}

		const [, value, unit] = match
		const num = parseInt(value, 10)

		switch (unit) {
			case 's':
				return num
			case 'm':
				return num * 60
			case 'h':
				return num * 60 * 60
			case 'd':
				return num * 24 * 60 * 60
			default:
				return 24 * 60 * 60
		}
	}

	/**
	 * Decode a JWT token without verification (for debugging/testing)
	 */
	static decodeToken(token: string): JWTPayload | null {
		try {
			// Simple base64 decode of JWT payload (second part)
			const parts = token.split('.')
			if (parts.length !== 3) {
				return null
			}

			const payload = JSON.parse(
				Buffer.from(parts[1], 'base64url').toString('utf-8'),
			)

			return payload as JWTPayload
		} catch {
			return null
		}
	}

	/**
	 * Check if a token is expired
	 */
	static isTokenExpired(token: string): boolean {
		const decoded = this.decodeToken(token)
		if (!decoded || !decoded.exp) {
			return true
		}

		return Date.now() >= decoded.exp * 1000
	}

	/**
	 * Extract token from Authorization header
	 */
	static extractTokenFromHeader(authHeader: string | undefined): string | null {
		if (!authHeader) {
			return null
		}

		const parts = authHeader.split(' ')
		if (parts.length !== 2 || parts[0] !== 'Bearer') {
			return null
		}

		return parts[1]
	}
}
