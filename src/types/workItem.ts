import type { BaseEntity } from './common.js';

export interface WorkItem extends BaseEntity {
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

export interface CreateWorkItemData {
  title: string;
  description?: string;
  type: 'task' | 'bug' | 'story';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  storyPoints?: number;
  estimatedHours?: number;
}

export interface UpdateWorkItemData {
  title?: string;
  description?: string;
  type?: 'task' | 'bug' | 'story';
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  storyPoints?: number;
  estimatedHours?: number;
}

export interface KanbanBoard {
  todo: WorkItem[];
  in_progress: WorkItem[];
  done: WorkItem[];
}