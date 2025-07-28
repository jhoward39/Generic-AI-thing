import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTaskScheduling } from "@/lib/dependencies";
import { CONFIG } from "@/lib/config";
import { getDefaultDueDate } from "@/lib/dateUtils";

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ error: "Error fetching todos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, duration = 1 } = await request.json();

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const todoData = {
      title: title.trim(),
      duration: parseInt(duration) || CONFIG.DEFAULT_TASK_DURATION,
      // Always set a due date - use provided date or default to configured days from now
      dueDate: dueDate ? new Date(dueDate) : getDefaultDueDate(),
    };

    const todo = await prisma.todo.create({
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

    // Fire-and-forget image fetch: do not block response
    (async () => {
      const { fetchImageUrl } = await import("@/lib/pexels");
      const img = await fetchImageUrl(todo.title);
      if (img) {
        try {
          await prisma.todo.update({
            where: { id: todo.id },
            data: { imageUrl: img },
          });
        } catch {
          // Ignore image update errors
        }
      }
    })();

    // Update scheduling for all tasks
    await updateTaskScheduling();

    // Return the todo but intentionally omit imageUrl so the client knows the image is still loading
    const { imageUrl, ...todoResponse } = todo;
    void imageUrl; // Mark as intentionally unused
    return NextResponse.json(todoResponse, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json({ error: "Error creating todo" }, { status: 500 });
  }
}
