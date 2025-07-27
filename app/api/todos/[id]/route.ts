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
    const { dueDate } = body;

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: { dueDate: dueDate ? new Date(dueDate) : null },
    });

    // Update scheduling after due date change
    await updateTaskScheduling();

    return NextResponse.json(updatedTodo, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error updating todo" }, { status: 500 });
  }
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
  } catch (error) {
    return NextResponse.json({ error: "Error deleting todo" }, { status: 500 });
  }
}
