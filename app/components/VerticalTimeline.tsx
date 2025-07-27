"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

interface Task {
  id: number;
  title: string;
  dueDate: string; // YYYY-MM-DD
}

interface Dependency {
  fromId: number;
  toId: number;
}

interface VerticalTimelineProps {
  tasks: Task[];
  dependencies: Dependency[];
  onTaskMove: (taskId: number, newDate: string) => void;
  onCreateDependency: (fromId: number, toId: number) => void;
}

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
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getDaysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------*/
export default function VerticalTimeline({
  tasks,
  dependencies,
  onTaskMove,
  onCreateDependency,
}: VerticalTimelineProps) {
  const [zoom, setZoom] = useState(1.0);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [draggedTaskPos, setDraggedTaskPos] = useState<{ x: number; y: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [minimapDragging, setMinimapDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hasScrolledToToday = useRef(false);

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

    const dates = tasks.map(t => parseDate(t.dueDate));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 7);
    
    const rows: Array<{ date: Date; dateStr: string; tasks: Task[] }> = [];
    let current = new Date(start);
    
    while (current <= end) {
      const dateStr = formatDate(current);
      const dayTasks = tasks.filter(t => t.dueDate === dateStr);
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

  /* ----------------------- Layout Calculations ----------------------- */
  const rowHeight = BASE_ROW_HEIGHT * zoom;
  const totalHeight = dateRows.length * rowHeight;
  const taskNodeWidth = TASK_NODE_WIDTH * zoom;
  const taskNodeHeight = TASK_NODE_HEIGHT * zoom;

  // Unified coordinate calculation - same logic for both HTML positioning and SVG paths
  const getTaskCoordinates = useCallback((task: Task) => {
    const row = dateRows.find(row => row.tasks.some(t => t.id === task.id));
    if (!row) return null;
    
    const rowIndex = dateRows.indexOf(row);
    const taskIndex = row.tasks.findIndex(t => t.id === task.id);
    
    // Calculate available width (same as used in HTML positioning)
    const containerWidth = containerRef.current?.clientWidth || 800;
    const availableWidth = containerWidth - MINIMAP_WIDTH - 32;
    
    // Calculate task X position within the row
    let taskX: number;
    if (row.tasks.length === 1) {
      taskX = availableWidth / 2;
    } else {
      const spacing = availableWidth / (row.tasks.length + 1);
      taskX = spacing * (taskIndex + 1);
    }
    
    // Calculate absolute coordinates
    const absoluteX = MINIMAP_WIDTH + taskX;
    const absoluteY = rowIndex * rowHeight + (rowHeight / 2);
    
    return { x: absoluteX, y: absoluteY };
  }, [dateRows, rowHeight, taskNodeWidth, MINIMAP_WIDTH]);

  // Calculate dependency paths for SVG rendering
  const dependencyPaths = useMemo(() => {
    return dependencies.map((dep, index) => {
      const fromTask = tasks.find(t => t.id === dep.fromId);
      const toTask = tasks.find(t => t.id === dep.toId);
      
      if (!fromTask || !toTask) return null;

      // Get actual DOM positions
      const fromPos = getTaskCoordinates(fromTask);
      const toPos = getTaskCoordinates(toTask);
      
      if (!fromPos || !toPos) return null;

      // Calculate natural curve based on task relationship
      const deltaY = toPos.y - fromPos.y;
      const deltaX = toPos.x - fromPos.x;
      // Simple, natural curve that always flows forward
      // Control points create a gentle arc in the direction of flow
      const midX = fromPos.x + deltaX * 0.5;
      const midY = fromPos.y + deltaY * 0.5;
      
      // Offset control points to create gentle curve
      const curve1X = fromPos.x + deltaX * 0.25;
      const curve1Y = fromPos.y + deltaY * 0.1;
      const curve2X = fromPos.x + deltaX * 0.75;
      const curve2Y = fromPos.y + deltaY * 0.9;
      
      const path = `M ${fromPos.x} ${fromPos.y} C ${curve1X} ${curve1Y} ${curve2X} ${curve2Y} ${toPos.x} ${toPos.y}`;
      
      return {
        id: `dep-${index}`,
        path,
        fromTask,
        toTask,
        fromX: fromPos.x,
        fromY: fromPos.y,
        toX: toPos.x,
        toY: toPos.y
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dependencies, tasks, getTaskCoordinates, forceUpdate]);

  // Force dependency path updates when tasks or dependencies change
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [tasks, dependencies]);

  // Smooth updates using requestAnimationFrame for DOM changes
  useEffect(() => {
    const update = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    const rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [tasks]);

  /* ----------------------- Scroll to Today on Mount ----------------------- */
  useEffect(() => {
    if (containerRef.current && dateRows.length > 0 && !hasScrolledToToday.current) {
      const today = new Date();
      const todayIndex = dateRows.findIndex(row => 
        row.date.toDateString() === today.toDateString()
      );
      
      if (todayIndex >= 0) {
        const scrollTop = todayIndex * rowHeight - (containerRef.current.clientHeight / 2);
        containerRef.current.scrollTop = Math.max(0, scrollTop);
        setScrollTop(containerRef.current.scrollTop);
        hasScrolledToToday.current = true;
      }
    }
  }, [dateRows, rowHeight]);

  /* ----------------------- Zoom Handlers ----------------------- */
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
      // Force dependency paths to recalculate on scroll
      setForceUpdate(prev => prev + 1);
    }
  }, []);

  // Add wheel event listener with non-passive option
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleWheel, handleScroll]);

  /* ----------------------- Drag Handlers ----------------------- */
  const handleTaskMouseDown = useCallback((e: React.MouseEvent, task: Task) => {
    if (e.button === 0) { // Left click for drag
      e.preventDefault();
      e.stopPropagation();
      
      setDraggedTask(task.id);
      
      // Set initial drag position to current mouse position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setDraggedTaskPos({ x: mouseX, y: mouseY });
      }
    } else if (e.button === 2) { // Right click for dependency
      e.preventDefault();
      console.log('Right click on task:', task.id, 'connectingFrom:', connectingFrom);
      if (connectingFrom === null) {
        setConnectingFrom(task.id);
        console.log('Started connecting from task:', task.id);
      } else if (connectingFrom !== task.id) {
        console.log('Creating dependency from', connectingFrom, 'to', task.id);
        onCreateDependency(connectingFrom, task.id);
        setConnectingFrom(null);
      }
    }
  }, [connectingFrom, onCreateDependency]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedTask !== null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      setDraggedTaskPos({ x: mouseX, y: mouseY });
    }
  }, [draggedTask]);

  const handleMouseUp = useCallback(() => {
    if (draggedTask !== null && containerRef.current) {
      // Calculate which row the task was dropped in based on mouse position
      const scrollTop = containerRef.current.scrollTop;
      const dropY = (draggedTaskPos?.y || 0) + scrollTop;
      const dropRowIndex = Math.floor(dropY / rowHeight);
      const clampedRowIndex = Math.max(0, Math.min(dateRows.length - 1, dropRowIndex));
      
      const targetDate = dateRows[clampedRowIndex]?.dateStr;
      if (targetDate) {
        onTaskMove(draggedTask, targetDate);
        // Trigger immediate dependency path update after task move
        requestAnimationFrame(() => {
          setForceUpdate(prev => prev + 1);
        });
      }
    }

    setDraggedTask(null);
    setDraggedTaskPos(null);
  }, [draggedTask, draggedTaskPos, rowHeight, dateRows, onTaskMove]);

  /* ----------------------- Minimap Calculation ----------------------- */
  const minimapViewport = useMemo(() => {
    if (!containerRef.current || totalHeight === 0) return { top: 0, height: 0 };
    
    const container = containerRef.current;
    const viewportHeight = container.clientHeight;
    
    const minimapHeight = container.clientHeight - 20; // Some padding
    const viewportRatio = viewportHeight / totalHeight;
    const scrollRatio = scrollTop / totalHeight;
    
    return {
      top: 10 + scrollRatio * minimapHeight,
      height: Math.max(4, viewportRatio * minimapHeight),
    };
  }, [totalHeight, scrollTop, zoom]);

  /* ----------------------- Task Dots for Minimap ----------------------- */
  const taskDots = useMemo(() => {
    if (!containerRef.current || totalHeight === 0) return [];
    
    const container = containerRef.current;
    const minimapHeight = container.clientHeight - 20;
    const dots: Array<{ top: number; count: number }> = [];
    
    dateRows.forEach((row, index) => {
      if (row.tasks.length > 0) {
        const rowPosition = (index * rowHeight) / totalHeight;
        const dotTop = 10 + rowPosition * minimapHeight;
        dots.push({ top: dotTop, count: row.tasks.length });
      }
    });
    
    return dots;
  }, [dateRows, rowHeight, totalHeight]);

  /* ----------------------- Minimap Handlers ----------------------- */
  const handleMinimapMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMinimapDragging(true);
    
    if (containerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minimapHeight = containerRef.current.clientHeight - 20;
      const scrollRatio = Math.max(0, Math.min(1, (y - 10) / minimapHeight));
      const newScrollTop = scrollRatio * (totalHeight - containerRef.current.clientHeight);
      
      containerRef.current.scrollTop = Math.max(0, newScrollTop);
      setScrollTop(containerRef.current.scrollTop);
    }
  }, [totalHeight]);

  const handleMinimapMouseMove = useCallback((e: React.MouseEvent) => {
    if (!minimapDragging || !containerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minimapHeight = containerRef.current.clientHeight - 20;
    const scrollRatio = Math.max(0, Math.min(1, (y - 10) / minimapHeight));
    const newScrollTop = scrollRatio * (totalHeight - containerRef.current.clientHeight);
    
    containerRef.current.scrollTop = Math.max(0, newScrollTop);
    setScrollTop(containerRef.current.scrollTop);
  }, [minimapDragging, totalHeight]);

  const handleMinimapMouseUp = useCallback(() => {
    setMinimapDragging(false);
  }, []);

  // Global mouse up handler for minimap
  useEffect(() => {
    if (minimapDragging) {
      const handleGlobalMouseUp = () => setMinimapDragging(false);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [minimapDragging]);

  // Handle window resize to update minimap
  useEffect(() => {
    const handleResize = () => {
      setScrollTop(containerRef.current?.scrollTop || 0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate which row would be the drop target
  const dropTargetRowIndex = useMemo(() => {
    if (draggedTask === null || !draggedTaskPos || !containerRef.current) return -1;
    
    const scrollTop = containerRef.current.scrollTop;
    const dropY = draggedTaskPos.y + scrollTop;
    const rowIndex = Math.floor(dropY / rowHeight);
    return Math.max(0, Math.min(dateRows.length - 1, rowIndex));
  }, [draggedTask, draggedTaskPos, rowHeight, dateRows]);

  /* ----------------------- Render ----------------------- */
  return (
    <div className="flex h-screen bg-[#FFFFF8]">
      {/* Minimap */}
      <div 
        className="relative bg-[#FFFFF8] cursor-pointer" 
        style={{ width: MINIMAP_WIDTH }}
        onMouseDown={handleMinimapMouseDown}
        onMouseMove={handleMinimapMouseMove}
        onMouseUp={handleMinimapMouseUp}
      >
        {/* Black timeline line */}
        <div className="absolute left-1/2 transform -translate-x-1/2 bg-black" style={{ 
          width: 2, 
          top: 10, 
          bottom: 10 
        }}></div>
        
        {/* Task dots */}
        {taskDots.map((dot, index) => (
          <div
            key={index}
            className="absolute left-1/2 transform -translate-x-1/2 bg-blue-600 rounded-full"
            style={{
              width: Math.min(8, 4 + dot.count),
              height: Math.min(8, 4 + dot.count),
              top: dot.top - Math.min(4, 2 + dot.count / 2),
            }}
            title={`${dot.count} task${dot.count > 1 ? 's' : ''}`}
          />
        ))}
        
        {/* Current viewport indicator */}
        <div className="absolute left-0 right-0 bg-gray-300 border border-gray-400 rounded-sm opacity-80" style={{
          top: minimapViewport.top,
          height: Math.max(4, minimapViewport.height),
        }}>
          <div
            className="w-full h-full bg-gray-200"
          ></div>
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
      >
        {/* React Flow for dependency arrows */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{ 
            left: 0,
            top: 0,
            width: '100%',
            height: totalHeight
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${containerRef.current?.clientWidth || 800} ${totalHeight}`}
            preserveAspectRatio="none"
          >
            {/* Arrow marker definition */}
            <defs>
              <marker 
                id="arrow-marker" 
                viewBox="0 0 10 10" 
                refX="9" 
                refY="3" 
                markerWidth="6" 
                markerHeight="6" 
                orient="auto"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="#6b7280"/>
              </marker>
            </defs>

            {/* Dependency arrows */}
            {dependencyPaths.map((dep, index) => (
              <g key={dep!.id}>
                <path
                  d={dep!.path}
                  stroke="#6b7280"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrow-marker)"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Date rows */}
        <div style={{ 
          height: totalHeight, 
          width: '100%',
          maxWidth: '100%'
        }}>
          {dateRows.map((row, index) => (
            <div
              key={row.dateStr}
              className={`border-b border-gray-200 relative flex items-center ${
                draggedTask !== null && dropTargetRowIndex === index
                  ? "bg-blue-50 border-blue-300" 
                  : ""
              }`}
              style={{ 
                height: rowHeight,
                marginLeft: MINIMAP_WIDTH,
                marginRight: '32px',
                width: `calc(100% - ${MINIMAP_WIDTH}px - 32px)`
              }}
            >
              {/* Date label */}
              <div className="absolute left-4 top-2 text-sm text-gray-600 font-medium">
                {row.date.toLocaleDateString("en-US", { 
                  weekday: "short", 
                  month: "short", 
                  day: "numeric" 
                })}
              </div>

              {/* Tasks in this row */}
              {row.tasks.map((task, taskIndex) => (
                <div
                  ref={(el) => {
                    if (el) taskRefs.current.set(task.id, el);
                    else taskRefs.current.delete(task.id);
                  }}
                  key={task.id}
                  className={`absolute bg-blue-100 border border-blue-300 rounded px-2 py-1 cursor-move select-none text-xs ${
                    draggedTask === task.id ? "opacity-80 shadow-lg bg-blue-200 border-blue-400" : ""
                  } ${connectingFrom === task.id ? "ring-2 ring-orange-400" : ""}`}
                  style={{
                    left: draggedTask === task.id && draggedTaskPos ? 
                      draggedTaskPos.x - (taskNodeWidth * 0.9) / 2 : 
                      getTaskCoordinates(task)!.x - (taskNodeWidth / 2),
                    top: draggedTask === task.id && draggedTaskPos ? 
                      draggedTaskPos.y - (taskNodeHeight * 0.9) / 2 : 
                      (rowHeight - taskNodeHeight) / 2,
                    width: draggedTask === task.id ? taskNodeWidth * 0.9 : taskNodeWidth,
                    height: draggedTask === task.id ? taskNodeHeight * 0.9 : taskNodeHeight,
                    zIndex: draggedTask === task.id ? 1000 : 1,
                    pointerEvents: draggedTask === task.id ? 'none' : 'auto',
                    transform: 'none',
                    transition: draggedTask === task.id ? 'none' : 'all 0.2s ease',
                  }}
                  onMouseDown={(e) => handleTaskMouseDown(e, task)}
                >
                  <div className="truncate font-medium">{task.title}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP))}
          className="btn-primary px-3 py-1 text-sm"
        >
          +
        </button>
        <div className="text-xs text-center text-gray-600">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP))}
          className="btn-primary px-3 py-1 text-sm"
        >
          −
        </button>
      </div>

      {/* Instructions */}
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-orange-100 border border-orange-300 rounded px-4 py-2 text-sm">
          Right-click another task to create dependency
        </div>
      )}
    </div>
  );
} 