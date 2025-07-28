/* ------------------------------------------------------------------
 * Timeline Constants
 * ------------------------------------------------------------------*/

export const TIMELINE_CONFIG = {
  BASE_ROW_HEIGHT: 80,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.0,
  ZOOM_STEP: 0.1,
  TASK_NODE_WIDTH: 120,
  TASK_NODE_HEIGHT: 40,
  MINIMAP_WIDTH: 40,
  SCROLL_PADDING: 7, // Days to add before/after date range
  AUTO_SCROLL_OFFSET: 30, // Days to show before/after tasks
} as const;

export const TIMELINE_STYLES = {
  ARROW_LENGTH: 9,
  STROKE_WIDTH: 2,
  MINIMAP_DOT_MIN_SIZE: 6,
  MINIMAP_DOT_MAX_SIZE: 12,
  DEPENDENCY_LINE_OFFSET: 10,
} as const;
