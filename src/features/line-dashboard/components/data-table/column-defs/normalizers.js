/**
 * Helper functions that coerce raw cell values into predictable formats.
 * Centralising them keeps rendering logic tidy and documents the various
 * shapes that arrive from the API.
 */

export function toHttpUrl(raw) {
  if (raw == null) return null
  const value = String(raw).trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

export function getRecordId(rowOriginal) {
  const rawId = rowOriginal?.id
  if (rawId === undefined || rawId === null) return null
  return String(rawId)
}

export function normalizeJiraKey(raw) {
  if (raw == null) return null
  const key = String(raw).trim().toUpperCase()
  return /^[A-Z0-9]+-\d+$/.test(key) ? key : null
}

export function buildJiraBrowseUrl(jiraKey) {
  const key = normalizeJiraKey(jiraKey)
  return key ? `https://jira.apple.net/browse/${key}` : null
}

export function normalizeComment(raw) {
  if (typeof raw === "string") return raw
  if (raw == null) return ""
  return String(raw)
}

export function normalizeNeedToSend(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const coerced = Number(raw)
  return Number.isFinite(coerced) ? coerced : 0
}

export function normalizeBinaryFlag(raw) {
  if (raw === 1 || raw === "1") return true
  if (raw === "." || raw === "" || raw == null) return false
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric === 1 : false
}

export function normalizeStatus(raw) {
  if (raw == null) return null
  return String(raw).trim().toUpperCase().replace(/\s+/g, "_")
}
