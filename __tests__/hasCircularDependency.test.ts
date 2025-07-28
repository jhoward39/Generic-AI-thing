import { hasCircularDependency, type DependencyGraph, type TaskNode } from "@/lib/dependencies";
import { describe, it, expect } from "@jest/globals";

/**
 * Helper to build an in-memory graph quickly.
 * edges: array of [from, to] meaning `from` depends on `to` (i.e. edge direction matches DB model)
 */
function makeGraph(
  edges: Array<[number, number]>,
  durations: Record<number, number> = {},
): DependencyGraph {
  const nodes = new Map<number, TaskNode>();
  const adjacency = new Map<number, number[]>();

  // Ensure every task appears in the map even if it has no outgoing edges
  for (const [from, to] of edges) {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.set(from, [...adjacency.get(from)!, to]);

    // Register nodes
    for (const id of [from, to]) {
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          title: `Task ${id}`,
          duration: durations[id] ?? 1,
          dependencies: [],
          dependentTasks: [],
          isOnCriticalPath: false,
        });
      }
    }
  }

  // Also ensure tasks with zero edges are included
  for (const id of Object.keys(durations)) {
    const numId = Number(id);
    if (!nodes.has(numId)) {
      nodes.set(numId, {
        id: numId,
        title: `Task ${numId}`,
        duration: durations[numId],
        dependencies: [],
        dependentTasks: [],
        isOnCriticalPath: false,
      });
    }
  }

  return {
    nodes,
    adjacencyList: adjacency,
  };
}

describe("hasCircularDependency", () => {
  it("returns false when adding a safe dependency", () => {
    const graph = makeGraph([
      [1, 2],
      [2, 3],
    ]);

    // Trying to add 3 -> 4 is safe
    expect(hasCircularDependency(graph, 3, 4)).toBe(false);
  });

  it("detects a circular dependency when the new edge closes a cycle", () => {
    const graph = makeGraph([
      [1, 2],
      [2, 3],
    ]);

    // Adding 3 -> 1 would create a cycle 1 -> 2 -> 3 -> 1
    expect(hasCircularDependency(graph, 3, 1)).toBe(true);
  });
});
