import { NextResponse } from "next/server";
import { updateTaskScheduling } from "@/lib/dependencies";

export async function POST() {
  try {
    // Trigger task scheduling update to recalculate earliest start dates
    await updateTaskScheduling();

    return NextResponse.json({
      message: "Task scheduling updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating task scheduling:", error);
    return NextResponse.json({ error: "Error updating task scheduling" }, { status: 500 });
  }
}
