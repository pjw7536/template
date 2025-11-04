import { DEFAULT_MIN_WIDTH } from "./constants"

/**
 * Estimate the natural width of a text column using the first line of each
 * value. We treat wide unicode characters as double width so that Hangul and
 * similar scripts render comfortably.
 */
export function computeAutoTextWidthFromRows(
  rows,
  key,
  { charUnitPx = 7, cellPadding = 40, min = DEFAULT_MIN_WIDTH, max = 720 } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxUnits = 0

  for (const row of rows) {
    const value = row?.[key]
    const str = value == null ? "" : String(value)
    const line = str.replace(/\t/g, "    ").split(/\r?\n/)[0] ?? ""
    let units = 0

    for (const ch of Array.from(line)) {
      const codePoint = ch.codePointAt(0) ?? 0
      if (codePoint === 0) continue
      if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) continue
      units += codePoint <= 0xff ? 1 : 2
    }

    if (units > maxUnits) maxUnits = units
  }

  if (maxUnits === 0) return null
  const width = Math.ceil(maxUnits * charUnitPx + cellPadding)
  return Math.max(min, Math.min(width, max))
}
