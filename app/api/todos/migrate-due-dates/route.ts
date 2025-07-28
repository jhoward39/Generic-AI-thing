import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultDueDate } from "@/lib/dateUtils";
import { updateTaskScheduling } from "@/lib/dependencies";

export async function POST() {
  try {
    // Find all tasks without due dates
    const tasksWithoutDueDates = await prisma.todo.findMany({
      where: {
        dueDate: null,
      },
    });

    if (tasksWithoutDueDates.length === 0) {
      return NextResponse.json({
        message: "No tasks found without due dates",
        updated: 0,
      });
    }

    // Update each task with a default due date based on its creation date
    const updates = tasksWithoutDueDates.map(async (task) => {
      const defaultDueDate = getDefaultDueDate(task.createdAt);
      return prisma.todo.update({
        where: { id: task.id },
        data: { dueDate: defaultDueDate },
      });
    });

    await Promise.all(updates);

    // Update task scheduling after setting due dates
    await updateTaskScheduling();

    return NextResponse.json({
      message: `Successfully updated ${tasksWithoutDueDates.length} tasks with default due dates`,
      updated: tasksWithoutDueDates.length,
      tasks: tasksWithoutDueDates.map((task) => ({
        id: task.id,
        title: task.title,
        createdAt: task.createdAt,
        newDueDate: getDefaultDueDate(task.createdAt),
      })),
    });
  } catch (error) {
    console.error("Error migrating due dates:", error);
    return NextResponse.json({ error: "Error migrating due dates" }, { status: 500 });
  }
}
