import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTaskScheduling } from "@/lib/dependencies";

interface Params {
  params: {
    id: string;
  };
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
