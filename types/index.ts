// Core types for the todo/task management system

// ============================================================================
// Database/API Types
// ============================================================================

export interface Todo {
  id: number;
  title: string;
  createdAt: string;
  dueDate?: string | null;
  duration: number;
  earliestStartDate?: string | null;
  isOnCriticalPath: boolean;
  imageUrl?: string | null;
  done?: boolean;
  dependencies: {
    dependsOn: {
      id: number;
      title: string;
    };
  }[];
  dependentTasks: {
    task: {
      id: number;
      title: string;
    };
  }[];
}

export interface TaskInfo {
  id: number;
  title: string;
  dueDate?: Date | null;
  duration: number;
  isOnCriticalPath: boolean;
  earliestStartDate?: Date | null;
}

export interface Dependency {
  id: number;
  taskId: number;
  dependsOnId: number;
  task: TaskInfo;
  dependsOn: TaskInfo;
}

export interface CriticalPathTask {
  id: number;
  title: string;
  duration: number;
  earliestStart: number;
  latestStart: number;
  slack: number;
}

export interface CriticalPathInfo {
  criticalPath: CriticalPathTask[];
  totalDuration: number;
}

export interface DependencyInfo {
  dependencies: Dependency[];
  criticalPath: CriticalPathInfo;
  totalTasks: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface TaskPieChartProps {
  uncompletedTasks: number;
  overdueTasks: number;
}

export interface CustomCalendarProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  openDirection?: "up" | "down";
}

export interface TaskModalProps {
  task: Todo;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: () => void;
  onTaskDelete: (id: number) => void;
  onDependencyUpdate?: () => void;
}

export interface VerticalTimelineProps {
  tasks: TimelineTask[];
  dependencies: TimelineDependency[];
  onTaskMove: (taskId: number, newDate: string) => void;
  onCreateDependency: (
    fromId: number,
    toId: number,
  ) => Promise<{ success: boolean; error?: string }>;
  onTaskUpdate: () => void;
  onTaskDelete: (id: number) => void;
}

// ============================================================================
// UI/Display Types
// ============================================================================

// Timeline-specific Task interface with required dueDate
export interface TimelineTask {
  id: number;
  title: string;
  dueDate: string; // YYYY-MM-DD format - required for timeline
  createdAt: string;
  duration: number;
  earliestStartDate?: string;
  isOnCriticalPath: boolean;
  imageUrl?: string | null;
  done?: boolean;
  dependencies: {
    dependsOn: {
      id: number;
      title: string;
    };
  }[];
  dependentTasks: {
    task: {
      id: number;
      title: string;
    };
  }[];
}

export interface TimelineDependency {
  fromId: number;
  toId: number;
}

// ============================================================================
// Dependency Graph Types
// ============================================================================

export interface TaskNode {
  id: number;
  title: string;
  duration: number;
  dueDate?: Date;
  dependencies: number[];
  dependentTasks: number[];
  earliestStartDate?: Date;
  isOnCriticalPath: boolean;
}

export interface DependencyGraph {
  nodes: Map<number, TaskNode>;
  adjacencyList: Map<number, number[]>;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiParams {
  id: string;
}

export interface CreateTodoRequest {
  title: string;
  dueDate?: string | null;
  duration?: number;
}

export interface UpdateTodoRequest {
  dueDate?: string | null;
  done?: boolean;
  title?: string;
  duration?: number;
}

export interface CreateDependencyRequest {
  taskId: number;
  dependsOnId: number;
}

export interface DeleteDependencyRequest {
  taskId: number;
  dependsOnId: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SortKey = "title" | "dueDate" | "duration" | "earliestStartDate";
export type SortOrder = "asc" | "desc";
export type ViewMode = "month" | "week";
