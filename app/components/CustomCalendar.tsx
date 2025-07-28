"use client";

import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import { useTheme } from "../layout";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CustomCalendarProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  openDirection?: "up" | "down";
}

export default function CustomCalendar({
  value,
  onChange,
  placeholder = "mm/dd/yyyy",
  className = "",
  openDirection = "down",
}: CustomCalendarProps) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDateChange = (value: Value) => {
    if (value && !Array.isArray(value)) {
      setSelectedDate(value);
      const formattedDate = value.toISOString().split("T")[0];
      onChange(formattedDate);
      setIsOpen(false);
    }
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Date Input Trigger */}
      <input
        type="text"
        readOnly
        value={selectedDate ? formatDisplayDate(selectedDate) : ""}
        placeholder={placeholder}
        onClick={() => setIsOpen(!isOpen)}
        className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200 cursor-pointer ${className}`}
      />

      {/* Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${openDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"} left-0 z-20 bg-[#FFFFF8] dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 transition-colors duration-200`}
        >
          <style jsx global>{`
            .react-calendar {
              background: ${isDark ? "#1f2937" : "#FFFFF8"};
              border: none;
              font-family: inherit;
              color: ${isDark ? "#f3f4f6" : "#111827"};
              width: 100%;
            }

            .react-calendar__navigation {
              display: flex;
              background: ${isDark ? "#1f2937" : "#FFFFF8"};
              margin-bottom: 1rem;
            }

            .react-calendar__navigation button {
              background: ${isDark ? "#374151" : "#f3f4f6"};
              border: 1px solid ${isDark ? "#4b5563" : "#d1d5db"};
              color: ${isDark ? "#f3f4f6" : "#111827"};
              font-size: 14px;
              font-weight: 500;
              padding: 0.5rem;
              border-radius: 0.375rem;
              margin: 0 2px;
              transition: all 0.2s;
            }

            .react-calendar__navigation button:hover {
              background: ${isDark ? "#4b5563" : "#e5e7eb"} !important;
              color: ${isDark ? "#f3f4f6" : "#111827"} !important;
            }

            .react-calendar__navigation button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .react-calendar__month-view__weekdays {
              text-align: center;
              text-transform: uppercase;
              font-weight: 600;
              font-size: 12px;
              color: ${isDark ? "#9ca3af" : "#6b7280"};
              margin-bottom: 0.5rem;
            }

            .react-calendar__month-view__weekdays__weekday {
              padding: 0.5rem;
            }

            .react-calendar__month-view__days {
              display: grid !important;
              grid-template-columns: repeat(7, 1fr);
              gap: 2px;
            }

            .react-calendar__tile {
              background: ${isDark ? "#1f2937" : "#FFFFF8"};
              border: 1px solid ${isDark ? "#374151" : "#e5e7eb"};
              color: ${isDark ? "#f3f4f6" : "#111827"};
              font-size: 14px;
              font-weight: 500;
              padding: 0.75rem 0.5rem;
              border-radius: 0.375rem;
              transition: all 0.2s;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 2.5rem;
            }

            .react-calendar__tile:hover {
              background: ${isDark ? "#374151" : "#f3f4f6"} !important;
              border-color: ${isDark ? "#4b5563" : "#d1d5db"} !important;
              color: ${isDark ? "#f3f4f6" : "#111827"} !important;
            }

            .react-calendar__tile--active {
              background: #3b82f6 !important;
              color: white !important;
              border-color: #2563eb !important;
            }

            .react-calendar__tile--now {
              background: ${isDark ? "#1e40af" : "#dbeafe"};
              color: ${isDark ? "#dbeafe" : "#1e40af"};
              border-color: ${isDark ? "#3b82f6" : "#93c5fd"};
            }

            .react-calendar__tile--neighboringMonth {
              color: ${isDark ? "#6b7280" : "#9ca3af"};
            }

            .react-calendar__tile--active.react-calendar__tile--now {
              background: #1e40af !important;
              color: white !important;
            }
          `}</style>

          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            locale="en-US"
            formatShortWeekday={(locale, date) =>
              date.toLocaleDateString(locale, { weekday: "short" }).charAt(0)
            }
            prevLabel="<"
            nextLabel=">"
            prev2Label="<<"
            next2Label=">>"
          />

          {/* Action Buttons */}
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-300 dark:border-gray-600">
            <button
              onClick={() => {
                setSelectedDate(null);
                onChange("");
                setIsOpen(false);
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                onChange(today.toISOString().split("T")[0]);
                setIsOpen(false);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-200 font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
