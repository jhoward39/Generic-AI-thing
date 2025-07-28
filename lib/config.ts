// Central configuration for the task management application

export const CONFIG = {
  // Polling & Performance
  POLLING_INTERVAL_MS: 3000,

  // Timeline Layout
  TIMELINE_LEFT_MARGIN: 80,
  TASK_SPACING: 140,
  TASK_VERTICAL_OFFSET: 20,

  // Task Node Dimensions (will be calculated by layout hook)
  DEFAULT_TASK_WIDTH: 120,
  DEFAULT_TASK_HEIGHT: 60,

  // API & External Services
  PEXELS_RESULTS_PER_PAGE: 1,

  // UI Constants
  MODAL_MAX_WIDTH: "2xl", // Tailwind class
  MODAL_MAX_HEIGHT: "80vh",

  // Form Defaults
  DEFAULT_TASK_DURATION: 1,
  DEFAULT_DUE_DATE_DAYS_AHEAD: 5,

  // Animation & Transitions
  TRANSITION_DURATION: 200,

  // z-index layers
  Z_INDEX: {
    DROPDOWN: 10000, // Calendar and other dropdowns (highest)
    UI_BAR: 9999, // Fixed UI bars (add task bar, etc.) - ABOVE ALL TASKS
    MODAL: 50, // Task modals and error messages
    DRAGGED_TASK: 50, // Dragged timeline tasks
    FLOATING_UI: 30, // Loading indicators
    NORMAL_TASK: 20, // Normal timeline elements
  },
} as const;

// Type-safe config access
export type ConfigKey = keyof typeof CONFIG;
export type ConfigValue<K extends ConfigKey> = (typeof CONFIG)[K];
