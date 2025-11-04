/**
 * Shared numeric constants used while building table column definitions.
 * Keeping them in a single module makes it easy to tune layout defaults
 * without hunting through the logic files.
 */

export const DEFAULT_MIN_WIDTH = 72
export const DEFAULT_MAX_WIDTH = 480
export const DEFAULT_TEXT_WIDTH = 140
export const DEFAULT_NUMBER_WIDTH = 110
export const DEFAULT_ID_WIDTH = 130
export const DEFAULT_DATE_WIDTH = 100
export const DEFAULT_BOOL_ICON_WIDTH = 70
export const DEFAULT_PROCESS_FLOW_WIDTH = 360

// Parameters that shape the process flow column width estimation.
export const PROCESS_FLOW_NODE_BLOCK_WIDTH = 50
export const PROCESS_FLOW_ARROW_GAP_WIDTH = 14
export const PROCESS_FLOW_CELL_SIDE_PADDING = 24
export const PROCESS_FLOW_MIN_WIDTH = Math.max(DEFAULT_MIN_WIDTH, 220)
export const PROCESS_FLOW_MAX_WIDTH = 1200
