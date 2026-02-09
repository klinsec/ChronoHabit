
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

export type CommitmentStatus = 'pending' | 'completed' | 'failed';

export interface Commitment {
  id: string;
  title: string;
  time?: string; // HH:mm format
  status: CommitmentStatus; // Replaces completedToday boolean
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
  allowedDays?: number[]; // Array of days (0=Sun, 1=Mon...) allowed for this contract
}

export interface ContractHistoryItem {
    id: string;
    startDate: number;
    endDate: number;
    phaseDuration: number;
    status: 'completed' | 'failed';
    commitmentsSnapshot: string[]; // List of titles
}

export interface SavedRoutine {
    id: string;
    title: string;
    commitments: Omit<Commitment, 'id' | 'status'>[];
    allowedDays?: number[];
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
  contractHistory?: ContractHistoryItem[];
  savedRoutines?: SavedRoutine[];
  settings?: {
      dailyNotificationEnabled: boolean;
      briefingTime?: string;
      reviewTime?: string;
  };
  timestamp: number;
  version: number;
}
