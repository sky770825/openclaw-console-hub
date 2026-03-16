/** 專案製作：網站/專案處理進度與說明 */

export type ProjectStatus = 'planning' | 'in_progress' | 'done' | 'paused';

export interface ProjectPhase {
  id: string;
  name: string;
  done: boolean;
  assigneeAgent?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  phases: ProjectPhase[];
  notes: string;
  assigneeAgent?: string;
  assigneeLabel?: string;
  deadline?: string;
  priority?: number;
  tags?: string[];
  deliverablesSummary?: string;
  linkedTaskIds?: string[];
  updatedAt: string;
  createdAt: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '規劃中',
  in_progress: '進行中',
  done: '已完成',
  paused: '暫停',
};
