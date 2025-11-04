/**
 * Sorting helpers keep TanStack Table sort functions small and reusable.
 */
export function isNumeric(value) {
  if (value == null || value === "") return false
  const numeric = Number(value)
  return Number.isFinite(numeric)
}

export function tryDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "string") {
    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? null : new Date(timestamp)
  }
  return null
}

export function cmpText(a, b) {
  const left = a == null ? "" : String(a)
  const right = b == null ? "" : String(b)
  return left.localeCompare(right)
}

export function cmpNumber(a, b) {
  const left = Number(a)
  const right = Number(b)
  if (!Number.isFinite(left) && !Number.isFinite(right)) return 0
  if (!Number.isFinite(left)) return -1
  if (!Number.isFinite(right)) return 1
  return left - right
}

export function cmpDate(a, b) {
  const left = tryDate(a)
  const right = tryDate(b)
  if (!left && !right) return 0
  if (!left) return -1
  if (!right) return 1
  return left.getTime() - right.getTime()
}

export function autoSortType(sample) {
  if (sample == null) return "text"
  if (isNumeric(sample)) return "number"
  if (tryDate(sample)) return "datetime"
  return "text"
}

export function getSortingFnForKey(colKey, config, sampleValue) {
  const requestedType = config.sortTypes?.[colKey] ?? "auto"
  const sortType = requestedType === "auto" ? autoSortType(sampleValue) : requestedType

  if (sortType === "number") {
    return (rowA, rowB) => cmpNumber(rowA.getValue(colKey), rowB.getValue(colKey))
  }

  if (sortType === "datetime") {
    return (rowA, rowB) => cmpDate(rowA.getValue(colKey), rowB.getValue(colKey))
  }

  return (rowA, rowB) => cmpText(rowA.getValue(colKey), rowB.getValue(colKey))
}
