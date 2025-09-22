import type { BaseEntity } from './common.js'

export interface User extends BaseEntity {
	email: string
	name: string
	password: string // hashed
	role: 'admin' | 'manager' | 'developer'
}

export interface CreateUserData {
	email: string
	name: string
	password: string
	role: 'admin' | 'manager' | 'developer'
}

export interface LoginData {
	email: string
	password: string
}

export interface AuthResponse {
	user: Omit<User, 'password'>
	token: string
}
