"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import CustomCalendar from "./CustomCalendar";
import { TaskModalProps } from "../../types";

export default function TaskModal({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
  onTaskDelete,
  onDependencyUpdate,
}: TaskModalProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [localDone, setLocalDone] = useState(false);
  const [localDependencies, setLocalDependencies] = useState<
    { dependsOn: { id: number; title: string } }[]
  >([]);

  // Update local state when task prop changes
  useEffect(() => {
    if (task) {
      setLocalDone(task.done || false);
      setLocalDependencies(task.dependencies || []);
    }
  }, [task]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const isOverdue = (dueDate?: string | null) => {
    if (!dueDate || localDone) return false; // Use localDone for immediate feedback
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    // Use UTC methods to extract date components to preserve the intended date
    const utcDate = new Date(dateString);

    // Create a new date in local timezone using the UTC date components
    // This ensures we display the same date that was intended to be stored
    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth();
    const day = utcDate.getUTCDate();

    const localDisplayDate = new Date(year, month, day);

    return localDisplayDate.toLocaleDateString(navigator.language, {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  /*
   * Date Handling Strategy:
   * - Database stores all dates in UTC
   * - Display converts UTC to browser's local timezone for viewing
   * - Editing converts UTC to local date strings (YYYY-MM-DD) using browser timezone
   * - Saving converts local date strings back to UTC using browser timezone before API call
   * - This ensures consistent timezone handling using the browser's actual timezone
   */

  // Convert UTC date string to local date string for editing (YYYY-MM-DD)
  // Uses the browser's actual timezone for conversion
  const utcToLocalDateString = (utcDateString: string): string => {
    try {
      const utcDate = new Date(utcDateString);
      if (isNaN(utcDate.getTime())) {
        throw new Error("Invalid date string");
      }

      // Use UTC methods to extract date components to preserve the date
      // This prevents timezone shifts from changing the actual date
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(utcDate.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error converting UTC to local date string:", error);
      return "";
    }
  };

  // Convert local date string (YYYY-MM-DD) to UTC for database
  // Uses the browser's actual timezone for conversion
  const localDateStringToUTC = (localDateString: string): string => {
    try {
      if (!localDateString || !/^\d{4}-\d{2}-\d{2}$/.test(localDateString)) {
        throw new Error("Invalid local date string format");
      }

      const [year, month, day] = localDateString.split("-").map(Number);

      // Create date directly in UTC to avoid timezone shifts
      // This ensures the date stays the same when stored in the database
      const utcDate = new Date(Date.UTC(year, month - 1, day));

      if (isNaN(utcDate.getTime())) {
        throw new Error("Invalid date values");
      }

      // Already in UTC, just convert to ISO string
      return utcDate.toISOString();
    } catch (error) {
      console.error("Error converting local date string to UTC:", error);
      return new Date().toISOString(); // Fallback to current date
    }
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async (taskId: number, field: string, value: string) => {
    setEditingField(null);
    setEditValue("");

    try {
      // Convert local date string to UTC before sending to API
      const processedValue = field === "dueDate" ? localDateStringToUTC(value) : value;

      const response = await fetch(`/api/todos/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: field === "duration" ? parseInt(value) : processedValue }),
      });

      if (response.ok) {
        onTaskUpdate();
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleToggleDone = async (id: number, currentDone: boolean) => {
    const newDone = !currentDone;

    // Update local state immediately for instant UI feedback
    setLocalDone(newDone);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: newDone }),
      });

      if (response.ok) {
        onTaskUpdate();
      } else {
        // Revert local state if API call failed
        setLocalDone(currentDone);
      }
    } catch (error) {
      console.error("Failed to update todo:", error);
      // Revert local state if API call failed
      setLocalDone(currentDone);
    }
  };

  const handleDeleteDependency = async (taskId: number, dependsOnId: number) => {
    // Update local state immediately for UI feedback
    setLocalDependencies((prev) => prev.filter((dep) => dep.dependsOn.id !== dependsOnId));

    try {
      const response = await fetch("/api/todos/dependencies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, dependsOnId }),
      });

      if (response.ok) {
        onTaskUpdate();
        onDependencyUpdate?.();
      } else {
        // Revert local state if API call failed
        if (task) {
          setLocalDependencies(task.dependencies || []);
        }
        console.error("Failed to delete dependency");
      }
    } catch (error) {
      // Revert local state if API call failed
      if (task) {
        setLocalDependencies(task.dependencies || []);
      }
      console.error("Failed to delete dependency:", error);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFFF8] dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-black dark:border-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          {editingField === "title" ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleSaveEdit(task.id, "title", editValue)}
              onKeyPress={(e) => e.key === "Enter" && handleSaveEdit(task.id, "title", editValue)}
              className="text-2xl font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-gray-100 flex-1 mr-4"
              autoFocus
            />
          ) : (
            <h2
              className={`text-2xl font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors flex-1 ${
                localDone
                  ? "line-through text-gray-500 dark:text-gray-500"
                  : "text-gray-900 dark:text-gray-100"
              }`}
              onDoubleClick={() => startEditing("title", task.title)}
              title="Double-click to edit"
            >
              {task.title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Image */}
          <div className="md:col-span-1">
            {task.imageUrl === undefined && (
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent border-r-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {task.imageUrl === null && (
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                No picture found
              </div>
            )}
            {task.imageUrl && (
              <Image
                src={task.imageUrl}
                alt={task.title}
                width={384}
                height={192}
                className="w-full h-48 object-cover rounded-lg border border-black dark:border-white"
              />
            )}

            {/* Editing hint moved here */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic text-center">
              💡 Double-click any field to edit
            </p>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-4">
            {/* Done Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localDone}
                    onChange={() => {
                      handleToggleDone(task.id, localDone);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 border-2 rounded transition-colors duration-200 flex items-center justify-center ${
                      localDone
                        ? "bg-green-900 border-green-900"
                        : "border-gray-300 dark:border-gray-600 hover:border-green-900"
                    }`}
                  >
                    {localDone && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    {localDone ? "Task completed" : "Mark as done"}
                  </span>
                </label>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              {editingField === "dueDate" ? (
                <div className="w-full">
                  <CustomCalendar
                    value={editValue}
                    onChange={(dateString) => {
                      setEditValue(dateString);
                      handleSaveEdit(task.id, "dueDate", dateString);
                    }}
                    className="w-full p-3"
                    placeholder="Select due date"
                    openDirection="down"
                  />
                </div>
              ) : (
                <div
                  onDoubleClick={() =>
                    startEditing("dueDate", task.dueDate ? utcToLocalDateString(task.dueDate) : "")
                  }
                  className="w-full p-3 bg-[#FFFFF8] dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Double-click to edit"
                >
                  {task.dueDate ? formatDate(task.dueDate) : "No due date set"}
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration
              </label>
              {editingField === "duration" ? (
                <input
                  type="number"
                  min="1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveEdit(task.id, "duration", editValue)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleSaveEdit(task.id, "duration", editValue)
                  }
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <div
                  onDoubleClick={() => startEditing("duration", task.duration.toString())}
                  className="w-full p-3 bg-[#FFFFF8] dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Double-click to edit"
                >
                  {task.duration} days
                </div>
              )}
            </div>

            {/* Earliest Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Earliest Start Date
              </label>
              <div className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400">
                {task.earliestStartDate ? formatDate(task.earliestStartDate) : "N/A"}
              </div>
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created Date
              </label>
              <div className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400">
                {formatDate(task.createdAt)}
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex gap-2">
              {localDone && (
                <span className="bg-green-900 text-white px-3 py-1 rounded-full text-sm">
                  COMPLETED
                </span>
              )}
              {task.isOnCriticalPath && !localDone && (
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                  CRITICAL PATH
                </span>
              )}
              {isOverdue(task.dueDate) && (
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                  OVERDUE
                </span>
              )}
            </div>

            {/* Dependencies */}
            {localDependencies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dependencies
                </label>
                <div className="flex flex-wrap gap-2">
                  {localDependencies.map((dep) => (
                    <div
                      key={dep.dependsOn.id}
                      className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      <span>{dep.dependsOn.title}</span>
                      <button
                        onClick={() => handleDeleteDependency(task!.id, dep.dependsOn.id)}
                        className="hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors"
                        title="Remove dependency"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependent Tasks */}
            {task.dependentTasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Blocks These Tasks
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.dependentTasks.map((dep, index) => (
                    <span
                      key={index}
                      className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded-full text-sm"
                    >
                      {dep.task.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                onClick={() => {
                  onTaskDelete(task.id);
                  onClose();
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Delete Task
              </button>
              <button
                onClick={onClose}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
