import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { UserRepository } from '../../src/repositories/UserRepository.js';
import { createTestDatabase, cleanupTestDatabase, testUserData } from './setup.js';
import type { MockDatabase } from './mock-database.js';

describe('UserRepository', () => {
  let db: MockDatabase;
  let userRepository: UserRepository;

  beforeEach(() => {
    db = createTestDatabase();
    userRepository = new UserRepository(db);
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const user = await userRepository.create(testUserData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(testUserData.email);
      expect(user.name).toBe(testUserData.name);
      expect(user.password).toBe(testUserData.password);
      expect(user.role).toBe(testUserData.role);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when creating user with duplicate email', async () => {
      await userRepository.create(testUserData);

      await expect(userRepository.create(testUserData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const createdUser = await userRepository.create(testUserData);
      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(testUserData.email);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await userRepository.findById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const createdUser = await userRepository.create(testUserData);
      const foundUser = await userRepository.findByEmail(testUserData.email);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(testUserData.email);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const createdUser = await userRepository.create(testUserData);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const updateData = { name: 'Updated Name', role: 'manager' as const };

      const updatedUser = await userRepository.update(createdUser.id, updateData);

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.role).toBe(updateData.role);
      expect(updatedUser.email).toBe(testUserData.email); // unchanged
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(updatedUser.createdAt.getTime());
    });

    it('should throw error when updating non-existent user', async () => {
      await expect(userRepository.update('non-existent-id', { name: 'New Name' })).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when updating to duplicate email', async () => {
      const user1 = await userRepository.create(testUserData);
      const user2 = await userRepository.create({
        ...testUserData,
        email: 'user2@example.com'
      });

      await expect(userRepository.update(user2.id, { email: testUserData.email })).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should return unchanged user when no update data provided', async () => {
      const createdUser = await userRepository.create(testUserData);
      const updatedUser = await userRepository.update(createdUser.id, {});

      expect(updatedUser).toEqual(createdUser);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const createdUser = await userRepository.create(testUserData);

      await userRepository.delete(createdUser.id);

      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should throw error when deleting non-existent user', async () => {
      await expect(userRepository.delete('non-existent-id')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('list', () => {
    it('should return empty array when no users exist', async () => {
      const users = await userRepository.list();
      expect(users).toEqual([]);
    });

    it('should return all users ordered by creation date', async () => {
      const user1 = await userRepository.create(testUserData);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const user2 = await userRepository.create({
        ...testUserData,
        email: 'user2@example.com'
      });

      const users = await userRepository.list();

      expect(users).toHaveLength(2);
      expect(users[0].id).toBe(user2.id); // Most recent first
      expect(users[1].id).toBe(user1.id);
    });
  });
});