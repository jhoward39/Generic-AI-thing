"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import TaskModal from "../TaskModal";
import { TimelineTask, VerticalTimelineProps } from "../../../types";
import { useTimelineLayout } from "./hooks/useTimelineLayout";
import { useTimelineInteractions } from "./hooks/useTimelineInteractions";
import { isSameDay, getToday } from "./utils/dateUtils";
import TimelineHeader from "./components/TimelineHeader";
import TimelineGrid from "./components/TimelineGrid";
import { CONFIG } from "../../../lib/config";

/**
 * Handles task visualization, drag & drop, and dependency management
 */
export default function VerticalTimeline({
  tasks,
  onTaskMove,
  onCreateDependency,
  onTaskUpdate,
  onTaskDelete,
}: VerticalTimelineProps) {
  const { isDark } = useTheme();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hasScrolledToToday = useRef(false);

  // State
  const [zoom, setZoom] = useState(1.0);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);

  // Custom hooks
  const { dateRows, rowHeight, totalHeight, taskNodeWidth, taskNodeHeight } = useTimelineLayout(
    tasks,
    zoom,
  );

  const {
    draggedTask,
    connectingFrom,
    dependencyError,
    handleTaskMouseDown,
    handleTaskMouseMove,
    handleTaskMouseUp,
    handleKeyDown,
    handleKeyUp,
    handleWindowBlur,
  } = useTimelineInteractions({
    tasks,
    onCreateDependency,
    onTaskMove,
    taskRefs,
    containerRef,
    taskNodeWidth,
    taskNodeHeight,
    rowHeight,
    dateRows,
  });

  // Update selectedTask when tasks change (to reflect image loading)
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find((task) => task.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
    // ESLint disabled: Adding selectedTask would cause infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, selectedTask?.id]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      // Resize handling can be added here if needed
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleWindowBlur]);

  // Auto-scroll to today on first load
  useEffect(() => {
    if (!hasScrolledToToday.current && dateRows.length > 0) {
      const today = getToday();
      const todayRow = dateRows.find((row) => isSameDay(row.date, today));

      if (todayRow && containerRef.current) {
        const rowIndex = dateRows.indexOf(todayRow);
        const scrollTo = rowIndex * rowHeight - window.innerHeight / 2;
        containerRef.current.scrollTop = Math.max(0, scrollTo);
        hasScrolledToToday.current = true;
      }
    }
  }, [dateRows, rowHeight]);

  // Event handlers
  const handleScroll = useCallback(() => {
    // Scroll handling can be added here if needed
  }, []);

  const handleTaskClick = useCallback((task: TimelineTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowTaskModal(false);
    setSelectedTask(null);
  }, []);

  const handleTaskUpdate = useCallback(() => {
    onTaskUpdate();
    // Don't close modal - let user see the updates (like image loading)
  }, [onTaskUpdate]);

  const handleTaskDelete = useCallback(
    (id: number) => {
      onTaskDelete(id);
      setShowTaskModal(false);
      setSelectedTask(null);
    },
    [onTaskDelete],
  );

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      // Cancel dependency creation if clicking outside tasks
      if (connectingFrom !== null) {
        const target = e.target as HTMLElement;
        const isTaskElement = target.closest("[data-task-id]");
        if (!isTaskElement) {
          // This would need to be handled by the interactions hook
          // For now, we'll leave this as a TODO for the interactions refactor
        }
      }
    },
    [connectingFrom],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#FFFFF8] dark:bg-gray-900 transition-colors duration-200">
      {/* Header with zoom controls */}
      <TimelineHeader zoom={zoom} onZoomChange={setZoom} isDark={isDark} />

      {/* Main timeline container */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-auto"
        onScroll={handleScroll}
        onMouseMove={handleTaskMouseMove}
        onMouseUp={handleTaskMouseUp}
        onClick={handleTimelineClick}
        onContextMenu={handleContextMenu}
      >
        {/* Timeline grid background */}
        <TimelineGrid
          dateRows={dateRows}
          rowHeight={rowHeight}
          totalHeight={totalHeight}
          isDark={isDark}
        />

        {/* TODO: Add remaining components */}
        {/* - TimelineMinimap */}
        {/* - DependencyLines */}
        {/* - TaskNodes */}

        {/* Dependency error message */}
        {dependencyError && (
          <div
            className={`fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md z-[${CONFIG.Z_INDEX.MODAL}]`}
          >
            {dependencyError}
          </div>
        )}

        {/* Temporary task rendering - will be moved to TaskNodes component */}
        {dateRows.map((row, rowIndex) => (
          <div key={row.dateStr}>
            {row.tasks.map((task, taskIndex) => {
              const isSelected = selectedTask?.id === task.id;
              const isDragged = draggedTask === task.id;
              const isConnecting = connectingFrom === task.id;

              return (
                <div
                  key={task.id}
                  ref={(el) => {
                    if (el) {
                      taskRefs.current.set(task.id, el);
                    } else {
                      taskRefs.current.delete(task.id);
                    }
                  }}
                  data-task-id={task.id}
                  className={`absolute cursor-pointer transition-all duration-200 ${
                    isDragged ? "z-[50] opacity-75 scale-95" : "z-[20]"
                  } ${isConnecting ? "ring-2 ring-blue-500" : ""} ${
                    isSelected ? "ring-2 ring-green-500" : ""
                  }`}
                  style={{
                    left: `${CONFIG.TIMELINE_LEFT_MARGIN + taskIndex * CONFIG.TASK_SPACING}px`,
                    top: `${rowIndex * rowHeight + CONFIG.TASK_VERTICAL_OFFSET}px`,
                    width: taskNodeWidth,
                    height: taskNodeHeight,
                  }}
                  onMouseDown={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                      handleTaskClick(task);
                    } else {
                      handleTaskMouseDown(e, task);
                    }
                  }}
                >
                  <div
                    className={`w-full h-full rounded-lg border-2 p-2 text-xs overflow-hidden ${
                      task.isOnCriticalPath
                        ? "border-orange-500 bg-orange-100 dark:bg-orange-900"
                        : task.done
                          ? "border-green-500 bg-green-100 dark:bg-green-900"
                          : "border-blue-500 bg-blue-100 dark:bg-blue-900"
                    }`}
                  >
                    <div className="font-semibold truncate">{task.title}</div>
                    <div className="text-gray-600 dark:text-gray-300">{task.duration}d</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Task modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          isOpen={showTaskModal}
          onClose={handleCloseModal}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
