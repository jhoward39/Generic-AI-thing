"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "../layout";

interface Todo {
  id: number;
  title: string;
  createdAt: string;
  dueDate?: string;
  duration: number;
  earliestStartDate?: string;
  isOnCriticalPath: boolean;
  imageUrl?: string | null;
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

export default function TaskListPage() {
  const { isDark } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sortKey, setSortKey] = useState<"createdAt" | "dueDate" | "duration">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Add-task form state
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDuration, setNewDuration] = useState("1");

  // Dependency management state
  const [dependencyInfo, setDependencyInfo] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedDependency, setSelectedDependency] = useState<number | null>(null);
  const [showDependencies, setShowDependencies] = useState(false);

  // Flag indicating whether any images are still being fetched
  const hasPendingImages = useMemo(
    () => todos.some((t) => t.imageUrl === undefined),
    [todos],
  );

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();

      setTodos((prev) => {
        const mapped: Todo[] = data.map((t: any) => {
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

  const fetchDependencyInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/todos/dependencies");
      if (res.ok) {
        const data = await res.json();
        setDependencyInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch dependency info:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTodos();
    fetchDependencyInfo();
  }, [fetchTodos]);

  // Polling while images pending
  useEffect(() => {
    if (!hasPendingImages) return;
    const id = setInterval(fetchTodos, 3000);
    return () => clearInterval(id);
  }, [hasPendingImages, fetchTodos]);

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
      setNewDuration("1");
      fetchTodos();
      fetchDependencyInfo();
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
      fetchDependencyInfo();
    } catch (error) {
      console.error("Failed to add dependency:", error);
    }
  };

  // Sorting logic
  const sortedTodos = useMemo(() => {
    const sortArr = [...todos];
    if (sortKey === "dueDate") {
      sortArr.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return sortOrder === "asc" ? diff : -diff;
      });
    } else if (sortKey === "duration") {
      sortArr.sort((a, b) => (sortOrder === "asc" ? a.duration - b.duration : b.duration - a.duration));
    } else {
      // createdAt always newest first regardless of order selection
      sortArr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sortArr;
  }, [todos, sortKey, sortOrder]);

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

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

  const handleRemoveDependency = async (taskId: number, dependsOnId: number) => {
    try {
      await fetch("/api/todos/dependencies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, dependsOnId }),
      });
      fetchTodos();
    } catch (error) {
      console.error("Failed to remove dependency:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFF8] dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <div className="text-center my-8">
          <h1 className="text-4xl text-gray-900 dark:text-gray-100 transition-colors duration-200">Task List</h1>
        </div>

        {/* Add Todo Form */}
        <div className="rounded-lg p-6 mb-8">
          <h2 className="text-2xl mb-4 text-gray-800 dark:text-gray-200 transition-colors duration-200">Add New Task</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">Task Title</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                placeholder="Enter task title..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">Due Date</label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">Duration (days)</label>
              <input
                type="number"
                min="1"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              />
            </div>
          </div>
          <button onClick={handleAddTodo} className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg mt-4 px-6 py-3 transition-colors duration-200">
            Add Task
          </button>
        </div>

        {/* Project Overview */}
        {dependencyInfo && (
          <div className="bg-transparent rounded-lg p-6 mb-8">
            <h2 className="text-2xl mb-4 text-gray-800 dark:text-gray-200 transition-colors duration-200">Project Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg transition-colors duration-200">
                <h3 className="font-medium text-blue-800 dark:text-blue-300">Total Tasks</h3>
                <p className="text-2xl text-blue-600 dark:text-blue-400">{dependencyInfo.totalTasks}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg transition-colors duration-200">
                <h3 className="font-medium text-purple-800 dark:text-purple-300">Critical Path Tasks</h3>
                <p className="text-2xl text-purple-600 dark:text-purple-400">
                  {dependencyInfo.criticalPath.criticalPath.length}
                </p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/30 p-4 rounded-lg transition-colors duration-200">
                <h3 className="font-medium text-pink-800 dark:text-pink-300">Project Duration</h3>
                <p className="text-2xl text-pink-600 dark:text-pink-400">{dependencyInfo.criticalPath.totalDuration} days</p>
              </div>
            </div>
          </div>
        )}

        {/* Sorting Controls */}
        <div className="flex flex-wrap justify-end gap-4 mb-4">
          <label className="mr-2 text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200" htmlFor="sort">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
          >
            <option value="createdAt">Created (newest)</option>
            <option value="dueDate">Due Date</option>
            <option value="duration">Duration</option>
          </select>

          {(sortKey === "dueDate" || sortKey === "duration") && (
            <>
              <label className="mr-2 text-gray-700 font-medium" htmlFor="order">
                Order:
              </label>
              <select
                id="order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-md bg-transparent"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </>
          )}
        </div>

        {/* Dependency Management */}
        <div className="bg-transparent rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl text-gray-800 dark:text-gray-200 transition-colors duration-200">Dependency Management</h2>
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg px-4 py-2 transition-colors duration-200"
            >
              {showDependencies ? "Hide" : "Show"} Dependencies
            </button>
          </div>

          {showDependencies && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">Task</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">Depends On</label>
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
                  className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg w-full px-4 py-3 transition-colors duration-200"
                >
                  Add Dependency
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-transparent rounded-lg p-6">
          {sortedTodos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg transition-colors duration-200">No tasks available.</p>
            </div>
          )}

          <div className="space-y-4">
            {sortedTodos.map((todo) => (
              <div
                key={todo.id}
                className={`p-6 rounded-lg border-2 flex gap-6 transition-colors duration-200 ${
                  todo.isOnCriticalPath 
                    ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20" 
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                }`}
              >
                {/* Image column */}
                <div className="w-40 flex-shrink-0">
                  {todo.imageUrl === undefined && <div className="skeleton-img w-40 h-32" />}
                  {todo.imageUrl === null && (
                    <div className="w-40 h-32 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors duration-200">
                      No picture found
                    </div>
                  )}
                  {todo.imageUrl && (
                    <img
                      src={todo.imageUrl}
                      alt={todo.title}
                      className="w-40 h-32 object-cover rounded-md"
                    />
                  )}
                </div>

                {/* Details column */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className={`text-xl font-semibold transition-colors duration-200 ${
                        isOverdue(todo.dueDate) 
                          ? "text-red-600 dark:text-red-400" 
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {todo.title}
                    </h3>
                    {todo.isOnCriticalPath && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs ">
                        CRITICAL PATH
                      </span>
                    )}
                    {isOverdue(todo.dueDate) && (
                      <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs ">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                    <div>
                      <span className="font-medium">Duration:</span> {todo.duration} days
                    </div>
                    {todo.dueDate && (
                      <div>
                        <span className="font-medium">Due:</span> {formatDate(todo.dueDate)}
                      </div>
                    )}
                    {todo.earliestStartDate && (
                      <div>
                        <span className="font-medium">Earliest Start:</span> {formatDate(todo.earliestStartDate)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(todo.createdAt)}
                    </div>
                  </div>

                  {/* Dependencies */}
                  {todo.dependencies.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">Depends on:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {todo.dependencies.map((dep, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs transition-colors duration-200"
                          >
                            {dep.dependsOn.title}
                            <button
                              onClick={() => handleRemoveDependency(todo.id, dep.dependsOn.id)}
                              className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-200"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dependent Tasks */}
                  {todo.dependentTasks.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">Blocks:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {todo.dependentTasks.map((dep, index) => (
                          <span
                            key={index}
                            className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full text-xs transition-colors duration-200"
                          >
                            {dep.task.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition duration-300 self-start"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 