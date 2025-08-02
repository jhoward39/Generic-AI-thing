"use client";
import { useState } from "react";
import VoiceToTasks from "./VoiceToTasks";
import VoiceToTasksDemo from "./VoiceToTasksDemo";

export default function AIAssistant() {
  const [showVoiceToTasks, setShowVoiceToTasks] = useState(false);

  return (
    <>
      {/* AI Assistant Toggle Button */}
      <div className="absolute top-20 right-4 z-[9999]">
        <button
          onClick={() => setShowVoiceToTasks(!showVoiceToTasks)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showVoiceToTasks
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {showVoiceToTasks ? "Hide AI Assistant" : "AI Assistant"}
        </button>
      </div>

      {/* Voice to Tasks Demo/Tips */}
      {showVoiceToTasks && <VoiceToTasksDemo />}

      {/* Voice to Tasks Component */}
      {showVoiceToTasks && <VoiceToTasks />}
    </>
  );
} 