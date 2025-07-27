"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import VerticalTimeline from "./components/VerticalTimeline";

interface Todo {
  id: number;
  title: string;
  dueDate?: string | null;
  duration: number;
  imageUrl?: string | null;
  dependencies: { dependsOn: { id: number } }[];
  dependentTasks: { task: { id: number } }[];
}

interface DependencyInfo {
  criticalPath: { criticalPath: any[]; totalDuration: number };
  totalTasks: number;
}

interface Task {
  id: number;
  title: string;
  dueDate: string;
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
    if (res.ok) setDependencyInfo(await res.json());
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchDependencyInfo();
  }, [fetchTodos]);

  useEffect(() => {
    if (!hasPendingImages) return;
    const id = setInterval(fetchTodos, 3000);
    return () => clearInterval(id);
  }, [hasPendingImages, fetchTodos]);

  /* Handlers */
  const handleCreateDependency = async (fromId: number, toId: number) => {
    console.log('handleCreateDependency called with:', { fromId, toId });
    const requestBody = { taskId: toId, dependsOnId: fromId };
    console.log('Sending to API:', requestBody);
    
    try {
      const response = await fetch("/api/todos/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        alert(`Error creating dependency: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      console.log('Dependency created successfully');
      fetchTodos();
      fetchDependencyInfo();
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error creating dependency');
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
      body: JSON.stringify({ title: newTitle, dueDate: newDueDate || null, duration: parseInt(newDuration) || 1 }),
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
      .filter(t => t.dueDate && t.dueDate.trim() !== "")
      .map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate!.split('T')[0], // Ensure YYYY-MM-DD format (strip time if present)
    }));
    return transformedTasks;
  }, [todos]);

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
      {/* Project overview */}
      {dependencyInfo && (
        <div className="absolute top-4 right-4 bg-[#FFFFF8] dark:bg-gray-900 p-4 z-20 transition-colors duration-200">
          <div className="flex gap-4">
            <div className="border border-black dark:border-gray-600 rounded p-2 bg-[#FFFFF8] dark:bg-gray-800 transition-colors duration-200">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{dependencyInfo?.totalTasks || 0}</div>
            </div>
            <div className="border border-black dark:border-gray-600 rounded p-2 bg-[#FFFFF8] dark:bg-gray-800 transition-colors duration-200">
              <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{dependencyInfo?.criticalPath?.criticalPath?.length || 0}</div>
            </div>
            <div className="border border-black dark:border-gray-600 rounded p-2 bg-[#FFFFF8] dark:bg-gray-800 transition-colors duration-200">
              <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{dependencyInfo?.criticalPath?.totalDuration || 0}d</div>
            </div>
          </div>
        </div>
      )}

      {/* Vertical Timeline */}
      <VerticalTimeline
        tasks={tasks}
        dependencies={dependencies}
        onTaskMove={handleMoveTask}
        onCreateDependency={handleCreateDependency}
      />

      {/* Add task bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#FFFFF8] dark:bg-gray-900 px-4 py-3 flex gap-2 items-center z-20 transition-colors duration-200">
        <input
          type="text"
          placeholder="add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
        />
        <input
          type="number"
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
          min="1"
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 w-16 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
        />
        <button
          onClick={handleAddTask}
          className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 px-3 py-1 rounded text-gray-900 dark:text-gray-100 transition-colors duration-200"
          disabled={!newTitle.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
