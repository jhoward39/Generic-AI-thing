"use client";
import { useState, useRef, useCallback } from "react";
import { useTimeline } from "../contexts/TimelineContext";

interface GeneratedTask {
  title: string;
  duration?: number;
  dueDate?: string;
  description?: string;
}

interface GeneratedDependency {
  taskId: number;
  dependsOnId: number;
}

interface TaskGenerationResponse {
  todos: GeneratedTask[];
  dependencies: GeneratedDependency[];
}

interface PreviewItem {
  id: string;
  type: "task" | "dependency";
  data: GeneratedTask | GeneratedDependency;
  accepted: boolean;
}

interface VoiceToTasksProps {
  onRefresh?: () => Promise<void>;
}

export default function VoiceToTasks({ onRefresh }: VoiceToTasksProps) {
  const timelineContext = useTimeline();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Handle voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Process audio and convert to text
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const result = await response.json();
      setTextInput(result.transcription);
      await generateTasks(result.transcription);
    } catch (err) {
      setError("Failed to transcribe audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate tasks from text
  const generateTasks = async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/llm/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tasks");
      }

      const result: { success: boolean; data: TaskGenerationResponse } = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error("Invalid response from task generation");
      }

      // Create preview items
      const items: PreviewItem[] = [
        ...result.data.todos.map((task, index) => ({
          id: `task-${index}`,
          type: "task" as const,
          data: task,
          accepted: true,
        })),
        ...result.data.dependencies.map((dep, index) => ({
          id: `dep-${index}`,
          type: "dependency" as const,
          data: dep,
          accepted: true,
        })),
      ];

      setPreviewItems(items);
      setShowPreview(true);
    } catch (err) {
      setError("Failed to generate tasks. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text input submission
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    await generateTasks(textInput);
  };

  // Toggle acceptance of preview items
  const toggleItemAcceptance = (id: string) => {
    setPreviewItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, accepted: !item.accepted } : item
      )
    );
  };

  // Accept all items
  const acceptAll = () => {
    setPreviewItems(prev => prev.map(item => ({ ...item, accepted: true })));
  };

  // Reject all items
  const rejectAll = () => {
    setPreviewItems(prev => prev.map(item => ({ ...item, accepted: false })));
  };

  // Create accepted items
  const createAcceptedItems = async () => {
    const acceptedTasks = previewItems
      .filter(item => item.type === "task" && item.accepted)
      .map(item => item.data as GeneratedTask);

    const acceptedDependencies = previewItems
      .filter(item => item.type === "dependency" && item.accepted)
      .map(item => item.data as GeneratedDependency);

    if (acceptedTasks.length === 0) {
      setError("No tasks selected to create");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/todos/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todos: acceptedTasks,
          dependencies: acceptedDependencies,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create tasks");
      }

      // Refresh the data - use provided refresh function or timeline context
      if (onRefresh) {
        await onRefresh();
      } else if (timelineContext) {
        await timelineContext.actions.fetchTodos();
        await timelineContext.actions.fetchDependencyInfo();
      }

      // Reset state
      setShowPreview(false);
      setPreviewItems([]);
      setTextInput("");
    } catch (err) {
      setError("Failed to create tasks. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel preview
  const cancelPreview = () => {
    setShowPreview(false);
    setPreviewItems([]);
    setTextInput("");
    setError(null);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-96 max-w-[90vw] z-[10000] border border-gray-200 dark:border-gray-700">
      {!showPreview ? (
        // Input mode
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Voice or Text to Tasks
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Speak or type to generate tasks automatically
            </p>
          </div>

          {/* Voice Recording */}
          <div className="space-y-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? "Processing..." : isRecording ? "Stop Recording" : "Start Voice Recording"}
            </button>
            {isRecording && (
              <div className="text-center text-sm text-red-500">
                Recording... Click to stop
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your tasks here..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              rows={3}
              disabled={isProcessing}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isProcessing}
              className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Generating..." : "Generate Tasks"}
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </div>
      ) : (
        // Preview mode
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Review Generated Tasks
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select which items to create
            </p>
          </div>

          {/* Preview Items */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {previewItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-colors ${
                  item.accepted
                    ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 bg-gray-50 dark:bg-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {item.type === "task" ? (
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {(item.data as GeneratedTask).title}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Duration: {(item.data as GeneratedTask).duration || 1} days
                          {(item.data as GeneratedTask).dueDate && 
                            ` • Due: ${(item.data as GeneratedTask).dueDate}`
                          }
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Dependency: Task {((item.data as GeneratedDependency).taskId + 1)} depends on Task {((item.data as GeneratedDependency).dependsOnId + 1)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleItemAcceptance(item.id)}
                    className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      item.accepted
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {item.accepted ? "✓" : "×"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
            >
              Accept All
            </button>
            <button
              onClick={rejectAll}
              className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
            >
              Reject All
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={createAcceptedItems}
              disabled={isProcessing || !previewItems.some(item => item.accepted)}
              className="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Creating..." : "Create Selected"}
            </button>
            <button
              onClick={cancelPreview}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </div>
      )}
    </div>
  );
} 