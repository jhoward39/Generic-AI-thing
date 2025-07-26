"use client";
import { useState, useEffect } from "react";

interface Todo {
  id: number;
  title: string;
  createdAt: string;
  dueDate?: string;
  duration: number;
  earliestStartDate?: string;
  isOnCriticalPath: boolean;
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

interface DependencyInfo {
  dependencies: any[];
  criticalPath: {
    criticalPath: any[];
    totalDuration: number;
  };
  totalTasks: number;
}

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDuration, setNewDuration] = useState("1");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyInfo | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedDependency, setSelectedDependency] = useState<number | null>(
    null,
  );
  const [showDependencies, setShowDependencies] = useState(false);

  useEffect(() => {
    fetchTodos();
    fetchDependencyInfo();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const fetchDependencyInfo = async () => {
    try {
      const res = await fetch("/api/todos/dependencies");
      if (res.ok) {
        const data = await res.json();
        setDependencyInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch dependency info:", error);
    }
  };

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

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      fetchTodos();
      fetchDependencyInfo();
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTask || !selectedDependency) return;
    try {
      const res = await fetch("/api/todos/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask,
          dependsOnId: selectedDependency,
        }),
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

  const handleRemoveDependency = async (
    taskId: number,
    dependsOnId: number,
  ) => {
    try {
      await fetch("/api/todos/dependencies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, dependsOnId }),
      });
      fetchTodos();
      fetchDependencyInfo();
    } catch (error) {
      console.error("Failed to remove dependency:", error);
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#FFFFF8]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl text-black m-4">Advanced Todo App</h1>
          <p className="text-black text-lg">
            Task Management with Dependencies & Critical Path Analysis
          </p>
        </div>

        {/* Add Todo Form */}
        <div className="rounded-lg  p-6 mb-8">
          <h2 className="text-2xl  mb-4 text-gray-800">Add New Task</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-900 focus:outline-none bg-transparent"
                placeholder="Enter task title..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-900 focus:outline-none bg-transparent"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                min="1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-900 focus:outline-none bg-transparent"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleAddTodo}
            className="btn-primary mt-4 px-6 py-3"
          >
            Add Task
          </button>
        </div>

        {/* Critical Path Info */}
        {dependencyInfo && (
          <div className="bg-transparent rounded-lg p-6 mb-8">
            <h2 className="text-2xl  mb-4 text-gray-800">Project Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">Total Tasks</h3>
                <p className="text-2xl  text-blue-600">
                  {dependencyInfo.totalTasks}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">
                  Critical Path Tasks
                </h3>
                <p className="text-2xl  text-purple-600">
                  {dependencyInfo.criticalPath.criticalPath.length}
                </p>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="font-semibold text-pink-800">
                  Project Duration
                </h3>
                <p className="text-2xl  text-pink-600">
                  {dependencyInfo.criticalPath.totalDuration} days
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dependency Management */}
        <div className="bg-transparent rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl text-gray-800">Dependency Management</h2>
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className="btn-primary px-4 py-2
                            "
            >
              {showDependencies ? "Hide" : "Show"} Dependencies
            </button>
          </div>

          {showDependencies && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedTask || ""}
                  onChange={(e) =>
                    setSelectedTask(parseInt(e.target.value) || null)
                  }
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depends On
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedDependency || ""}
                  onChange={(e) =>
                    setSelectedDependency(parseInt(e.target.value) || null)
                  }
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
                  className="btn-primary w-fulL px-4 py-3 rounded-lg disabled:cursor-not-allowed"
                >
                  Add Dependency
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-transparent rounded-lg p-6">
          <h2 className="text-2xl  mb-4 text-gray-800">Tasks</h2>
          <div className="space-y-4">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`p-6 rounded-lg border-2 ${
                  todo.isOnCriticalPath
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className={`text-xl font-semibold ${
                          isOverdue(todo.dueDate)
                            ? "text-red-600"
                            : "text-gray-800"
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {todo.duration} days
                      </div>
                      {todo.dueDate && (
                        <div>
                          <span className="font-medium">Due:</span>{" "}
                          {formatDate(todo.dueDate)}
                        </div>
                      )}
                      {todo.earliestStartDate && (
                        <div>
                          <span className="font-medium">Earliest Start:</span>{" "}
                          {formatDate(todo.earliestStartDate)}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {formatDate(todo.createdAt)}
                      </div>
                    </div>

                    {/* Dependencies */}
                    {todo.dependencies.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">
                          Depends on:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {todo.dependencies.map((dep, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                            >
                              {dep.dependsOn.title}
                              <button
                                onClick={() =>
                                  handleRemoveDependency(
                                    todo.id,
                                    dep.dependsOn.id,
                                  )
                                }
                                className="ml-1 text-blue-600 hover:text-blue-800"
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
                        <span className="text-sm font-medium text-gray-700">
                          Blocks:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {todo.dependentTasks.map((dep, index) => (
                            <span
                              key={index}
                              className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs"
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
                    className="ml-4 text-red-500 hover:text-red-700 transition duration-300"
                  >
                    <svg
                      className="w-6 h-6"
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
              </div>
            ))}
          </div>

          {todos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No tasks yet. Add your first task above!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
