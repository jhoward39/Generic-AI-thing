import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Task {
  title: string;
  duration: number; // in days
  dueDate?: string; // ISO date string
  description?: string;
}

interface Dependency {
  taskId: number; // This will be the index in the tasks array
  dependsOnId: number; // This will be the index in the tasks array
}

interface TaskGenerationResponse {
  todos: Task[];
  dependencies: Dependency[];
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text input is required" },
        { status: 400 }
      );
    }

    const prompt = `
You are a task management assistant. Analyze the following text and extract tasks and their dependencies.

Text: "${text}"

Please return a JSON object with the following structure:
{
  "todos": [
    {
      "title": "Task title",
      "duration": 1, // Duration in days (integer)
      "dueDate": "2024-01-15", // Optional ISO date string
      "description": "Optional task description"
    }
  ],
  "dependencies": [
    {
      "taskId": 1, // Index of the task in the todos array (0-based)
      "dependsOnId": 0 // Index of the task it depends on (0-based)
    }
  ]
}

Guidelines:
- Extract all actionable tasks from the text
- Estimate realistic durations in days
- Identify logical dependencies between tasks
- Use 0-based indexing for taskId and dependsOnId
- Only include dependencies that make logical sense
- Keep task titles concise but descriptive
- If no due dates are mentioned, omit the dueDate field
- If no dependencies are mentioned, return an empty dependencies array

Return only the JSON object, no additional text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts tasks and dependencies from text. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let parsedResponse: TaskGenerationResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseText);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Validate the response structure
    if (!parsedResponse.todos || !Array.isArray(parsedResponse.todos)) {
      throw new Error("Invalid response structure: todos array is required");
    }

    if (!parsedResponse.dependencies || !Array.isArray(parsedResponse.dependencies)) {
      parsedResponse.dependencies = [];
    }

    // Validate dependencies reference valid task indices
    const maxTaskIndex = parsedResponse.todos.length - 1;
    for (const dep of parsedResponse.dependencies) {
      if (dep.taskId > maxTaskIndex || dep.dependsOnId > maxTaskIndex) {
        throw new Error("Dependency references non-existent task");
      }
      if (dep.taskId === dep.dependsOnId) {
        throw new Error("Task cannot depend on itself");
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
    });

  } catch (error) {
    console.error("Task generation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate tasks",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 