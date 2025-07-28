"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import VerticalTimeline from "./components/VerticalTimeline";
import CustomCalendar from "./components/CustomCalendar";
import TaskPieChart from "./components/TaskPieChart";

interface Todo {
  id: number;
  title: string;
  dueDate?: string | null;
  duration: number;
  imageUrl?: string | null;
  done?: boolean;
  isOnCriticalPath: boolean;
  earliestStartDate?: string | null;
  dependencies: { dependsOn: { id: number } }[];
  dependentTasks: { task: { id: number } }[];
}

interface DependencyInfo {
  criticalPath: {
    criticalPath: {
      id: number;
      title: string;
      duration: number;
      earliestStart: number;
      latestStart: number;
      slack: number;
    }[];
    totalDuration: number;
  };
  totalTasks: number;
}

interface Task {
  id: number;
  title: string;
  dueDate: string;
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

interface Dependency {
  fromId: number;
  toId: number;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyInfo | null>(null);

  // add-task bar state
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDuration, setNewDuration] = useState("1");

  const hasPendingImages = useMemo(() => todos.some((t) => t.imageUrl === undefined), [todos]);

  // Calculate uncompleted and overdue tasks
  const { uncompletedTasks, overdueTasks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const uncompleted = todos.filter((todo) => !todo.done);

    const overdue = todos.filter((todo) => {
      if (!todo.dueDate || todo.done) return false;
      const dueDate = new Date(todo.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    return {
      uncompletedTasks: uncompleted.length,
      overdueTasks: overdue.length,
    };
  }, [todos]);

  const fetchTodos = useCallback(async () => {
    const res = await fetch("/api/todos");
    const data: Todo[] = await res.json();
    setTodos((prev) =>
      data.map((t) => {
        const prevTodo = prev.find((p) => p.id === t.id);
        if (!prevTodo && t.imageUrl === null) return { ...t, imageUrl: undefined } as Todo;
        return t;
      }),
    );
  }, []);

  const fetchDependencyInfo = useCallback(async () => {
    const res = await fetch("/api/todos/dependencies");
    if (res.ok) {
      const data = await res.json();
      setDependencyInfo(data);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchDependencyInfo();
  }, [fetchTodos, fetchDependencyInfo]);

  // polling while images pending
  useEffect(() => {
    if (!hasPendingImages) return;
    const id = setInterval(fetchTodos, 3000);
    return () => clearInterval(id);
  }, [hasPendingImages, fetchTodos]);

  const handleCreateDependency = async (
    fromId: number,
    toId: number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/todos/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: toId, dependsOnId: fromId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || "Failed to create dependency" };
      }

      fetchTodos();
      fetchDependencyInfo();
      return { success: true };
    } catch (error) {
      console.error("Network error creating dependency:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  const handleMoveTask = async (id: number, newDate: string) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: newDate }),
    });
    fetchTodos();
  };

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        dueDate: newDueDate || null,
        duration: parseInt(newDuration) || 1,
      }),
    });
    setNewTitle("");
    setNewDueDate("");
    setNewDuration("1");
    fetchTodos();
    fetchDependencyInfo();
  };

  // Transform todos to tasks format for VerticalTimeline
  const tasks: Task[] = useMemo(() => {
    const transformedTasks = todos
      .filter((t) => t.dueDate && t.dueDate.trim() !== "")
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate!.split("T")[0], // Ensure YYYY-MM-DD format (strip time if present)
        createdAt: new Date().toISOString(), // Add createdAt
        duration: t.duration,
        earliestStartDate: t.earliestStartDate ? t.earliestStartDate.split("T")[0] : undefined,
        isOnCriticalPath: t.isOnCriticalPath, // Use actual critical path data from database
        imageUrl: t.imageUrl,
        done: t.done, // Add done property
        dependencies: t.dependencies.map((dep) => ({
          dependsOn: {
            id: dep.dependsOn.id,
            title: todos.find((todo) => todo.id === dep.dependsOn.id)?.title || "Unknown",
          },
        })),
        dependentTasks: t.dependentTasks.map((dep) => ({
          task: {
            id: dep.task.id,
            title: todos.find((todo) => todo.id === dep.task.id)?.title || "Unknown",
          },
        })),
      }));
    return transformedTasks;
  }, [todos]);

  const handleDeleteTask = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
      fetchTodos();
      fetchDependencyInfo();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Transform dependencies
  const dependencies: Dependency[] = useMemo(() => {
    const deps: Dependency[] = [];
    todos.forEach((t) => {
      t.dependencies.forEach((d) => deps.push({ fromId: d.dependsOn.id, toId: t.id }));
    });
    return deps;
  }, [todos]);

  return (
    <div className="min-h-screen bg-[#FFFFF8] dark:bg-gray-900 relative transition-colors duration-200">
      {/* Project overview pie chart */}
      {dependencyInfo && (
        <div className="absolute top-4 right-4 z-20">
          <TaskPieChart uncompletedTasks={uncompletedTasks} overdueTasks={overdueTasks} />
        </div>
      )}

      {/* Vertical Timeline */}
      <VerticalTimeline
        tasks={tasks}
        dependencies={dependencies}
        onTaskMove={handleMoveTask}
        onCreateDependency={handleCreateDependency}
        onTaskUpdate={fetchTodos}
        onTaskDelete={handleDeleteTask}
      />

      {/* Add task bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#FFFFF8] dark:bg-gray-900 px-4 py-3 flex gap-2 items-center z-20 transition-colors duration-200">
        <input
          type="text"
          placeholder="add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
        />
        <CustomCalendar
          value={newDueDate}
          onChange={(date) => setNewDueDate(date)}
          className="w-32 p-2"
          openDirection="up"
        />
        <input
          type="number"
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
          min="1"
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-16 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
        />
        <button
          onClick={handleAddTask}
          className=" btn-primary px-4 py-3"
          disabled={!newTitle.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
