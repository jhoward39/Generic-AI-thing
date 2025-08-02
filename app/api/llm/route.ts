import { NextResponse } from "next/server";
import {
  addDependency,
  removeDependency
} from "@/lib/dependencies";


// Add a dependency
export async function POST(request: Request) {
  try {
    const { taskId, dependsOnId } = await request.json();

    if (!taskId || !dependsOnId) {
      return NextResponse.json(
        {
          error: "Both taskId and dependsOnId are required",
        },
        { status: 400 },
      );
    }

    if (taskId === dependsOnId) {
      return NextResponse.json(
        {
          error: "A task cannot depend on itself",
        },
        { status: 400 },
      );
    }

    await addDependency(parseInt(taskId), parseInt(dependsOnId));
    return NextResponse.json({ message: "Dependency added successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating dependency:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error creating dependency",
      },
      { status: 400 },
    );
  }
}

// Remove a dependency
export async function DELETE(request: Request) {
  try {
    const { taskId, dependsOnId } = await request.json();

    if (!taskId || !dependsOnId) {
      return NextResponse.json(
        {
          error: "Both taskId and dependsOnId are required",
        },
        { status: 400 },
      );
    }

    await removeDependency(parseInt(taskId), parseInt(dependsOnId));
    return NextResponse.json({ message: "Dependency removed successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error removing dependency:", error);
    const errorMessage = error instanceof Error ? error.message : "Error removing dependency";
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
