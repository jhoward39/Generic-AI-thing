import React from "react";
import { TIMELINE_CONFIG } from "../utils/constants";
import { TimelineHeaderProps } from "../types";

/**
 * Timeline header with zoom controls
 */
export default function TimelineHeader({ zoom, onZoomChange }: TimelineHeaderProps) {
  const handleZoomIn = () => {
    const newZoom = Math.min(TIMELINE_CONFIG.MAX_ZOOM, zoom + TIMELINE_CONFIG.ZOOM_STEP);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(TIMELINE_CONFIG.MIN_ZOOM, zoom - TIMELINE_CONFIG.ZOOM_STEP);
    onZoomChange(newZoom);
  };

  const handleZoomReset = () => {
    onZoomChange(1.0);
  };

  return (
    <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
      <button
        onClick={handleZoomOut}
        disabled={zoom <= TIMELINE_CONFIG.MIN_ZOOM}
        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        title="Zoom Out"
      >
        −
      </button>

      <span className="text-sm font-mono min-w-[4rem] text-center text-gray-700 dark:text-gray-300">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={handleZoomIn}
        disabled={zoom >= TIMELINE_CONFIG.MAX_ZOOM}
        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        title="Zoom In"
      >
        +
      </button>

      <button
        onClick={handleZoomReset}
        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
        title="Reset Zoom"
      >
        Reset
      </button>
    </div>
  );
}
