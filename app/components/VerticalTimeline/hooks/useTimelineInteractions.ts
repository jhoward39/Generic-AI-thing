import { useState, useCallback } from "react";
import { TimelineTask } from "../../../../types";
import {
  UseTimelineInteractionsParams,
  UseTimelineInteractionsReturn,
  TaskCoordinates,
} from "../types";

/**
 * Custom hook for timeline interactions
 * Handles drag and drop, keyboard events, and dependency creation
 */
export function useTimelineInteractions(
  params: UseTimelineInteractionsParams,
): UseTimelineInteractionsReturn {
  const { onCreateDependency, onTaskMove, containerRef, rowHeight, dateRows } = params;

  // State
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [draggedTaskPos, setDraggedTaskPos] = useState<TaskCoordinates | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [isCommandHeld, setIsCommandHeld] = useState(false);

  // Keyboard event handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Meta" || e.key === "Control") {
      setIsCommandHeld(true);
    }
    if (e.key === "Escape") {
      setConnectingFrom(null);
      setDependencyError(null);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Meta" || e.key === "Control") {
      setIsCommandHeld(false);
    }
  }, []);

  const handleWindowBlur = useCallback(() => {
    setIsCommandHeld(false);
  }, []);

  // Mouse event handlers
  const handleTaskMouseDown = useCallback(
    (e: React.MouseEvent, task: TimelineTask) => {
      if (e.button === 0) {
        // Left click - start drag or open modal
        e.preventDefault();
        e.stopPropagation();

        // Check for Command/Ctrl + click to open modal
        if (e.metaKey || e.ctrlKey) {
          // Modal opening is handled by parent component
          return;
        }

        // Start drag
        setDraggedTask(task.id);
        setDraggedTaskPos({ x: e.clientX, y: e.clientY });
      } else if (e.button === 2) {
        // Right click - dependency creation
        e.preventDefault();
        if (connectingFrom === null) {
          setConnectingFrom(task.id);
          setDependencyError(null);
        } else if (connectingFrom !== task.id) {
          onCreateDependency(connectingFrom, task.id).then((result) => {
            if (result.success) {
              setConnectingFrom(null);
              setDependencyError(null);
            } else {
              setDependencyError(result.error || "Failed to create dependency.");
            }
          });
        }
      }
    },
    [connectingFrom, onCreateDependency],
  );

  const handleTaskMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggedTask !== null) {
        // Use viewport coordinates for consistent tracking
        setDraggedTaskPos({ x: e.clientX, y: e.clientY });
      }
    },
    [draggedTask],
  );

  const handleTaskMouseUp = useCallback(() => {
    if (draggedTask !== null && containerRef.current && draggedTaskPos) {
      // Convert viewport coordinates back to container coordinates for drop calculation
      const rect = containerRef.current.getBoundingClientRect();
      const containerY = draggedTaskPos.y - rect.top;
      const scrollTop = containerRef.current.scrollTop;

      // Use the center of the dragged task for more accurate drop detection
      const taskCenterY = containerY + scrollTop;
      const dropRowIndex = Math.floor(taskCenterY / rowHeight);
      const clampedRowIndex = Math.max(0, Math.min(dateRows.length - 1, dropRowIndex));

      const targetDate = dateRows[clampedRowIndex]?.dateStr;
      if (targetDate) {
        onTaskMove(draggedTask, targetDate);
      }
    }

    setDraggedTask(null);
    setDraggedTaskPos(null);
  }, [draggedTask, draggedTaskPos, rowHeight, dateRows, onTaskMove, containerRef]);

  return {
    draggedTask,
    draggedTaskPos,
    connectingFrom,
    dependencyError,
    isCommandHeld,
    handleTaskMouseDown,
    handleTaskMouseMove,
    handleTaskMouseUp,
    handleKeyDown,
    handleKeyUp,
    handleWindowBlur,
  };
}
