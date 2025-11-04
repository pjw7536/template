import { isNumeric } from "./sorting"

const ALIGNMENT_VALUES = new Set(["left", "center", "right"])

/**
 * Determine how headers and cells should align. We first infer a sensible
 * default (numbers to the right, IDs to the right, the rest to the left) and
 * then apply optional user overrides.
 */
export function normalizeAlignment(value, fallback = "left") {
  if (typeof value !== "string") return fallback
  const lowered = value.toLowerCase()
  return ALIGNMENT_VALUES.has(lowered) ? lowered : fallback
}

export function inferDefaultAlignment(colKey, sampleValue) {
  if (typeof sampleValue === "number") return "right"
  if (isNumeric(sampleValue)) return "right"
  if (colKey && /(_?id|count|qty|amount|number)$/i.test(colKey)) return "right"
  return "left"
}

export function resolveAlignment(colKey, config, sampleValue) {
  const inferred = inferDefaultAlignment(colKey, sampleValue)
  const cellAlignment = normalizeAlignment(config.cellAlign?.[colKey], inferred)
  const headerAlignment = normalizeAlignment(config.headerAlign?.[colKey], cellAlignment)
  return { cell: cellAlignment, header: headerAlignment }
}
