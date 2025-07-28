"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import CustomCalendar from "../components/CustomCalendar";
import TaskModal from "../components/TaskModal";
import { Todo } from "../../types";
import { CONFIG } from "../../lib/config";

export default function TaskListPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sortKey, setSortKey] = useState<
    "title" | "dueDate" | "duration" | "earliestStartDate" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Add-task form state
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDuration, setNewDuration] = useState(CONFIG.DEFAULT_TASK_DURATION.toString());

  // Dependency management state
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedDependency, setSelectedDependency] = useState<number | null>(null);
  const [showDependencies, setShowDependencies] = useState(false);

  // Modal state
  const [selectedTodoForModal, setSelectedTodoForModal] = useState<Todo | null>(null);

  // Flag indicating whether any images are still being fetched
  const hasPendingImages = useMemo(() => todos.some((t) => t.imageUrl === undefined), [todos]);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();

      setTodos((prev) => {
        const mapped: Todo[] = data.map((t: Todo) => {
          const prevTodo = prev.find((p) => p.id === t.id);
          if (!prevTodo && t.imageUrl === null) {
            return { ...t, imageUrl: undefined };
          }
          return t;
        });
        return mapped;
      });
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Polling while images pending
  useEffect(() => {
    if (!hasPendingImages) return;
    const id = setInterval(fetchTodos, CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasPendingImages, fetchTodos]);

  // Update selectedTodoForModal when todos change (to reflect image loading)
  useEffect(() => {
    if (selectedTodoForModal) {
      const updatedTodo = todos.find((todo) => todo.id === selectedTodoForModal.id);
      if (updatedTodo) {
        setSelectedTodoForModal(updatedTodo);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, selectedTodoForModal?.id]);

  // Handle column header clicks for sorting
  const handleSort = (key: "title" | "dueDate" | "duration" | "earliestStartDate") => {
    if (sortKey === key) {
      // Toggle order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default order
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Add new todo
  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodo,
          dueDate: newDueDate || null,
          duration: parseInt(newDuration) || 1,
        }),
      });
      setNewTodo("");
      setNewDueDate("");
      setNewDuration(CONFIG.DEFAULT_TASK_DURATION.toString());
      fetchTodos();
    } catch (error) {
      console.error("Failed to add todo:", error);
    }
  };

  // Add dependency
  const handleAddDependency = async () => {
    if (!selectedTask || !selectedDependency) return;
    try {
      const res = await fetch("/api/todos/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask, dependsOnId: selectedDependency }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error);
        return;
      }
      setSelectedTask(null);
      setSelectedDependency(null);
      fetchTodos();
    } catch (error) {
      console.error("Failed to add dependency:", error);
    }
  };

  // Sorting logic
  const sortedTodos = useMemo(() => {
    const sortArr = [...todos];

    // Primary grouping: uncompleted tasks first, then completed tasks
    sortArr.sort((a, b) => {
      const aDone = a.done || false;
      const bDone = b.done || false;

      // If completion status is different, uncompleted comes first
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }

      // Within the same completion group, apply secondary sorting
      if (sortKey === "title") {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        const diff = titleA.localeCompare(titleB);
        return sortOrder === "asc" ? diff : -diff;
      } else if (sortKey === "duration") {
        return sortOrder === "asc" ? a.duration - b.duration : b.duration - a.duration;
      } else if (sortKey === "earliestStartDate") {
        if (!a.earliestStartDate && !b.earliestStartDate) return 0;
        if (!a.earliestStartDate) return 1;
        if (!b.earliestStartDate) return -1;
        const diff =
          new Date(a.earliestStartDate).getTime() - new Date(b.earliestStartDate).getTime();
        return sortOrder === "asc" ? diff : -diff;
      } else {
        // Default sorting by due date (or when sortKey is "dueDate" or null)
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return sortKey === "dueDate" ? (sortOrder === "asc" ? diff : -diff) : diff; // Always ascending for default
      }
    });

    return sortArr;
  }, [todos, sortKey, sortOrder]);

  const isOverdue = (dueDate?: string | null, done?: boolean) => {
    if (!dueDate || done) return false;
    return new Date(dueDate) < new Date();
  };

  // Count overdue tasks (excluding completed ones)
  const overdueCount = useMemo(() => {
    return todos.filter((todo) => isOverdue(todo.dueDate, todo.done)).length;
  }, [todos]);

  // Count uncompleted tasks
  const todoCount = useMemo(() => {
    return todos.filter((todo) => !todo.done).length;
  }, [todos]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
      fetchTodos();
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFF8] dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* Add Todo Form */}
        <div className="rounded-lg p-6">
          <h2 className="text-2xl mb-4 text-gray-800 dark:text-gray-200 transition-colors duration-200">
            Add New Task
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                Task Title
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-[#FFFFF8] dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                placeholder="Enter task title..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                Due Date
              </label>
              <CustomCalendar
                value={newDueDate}
                onChange={(date) => setNewDueDate(date)}
                className="w-full p-3"
                openDirection="down"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                Duration (days)
              </label>
              <input
                type="number"
                min="1"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-[#FFFFF8] dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleAddTodo}
            className="border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-green-900 dark:hover:bg-blue-700 hover:text-white hover:border-green-900 dark:hover:border-blue-700 rounded-lg mt-4 px-6 py-3 transition-colors duration-200"
          >
            Add Task
          </button>
        </div>

        {/* Dependency Management */}
        <div className="bg-transparent rounded-lg p-6 mb-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl text-gray-800 dark:text-gray-200 transition-colors duration-200">
              Dependency Management
            </h2>
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-green-900 dark:hover:bg-blue-700 hover:text-white hover:border-green-900 dark:hover:border-blue-700 rounded-lg px-4 py-2 transition-colors duration-200"
            >
              {showDependencies ? "Hide" : "Show"} Dependency Management
            </button>
          </div>

          {showDependencies && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                  Task
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                  value={selectedTask || ""}
                  onChange={(e) => setSelectedTask(parseInt(e.target.value) || null)}
                >
                  <option value="">Select a task...</option>
                  {todos.map((todo) => (
                    <option key={todo.id} value={todo.id}>
                      {todo.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
                  Depends On
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                  value={selectedDependency || ""}
                  onChange={(e) => setSelectedDependency(parseInt(e.target.value) || null)}
                >
                  <option value="">Select dependency...</option>
                  {todos
                    .filter((todo) => todo.id !== selectedTask)
                    .map((todo) => (
                      <option key={todo.id} value={todo.id}>
                        {todo.title}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddDependency}
                  disabled={!selectedTask || !selectedDependency}
                  className="border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-green-900 dark:hover:bg-blue-700 hover:text-white hover:border-green-900 dark:hover:border-blue-700 disabled:bg-gray-400 disabled:text-white disabled:cursor-not-allowed disabled:border-gray-400 rounded-lg w-full px-4 py-3 transition-colors duration-200"
                >
                  Add Dependency
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-transparent rounded-lg p-4">
          {sortedTodos.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-base transition-colors duration-200">
                No tasks available.
              </p>
            </div>
          )}

          {/* Compact Table View */}
          <div className="border border-black dark:border-black rounded-lg overflow-hidden max-h-[calc(15*2.5rem)] overflow-y-auto mb-6">
            {/* Header */}
            <div className="bg-gray-100 dark:bg-gray-800 border-b border-black dark:border-black p-2 grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="col-span-1"></div> {/* Icon */}
              <div
                className="col-span-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-1 py-1 rounded transition-colors flex items-center gap-1"
                onClick={() => handleSort("title")}
              >
                {sortKey === "title" && (
                  <span className="text-xs">{sortOrder === "asc" ? "▲" : "▼"}</span>
                )}
                Task ({todoCount} todo) ({todos.length} total)
              </div>
              <div
                className="col-span-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-1 py-1 rounded transition-colors flex items-center gap-1"
                onClick={() => handleSort("dueDate")}
              >
                {sortKey === "dueDate" && (
                  <span className="text-xs">{sortOrder === "asc" ? "▲" : "▼"}</span>
                )}
                Due Date
                {overdueCount > 0 && (
                  <span className="text-red-600 dark:text-red-400 ml-1">
                    ({overdueCount} overdue)
                  </span>
                )}
              </div>
              <div
                className="col-span-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-1 py-1 rounded transition-colors flex items-center gap-1"
                onClick={() => handleSort("duration")}
              >
                {sortKey === "duration" && (
                  <span className="text-xs">{sortOrder === "asc" ? "▲" : "▼"}</span>
                )}
                Duration
              </div>
              <div
                className="col-span-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-1 py-1 rounded transition-colors flex items-center gap-1"
                onClick={() => handleSort("earliestStartDate")}
              >
                {sortKey === "earliestStartDate" && (
                  <span className="text-xs">{sortOrder === "asc" ? "▲" : "▼"}</span>
                )}
                Earliest Start
              </div>
              <div className="col-span-1 px-1 py-1">Dependencies</div>
            </div>

            {/* Task Rows */}
            {sortedTodos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => setSelectedTodoForModal(todo)}
                className={`p-2 border-b border-gray-200 dark:border-gray-700 grid grid-cols-12 gap-2 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${
                  todo.isOnCriticalPath
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-[#FFFFF8] dark:bg-gray-900"
                }`}
              >
                {/* Small Icon */}
                <div className="col-span-1">
                  {todo.imageUrl === undefined && (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent border-r-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {todo.imageUrl === null && (
                    <div className="w-6 h-6 rounded border border-black dark:border-black bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-xs text-gray-400">?</span>
                    </div>
                  )}
                  {todo.imageUrl && (
                    <Image
                      src={todo.imageUrl}
                      alt={todo.title}
                      width={24}
                      height={24}
                      className="w-6 h-6 object-cover rounded border border-black dark:border-black"
                    />
                  )}
                </div>

                {/* Task Title */}
                <div className="col-span-4">
                  <div className="flex items-center gap-2 min-h-[1.5rem]">
                    <span
                      className={`text-sm truncate ${
                        todo.done
                          ? "text-gray-500 dark:text-gray-500 line-through"
                          : isOverdue(todo.dueDate, todo.done)
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {todo.title}
                    </span>
                    {todo.isOnCriticalPath && !todo.done && (
                      <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs flex-shrink-0">
                        CRITICAL
                      </span>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="col-span-2">
                  <div className="flex items-center min-h-[1.5rem]">
                    <span
                      className={`text-sm w-24 ${
                        todo.done
                          ? "text-gray-500 dark:text-gray-500 line-through"
                          : isOverdue(todo.dueDate, todo.done)
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {todo.dueDate ? formatDate(todo.dueDate) : "No due date"}
                    </span>
                    <div className="flex-1 flex justify-start">
                      {isOverdue(todo.dueDate, todo.done) && (
                        <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs whitespace-nowrap">
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="col-span-1">
                  <span
                    className={`text-sm ${
                      todo.done
                        ? "text-gray-500 dark:text-gray-500 line-through"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {todo.duration}d
                  </span>
                </div>

                {/* Earliest Start */}
                <div className="col-span-2">
                  <span
                    className={`text-sm ${
                      todo.done
                        ? "text-gray-500 dark:text-gray-500 line-through"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {todo.earliestStartDate ? formatDate(todo.earliestStartDate) : "N/A"}
                  </span>
                </div>

                {/* Status/Dependencies */}
                <div className="col-span-2">
                  {todo.dependencies.length > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1 py-0.5 rounded">
                      {todo.dependencies.length} deps
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Details Modal */}
        {selectedTodoForModal && (
          <TaskModal
            task={selectedTodoForModal}
            isOpen={!!selectedTodoForModal}
            onClose={() => setSelectedTodoForModal(null)}
            onTaskUpdate={fetchTodos}
            onTaskDelete={(id: number) => {
              handleDeleteTodo(id);
              setSelectedTodoForModal(null);
            }}
            onDependencyUpdate={fetchTodos}
          />
        )}
      </div>
    </div>
  );
}
