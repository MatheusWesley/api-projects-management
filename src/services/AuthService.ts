import type { IAuthService } from '../types/services.js';
import type { IUserRepository } from '../types/repositories.js';
import type { User, CreateUserData, AuthResponse } from '../types/user.js';
import { JWTUtils } from '../utils/jwt.js';
import { PasswordUtils } from '../utils/password.js';
import { 
  UnauthorizedError, 
  ConflictError, 
  ValidationError,
  NotFoundError,
  TokenError 
} from '../types/errors.js';

export class AuthService implements IAuthService {
  constructor(private userRepository: IUserRepository) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Compare password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token using JWTUtils
    const tokenResult = await JWTUtils.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: tokenResult.token
    };
  }

  async register(userData: CreateUserData): Promise<User> {
    const { email, password, name, role } = userData;

    // Validate required fields
    if (!email || !password || !name || !role) {
      throw new ValidationError('Email, password, name, and role are required');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        errors: passwordValidation.errors
      });
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const newUser = await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });

    return newUser;
  }

  async verifyToken(token: string): Promise<User> {
    if (!token) {
      throw new TokenError('Token is required');
    }

    try {
      // Verify and decode token
      const payload = await JWTUtils.verifyToken(token);
      
      // Find user by ID from token
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new TokenError('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }
      throw new TokenError('Invalid or expired token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await PasswordUtils.hashPassword(password);
    } catch (error) {
      throw new ValidationError('Failed to process password');
    }
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await PasswordUtils.comparePassword(password, hash);
    } catch (error) {
      return false;
    }
  }

  async generateToken(user: User): Promise<string> {
    try {
      const tokenResult = await JWTUtils.generateToken(user);
      return tokenResult.token;
    } catch (error) {
      throw new ValidationError('Failed to generate token');
    }
  }
}