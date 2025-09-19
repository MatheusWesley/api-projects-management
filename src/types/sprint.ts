import type { BaseEntity } from './common.js';

export interface Sprint extends BaseEntity {
  name: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  status: 'planned' | 'active' | 'completed';
  goal?: string;
}

export interface CreateSprintData {
  name: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  goal?: string;
}

export interface UpdateSprintData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'planned' | 'active' | 'completed';
  goal?: string;
}