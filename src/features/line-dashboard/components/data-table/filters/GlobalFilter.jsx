"use client"

import { Input } from "@/components/ui/input"

import { searchableValue } from "../utils/formatters"

function normalizeFilterValue(filterValue) {
  if (filterValue === null || filterValue === undefined) return ""
  return String(filterValue).trim().toLowerCase()
}

export function createGlobalFilterFn(columns) {
  const searchableKeys = Array.from(new Set(columns)).filter(Boolean)

  return (row, _columnId, filterValue) => {
    const keyword = normalizeFilterValue(filterValue)
    if (!keyword) return true

    return searchableKeys.some((key) => {
      const columnValue = row.original?.[key]
      if (columnValue === undefined || columnValue === null) return false
      return searchableValue(columnValue).includes(keyword)
    })
  }
}

export function GlobalFilter({ value, onChange, placeholder = "Search rows" }) {
  return (
    <Input
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className="h-8 w-full max-w-xs"
    />
  )
}
