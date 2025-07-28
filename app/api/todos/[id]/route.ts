import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTaskScheduling } from "@/lib/dependencies";

interface Params {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateData: {
      dueDate?: Date | null;
      done?: boolean;
      title?: string;
      duration?: number;
    } = {};

    // Handle different fields that can be updated
    if ("dueDate" in body) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if ("done" in body) {
      updateData.done = Boolean(body.done);
    }
    if ("title" in body) {
      updateData.title = body.title;
    }
    if ("duration" in body) {
      updateData.duration = parseInt(body.duration) || 1;
    }

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: updateData,
    });

    // Update scheduling after changes
    await updateTaskScheduling();

    return NextResponse.json(updatedTodo, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error updating todo" }, { status: 500 });
  }
}

// Also add PUT method for compatibility
export async function PUT(request: Request, { params }: Params) {
  return PATCH(request, { params });
}

export async function DELETE(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.todo.delete({
      where: { id },
    });

    // Update scheduling after deletion
    await updateTaskScheduling();

    return NextResponse.json({ message: "Todo deleted" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error deleting todo" }, { status: 500 });
  }
}
