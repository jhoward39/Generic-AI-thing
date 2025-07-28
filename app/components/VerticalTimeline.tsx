"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import TaskModal from "./TaskModal";
import { TimelineTask, VerticalTimelineProps } from "../../types";

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------*/
const BASE_ROW_HEIGHT = 80;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const TASK_NODE_WIDTH = 120;
const TASK_NODE_HEIGHT = 40;
const MINIMAP_WIDTH = 40;

/* ------------------------------------------------------------------
 * Utility Functions
 * ------------------------------------------------------------------*/
function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function formatDate(date: Date): string {
  // Use local timezone formatting instead of UTC to fix timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------*/
export default function VerticalTimeline({
  tasks,
  dependencies,
  onTaskMove,
  onCreateDependency,
  onTaskUpdate,
  onTaskDelete,
}: VerticalTimelineProps) {
  const { isDark } = useTheme();
  const [zoom, setZoom] = useState(1.0);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [draggedTaskPos, setDraggedTaskPos] = useState<{ x: number; y: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [minimapDragging, setMinimapDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const [containerWidth, setContainerWidth] = useState(800);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [isCommandHeld, setIsCommandHeld] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hasScrolledToToday = useRef(false);

  // Update selectedTask when tasks change (to reflect image loading)
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find((task) => task.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasks, selectedTask]);

  /* ----------------------- Date Range Calculation ----------------------- */
  const { startDate, endDate, dateRows } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: addDays(today, -30),
        endDate: addDays(today, 30),
        dateRows: [],
      };
    }

    const dates = tasks.map((t) => parseDate(t.dueDate));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 7);

    const rows: Array<{ date: Date; dateStr: string; tasks: TimelineTask[] }> = [];
    let current = new Date(start);

    while (current <= end) {
      const dateStr = formatDate(current);
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      rows.push({
        date: new Date(current),
        dateStr,
        tasks: dayTasks,
      });
      current = addDays(current, 1);
    }

    return {
      startDate: start,
      endDate: end,
      dateRows: rows,
    };
  }, [tasks]);

  void startDate; // Intentionally unused
  void endDate; // Intentionally unused

  /* ----------------------- Layout Calculations ----------------------- */
  const rowHeight = BASE_ROW_HEIGHT * zoom;
  const totalHeight = dateRows.length * rowHeight;
  const taskNodeWidth = TASK_NODE_WIDTH * zoom;
  const taskNodeHeight = TASK_NODE_HEIGHT * zoom;

  // Unified coordinate calculation - same logic for both HTML positioning and SVG paths
  const getTaskCoordinates = useCallback(
    (task: TimelineTask) => {
      const row = dateRows.find((row) => row.tasks.some((t) => t.id === task.id));
      if (!row) return null;

      const rowIndex = dateRows.indexOf(row);
      const taskIndex = row.tasks.findIndex((t) => t.id === task.id);

      // Use tracked container width for consistent calculations
      const availableWidth = containerWidth - MINIMAP_WIDTH - 32;

      // Calculate task X position within the row
      let taskX: number;
      if (row.tasks.length === 1) {
        taskX = availableWidth / 2;
      } else {
        const spacing = availableWidth / (row.tasks.length + 1);
        taskX = spacing * (taskIndex + 1);
      }

      // Calculate absolute coordinates - ensuring perfect alignment
      const absoluteX = MINIMAP_WIDTH + taskX;
      // Use the exact same Y calculation as the HTML positioning: row center
      const absoluteY = rowIndex * rowHeight + rowHeight / 2;

      return { x: absoluteX, y: absoluteY };
    },
    [dateRows, rowHeight, containerWidth],
  );

  // Calculate clean edge connection points with proper top/bottom logic and perpendicular direction vectors
  const getBoxEdgePointWithDirection = useCallback(
    (centerX: number, centerY: number, targetX: number, targetY: number, isSource: boolean) => {
      const halfWidth = (TASK_NODE_WIDTH * zoom) / 2;
      const halfHeight = (TASK_NODE_HEIGHT * zoom) / 2;
      const arrowLength = 9; // Length of arrow head for proper offset

      // Calculate direction to target
      const dx = targetX - centerX;
      const dy = targetY - centerY;

      // Determine which edge to connect to based on direction and role (source vs target)
      // Prioritize vertical connections when there's any significant vertical separation
      if (Math.abs(dy) > 10) {
        // If vertically separated by more than 10 pixels, use vertical connection
        // Tasks are vertically separated - use top/bottom edges
        if (isSource) {
          // For source task: if target is below, connect from bottom edge
          if (dy > 0) {
            return {
              point: { x: centerX, y: centerY + halfHeight },
              direction: { x: 0, y: 1 }, // Outward from bottom edge (down)
            };
          } else {
            return {
              point: { x: centerX, y: centerY - halfHeight },
              direction: { x: 0, y: -1 }, // Outward from top edge (up)
            };
          }
        } else {
          // For target task: offset by arrow length so line stops before box
          if (dy < 0) {
            // Source is above target - connect to top edge, offset outward by arrow length
            return {
              point: { x: centerX, y: centerY - halfHeight - arrowLength },
              direction: { x: 0, y: -1 }, // Inward to top edge (up)
            };
          } else {
            // Source is below target - connect to bottom edge, offset outward by arrow length
            return {
              point: { x: centerX, y: centerY + halfHeight + arrowLength },
              direction: { x: 0, y: 1 }, // Inward to bottom edge (down)
            };
          }
        }
      } else {
        // Tasks are horizontally separated - use left/right edges
        if (isSource) {
          // For source task: connect from the edge facing the target
          if (dx > 0) {
            return {
              point: { x: centerX + halfWidth, y: centerY },
              direction: { x: 1, y: 0 }, // Outward from right edge (right)
            };
          } else {
            return {
              point: { x: centerX - halfWidth, y: centerY },
              direction: { x: -1, y: 0 }, // Outward from left edge (left)
            };
          }
        } else {
          // For target task: offset by arrow length so line stops before box
          if (dx < 0) {
            // Source is to the left of target - connect to left edge, offset outward by arrow length
            return {
              point: { x: centerX - halfWidth - arrowLength, y: centerY },
              direction: { x: -1, y: 0 }, // Inward to left edge (left)
            };
          } else {
            // Source is to the right of target - connect to right edge, offset outward by arrow length
            return {
              point: { x: centerX + halfWidth + arrowLength, y: centerY },
              direction: { x: 1, y: 0 }, // Inward to right edge (right)
            };
          }
        }
      }
    },
    [zoom],
  );

  // Calculate dependency paths for SVG rendering with collision avoidance
  const dependencyPaths = useMemo(() => {
    // Helper function to check if a line segment intersects with a task
    const doesLineIntersectTask = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      task: TimelineTask,
      taskCoords: { x: number; y: number },
    ) => {
      const halfWidth = (TASK_NODE_WIDTH * zoom) / 2;
      const halfHeight = (TASK_NODE_HEIGHT * zoom) / 2;

      // Task rectangle bounds
      const left = taskCoords.x - halfWidth;
      const right = taskCoords.x + halfWidth;
      const top = taskCoords.y - halfHeight;
      const bottom = taskCoords.y + halfHeight;

      // Check if line segment intersects with rectangle using line-rectangle intersection
      return lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom);
    };

    // Line-rectangle intersection algorithm
    const lineIntersectsRect = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      left: number,
      top: number,
      right: number,
      bottom: number,
    ) => {
      // Check if either endpoint is inside the rectangle
      if (
        (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
        (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)
      ) {
        return true;
      }

      // Check if line intersects any of the four rectangle edges
      return (
        lineSegmentsIntersect(x1, y1, x2, y2, left, top, right, top) || // top edge
        lineSegmentsIntersect(x1, y1, x2, y2, right, top, right, bottom) || // right edge
        lineSegmentsIntersect(x1, y1, x2, y2, right, bottom, left, bottom) || // bottom edge
        lineSegmentsIntersect(x1, y1, x2, y2, left, bottom, left, top) // left edge
      );
    };

    // Line segment intersection
    const lineSegmentsIntersect = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x3: number,
      y3: number,
      x4: number,
      y4: number,
    ) => {
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denom) < 0.0001) return false;

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };

    return dependencies
      .map((dep, index) => {
        const fromTask = tasks.find((t) => t.id === dep.fromId);
        const toTask = tasks.find((t) => t.id === dep.toId);

        if (!fromTask || !toTask) return null;

        // Get center positions
        const fromCenter = getTaskCoordinates(fromTask);
        const toCenter = getTaskCoordinates(toTask);

        if (!fromCenter || !toCenter) return null;

        // Get all other tasks (not involved in this dependency)
        const otherTasks = tasks.filter((t) => t.id !== dep.fromId && t.id !== dep.toId);

        // Calculate edge intersection points with direction info
        const fromEdgeInfo = getBoxEdgePointWithDirection(
          fromCenter.x,
          fromCenter.y,
          toCenter.x,
          toCenter.y,
          true,
        );
        const toEdgeInfo = getBoxEdgePointWithDirection(
          toCenter.x,
          toCenter.y,
          fromCenter.x,
          fromCenter.y,
          false,
        );

        // Check if direct path would intersect with other tasks
        let needsRouting = false;
        const conflictingTasks: { task: TimelineTask; coords: { x: number; y: number } }[] = [];

        for (const task of otherTasks) {
          const taskCoords = getTaskCoordinates(task);
          if (
            taskCoords &&
            doesLineIntersectTask(
              fromEdgeInfo.point.x,
              fromEdgeInfo.point.y,
              toEdgeInfo.point.x,
              toEdgeInfo.point.y,
              task,
              taskCoords,
            )
          ) {
            needsRouting = true;
            conflictingTasks.push({ task, coords: taskCoords });
          }
        }

        let path: string;

        if (!needsRouting) {
          // Direct path - use original bezier curve
          const controlDistance = Math.max(
            50 * zoom,
            Math.abs(toEdgeInfo.point.x - fromEdgeInfo.point.x) * 0.3,
            Math.abs(toEdgeInfo.point.y - fromEdgeInfo.point.y) * 0.3,
          );

          const curve1X = fromEdgeInfo.point.x + fromEdgeInfo.direction.x * controlDistance;
          const curve1Y = fromEdgeInfo.point.y + fromEdgeInfo.direction.y * controlDistance;
          const curve2X = toEdgeInfo.point.x + toEdgeInfo.direction.x * controlDistance;
          const curve2Y = toEdgeInfo.point.y + toEdgeInfo.direction.y * controlDistance;

          path = `M ${fromEdgeInfo.point.x} ${fromEdgeInfo.point.y} C ${curve1X} ${curve1Y} ${curve2X} ${curve2Y} ${toEdgeInfo.point.x} ${toEdgeInfo.point.y}`;
        } else {
          // Route around conflicting tasks with smooth curves
          const baseControlDistance = Math.max(
            50 * zoom,
            Math.abs(toEdgeInfo.point.x - fromEdgeInfo.point.x) * 0.2,
            Math.abs(toEdgeInfo.point.y - fromEdgeInfo.point.y) * 0.2,
          );

          // Determine routing direction and calculate offset
          const avgConflictX =
            conflictingTasks.reduce((sum, ct) => sum + ct.coords.x, 0) / conflictingTasks.length;
          const routeLeft = fromCenter.x < avgConflictX;
          const routingOffset = Math.max(80 * zoom, (TASK_NODE_WIDTH * zoom) / 2 + 40 * zoom);

          // Calculate avoidance X coordinate
          const avoidanceX = routeLeft
            ? Math.min(...conflictingTasks.map((ct) => ct.coords.x)) - routingOffset
            : Math.max(...conflictingTasks.map((ct) => ct.coords.x)) + routingOffset;

          // First control point: maintain perpendicular exit from source
          const control1X = fromEdgeInfo.point.x + fromEdgeInfo.direction.x * baseControlDistance;
          const control1Y = fromEdgeInfo.point.y + fromEdgeInfo.direction.y * baseControlDistance;

          // Calculate intermediate point for smooth avoidance
          const midY = fromCenter.y + (toCenter.y - fromCenter.y) * 0.5;
          const intermediateX = avoidanceX;
          const intermediateY = midY;

          // Second control point: smooth transition toward intermediate point
          const control2X = avoidanceX;
          const control2Y = fromCenter.y + (midY - fromCenter.y) * 0.7;

          // Third control point: smooth transition from intermediate point
          const control3X = avoidanceX;
          const control3Y = toCenter.y + (midY - toCenter.y) * 0.7;

          // Fourth control point: maintain perpendicular approach to target
          const control4X = toEdgeInfo.point.x + toEdgeInfo.direction.x * baseControlDistance;
          const control4Y = toEdgeInfo.point.y + toEdgeInfo.direction.y * baseControlDistance;

          // Create smooth path with two connected Bezier curves
          path = `M ${fromEdgeInfo.point.x} ${fromEdgeInfo.point.y} 
                  C ${control1X} ${control1Y} ${control2X} ${control2Y} ${intermediateX} ${intermediateY}
                  C ${control3X} ${control3Y} ${control4X} ${control4Y} ${toEdgeInfo.point.x} ${toEdgeInfo.point.y}`;
        }

        return {
          id: `dep-${index}`,
          path,
          fromTask,
          toTask,
          fromX: fromEdgeInfo.point.x,
          fromY: fromEdgeInfo.point.y,
          toX: toEdgeInfo.point.x,
          toY: toEdgeInfo.point.y,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dependencies, tasks, getTaskCoordinates, getBoxEdgePointWithDirection, zoom]);

  // Dependencies and tasks changes are handled automatically by React re-renders

  /* ----------------------- Scroll to Today on Mount ----------------------- */
  useEffect(() => {
    if (containerRef.current && dateRows.length > 0 && !hasScrolledToToday.current) {
      const today = new Date();
      const todayIndex = dateRows.findIndex(
        (row) => row.date.toDateString() === today.toDateString(),
      );

      if (todayIndex >= 0) {
        const scrollTop = todayIndex * rowHeight - containerRef.current.clientHeight / 2;
        containerRef.current.scrollTop = Math.max(0, scrollTop);
        setScrollTop(containerRef.current.scrollTop);
        hasScrolledToToday.current = true;
      }
    }
  }, [dateRows, rowHeight]);

  /* ----------------------- Zoom Handlers ----------------------- */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const container = containerRef.current;
        if (!container) return;

        // Get cursor position relative to the container
        const rect = container.getBoundingClientRect();
        const cursorY = e.clientY - rect.top;

        // Calculate what row the cursor is over (independent of zoom)
        const scrollTop = container.scrollTop;
        const oldRowHeight = BASE_ROW_HEIGHT * zoom;
        const cursorRowIndex = (scrollTop + cursorY) / oldRowHeight;

        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const oldZoom = zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + delta));

        // Only update if zoom actually changes
        if (newZoom !== oldZoom) {
          setZoom(newZoom);

          // Calculate new scroll position to keep the same row under cursor
          // We need to do this after the zoom state updates, so we'll use setTimeout
          setTimeout(() => {
            if (containerRef.current) {
              const newRowHeight = BASE_ROW_HEIGHT * newZoom;
              const newScrollTop = cursorRowIndex * newRowHeight - cursorY;
              containerRef.current.scrollTop = Math.max(0, newScrollTop);
            }
          }, 0);
        }
      }
    },
    [zoom],
  );

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Add wheel event listener with non-passive option
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleWheel, handleScroll]);

  // Track Command/Ctrl key state for cursor styling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsCommandHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsCommandHeld(false);
      }
    };

    const handleWindowBlur = () => {
      setIsCommandHeld(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  /* ----------------------- Drag Handlers ----------------------- */
  const handleTaskMouseDown = useCallback(
    (e: React.MouseEvent, task: TimelineTask) => {
      if (e.button === 0) {
        // Left click
        e.preventDefault();
        e.stopPropagation();

        // Check for Command/Ctrl + click to open modal
        if (e.metaKey || e.ctrlKey) {
          setSelectedTask(task);
          setShowTaskModal(true);
          return; // Don't start drag when opening modal
        }

        // Otherwise start drag
        setDraggedTask(task.id);
        setDraggedTaskPos({ x: e.clientX, y: e.clientY });
      } else if (e.button === 2) {
        // Right click for dependency
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggedTask !== null) {
        // Use viewport coordinates for consistent tracking
        setDraggedTaskPos({ x: e.clientX, y: e.clientY });
      }
    },
    [draggedTask],
  );

  const handleMouseUp = useCallback(() => {
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
  }, [draggedTask, draggedTaskPos, rowHeight, dateRows, onTaskMove]);

  // Handle clicking outside tasks to cancel dependency creation
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // Only cancel dependency creation if we're in connecting mode and didn't click on a task
      if (connectingFrom !== null) {
        const target = e.target as HTMLElement;
        const isTaskElement = target.closest("[data-task-id]");
        if (!isTaskElement) {
          setConnectingFrom(null);
          setDependencyError(null); // Clear error when canceling
        }
      }
    },
    [connectingFrom],
  );

  // Prevent context menu on timeline
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  /* ----------------------- Minimap Calculation ----------------------- */
  const minimapViewport = useMemo(() => {
    if (!containerRef.current || !minimapRef.current || totalHeight === 0)
      return { top: 0, height: 0 };

    const container = containerRef.current;
    const minimap = minimapRef.current;
    const viewportHeight = container.clientHeight;
    const minimapHeight = minimap.clientHeight;

    // Simple calculation: what portion of timeline is visible
    const viewportRatio = viewportHeight / totalHeight;

    // How much can we actually scroll
    const maxScroll = Math.max(0, totalHeight - viewportHeight);

    // Available minimap space (10px padding top and bottom)
    const availableSpace = minimapHeight - 20;

    // Indicator height proportional to what we can see
    const indicatorHeight = Math.max(4, viewportRatio * availableSpace);

    // Available travel distance for the indicator
    const indicatorTravelSpace = availableSpace - indicatorHeight;

    // Position based on scroll ratio, but only within available travel space
    const scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    const indicatorTop = 10 + scrollRatio * indicatorTravelSpace;

    return {
      top: indicatorTop,
      height: indicatorHeight,
    };
  }, [totalHeight, scrollTop]);

  /* ----------------------- Task Dots for Minimap ----------------------- */
  const taskDots = useMemo(() => {
    if (!containerRef.current || !minimapRef.current || totalHeight === 0) return [];

    // Use actual minimap height for dot positioning
    const minimap = minimapRef.current;
    const minimapHeight = minimap.clientHeight;
    const availableHeight = minimapHeight - 20; // Same padding as viewport
    const dots: Array<{ top: number; count: number }> = [];

    dateRows.forEach((row, index) => {
      if (row.tasks.length > 0) {
        const rowPosition = (index * rowHeight) / totalHeight;
        const dotTop = 10 + rowPosition * availableHeight;
        dots.push({ top: dotTop, count: row.tasks.length });
      }
    });

    return dots;
  }, [dateRows, rowHeight, totalHeight]);

  /* ----------------------- Minimap Handlers ----------------------- */
  const handleMinimapMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setMinimapDragging(true);

      if (containerRef.current && minimapRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const viewportHeight = containerRef.current.clientHeight;
        const minimapHeight = minimapRef.current.clientHeight;
        const availableHeight = minimapHeight - 20;
        const scrollRatio = Math.max(0, Math.min(1, (y - 10) / availableHeight));
        const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
        const newScrollTop = scrollRatio * maxScrollTop;

        containerRef.current.scrollTop = Math.max(0, newScrollTop);
        setScrollTop(containerRef.current.scrollTop);
      }
    },
    [totalHeight],
  );

  const handleMinimapMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!minimapDragging || !containerRef.current || !minimapRef.current) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const viewportHeight = containerRef.current.clientHeight;
      const minimapHeight = minimapRef.current.clientHeight;
      const availableHeight = minimapHeight - 20;
      const scrollRatio = Math.max(0, Math.min(1, (y - 10) / availableHeight));
      const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
      const newScrollTop = scrollRatio * maxScrollTop;

      containerRef.current.scrollTop = Math.max(0, newScrollTop);
      setScrollTop(containerRef.current.scrollTop);
    },
    [minimapDragging, totalHeight],
  );

  const handleMinimapMouseUp = useCallback(() => {
    setMinimapDragging(false);
  }, []);

  // Global mouse up handler for minimap
  useEffect(() => {
    if (minimapDragging) {
      const handleGlobalMouseUp = () => setMinimapDragging(false);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [minimapDragging]);

  // Handle window resize to update minimap and container width
  useEffect(() => {
    const handleResize = () => {
      setScrollTop(containerRef.current?.scrollTop || 0);
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track initial container width
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  // Update container width when dependencies or tasks change
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, [tasks, dependencies]);

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (dependencyError) {
      const timer = setTimeout(() => {
        setDependencyError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [dependencyError]);

  // Calculate which row would be the drop target
  const dropTargetRowIndex = useMemo(() => {
    if (draggedTask === null || !draggedTaskPos || !containerRef.current) return -1;

    // Convert viewport coordinates to container coordinates (same as drop logic)
    const rect = containerRef.current.getBoundingClientRect();
    const containerY = draggedTaskPos.y - rect.top;
    const scrollTop = containerRef.current.scrollTop;
    const taskCenterY = containerY + scrollTop;
    const rowIndex = Math.floor(taskCenterY / rowHeight);
    return Math.max(0, Math.min(dateRows.length - 1, rowIndex));
  }, [draggedTask, draggedTaskPos, rowHeight, dateRows]);

  /* ----------------------- Render ----------------------- */
  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#FFFFF8] dark:bg-gray-900 transition-colors duration-200">
      {/* Minimap */}
      <div
        ref={minimapRef}
        className="relative bg-[#FFFFF8] dark:bg-gray-900 cursor-pointer transition-colors duration-200 h-full"
        style={{ width: MINIMAP_WIDTH }}
        onMouseDown={handleMinimapMouseDown}
        onMouseMove={handleMinimapMouseMove}
        onMouseUp={handleMinimapMouseUp}
      >
        {/* Black timeline line */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 bg-black"
          style={{
            width: 2,
            top: 10,
            bottom: 10,
          }}
        ></div>

        {/* Task dots */}
        {taskDots.map((dot, index) => (
          <div
            key={index}
            className="absolute left-1/2 transform -translate-x-1/2 bg-blue-600 rounded-full"
            style={{
              width: Math.min(12, 6 + Math.floor(dot.count * 1.5)),
              height: Math.min(12, 6 + Math.floor(dot.count * 1.5)),
              top: dot.top - Math.min(6, 3 + Math.floor(dot.count * 0.75)),
            }}
            title={`${dot.count} task${dot.count > 1 ? "s" : ""}`}
          />
        ))}

        {/* Current viewport indicator */}
        <div
          className="absolute left-0 right-0 bg-gray-300 border border-gray-400 rounded-sm opacity-80"
          style={{
            top: minimapViewport.top,
            height: minimapViewport.height,
          }}
        >
          <div className="w-full h-full bg-gray-200"></div>
        </div>
      </div>

      {/* Main timeline */}
      <div
        className="relative h-full overflow-y-auto overflow-x-hidden"
        style={{ width: `calc(100vw - ${MINIMAP_WIDTH}px)` }}
        ref={containerRef}
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleTimelineClick}
        onContextMenu={handleContextMenu}
      >
        {/* React Flow for dependency arrows */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: totalHeight,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${containerWidth} ${totalHeight}`}
            preserveAspectRatio="none"
          >
            {/* Arrow marker definitions */}
            <defs>
              {/* Normal dependency arrow */}
              <marker
                id="arrow-marker"
                viewBox="0 0 10 10"
                refX="3"
                refY="3"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L0,6 L9,3 z" fill={isDark ? "#9CA3AF" : "#6B7280"} />
              </marker>

              {/* Critical path arrow */}
              <marker
                id="critical-arrow-marker"
                viewBox="0 0 10 10"
                refX="3"
                refY="3"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="#D97706" />
              </marker>
            </defs>

            {/* Dependency arrows */}
            {dependencyPaths.map((dep) => {
              // Check if both tasks are on critical path
              const isCriticalPath = dep!.fromTask.isOnCriticalPath && dep!.toTask.isOnCriticalPath;

              return (
                <g key={dep!.id}>
                  <path
                    d={dep!.path}
                    stroke={isCriticalPath ? "#D97706" : isDark ? "#9CA3AF" : "#6B7280"}
                    strokeWidth={isCriticalPath ? "3" : "2"}
                    fill="none"
                    markerEnd={
                      isCriticalPath ? "url(#critical-arrow-marker)" : "url(#arrow-marker)"
                    }
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Date rows */}
        <div
          style={{
            height: totalHeight,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {dateRows.map((row, index) => {
            const today = formatDate(new Date());
            const isToday = row.dateStr === today;

            return (
              <div
                key={row.dateStr}
                className={`relative flex items-center transition-colors duration-200 ${
                  isToday
                    ? "border-t-2 border-b-2 border-t-blue-600 border-b-blue-600 dark:border-t-blue-400 dark:border-b-blue-400"
                    : "border-b border-gray-200 dark:border-gray-700"
                } ${
                  draggedTask !== null && dropTargetRowIndex === index
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600"
                    : ""
                }`}
                style={{
                  height: rowHeight,
                  marginLeft: MINIMAP_WIDTH,
                  marginRight: "32px",
                  width: `calc(100% - ${MINIMAP_WIDTH}px - 32px)`,
                }}
              >
                {/* Date label */}
                <div
                  className={`absolute left-4 top-2 text-sm font-medium transition-colors duration-200 ${
                    isToday
                      ? "text-blue-900 dark:text-blue-900"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {row.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>

                {/* Tasks in this row */}
                {row.tasks.map((task) => (
                  <div
                    ref={(el) => {
                      if (el) taskRefs.current.set(task.id, el);
                      else taskRefs.current.delete(task.id);
                    }}
                    key={task.id}
                    data-task-id={task.id}
                    className={`absolute bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 rounded px-2 py-1 select-none text-xs transition-colors duration-200 flex items-center justify-center ${
                      isCommandHeld ? "cursor-pointer" : "cursor-move"
                    } ${
                      draggedTask === task.id
                        ? "opacity-80 shadow-lg bg-blue-200 dark:bg-blue-700 border-blue-400 dark:border-blue-500"
                        : ""
                    } ${connectingFrom === task.id ? "ring-2 ring-orange-400" : ""}`}
                    style={{
                      left:
                        draggedTask === task.id && draggedTaskPos
                          ? draggedTaskPos.x - (taskNodeWidth * 0.9) / 2
                          : getTaskCoordinates(task)!.x - MINIMAP_WIDTH - taskNodeWidth / 2,
                      top:
                        draggedTask === task.id && draggedTaskPos
                          ? draggedTaskPos.y - (taskNodeHeight * 0.9) / 2
                          : (rowHeight - taskNodeHeight) / 2,
                      width: draggedTask === task.id ? taskNodeWidth * 0.9 : taskNodeWidth,
                      height: draggedTask === task.id ? taskNodeHeight * 0.9 : taskNodeHeight,
                      zIndex: draggedTask === task.id ? 1000 : 1,
                      pointerEvents: draggedTask === task.id ? "none" : "auto",
                      transform: "none",
                      transition: draggedTask === task.id ? "none" : "all 0.2s ease",
                      position: draggedTask === task.id ? "fixed" : "absolute",
                    }}
                    onMouseDown={(e) => handleTaskMouseDown(e, task)}
                  >
                    <div
                      className={`font-medium text-center leading-tight truncate ${
                        task.done
                          ? "line-through text-gray-500 dark:text-gray-500"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {task.title}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions and Error Messages */}
      {dependencyError ? (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded px-4 py-2 text-sm text-red-800 dark:text-red-200">
          {dependencyError}
        </div>
      ) : connectingFrom ? (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded px-4 py-2 text-sm text-orange-800 dark:text-orange-200">
          Right-click another task to create dependency
        </div>
      ) : null}

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onTaskUpdate={onTaskUpdate}
          onTaskDelete={onTaskDelete}
          onDependencyUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
}
