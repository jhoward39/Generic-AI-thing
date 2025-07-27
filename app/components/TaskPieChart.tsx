"use client";
import { useState } from "react";

interface TaskPieChartProps {
  totalTasks: number;
  overdueTasks: number;
}

export default function TaskPieChart({ totalTasks, overdueTasks }: TaskPieChartProps) {
  const [hoveredSection, setHoveredSection] = useState<'overdue' | 'remaining' | null>(null);
  
  const remainingTasks = totalTasks - overdueTasks;
  const overduePercentage = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
  const remainingPercentage = totalTasks > 0 ? (remainingTasks / totalTasks) * 100 : 0;

  // Calculate SVG path for pie slices - 5% larger circle
  const radius = 42; // Increased from 40
  const strokeWidth = 12; // Reduced from 16
  const circumference = 2 * Math.PI * radius;
  const overdueStrokeDasharray = `${(overduePercentage / 100) * circumference} ${circumference}`;
  const remainingStrokeDasharray = `${(remainingPercentage / 100) * circumference} ${circumference}`;
  
  // Calculate rotation for remaining section (starts after overdue section)
  const remainingRotation = (overduePercentage / 100) * 360;

  const getCenterText = () => {
    if (hoveredSection === 'overdue') {
      return overdueTasks.toString();
    } else if (hoveredSection === 'remaining') {
      return remainingTasks.toString();
    }
    return totalTasks.toString();
  };

  const getCenterSubtext = () => {
    if (hoveredSection === 'overdue') {
      return 'overdue';
    } else if (hoveredSection === 'remaining') {
      return 'remaining';
    }
    return 'total';
  };

  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className="dark:stroke-gray-600"
        />
        
        {/* Invisible hover areas for better responsiveness */}
        {overdueTasks > 0 && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="transparent"
            strokeWidth={strokeWidth + 8}
            strokeDasharray={overdueStrokeDasharray}
            style={{ pointerEvents: 'all' }}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredSection('overdue')}
            onMouseLeave={() => setHoveredSection(null)}
          />
        )}
        
        {remainingTasks > 0 && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="transparent"
            strokeWidth={strokeWidth + 8}
            strokeDasharray={remainingStrokeDasharray}
            style={{
              transform: `rotate(${remainingRotation}deg)`,
              transformOrigin: '48px 48px',
              pointerEvents: 'all'
            }}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredSection('remaining')}
            onMouseLeave={() => setHoveredSection(null)}
          />
        )}
        
        {/* Visible pie sections */}
        {/* Overdue section (dull red) */}
        {overdueTasks > 0 && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="#991b1b"
            strokeWidth={strokeWidth}
            strokeDasharray={overdueStrokeDasharray}
            className="transition-all duration-300 hover:stroke-red-700"
            style={{ pointerEvents: 'none' }}
          />
        )}
        
        {/* Remaining section (dull green) */}
        {remainingTasks > 0 && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="#166534"
            strokeWidth={strokeWidth}
            strokeDasharray={remainingStrokeDasharray}
            style={{
              transform: `rotate(${remainingRotation}deg)`,
              transformOrigin: '48px 48px',
              pointerEvents: 'none'
            }}
            className="transition-all duration-300 hover:stroke-green-700"
          />
        )}
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none font-mono">
          {getCenterText()}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 leading-none font-mono">
          {getCenterSubtext()}
        </div>
      </div>
    </div>
  );
} 