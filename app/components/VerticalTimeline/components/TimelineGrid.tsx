import React from "react";
import { isSameDay, getToday } from "../utils/dateUtils";
import { TimelineGridProps } from "../types";

/**
 * Timeline grid background with date labels
 */
export default function TimelineGrid({
  dateRows,
  rowHeight,
  totalHeight,
  isDark,
}: TimelineGridProps) {
  const today = getToday();

  return (
    <div className="absolute inset-0" style={{ height: totalHeight }}>
      {dateRows.map((row, index) => {
        const isToday = isSameDay(row.date, today);
        const isWeekend = row.date.getDay() === 0 || row.date.getDay() === 6;

        return (
          <div
            key={row.dateStr}
            className={`absolute left-0 right-0 border-b transition-colors ${
              isDark ? "border-gray-700" : "border-gray-200"
            } ${
              isToday
                ? isDark
                  ? "bg-blue-900/20"
                  : "bg-blue-50"
                : isWeekend
                  ? isDark
                    ? "bg-gray-800/30"
                    : "bg-gray-50/50"
                  : ""
            }`}
            style={{
              top: index * rowHeight,
              height: rowHeight,
            }}
          >
            {/* Date label */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <div
                className={`text-xs ${
                  isToday
                    ? isDark
                      ? "text-blue-300 font-semibold"
                      : "text-blue-600 font-semibold"
                    : isDark
                      ? "text-gray-400"
                      : "text-gray-500"
                }`}
              >
                {row.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {row.date.toLocaleDateString("en-US", {
                  weekday: "short",
                })}
              </div>
            </div>

            {/* Today indicator line */}
            {isToday && (
              <div
                className={`absolute left-0 right-0 top-0 h-0.5 ${
                  isDark ? "bg-blue-400" : "bg-blue-500"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
