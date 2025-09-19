import { Database } from 'bun:sqlite';
import type { DatabaseConfig } from '../types/common.js';

let db: Database | null = null;

export function initializeDatabase(config: DatabaseConfig): Database {
  if (db) {
    return db;
  }

  db = new Database(config.filename);
  
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');
  
  // Create tables
  createTables(db);
  
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function createTables(database: Database): void {
  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'manager', 'developer')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Projects table
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'archived', 'completed')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Work items table
  database.exec(`
    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT CHECK(type IN ('task', 'bug', 'story')) NOT NULL,
      status TEXT CHECK(status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
      project_id TEXT NOT NULL,
      assignee_id TEXT,
      reporter_id TEXT NOT NULL,
      story_points INTEGER,
      estimated_hours INTEGER,
      priority_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Sprints table (for future use)
  database.exec(`
    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      status TEXT CHECK(status IN ('planned', 'active', 'completed')) DEFAULT 'planned',
      goal TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
    CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON work_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_work_items_assignee_id ON work_items(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_work_items_reporter_id ON work_items(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
    CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items(type);
    CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);
    CREATE INDEX IF NOT EXISTS idx_work_items_priority_order ON work_items(priority_order);
    CREATE INDEX IF NOT EXISTS idx_work_items_project_status ON work_items(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_work_items_project_priority ON work_items(project_id, priority_order);
    CREATE INDEX IF NOT EXISTS idx_work_items_created_at ON work_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
    CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
    CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);
  `);
}

// Utility function to generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Utility function to parse dates from database
function parseDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  return typeof value === 'string' ? new Date(value) : value;
}

// Database row to entity mappers
export function mapUserRow(row: any): import('../types/user.js').User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    password: row.password,
    role: row.role,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at)
  };
}

export function mapProjectRow(row: any): import('../types/project.js').Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    ownerId: row.owner_id,
    status: row.status,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at)
  };
}

export function mapWorkItemRow(row: any): import('../types/workItem.js').WorkItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    type: row.type,
    status: row.status,
    priority: row.priority,
    projectId: row.project_id,
    assigneeId: row.assignee_id || undefined,
    reporterId: row.reporter_id,
    storyPoints: row.story_points || undefined,
    estimatedHours: row.estimated_hours || undefined,
    priorityOrder: row.priority_order,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at)
  };
}