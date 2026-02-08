
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
  deadline?: number; // Timestamp for the deadline
}

// --- Discipline Contract Types ---

export type ContractPhase = number; // Changed from union to number for custom duration

export interface Commitment {
  id: string;
  title: string;
  time?: string; // HH:mm format
  completedToday: boolean;
}

export interface DisciplineContract {
  active: boolean;
  currentPhase: ContractPhase; // This is the total duration goal (e.g., 7 days)
  dayInPhase: number; // 1-based index
  startDate: number;
  lastCheckDate: string; // To handle daily resets (YYYY-MM-DD)
  commitments: Commitment[];
  history: boolean[]; // Array of true/false for previous days in current phase
  failed: boolean;
}

export type View = 'timer' | 'history' | 'stats' | 'tasks' | 'routines' | 'discipline';

export type GoalType = 'min' | 'max';
export type GoalPeriod = 'day' | 'week' | 'month' | 'all';

export interface Goal {
  taskId: string;
  type: GoalType;
  duration: number; // in milliseconds
  period: GoalPeriod;
}

export interface BackupData {
  tasks: Task[];
  timeEntries: TimeEntry[];
  goals: Goal[];
  subtasks: Subtask[];
  contract?: DisciplineContract;
  timestamp: number;
  version: number;
}
