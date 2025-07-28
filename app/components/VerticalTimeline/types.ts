import { TimelineTask, TimelineDependency } from "../../../types";

/* ------------------------------------------------------------------
 * Timeline Component Types
 * ------------------------------------------------------------------*/

export interface DateRow {
  date: Date;
  dateStr: string;
  tasks: TimelineTask[];
}

export interface TaskCoordinates {
  x: number;
  y: number;
}

export interface EdgePoint {
  point: TaskCoordinates;
  direction: { x: number; y: number };
}

export interface MinimapViewport {
  top: number;
  height: number;
}

export interface TaskDot {
  top: number;
  count: number;
}

/* ------------------------------------------------------------------
 * Hook Types
 * ------------------------------------------------------------------*/

export interface UseTimelineLayoutReturn {
  dateRows: DateRow[];
  rowHeight: number;
  totalHeight: number;
  taskNodeWidth: number;
  taskNodeHeight: number;
}

export interface UseTimelineInteractionsParams {
  tasks: TimelineTask[];
  onCreateDependency: (
    fromId: number,
    toId: number,
  ) => Promise<{ success: boolean; error?: string }>;
  onTaskMove: (taskId: number, newDate: string) => void;
  taskRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  containerRef: React.RefObject<HTMLDivElement>;
  taskNodeWidth: number;
  taskNodeHeight: number;
  rowHeight: number;
  dateRows: DateRow[];
}

export interface UseTimelineInteractionsReturn {
  draggedTask: number | null;
  draggedTaskPos: TaskCoordinates | null;
  connectingFrom: number | null;
  dependencyError: string | null;
  isCommandHeld: boolean;
  handleTaskMouseDown: (e: React.MouseEvent, task: TimelineTask) => void;
  handleTaskMouseMove: (e: React.MouseEvent) => void;
  handleTaskMouseUp: (e: React.MouseEvent) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
  handleWindowBlur: () => void;
}

export interface UseTimelineDependenciesParams {
  dateRows: DateRow[];
  rowHeight: number;
  containerWidth: number;
  taskNodeWidth: number;
  taskNodeHeight: number;
}

export interface UseTimelineDependenciesReturn {
  getTaskCoordinates: (task: TimelineTask) => TaskCoordinates | null;
  getBoxEdgePointWithDirection: (
    centerX: number,
    centerY: number,
    targetX: number,
    targetY: number,
    isSource: boolean,
  ) => EdgePoint;
}

/* ------------------------------------------------------------------
 * Component Props Types
 * ------------------------------------------------------------------*/

export interface TimelineHeaderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isDark: boolean;
}

export interface TimelineGridProps {
  dateRows: DateRow[];
  rowHeight: number;
  totalHeight: number;
  isDark: boolean;
}

export interface TimelineMinimapProps {
  dateRows: DateRow[];
  rowHeight: number;
  totalHeight: number;
  scrollTop: number;
  onScrollChange: (scrollTop: number) => void;
  isDark: boolean;
}

export interface DependencyLinesProps {
  dependencies: TimelineDependency[];
  tasks: TimelineTask[];
  getTaskCoordinates: (task: TimelineTask) => TaskCoordinates | null;
  getBoxEdgePointWithDirection: (
    centerX: number,
    centerY: number,
    targetX: number,
    targetY: number,
    isSource: boolean,
  ) => EdgePoint;
  isDark: boolean;
}

export interface TaskNodesProps {
  tasks: TimelineTask[];
  dateRows: DateRow[];
  rowHeight: number;
  taskNodeWidth: number;
  taskNodeHeight: number;
  draggedTask: number | null;
  draggedTaskPos: TaskCoordinates | null;
  connectingFrom: number | null;
  taskRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onTaskMouseDown: (e: React.MouseEvent, task: TimelineTask) => void;
  onTaskMouseMove: (e: React.MouseEvent) => void;
  onTaskMouseUp: (e: React.MouseEvent) => void;
  onTaskClick: (task: TimelineTask) => void;
  isDark: boolean;
}
