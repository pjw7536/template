export const DEFAULT_TABLE = "drone_sop_v3"
export const DEFAULT_RANGE_DAYS = 3

const DAY_IN_MS = 86_400_000

export const toDateInputValue = (date) => date.toISOString().split("T")[0]

export const getDefaultFromValue = () => {
  const now = new Date()
  const from = new Date(now.getTime() - DEFAULT_RANGE_DAYS * DAY_IN_MS)
  return toDateInputValue(from)
}

export const getDefaultToValue = () => toDateInputValue(new Date())

export const SAVING_DELAY_MS = 180
export const MIN_SAVING_VISIBLE_MS = 500
export const SAVED_VISIBLE_MS = 800

export const STEP_COLUMN_KEYS = [
  "main_step",
  "metro_steps",
  "metro_current_step",
  "metro_end_step",
  "custom_end_step",
  "inform_step",
]

export const STEP_COLUMN_KEY_SET = new Set(STEP_COLUMN_KEYS)

export const numberFormatter = new Intl.NumberFormat("en-US")
export const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
