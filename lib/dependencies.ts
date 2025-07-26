import { prisma } from "./prisma";

export interface TaskNode {
  id: number;
  title: string;
  duration: number;
  dueDate?: Date;
  dependencies: number[];
  dependentTasks: number[];
  earliestStartDate?: Date;
  isOnCriticalPath: boolean;
}

export interface DependencyGraph {
  nodes: Map<number, TaskNode>;
  adjacencyList: Map<number, number[]>;
}

/**
 * Build dependency graph from database
 */
export async function buildDependencyGraph(): Promise<DependencyGraph> {
  const todos = await prisma.todo.findMany({
    include: {
      dependencies: true,
      dependentTasks: true,
    },
  });

  const nodes = new Map<number, TaskNode>();
  const adjacencyList = new Map<number, number[]>();

  // Build nodes
  for (const todo of todos) {
    const dependencies = todo.dependencies.map((dep: any) => dep.dependsOnId);
    const dependentTasks = todo.dependentTasks.map((dep: any) => dep.taskId);

    nodes.set(todo.id, {
      id: todo.id,
      title: todo.title,
      duration: todo.duration,
      dueDate: todo.dueDate || undefined,
      dependencies,
      dependentTasks,
      earliestStartDate: todo.earliestStartDate || undefined,
      isOnCriticalPath: todo.isOnCriticalPath,
    });

    adjacencyList.set(todo.id, dependencies);
  }

  return { nodes, adjacencyList };
}

/**
 * Detect circular dependencies using DFS with recursion stack
 */
export function hasCircularDependency(
  graph: DependencyGraph,
  newTaskId: number,
  newDependencyId: number,
): boolean {
  // Create a temporary graph with the new dependency
  const tempAdjacencyList = new Map(graph.adjacencyList);
  const currentDeps = tempAdjacencyList.get(newTaskId) || [];
  tempAdjacencyList.set(newTaskId, [...currentDeps, newDependencyId]);

  const visited = new Set<number>();
  const recursionStack = new Set<number>();

  function dfs(nodeId: number): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Cycle detected
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const dependencies = tempAdjacencyList.get(nodeId) || [];
    for (const depId of dependencies) {
      if (dfs(depId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check from all nodes to ensure we catch all cycles
  for (const nodeId of Array.from(graph.nodes.keys())) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Topological sort using Kahn's algorithm
 */
export function topologicalSort(graph: DependencyGraph): number[] {
  const inDegree = new Map<number, number>();
  const result: number[] = [];
  const queue: number[] = [];

  // Initialize in-degrees
  for (const nodeId of Array.from(graph.nodes.keys())) {
    inDegree.set(nodeId, 0);
  }

  // Calculate in-degrees
  for (const [nodeId, dependencies] of Array.from(
    graph.adjacencyList.entries(),
  )) {
    for (const depId of dependencies) {
      inDegree.set(depId, (inDegree.get(depId) || 0) + 1);
    }
  }

  // Find all nodes with no incoming edges
  for (const [nodeId, degree] of Array.from(inDegree.entries())) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    result.push(currentId);

    const dependencies = graph.adjacencyList.get(currentId) || [];
    for (const depId of dependencies) {
      const newInDegree = (inDegree.get(depId) || 0) - 1;
      inDegree.set(depId, newInDegree);

      if (newInDegree === 0) {
        queue.push(depId);
      }
    }
  }

  return result;
}

/**
 * Calculate Critical Path Method (CPM) - Forward and Backward Pass
 */
export function calculateCriticalPath(graph: DependencyGraph): {
  criticalPath: number[];
  earliestTimes: Map<number, number>;
  latestTimes: Map<number, number>;
} {
  const sortedNodes = topologicalSort(graph);
  const earliestTimes = new Map<number, number>();
  const latestTimes = new Map<number, number>();

  // Forward pass - calculate earliest start times
  for (const nodeId of sortedNodes) {
    const node = graph.nodes.get(nodeId)!;
    let earliestStart = 0;

    const dependencies = graph.adjacencyList.get(nodeId) || [];
    for (const depId of dependencies) {
      const depEarliest = earliestTimes.get(depId) || 0;
      const depNode = graph.nodes.get(depId)!;
      earliestStart = Math.max(earliestStart, depEarliest + depNode.duration);
    }

    earliestTimes.set(nodeId, earliestStart);
  }

  // Find project completion time (max earliest finish time)
  let projectDuration = 0;
  for (const nodeId of Array.from(graph.nodes.keys())) {
    const node = graph.nodes.get(nodeId)!;
    const finishTime = (earliestTimes.get(nodeId) || 0) + node.duration;
    projectDuration = Math.max(projectDuration, finishTime);
  }

  // Backward pass - calculate latest start times
  for (const nodeId of [...sortedNodes].reverse()) {
    const node = graph.nodes.get(nodeId)!;

    // Find dependent tasks
    const dependentTasks: number[] = [];
    for (const [taskId, deps] of Array.from(graph.adjacencyList.entries())) {
      if (deps.includes(nodeId)) {
        dependentTasks.push(taskId);
      }
    }

    let latestStart = projectDuration - node.duration;

    if (dependentTasks.length > 0) {
      let minLatestStartOfDependents = Infinity;
      for (const depTaskId of dependentTasks) {
        const depLatest = latestTimes.get(depTaskId) || projectDuration;
        minLatestStartOfDependents = Math.min(
          minLatestStartOfDependents,
          depLatest,
        );
      }
      latestStart = minLatestStartOfDependents - node.duration;
    }

    latestTimes.set(nodeId, latestStart);
  }

  // Identify critical path tasks (earliest = latest)
  const criticalPath: number[] = [];
  for (const nodeId of Array.from(graph.nodes.keys())) {
    const earliest = earliestTimes.get(nodeId) || 0;
    const latest = latestTimes.get(nodeId) || 0;

    if (Math.abs(earliest - latest) < 0.001) {
      // Account for floating point precision
      criticalPath.push(nodeId);
    }
  }

  return { criticalPath, earliestTimes, latestTimes };
}

/**
 * Update task scheduling in database
 */
export async function updateTaskScheduling(): Promise<void> {
  const graph = await buildDependencyGraph();
  const { criticalPath, earliestTimes } = calculateCriticalPath(graph);

  // Update all tasks with calculated values
  for (const [taskId, node] of Array.from(graph.nodes.entries())) {
    const earliestStart = earliestTimes.get(taskId) || 0;
    const isOnCriticalPath = criticalPath.includes(taskId);

    await prisma.todo.update({
      where: { id: taskId },
      data: {
        earliestStartDate: new Date(
          Date.now() + earliestStart * 24 * 60 * 60 * 1000,
        ),
        isOnCriticalPath,
      },
    });
  }
}

/**
 * Add a dependency between tasks
 */
export async function addDependency(
  taskId: number,
  dependsOnId: number,
): Promise<boolean> {
  if (taskId === dependsOnId) {
    throw new Error("A task cannot depend on itself");
  }

  // Check for circular dependencies
  const graph = await buildDependencyGraph();
  if (hasCircularDependency(graph, taskId, dependsOnId)) {
    throw new Error(
      "Adding this dependency would create a circular dependency",
    );
  }

  // Add the dependency
  await prisma.taskDependency.create({
    data: {
      taskId,
      dependsOnId,
    },
  });

  // Update scheduling
  await updateTaskScheduling();

  return true;
}

/**
 * Remove a dependency between tasks
 */
export async function removeDependency(
  taskId: number,
  dependsOnId: number,
): Promise<void> {
  await prisma.taskDependency.deleteMany({
    where: {
      taskId,
      dependsOnId,
    },
  });

  // Update scheduling
  await updateTaskScheduling();
}

/**
 * Get all dependencies with task information
 */
export async function getAllDependencies() {
  return await prisma.taskDependency.findMany({
    include: {
      task: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          duration: true,
          isOnCriticalPath: true,
          earliestStartDate: true,
        },
      },
      dependsOn: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          duration: true,
          isOnCriticalPath: true,
          earliestStartDate: true,
        },
      },
    },
  });
}

/**
 * Get critical path information
 */
export async function getCriticalPathInfo() {
  const graph = await buildDependencyGraph();
  const { criticalPath, earliestTimes, latestTimes } =
    calculateCriticalPath(graph);

  const criticalPathTasks = criticalPath.map((taskId) => {
    const node = graph.nodes.get(taskId)!;
    return {
      id: taskId,
      title: node.title,
      duration: node.duration,
      earliestStart: earliestTimes.get(taskId) || 0,
      latestStart: latestTimes.get(taskId) || 0,
      slack: (latestTimes.get(taskId) || 0) - (earliestTimes.get(taskId) || 0),
    };
  });

  return {
    criticalPath: criticalPathTasks,
    totalDuration: Math.max(
      ...Array.from(earliestTimes.values()).map((start, idx) => {
        const taskId = Array.from(graph.nodes.keys())[idx];
        const node = graph.nodes.get(taskId)!;
        return start + node.duration;
      }),
    ),
  };
}
