import type { BaseEntity } from './common.js';

export interface Project extends BaseEntity {
  name: string;
  description: string;
  ownerId: string;
  status: 'active' | 'archived' | 'completed';
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
}