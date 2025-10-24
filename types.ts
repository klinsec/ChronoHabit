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

export type View = 'timer' | 'history' | 'stats';

export type GoalType = 'min' | 'max';
export type GoalPeriod = 'day' | 'week';

export interface Goal {
  taskId: string;
  type: GoalType;
  duration: number; // in milliseconds
  period: GoalPeriod;
}
