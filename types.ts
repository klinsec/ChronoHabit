
export interface Task {
  id: string;
  name: string;
  color: string;
  icon: string;
  difficulty?: number; // 0 to 10 (0 = 0 stars, 10 = 5 stars)
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
  completedAt?: number; // Timestamp when completed
  status: SubtaskStatus;
  deadline?: number; // Timestamp for the deadline
  difficulty?: number; // 0-10 points
}

// --- Discipline Contract Types ---

export type ContractPhase = number; 

export type CommitmentStatus = 'pending' | 'completed' | 'failed';

export interface Commitment {
  id: string;
  title: string;
  time?: string; // HH:mm format
  status: CommitmentStatus; 
}

export interface DailyRoutineHistory {
    date: string; // YYYY-MM-DD
    points: number; // Points earned that day
    streakLevel: number; // The potential level for that day (1-10)
    totalCommitments: number;
    completedCommitments: number;
}

export interface DisciplineContract {
  active: boolean;
  currentPhase: ContractPhase; 
  dayInPhase: number; 
  startDate: number;
  lastCheckDate: string; // YYYY-MM-DD
  commitments: Commitment[];
  history: boolean[]; // Legacy
  dailyHistory: DailyRoutineHistory[]; // New detailed history
  currentStreakLevel: number; // 1 to 10, determines potential points for today
  failed: boolean;
  allowedDays?: number[]; 
}

export interface ContractHistoryItem {
    id: string;
    startDate: number;
    endDate: number;
    phaseDuration: number;
    status: 'completed' | 'failed';
    commitmentsSnapshot: string[];
    dailyHistory: DailyRoutineHistory[];
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
