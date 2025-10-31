"use client"

import * as React from "react"

import {
  applyQuickFilters,
  countActiveQuickFilters,
  createInitialQuickFilters,
  createQuickFilterSections,
  isMultiSelectFilter,
  syncQuickFiltersToSections,
} from "../filters/quickFilters"

export function useQuickFilters(columns, rows) {
  const sections = React.useMemo(
    () => createQuickFilterSections(columns, rows),
    [columns, rows]
  )

  const [filters, setFilters] = React.useState(() => createInitialQuickFilters())

  React.useEffect(() => {
    setFilters((previous) => syncQuickFiltersToSections(previous, sections))
  }, [sections])

  const filteredRows = React.useMemo(
    () => applyQuickFilters(rows, sections, filters),
    [rows, sections, filters]
  )

  const activeCount = React.useMemo(
    () => countActiveQuickFilters(filters),
    [filters]
  )

  const toggleFilter = React.useCallback((key, value) => {
    setFilters((previous) => {
      const isMulti = isMultiSelectFilter(key)
      if (value === null) {
        return { ...previous, [key]: isMulti ? [] : null }
      }

      if (!isMulti) {
        return { ...previous, [key]: previous[key] === value ? null : value }
      }

      const currentValues = Array.isArray(previous[key]) ? previous[key] : []
      const exists = currentValues.includes(value)
      const nextValues = exists
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]

      return { ...previous, [key]: nextValues }
    })
  }, [])

  const resetFilters = React.useCallback(
    () => setFilters(createInitialQuickFilters()),
    []
  )

  return {
    sections,
    filters,
    filteredRows,
    activeCount,
    toggleFilter,
    resetFilters,
  }
}
