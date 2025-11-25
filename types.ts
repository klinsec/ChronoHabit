
export interface Task {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  startTime: number;
  endTime: number | null;
}

export type SubtaskStatus = 'today' | 'pending' | 'idea' | 'log';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: number;
  status: SubtaskStatus;
}

export type View = 'timer' | 'history' | 'stats' | 'tasks';

export type GoalType = 'min' | 'max';
export type GoalPeriod = 'day' | 'week' | 'month' | 'all';

export interface Goal {
  taskId: string;
  type: GoalType;
  duration: number; // in milliseconds
  period: GoalPeriod;
}