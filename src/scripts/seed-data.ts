#!/usr/bin/env bun
/**
 * Seed data script for development and testing
 * Populates database with sample data
 */

import { initializeApp } from '../config/index.js';
import { config, isDevelopment, isTest } from '../config/env.js';
import { generateId } from '../config/database.js';
import { PasswordUtils } from '../utils/password.js';

interface SeedUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'manager' | 'developer';
}

interface SeedProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: 'active' | 'archived' | 'completed';
}

interface SeedWorkItem {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'bug' | 'story';
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectId: string;
  assigneeId?: string;
  reporterId: string;
  storyPoints?: number;
  estimatedHours?: number;
  priorityOrder: number;
}

async function createSeedData(): Promise<{
  users: SeedUser[];
  projects: SeedProject[];
  workItems: SeedWorkItem[];
}> {
  // Create seed users
  const users: SeedUser[] = [
    {
      id: generateId(),
      email: 'admin@example.com',
      name: 'Admin User',
      password: await PasswordUtils.hashPassword('#Admin123'),
      role: 'admin',
    },
    {
      id: generateId(),
      email: 'manager@example.com',
      name: 'Project Manager',
      password: await PasswordUtils.hashPassword('#Manager123'),
      role: 'manager',
    },
    {
      id: generateId(),
      email: 'dev1@example.com',
      name: 'Developer One',
      password: await PasswordUtils.hashPassword('#Dev1234'),
      role: 'developer',
    },
    {
      id: generateId(),
      email: 'dev2@example.com',
      name: 'Developer Two',
      password: await PasswordUtils.hashPassword('dev123'),
      role: 'developer',
    },
  ];

  // Create seed projects
  const projects: SeedProject[] = [
    {
      id: generateId(),
      name: 'E-commerce Platform',
      description: 'Building a modern e-commerce platform with React and Node.js',
      ownerId: users[1].id, // Manager
      status: 'active',
    },
    {
      id: generateId(),
      name: 'Mobile App',
      description: 'Cross-platform mobile application using React Native',
      ownerId: users[1].id, // Manager
      status: 'active',
    },
    {
      id: generateId(),
      name: 'Legacy System Migration',
      description: 'Migrating legacy PHP system to modern architecture',
      ownerId: users[0].id, // Admin
      status: 'archived',
    },
  ];

  // Create seed work items
  const workItems: SeedWorkItem[] = [
    // E-commerce Platform items
    {
      id: generateId(),
      title: 'Setup project structure',
      description: 'Initialize React project with TypeScript and configure build tools',
      type: 'task',
      status: 'done',
      priority: 'high',
      projectId: projects[0].id,
      assigneeId: users[2].id,
      reporterId: users[1].id,
      storyPoints: 3,
      estimatedHours: 8,
      priorityOrder: 1,
    },
    {
      id: generateId(),
      title: 'Implement user authentication',
      description: 'Create login/register forms and JWT authentication flow',
      type: 'story',
      status: 'in_progress',
      priority: 'high',
      projectId: projects[0].id,
      assigneeId: users[2].id,
      reporterId: users[1].id,
      storyPoints: 8,
      estimatedHours: 20,
      priorityOrder: 2,
    },
    {
      id: generateId(),
      title: 'Design product catalog UI',
      description: 'Create responsive product listing and detail pages',
      type: 'story',
      status: 'todo',
      priority: 'medium',
      projectId: projects[0].id,
      assigneeId: users[3].id,
      reporterId: users[1].id,
      storyPoints: 5,
      estimatedHours: 16,
      priorityOrder: 3,
    },
    {
      id: generateId(),
      title: 'Fix cart calculation bug',
      description: 'Cart total is not updating correctly when items are removed',
      type: 'bug',
      status: 'todo',
      priority: 'critical',
      projectId: projects[0].id,
      reporterId: users[1].id,
      priorityOrder: 4,
    },
    
    // Mobile App items
    {
      id: generateId(),
      title: 'Setup React Native project',
      description: 'Initialize React Native project with navigation and state management',
      type: 'task',
      status: 'done',
      priority: 'high',
      projectId: projects[1].id,
      assigneeId: users[3].id,
      reporterId: users[1].id,
      storyPoints: 5,
      estimatedHours: 12,
      priorityOrder: 1,
    },
    {
      id: generateId(),
      title: 'Implement push notifications',
      description: 'Add Firebase push notification support for iOS and Android',
      type: 'story',
      status: 'todo',
      priority: 'medium',
      projectId: projects[1].id,
      assigneeId: users[2].id,
      reporterId: users[1].id,
      storyPoints: 8,
      estimatedHours: 24,
      priorityOrder: 2,
    },
    
    // Legacy System Migration items
    {
      id: generateId(),
      title: 'Analyze legacy database schema',
      description: 'Document current database structure and identify migration requirements',
      type: 'task',
      status: 'done',
      priority: 'high',
      projectId: projects[2].id,
      assigneeId: users[0].id,
      reporterId: users[0].id,
      estimatedHours: 16,
      priorityOrder: 1,
    },
  ];

  return { users, projects, workItems };
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if we should seed (only in development or test)
    if (!isDevelopment() && !isTest()) {
      console.log('⚠️  Seeding is only allowed in development or test environments');
      return;
    }
    
    // Initialize the application
    const { database } = initializeApp();
    
    // Check if data already exists
    const existingUsers = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (existingUsers.count > 0) {
      console.log('📊 Database already contains data. Skipping seed.');
      database.close();
      return;
    }
    
    // Create seed data
    const { users, projects, workItems } = await createSeedData();
    
    // Insert users
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    for (const user of users) {
      insertUser.run(user.id, user.email, user.name, user.password, user.role);
    }
    console.log(`✅ Inserted ${users.length} users`);
    
    // Insert projects
    const insertProject = database.prepare(`
      INSERT INTO projects (id, name, description, owner_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    for (const project of projects) {
      insertProject.run(project.id, project.name, project.description, project.ownerId, project.status);
    }
    console.log(`✅ Inserted ${projects.length} projects`);
    
    // Insert work items
    const insertWorkItem = database.prepare(`
      INSERT INTO work_items (
        id, title, description, type, status, priority, project_id, 
        assignee_id, reporter_id, story_points, estimated_hours, priority_order,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    for (const item of workItems) {
      insertWorkItem.run(
        item.id, item.title, item.description, item.type, item.status, item.priority,
        item.projectId, item.assigneeId || null, item.reporterId, 
        item.storyPoints || null, item.estimatedHours || null, item.priorityOrder
      );
    }
    console.log(`✅ Inserted ${workItems.length} work items`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Seed data summary:');
    console.log('Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - password: ${user.email.split('@')[0]}123`);
    });
    
    console.log('\nProjects:');
    projects.forEach(project => {
      const owner = users.find(u => u.id === project.ownerId);
      console.log(`  - ${project.name} (owned by ${owner?.name})`);
    });
    
    // Close database connection
    database.close();
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  await seedDatabase();
}

export { seedDatabase, createSeedData };