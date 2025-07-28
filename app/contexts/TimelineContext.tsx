"use client";

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { Todo, TimelineTask, TimelineDependency, DependencyInfo } from "../../types";

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------*/

interface TimelineState {
  todos: Todo[];
  dependencyInfo: DependencyInfo | null;
  loading: boolean;
  error: string | null;
  hasPendingImages: boolean;
}

type TimelineAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_TODOS"; payload: Todo[] }
  | { type: "SET_DEPENDENCY_INFO"; payload: DependencyInfo | null }
  | { type: "UPDATE_TODO"; payload: { id: number; updates: Partial<Todo> } }
  | { type: "DELETE_TODO"; payload: number }
  | { type: "ADD_TODO"; payload: Todo };

interface TimelineContextType {
  state: TimelineState;
  actions: {
    fetchTodos: () => Promise<void>;
    fetchDependencyInfo: () => Promise<void>;
    createTodo: (title: string, dueDate?: string | null, duration?: number) => Promise<void>;
    updateTodo: (id: number, updates: Partial<Todo>) => Promise<void>;
    deleteTodo: (id: number) => Promise<void>;
    createDependency: (
      fromId: number,
      toId: number,
    ) => Promise<{ success: boolean; error?: string }>;
    moveTodo: (id: number, newDate: string) => Promise<void>;
  };
  derived: {
    timelineTasks: TimelineTask[];
    timelineDependencies: TimelineDependency[];
    uncompletedTasks: number;
    overdueTasks: number;
  };
}

/* ------------------------------------------------------------------
 * Reducer
 * ------------------------------------------------------------------*/

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_TODOS":
      return {
        ...state,
        todos: action.payload,
        hasPendingImages: action.payload.some((t) => t.imageUrl === undefined),
        loading: false,
        error: null,
      };

    case "SET_DEPENDENCY_INFO":
      return { ...state, dependencyInfo: action.payload };

    case "UPDATE_TODO":
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id ? { ...todo, ...action.payload.updates } : todo,
        ),
      };

    case "DELETE_TODO":
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload),
      };

    case "ADD_TODO":
      const newTodos = [action.payload, ...state.todos];
      return {
        ...state,
        todos: newTodos,
        hasPendingImages: newTodos.some((t) => t.imageUrl === undefined),
      };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------
 * Context
 * ------------------------------------------------------------------*/

const TimelineContext = createContext<TimelineContextType | null>(null);

export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error("useTimeline must be used within a TimelineProvider");
  }
  return context;
}

/* ------------------------------------------------------------------
 * Provider
 * ------------------------------------------------------------------*/

interface TimelineProviderProps {
  children: ReactNode;
}

export function TimelineProvider({ children }: TimelineProviderProps) {
  const initialState: TimelineState = {
    todos: [],
    dependencyInfo: null,
    loading: false,
    error: null,
    hasPendingImages: false,
  };

  const [state, dispatch] = useReducer(timelineReducer, initialState);

  // Create refs for functions to avoid circular dependencies
  const fetchTodosRef = React.useRef<() => Promise<void>>();
  const fetchDependencyInfoRef = React.useRef<() => Promise<void>>();
  const currentTodosRef = React.useRef<Todo[]>();

  // API Actions
  const fetchTodos = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error("Failed to fetch todos");

      const data: Todo[] = await res.json();

      // Process data for image loading state - exact same logic as task list
      const processedData = data.map((t: Todo) => {
        const prevTodo = currentTodosRef.current?.find((p) => p.id === t.id);
        if (!prevTodo && t.imageUrl === null) {
          return { ...t, imageUrl: undefined };
        }

        return t;
      });

      dispatch({ type: "SET_TODOS", payload: processedData });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []); // Keep empty - adding state.todos would cause infinite loops

  const fetchDependencyInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/todos/dependencies");
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "SET_DEPENDENCY_INFO", payload: data });
      }
    } catch (error) {
      console.error("Failed to fetch dependency info:", error);
    }
  }, []);

  // Update refs
  fetchTodosRef.current = fetchTodos;
  fetchDependencyInfoRef.current = fetchDependencyInfo;
  currentTodosRef.current = state.todos;

  const createTodo = useCallback(async (title: string, dueDate?: string | null, duration = 1) => {
    try {
      dispatch({ type: "SET_ERROR", payload: null });

      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueDate, duration }),
      });

      if (!res.ok) throw new Error("Failed to create todo");

      const newTodo = await res.json();
      dispatch({ type: "ADD_TODO", payload: newTodo });

      // Refresh dependency info
      await fetchDependencyInfoRef.current?.();
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Failed to create todo",
      });
      throw error;
    }
  }, []);

  const updateTodo = useCallback(async (id: number, updates: Partial<Todo>) => {
    try {
      dispatch({ type: "SET_ERROR", payload: null });

      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update todo");

      dispatch({ type: "UPDATE_TODO", payload: { id, updates } });

      // Refresh full data if this might affect dependencies
      if (updates.dueDate !== undefined) {
        await fetchTodosRef.current?.();
        await fetchDependencyInfoRef.current?.();
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Failed to update todo",
      });
      throw error;
    }
  }, []);

  const deleteTodo = useCallback(async (id: number) => {
    try {
      dispatch({ type: "SET_ERROR", payload: null });

      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete todo");

      dispatch({ type: "DELETE_TODO", payload: id });
      await fetchDependencyInfoRef.current?.();
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Failed to delete todo",
      });
    }
  }, []);

  const createDependency = useCallback(
    async (fromId: number, toId: number): Promise<{ success: boolean; error?: string }> => {
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

        await fetchTodosRef.current?.();
        await fetchDependencyInfoRef.current?.();
        return { success: true };
      } catch {
        return { success: false, error: "Network error occurred" };
      }
    },
    [],
  ); // Remove circular dependencies, use refs instead

  const moveTodo = useCallback(
    async (id: number, newDate: string) => {
      await updateTodo(id, { dueDate: newDate });
    },
    [updateTodo],
  );

  // Derived state
  const timelineTasks: TimelineTask[] = React.useMemo(() => {
    const todoMap = new Map(state.todos.map((t) => [t.id, t]));

    return state.todos
      .filter((t) => t.dueDate && t.dueDate.trim() !== "")
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate!.split("T")[0],
        createdAt: new Date().toISOString(),
        duration: t.duration,
        earliestStartDate: t.earliestStartDate ? t.earliestStartDate.split("T")[0] : undefined,
        isOnCriticalPath: t.isOnCriticalPath,
        imageUrl: t.imageUrl,
        done: t.done,
        dependencies: t.dependencies.map((dep) => ({
          dependsOn: {
            id: dep.dependsOn.id,
            title: todoMap.get(dep.dependsOn.id)?.title || "Unknown",
          },
        })),
        dependentTasks: t.dependentTasks.map((dep) => ({
          task: {
            id: dep.task.id,
            title: todoMap.get(dep.task.id)?.title || "Unknown",
          },
        })),
      }));
  }, [state.todos]);

  const timelineDependencies: TimelineDependency[] = React.useMemo(() => {
    const deps: TimelineDependency[] = [];
    state.todos.forEach((t) => {
      t.dependencies.forEach((d) => deps.push({ fromId: d.dependsOn.id, toId: t.id }));
    });
    return deps;
  }, [state.todos]);

  const { uncompletedTasks, overdueTasks } = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uncompleted = state.todos.filter((todo) => !todo.done);
    const overdue = state.todos.filter((todo) => {
      if (!todo.dueDate || todo.done) return false;
      const dueDate = new Date(todo.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    return {
      uncompletedTasks: uncompleted.length,
      overdueTasks: overdue.length,
    };
  }, [state.todos]);

  // Memoize actions to prevent infinite re-renders
  const actions = React.useMemo(
    () => ({
      fetchTodos,
      fetchDependencyInfo,
      createTodo,
      updateTodo,
      deleteTodo,
      createDependency,
      moveTodo,
    }),
    [
      fetchTodos,
      fetchDependencyInfo,
      createTodo,
      updateTodo,
      deleteTodo,
      createDependency,
      moveTodo,
    ],
  );

  const contextValue: TimelineContextType = {
    state,
    actions,
    derived: {
      timelineTasks,
      timelineDependencies,
      uncompletedTasks,
      overdueTasks,
    },
  };

  return <TimelineContext.Provider value={contextValue}>{children}</TimelineContext.Provider>;
}
