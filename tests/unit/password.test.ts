import { describe, it, expect } from 'bun:test'
import { PasswordUtils } from '../../src/utils/password.js'

describe('PasswordUtils', () => {
	describe('hashPassword', () => {
		it('should hash a password successfully', async () => {
			const password = 'TestPassword123!'
			const hashedPassword = await PasswordUtils.hashPassword(password)

			expect(hashedPassword).toBeDefined()
			expect(typeof hashedPassword).toBe('string')
			expect(hashedPassword).not.toBe(password)
			expect(hashedPassword.length).toBeGreaterThan(0)
		})

		it('should generate different hashes for the same password', async () => {
			const password = 'TestPassword123!'
			const hash1 = await PasswordUtils.hashPassword(password)
			const hash2 = await PasswordUtils.hashPassword(password)

			expect(hash1).not.toBe(hash2)
		})

		it('should throw error for empty password', async () => {
			await expect(PasswordUtils.hashPassword('')).rejects.toThrow(
				'Password cannot be empty',
			)
		})

		it('should throw error for undefined password', async () => {
			await expect(
				PasswordUtils.hashPassword(undefined as any),
			).rejects.toThrow('Password cannot be empty')
		})
	})

	describe('comparePassword', () => {
		it('should return true for matching password and hash', async () => {
			const password = 'TestPassword123!'
			const hashedPassword = await PasswordUtils.hashPassword(password)

			const isMatch = await PasswordUtils.comparePassword(
				password,
				hashedPassword,
			)

			expect(isMatch).toBe(true)
		})

		it('should return false for non-matching password and hash', async () => {
			const password = 'TestPassword123!'
			const wrongPassword = 'WrongPassword123!'
			const hashedPassword = await PasswordUtils.hashPassword(password)

			const isMatch = await PasswordUtils.comparePassword(
				wrongPassword,
				hashedPassword,
			)

			expect(isMatch).toBe(false)
		})

		it('should return false for empty password', async () => {
			const hashedPassword =
				await PasswordUtils.hashPassword('TestPassword123!')

			const isMatch = await PasswordUtils.comparePassword('', hashedPassword)

			expect(isMatch).toBe(false)
		})

		it('should return false for empty hash', async () => {
			const isMatch = await PasswordUtils.comparePassword(
				'TestPassword123!',
				'',
			)

			expect(isMatch).toBe(false)
		})

		it('should return false for invalid hash', async () => {
			const isMatch = await PasswordUtils.comparePassword(
				'TestPassword123!',
				'invalid-hash',
			)

			expect(isMatch).toBe(false)
		})
	})

	describe('validatePasswordStrength', () => {
		it('should validate a strong password', () => {
			const strongPassword = 'StrongPass123!'
			const result = PasswordUtils.validatePasswordStrength(strongPassword)

			expect(result.isValid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it('should reject password that is too short', () => {
			const shortPassword = 'Short1!'
			const result = PasswordUtils.validatePasswordStrength(shortPassword)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'Password must be at least 8 characters long',
			)
		})

		it('should reject password that is too long', () => {
			const longPassword = 'A'.repeat(129) + '1!'
			const result = PasswordUtils.validatePasswordStrength(longPassword)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'Password must be less than 128 characters long',
			)
		})

		it('should reject password without lowercase letter', () => {
			const password = 'PASSWORD123!'
			const result = PasswordUtils.validatePasswordStrength(password)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'Password must contain at least one lowercase letter',
			)
		})

		it('should reject password without uppercase letter', () => {
			const password = 'password123!'
			const result = PasswordUtils.validatePasswordStrength(password)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'Password must contain at least one uppercase letter',
			)
		})

		it('should reject password without number', () => {
			const password = 'Password!'
			const result = PasswordUtils.validatePasswordStrength(password)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'Password must contain at least one number',
			)
		})

		it('should reject password without special character', () => {
			const password = 'Password123'
			const result = PasswordUtils.validatePasswordStrength(password)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'Password must contain at least one special character',
			)
		})

		it('should reject empty password', () => {
			const result = PasswordUtils.validatePasswordStrength('')

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain('Password is required')
		})

		it('should reject null password', () => {
			const result = PasswordUtils.validatePasswordStrength(null as any)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain('Password is required')
		})

		it('should return multiple errors for weak password', () => {
			const weakPassword = 'weak'
			const result = PasswordUtils.validatePasswordStrength(weakPassword)

			expect(result.isValid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(1)
		})
	})

	describe('generateRandomPassword', () => {
		it('should generate password with default length', () => {
			const password = PasswordUtils.generateRandomPassword()

			expect(password).toBeDefined()
			expect(password.length).toBe(12)
		})

		it('should generate password with custom length', () => {
			const length = 16
			const password = PasswordUtils.generateRandomPassword(length)

			expect(password.length).toBe(length)
		})

		it('should generate password that passes strength validation', () => {
			const password = PasswordUtils.generateRandomPassword()
			const validation = PasswordUtils.validatePasswordStrength(password)

			expect(validation.isValid).toBe(true)
		})

		it('should generate different passwords each time', () => {
			const password1 = PasswordUtils.generateRandomPassword()
			const password2 = PasswordUtils.generateRandomPassword()

			expect(password1).not.toBe(password2)
		})

		it('should generate password with at least one character from each category', () => {
			const password = PasswordUtils.generateRandomPassword(20)

			expect(/[a-z]/.test(password)).toBe(true) // lowercase
			expect(/[A-Z]/.test(password)).toBe(true) // uppercase
			expect(/\d/.test(password)).toBe(true) // number
			expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true) // special
		})
	})
})
