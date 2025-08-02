import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDependency, updateTaskScheduling } from "@/lib/dependencies";
import { CONFIG } from "@/lib/config";
import { getDefaultDueDate } from "@/lib/dateUtils";

interface Task {
  title: string;
  duration?: number;
  dueDate?: string;
  description?: string;
}

interface Dependency {
  taskId: number; // Index in the tasks array
  dependsOnId: number; // Index in the tasks array
}

interface BulkCreateRequest {
  todos: Task[];
  dependencies: Dependency[];
}

export async function POST(request: Request) {
  try {
    const { todos, dependencies }: BulkCreateRequest = await request.json();

    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return NextResponse.json(
        { error: "At least one todo is required" },
        { status: 400 }
      );
    }

    // Validate dependencies reference valid task indices
    const maxTaskIndex = todos.length - 1;
    for (const dep of dependencies || []) {
      if (dep.taskId > maxTaskIndex || dep.dependsOnId > maxTaskIndex) {
        return NextResponse.json(
          { error: "Dependency references non-existent task" },
          { status: 400 }
        );
      }
      if (dep.taskId === dep.dependsOnId) {
        return NextResponse.json(
          { error: "Task cannot depend on itself" },
          { status: 400 }
        );
      }
    }

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Create all todos first
      const createdTodos = [];
      for (const task of todos) {
        const todoData = {
          title: task.title.trim(),
          duration: task.duration || CONFIG.DEFAULT_TASK_DURATION,
          dueDate: task.dueDate ? new Date(task.dueDate) : getDefaultDueDate(),
        };

        const todo = await tx.todo.create({
          data: todoData,
          include: {
            dependencies: {
              include: {
                dependsOn: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
            dependentTasks: {
              include: {
                task: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        });
        createdTodos.push(todo);
      }

      // Create dependencies using the actual todo IDs
      const createdDependencies = [];
      for (const dep of dependencies || []) {
        const actualTaskId = createdTodos[dep.taskId].id;
        const actualDependsOnId = createdTodos[dep.dependsOnId].id;
        
        // Use the existing addDependency function but within transaction
        const dependency = await tx.taskDependency.create({
          data: {
            taskId: actualTaskId,
            dependsOnId: actualDependsOnId,
          },
        });
        createdDependencies.push(dependency);
      }

      return { createdTodos, createdDependencies };
    });

    // Update scheduling after all todos and dependencies are created
    await updateTaskScheduling();

    return NextResponse.json({
      success: true,
      createdTodos: result.createdTodos,
      createdDependencies: result.createdDependencies,
      message: `Successfully created ${result.createdTodos.length} todos and ${result.createdDependencies.length} dependencies`,
    }, { status: 201 });

  } catch (error) {
    console.error("Error in bulk create:", error);
    return NextResponse.json(
      { 
        error: "Failed to bulk create todos and dependencies",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 