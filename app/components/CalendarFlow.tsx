"use client";

import React, { useMemo, useCallback, useEffect } from "react";
import ReactFlow, { addEdge, Position, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";

/* ------------------------------------------------------------------
 * Types & Constants
 * ------------------------------------------------------------------*/
interface Todo {
  id: number;
  title: string;
  dueDate?: string | null;
  duration: number;
  imageUrl?: string | null;
  dependencies: { dependsOn: { id: number } }[];
  dependentTasks: { task: { id: number } }[];
}

export type ViewMode = "month" | "week";

interface CalendarFlowProps {
  todos: Todo[];
  /* Dependency + scheduling handlers (lifted to parent) */
  onCreateDependency: (fromId: number, toId: number) => void;
  onMoveTask: (id: number, newDate: string | null) => void;
  /* View state */
  viewMode: ViewMode;
  viewStart: Date; // first visible day (month first-of-month OR Sunday)
  onPrev: () => void;
  onNext: () => void;
  onToggleView: () => void;
}

const CELL_W = 160;
const CELL_H = 100;
const HEADER_H = 32;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------*/
export default function CalendarFlow({
  todos,
  onCreateDependency,
  onMoveTask,
  viewMode,
  viewStart,
  onPrev,
  onNext,
  onToggleView,
}: CalendarFlowProps) {
  /* ----------------------- Derived calendar meta ----------------------- */
  const monthStart = useMemo(
    () =>
      viewMode === "month" ? new Date(viewStart.getFullYear(), viewStart.getMonth(), 1) : null,
    [viewMode, viewStart],
  );
  const firstWeekday = monthStart ? monthStart.getDay() : 0;
  const daysInMonth = monthStart
    ? new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
    : 7;
  const numRows = viewMode === "week" ? 1 : Math.ceil((firstWeekday + daysInMonth) / 7);
  const viewEnd = useMemo(() => {
    return viewMode === "week"
      ? new Date(viewStart.getTime() + 6 * DAY_MS)
      : new Date(viewStart.getFullYear(), viewStart.getMonth() + 1, 0);
  }, [viewMode, viewStart]);

  /* ------------------------- Nodes & Edges ------------------------- */
  const { nodesInit, edgesInit } = useMemo(() => {
    const perDayCount: Record<string, number> = {};
    const nodes: unknown[] = [];
    const edges: unknown[] = [];

    const addStackedPos = (row: number, col: number) => {
      const key = `${row}-${col}`;
      const idx = perDayCount[key] || 0;
      perDayCount[key] = idx + 1;
      return idx;
    };

    todos.forEach((t) => {
      if (!t.dueDate) return; // skip unscheduled tasks
      const date = new Date(t.dueDate);
      if (date < viewStart || date > viewEnd) return; // outside visible window

      const col = date.getDay();
      const row = viewMode === "week" ? 0 : Math.floor((firstWeekday + date.getDate() - 1) / 7);

      const stackIdx = addStackedPos(row, col);

      nodes.push({
        id: t.id.toString(),
        data: { label: t.title },
        type: "default",
        draggable: true,
        position: {
          x: col * CELL_W + CELL_W / 2,
          y: row * CELL_H + HEADER_H + stackIdx * 10,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      // Edges (dependencies point from dependsOn -> task)
      t.dependencies.forEach((dep) => {
        edges.push({
          id: `e-${dep.dependsOn.id}-${t.id}`,
          source: dep.dependsOn.id.toString(),
          target: t.id.toString(),
        });
      });
    });

    return { nodesInit: nodes, edgesInit: edges };
  }, [todos, viewMode, viewStart, firstWeekday, viewEnd]);

  /* ---------------------- React Flow state hooks ---------------------- */
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesInit);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesInit);

  // Keep local state in sync with props-derived nodes/edges
  useEffect(() => setNodes(nodesInit), [nodesInit, setNodes]);
  useEffect(() => setEdges(edgesInit), [edgesInit, setEdges]);

  /* -------------------------- Event handlers -------------------------- */
  const handleConnect = useCallback(
    (connection: { source?: string; target?: string }) => {
      if (connection.source && connection.target) {
        onCreateDependency(parseInt(connection.source), parseInt(connection.target));
        setEdges((eds: unknown[]) => addEdge(connection, eds));
      }
    },
    [onCreateDependency, setEdges],
  );

  const handleNodeDragStop = useCallback(
    (_e: unknown, node: { id: string; position: { x: number; y: number } }) => {
      const col = Math.min(6, Math.max(0, Math.floor(node.position.x / CELL_W)));
      const row = Math.max(0, Math.floor((node.position.y - HEADER_H) / CELL_H));

      if (viewMode === "week") {
        const newDate = new Date(viewStart.getTime() + col * DAY_MS);
        onMoveTask(parseInt(node.id), newDate.toISOString().split("T")[0]);
      } else {
        const dayIdx = row * 7 + col - firstWeekday + 1;
        if (dayIdx < 1 || dayIdx > daysInMonth) return; // ignore drop outside month grid
        const newDate = new Date(viewStart.getFullYear(), viewStart.getMonth(), dayIdx);
        onMoveTask(parseInt(node.id), newDate.toISOString().split("T")[0]);
      }
    },
    [viewMode, viewStart, firstWeekday, daysInMonth, onMoveTask],
  );

  // Wheel interaction: ctrl/meta = toggle zoom, otherwise paging
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onToggleView();
        return;
      }
      if (e.deltaY > 0) onNext();
      else if (e.deltaY < 0) onPrev();
    },
    [onPrev, onNext, onToggleView],
  );

  /* ------------------------------ Render ------------------------------ */
  const containerW = 7 * CELL_W;
  const containerH = numRows * CELL_H + HEADER_H;

  return (
    <div
      style={{ width: containerW, height: containerH, position: "relative" }}
      onWheel={handleWheel}
    >
      {/* Calendar grid (pointer-events:none) */}
      <div
        className="absolute inset-0 border-t border-l border-gray-300 pointer-events-none"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${numRows}, ${CELL_H}px)`,
        }}
      >
        {Array.from({ length: numRows * 7 }).map((_, idx) => {
          let dayNum: number | null = null;
          if (viewMode === "month") {
            if (idx >= firstWeekday && idx < firstWeekday + daysInMonth) {
              dayNum = idx - firstWeekday + 1;
            }
          } else {
            const date = new Date(viewStart.getTime() + (idx % 7) * DAY_MS);
            dayNum = date.getDate();
          }
          return (
            <div key={idx} className="border-b border-r border-gray-300 relative">
              {dayNum !== null && (
                <span className="absolute top-0 left-0 text-xs p-1">{dayNum}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Day labels header (pointer-events:none) */}
      <div className="absolute top-0 left-0 grid grid-cols-7 w-full text-center font-medium pointer-events-none">
        {DAYS.map((d) => (
          <div key={d} className="py-2 bg-gray-50 border-r border-gray-300">
            {d}
          </div>
        ))}
      </div>

      {/* React-Flow canvas overlay */}
      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeDragStop={handleNodeDragStop}
          fitView
          proOptions={{ hideAttribution: true }}
        />
      </div>
    </div>
  );
}
