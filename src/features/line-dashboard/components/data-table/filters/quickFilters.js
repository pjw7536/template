const MULTI_SELECT_KEYS = new Set(["status", "sdwt_prod"])

function findMatchingColumn(columns, target) {
  if (!Array.isArray(columns)) return null
  const targetLower = target.toLowerCase()
  return (
    columns.find((column) => typeof column === "string" && column.toLowerCase() === targetLower) ?? null
  )
}

const QUICK_FILTER_DEFINITIONS = [
  {
    key: "sdwt_prod",
    label: "설비분임조",
    resolveColumn: (columns) => findMatchingColumn(columns, "sdwt_prod"),
    normalizeValue: (value) => {
      if (value == null) return null
      const trimmed = String(value).trim()
      return trimmed.length > 0 ? trimmed : null
    },
    formatValue: (value) => value,
    compareOptions: (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  },
  {
    key: "user_sdwt_prod",
    label: "Engr분임조",
    resolveColumn: (columns) => findMatchingColumn(columns, "user_sdwt_prod"),
    normalizeValue: (value) => {
      if (value == null) return null
      const trimmed = String(value).trim()
      return trimmed.length > 0 ? trimmed : null
    },
    formatValue: (value) => value,
    compareOptions: (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  },
  {
    key: "status",
    label: "Status",
    resolveColumn: (columns) => findMatchingColumn(columns, "status"),
    normalizeValue: (value) => {
      if (value == null) return null
      const normalized = String(value).trim()
      return normalized.length > 0 ? normalized.toUpperCase() : null
    },
    formatValue: (value) => value,
    compareOptions: (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  },
  {
    key: "needtosend",
    label: "예약",
    resolveColumn: (columns) => findMatchingColumn(columns, "needtosend"),
    normalizeValue: (value) => {
      if (value === 1 || value === "1") return "1"
      if (value === 0 || value === "0") return "0"
      if (value == null || value === "") return "0"
      const numeric = Number(value)
      if (Number.isFinite(numeric)) return numeric === 1 ? "1" : "0"
      return "0"
    },
    formatValue: (value) => (value === "1" ? "Yes" : "No"),
    compareOptions: (a, b) => {
      if (a.value === b.value) return 0
      if (a.value === "1") return -1
      if (b.value === "1") return 1
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    },
  },
  {
    key: "send_jira",
    label: "Jira전송완료",
    resolveColumn: (columns) => findMatchingColumn(columns, "send_jira"),
    normalizeValue: (value) => {
      if (value === 1 || value === "1") return "1"
      if (value === 0 || value === "0") return "0"
      if (value == null || value === "") return "0"
      const numeric = Number(value)
      if (Number.isFinite(numeric)) return numeric === 1 ? "1" : "0"
      return "0"
    },
    formatValue: (value) => (value === "1" ? "Yes" : "No"),
    compareOptions: (a, b) => {
      if (a.value === b.value) return 0
      if (a.value === "1") return -1
      if (b.value === "1") return 1
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    },
  },
]

export function createInitialQuickFilters() {
  return QUICK_FILTER_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.key] = MULTI_SELECT_KEYS.has(definition.key) ? [] : null
    return acc
  }, {})
}

export function createQuickFilterSections(columns, rows) {
  return QUICK_FILTER_DEFINITIONS.map((definition) => {
    const columnKey = definition.resolveColumn(columns)
    if (!columnKey) return null

    const valueMap = new Map()
    rows.forEach((row) => {
      const rawValue = row?.[columnKey]
      const normalized = definition.normalizeValue(rawValue)
      if (normalized === null) return
      if (!valueMap.has(normalized)) {
        valueMap.set(normalized, definition.formatValue(normalized, rawValue))
      }
    })

    if (valueMap.size === 0) return null

    const options = Array.from(valueMap.entries()).map(([value, label]) => ({ value, label }))
    if (typeof definition.compareOptions === "function") {
      options.sort((a, b) => definition.compareOptions(a, b))
    }

    return {
      key: definition.key,
      label: definition.label,
      options,
      getValue: (row) => definition.normalizeValue(row?.[columnKey]),
      isMulti: MULTI_SELECT_KEYS.has(definition.key),
    }
  }).filter(Boolean)
}

export function syncQuickFiltersToSections(previousFilters, sections) {
  const sectionMap = new Map(sections.map((section) => [section.key, section]))
  let nextFilters = previousFilters

  QUICK_FILTER_DEFINITIONS.forEach((definition) => {
    const section = sectionMap.get(definition.key)
    const current = previousFilters[definition.key]
    const shouldBeMulti = MULTI_SELECT_KEYS.has(definition.key)

    if (!section) {
      const resetValue = shouldBeMulti ? [] : null
      if (JSON.stringify(current) !== JSON.stringify(resetValue)) {
        if (nextFilters === previousFilters) nextFilters = { ...previousFilters }
        nextFilters[definition.key] = resetValue
      }
      return
    }

    const validValues = new Set(section.options.map((option) => option.value))
    if (section.isMulti) {
      const currentArray = Array.isArray(current) ? current : []
      const filtered = currentArray.filter((value) => validValues.has(value))
      if (filtered.length !== currentArray.length) {
        if (nextFilters === previousFilters) nextFilters = { ...previousFilters }
        nextFilters[definition.key] = filtered
      }
    } else if (current !== null && !validValues.has(current)) {
      if (nextFilters === previousFilters) nextFilters = { ...previousFilters }
      nextFilters[definition.key] = null
    }
  })

  return nextFilters
}

export function applyQuickFilters(rows, sections, filters) {
  if (sections.length === 0) return rows
  return rows.filter((row) =>
    sections.every((section) => {
      const current = filters[section.key]
      const rowValue = section.getValue(row)
      if (section.isMulti) {
        return Array.isArray(current) && current.length > 0 ? current.includes(rowValue) : true
      }
      return current !== null ? rowValue === current : true
    })
  )
}

export function countActiveQuickFilters(filters) {
  return Object.entries(filters).reduce((sum, [key, value]) => {
    if (MULTI_SELECT_KEYS.has(key)) {
      return sum + (Array.isArray(value) ? value.length : 0)
    }
    return sum + (value !== null ? 1 : 0)
  }, 0)
}

export function isMultiSelectFilter(key) {
  return MULTI_SELECT_KEYS.has(key)
}

export { QUICK_FILTER_DEFINITIONS }
