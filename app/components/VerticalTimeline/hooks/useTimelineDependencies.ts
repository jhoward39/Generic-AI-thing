import { useCallback } from "react";
import { TimelineTask } from "../../../../types";
import { TIMELINE_CONFIG, TIMELINE_STYLES } from "../utils/constants";
import {
  UseTimelineDependenciesParams,
  UseTimelineDependenciesReturn,
  TaskCoordinates,
  EdgePoint,
} from "../types";

/**
 * Custom hook for timeline dependency calculations
 * Handles coordinate calculations and edge point determination
 */
export function useTimelineDependencies(
  params: UseTimelineDependenciesParams,
): UseTimelineDependenciesReturn {
  const { dateRows, rowHeight, containerWidth, taskNodeWidth, taskNodeHeight } = params;

  /**
   * Calculate task coordinates for dependency line drawing
   */
  const getTaskCoordinates = useCallback(
    (task: TimelineTask): TaskCoordinates | null => {
      const row = dateRows.find((row) => row.tasks.some((t) => t.id === task.id));
      if (!row) return null;

      const rowIndex = dateRows.indexOf(row);
      const taskIndex = row.tasks.findIndex((t) => t.id === task.id);

      // Use tracked container width for consistent calculations
      const availableWidth = containerWidth - TIMELINE_CONFIG.MINIMAP_WIDTH - 32;

      // Calculate task X position within the row
      let taskX: number;
      if (row.tasks.length === 1) {
        taskX = availableWidth / 2;
      } else {
        const spacing = availableWidth / (row.tasks.length + 1);
        taskX = spacing * (taskIndex + 1);
      }

      // Calculate absolute coordinates - ensuring perfect alignment
      const absoluteX = TIMELINE_CONFIG.MINIMAP_WIDTH + taskX;
      // Use the exact same Y calculation as the HTML positioning: row center
      const absoluteY = rowIndex * rowHeight + rowHeight / 2;

      return { x: absoluteX, y: absoluteY };
    },
    [dateRows, rowHeight, containerWidth],
  );

  /**
   * Calculate clean edge connection points with proper direction vectors
   */
  const getBoxEdgePointWithDirection = useCallback(
    (
      centerX: number,
      centerY: number,
      targetX: number,
      targetY: number,
      isSource: boolean,
    ): EdgePoint => {
      const halfWidth = taskNodeWidth / 2;
      const halfHeight = taskNodeHeight / 2;
      const arrowLength = TIMELINE_STYLES.ARROW_LENGTH;

      // Calculate direction to target
      const dx = targetX - centerX;
      const dy = targetY - centerY;

      // Determine which edge to connect to based on direction and role (source vs target)
      // Prioritize vertical connections when there's any significant vertical separation
      if (Math.abs(dy) > TIMELINE_STYLES.DEPENDENCY_LINE_OFFSET) {
        // Tasks are vertically separated - use top/bottom edges
        if (isSource) {
          // For source task: if target is below, connect from bottom edge
          if (dy > 0) {
            return {
              point: { x: centerX, y: centerY + halfHeight },
              direction: { x: 0, y: 1 }, // Outward from bottom edge (down)
            };
          } else {
            return {
              point: { x: centerX, y: centerY - halfHeight },
              direction: { x: 0, y: -1 }, // Outward from top edge (up)
            };
          }
        } else {
          // For target task: offset by arrow length so line stops before box
          if (dy < 0) {
            // Source is above target - connect to top edge, offset outward by arrow length
            return {
              point: { x: centerX, y: centerY - halfHeight - arrowLength },
              direction: { x: 0, y: -1 }, // Inward to top edge (up)
            };
          } else {
            // Source is below target - connect to bottom edge, offset outward by arrow length
            return {
              point: { x: centerX, y: centerY + halfHeight + arrowLength },
              direction: { x: 0, y: 1 }, // Inward to bottom edge (down)
            };
          }
        }
      } else {
        // Tasks are horizontally separated - use left/right edges
        if (isSource) {
          // For source task: connect from the edge facing the target
          if (dx > 0) {
            return {
              point: { x: centerX + halfWidth, y: centerY },
              direction: { x: 1, y: 0 }, // Outward from right edge (right)
            };
          } else {
            return {
              point: { x: centerX - halfWidth, y: centerY },
              direction: { x: -1, y: 0 }, // Outward from left edge (left)
            };
          }
        } else {
          // For target task: offset by arrow length so line stops before box
          if (dx < 0) {
            // Source is to the left of target - connect to left edge, offset outward by arrow length
            return {
              point: { x: centerX - halfWidth - arrowLength, y: centerY },
              direction: { x: -1, y: 0 }, // Inward to left edge (left)
            };
          } else {
            // Source is to the right of target - connect to right edge, offset outward by arrow length
            return {
              point: { x: centerX + halfWidth + arrowLength, y: centerY },
              direction: { x: 1, y: 0 }, // Inward to right edge (right)
            };
          }
        }
      }
    },
    [taskNodeWidth, taskNodeHeight],
  );

  return {
    getTaskCoordinates,
    getBoxEdgePointWithDirection,
  };
}
