"use client";
import { useState } from "react";

const EXAMPLE_TEXTS = [
  "I need to plan a project launch. First, I should research competitors, then create a marketing strategy, and finally design the website. The website design depends on the marketing strategy, and the strategy depends on the competitor research.",
  "For my vacation planning: book flights, reserve hotel, pack luggage, and arrange airport transfer. The airport transfer depends on the flight booking, and packing depends on the hotel reservation.",
  "Home renovation tasks: demolish old kitchen, install new cabinets, paint walls, and install new appliances. The painting depends on cabinet installation, and appliances depend on both painting and cabinets.",
];

export default function VoiceToTasksDemo() {
  const [selectedExample, setSelectedExample] = useState(0);

  return (
    <div className="fixed top-20 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80 max-w-[90vw] z-[9999] border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        AI Assistant Tips
      </h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            💡 How to use:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Click "AI Assistant" to open the interface</li>
            <li>• Speak naturally or type your tasks</li>
            <li>• Review and select which items to create</li>
            <li>• Tasks and dependencies are created automatically</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            🎯 Example inputs:
          </h4>
          <select
            value={selectedExample}
            onChange={(e) => setSelectedExample(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            {EXAMPLE_TEXTS.map((text, index) => (
              <option key={index} value={index}>
                Example {index + 1}
              </option>
            ))}
          </select>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            "{EXAMPLE_TEXTS[selectedExample]}"
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            🎤 Voice Tips:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Mention dependencies naturally ("X depends on Y")</li>
            <li>• Include timeframes when possible</li>
            <li>• Use action words (create, build, design, etc.)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            ✨ What it generates:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Individual tasks with titles and durations</li>
            <li>• Logical dependencies between tasks</li>
            <li>• Due dates when mentioned</li>
            <li>• Structured project timeline</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 