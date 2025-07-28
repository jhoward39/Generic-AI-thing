import { useMemo } from "react";
import { TimelineTask } from "../../../../types";
import { TIMELINE_CONFIG } from "../utils/constants";
import { parseDate, formatDate, addDays } from "../utils/dateUtils";
import { DateRow, UseTimelineLayoutReturn } from "../types";

/**
 * Custom hook for timeline layout calculations
 * Handles date range calculation, row creation, and sizing
 */
export function useTimelineLayout(tasks: TimelineTask[], zoom: number): UseTimelineLayoutReturn {
  const dateRows = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      const start = addDays(today, -TIMELINE_CONFIG.AUTO_SCROLL_OFFSET);
      const end = addDays(today, TIMELINE_CONFIG.AUTO_SCROLL_OFFSET);

      const rows: DateRow[] = [];
      let current = new Date(start);

      while (current <= end) {
        const dateStr = formatDate(current);
        rows.push({
          date: new Date(current),
          dateStr,
          tasks: [],
        });
        current = addDays(current, 1);
      }

      return rows;
    }

    const dates = tasks.map((t) => parseDate(t.dueDate));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    const start = addDays(minDate, -TIMELINE_CONFIG.SCROLL_PADDING);
    const end = addDays(maxDate, TIMELINE_CONFIG.SCROLL_PADDING);

    const rows: DateRow[] = [];
    let current = new Date(start);

    while (current <= end) {
      const dateStr = formatDate(current);
      const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
      rows.push({
        date: new Date(current),
        dateStr,
        tasks: dayTasks,
      });
      current = addDays(current, 1);
    }

    return rows;
  }, [tasks]);

  const rowHeight = TIMELINE_CONFIG.BASE_ROW_HEIGHT * zoom;
  const totalHeight = dateRows.length * rowHeight;
  const taskNodeWidth = TIMELINE_CONFIG.TASK_NODE_WIDTH * zoom;
  const taskNodeHeight = TIMELINE_CONFIG.TASK_NODE_HEIGHT * zoom;

  return {
    dateRows,
    rowHeight,
    totalHeight,
    taskNodeWidth,
    taskNodeHeight,
  };
}
