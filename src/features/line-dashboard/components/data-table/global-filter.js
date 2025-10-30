import { searchableValue } from "./utils"

export const createGlobalFilterFn = (columns) =>
  (row, _columnId, filterValue) => {
    if (!filterValue) return true
    const lc = String(filterValue).toLowerCase()
    return columns.some((key) => {
      const value = row.original?.[key]
      return searchableValue(value).includes(lc)
    })
  }
