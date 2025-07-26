import { NextResponse } from "next/server";
import {
  addDependency,
  removeDependency,
  getAllDependencies,
  getCriticalPathInfo,
  buildDependencyGraph,
} from "@/lib/dependencies";

// Get dependency information
export async function GET() {
  try {
    const dependencies = await getAllDependencies();
    const criticalPathInfo = await getCriticalPathInfo();
    const graph = await buildDependencyGraph();

    return NextResponse.json({
      dependencies,
      criticalPath: criticalPathInfo,
      totalTasks: graph.nodes.size,
    });
  } catch (error) {
    console.error("Error fetching dependency info:", error);
    return NextResponse.json(
      { error: "Error fetching dependency info" },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json(
      { message: "Dependency added successfully" },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating dependency:", error);
    return NextResponse.json(
      {
        error: error.message || "Error creating dependency",
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
    return NextResponse.json(
      { message: "Dependency removed successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error removing dependency:", error);
    return NextResponse.json(
      {
        error: error.message || "Error removing dependency",
      },
      { status: 500 },
    );
  }
}
