"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconDatabase,
  IconLoader,
  IconReload,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { dateFormatter, numberFormatter, timeFormatter, toDateInputValue } from "./constants"
import { createColumnDefs } from "./column-defs"
import { createGlobalFilterFn } from "./global-filter"
import { useDataTableState } from "./use-data-table"

const TEXT_ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const JUSTIFY_ALIGN_CLASS = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
}

const QUICK_FILTER_DEFINITIONS = [
  {
    key: "sdwt_prod",
    label: "설비 SDWT",
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
    label: "User (SDWT)",
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
    label: "예약", // matches the column display label
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
    label: "Jira전송완료", // matches the column display label
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

function createInitialQuickFilters() {
  return QUICK_FILTER_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.key] = null
    return acc
  }, {})
}

function findMatchingColumn(columns, target) {
  if (!Array.isArray(columns)) return null
  const targetLower = target.toLowerCase()
  return (
    columns.find((column) => typeof column === "string" && column.toLowerCase() === targetLower) ?? null
  )
}

function getTextAlignClass(alignment = "left") {
  return TEXT_ALIGN_CLASS[alignment] ?? TEXT_ALIGN_CLASS.left
}

function getJustifyClass(alignment = "left") {
  return JUSTIFY_ALIGN_CLASS[alignment] ?? JUSTIFY_ALIGN_CLASS.left
}

function resolveHeaderAlignment(meta) {
  const alignment = meta?.alignment
  return alignment?.header ?? alignment?.cell ?? "left"
}

function resolveCellAlignment(meta) {
  const alignment = meta?.alignment
  return alignment?.cell ?? alignment?.header ?? "left"
}

export function DataTable({ lineId }) {
  const {
    selectedTable,
    columns,
    rows,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    appliedFrom,
    appliedTo,
    filter,
    setFilter,
    sorting,
    setSorting,
    isLoadingRows,
    rowsError,
    fetchRows,
    tableMeta,
  } = useDataTableState({ lineId })

  /* ===========================
   * 테이블 정의/상태
   * =========================== */
  const firstRow = rows[0]
  const columnDefs = React.useMemo(
    () => createColumnDefs(columns, undefined, firstRow),
    [columns, firstRow]
  )
  const globalFilterFn = React.useMemo(() => createGlobalFilterFn(columns), [columns])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [quickFilters, setQuickFilters] = React.useState(() => createInitialQuickFilters())

  const quickFilterSections = React.useMemo(() => {
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

      const options = Array.from(valueMap.entries()).map(([value, label]) => ({
        value,
        label,
      }))

      if (typeof definition.compareOptions === "function") {
        options.sort((a, b) => definition.compareOptions(a, b))
      }

      return {
        key: definition.key,
        label: definition.label,
        options,
        getValue: (row) => definition.normalizeValue(row?.[columnKey]),
      }
    }).filter(Boolean)
  }, [columns, rows])

  React.useEffect(() => {
    const sectionMap = new Map(quickFilterSections.map((section) => [section.key, section]))
    setQuickFilters((previous) => {
      let next = previous
      for (const definition of QUICK_FILTER_DEFINITIONS) {
        const section = sectionMap.get(definition.key)
        const currentValue = previous[definition.key] ?? null
        if (!section) {
          if (currentValue !== null) {
            if (next === previous) next = { ...previous }
            next[definition.key] = null
          }
          continue
        }

        if (
          currentValue !== null &&
          !section.options.some((option) => option.value === currentValue)
        ) {
          if (next === previous) next = { ...previous }
          next[definition.key] = null
        }
      }
      return next
    })
  }, [quickFilterSections])

  const filteredRows = React.useMemo(() => {
    if (quickFilterSections.length === 0) return rows

    const activeSections = quickFilterSections.filter((section) => quickFilters[section.key] !== null)
    if (activeSections.length === 0) return rows

    return rows.filter((row) =>
      activeSections.every((section) => section.getValue(row) === quickFilters[section.key])
    )
  }, [rows, quickFilterSections, quickFilters])

  /* eslint-disable react-hooks/incompatible-library */
  // 한 곳에서 모든 tanstack-table 설정을 모아둔다.
  const table = useReactTable({
    data: filteredRows,
    columns: columnDefs,
    meta: tableMeta,
    state: {
      sorting,
      globalFilter: filter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onPaginationChange: setPagination,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
  })
  /* eslint-enable react-hooks/incompatible-library */

  /* ===========================
   * 파생 정보 계산
   * =========================== */
  const todayInputValue = toDateInputValue(new Date())
  const rangeLabel = React.useMemo(() => {
    const fromLabel = appliedFrom
      ? dateFormatter.format(new Date(`${appliedFrom}T00:00:00Z`))
      : null
    const toLabel = appliedTo
      ? dateFormatter.format(new Date(`${appliedTo}T00:00:00Z`))
      : null
    if (fromLabel && toLabel) return `between ${fromLabel} – ${toLabel}`
    if (fromLabel) return `since ${fromLabel}`
    if (toLabel) return `through ${toLabel}`
    return "for all time"
  }, [appliedFrom, appliedTo])

  const emptyStateColSpan = Math.max(table.getVisibleLeafColumns().length, 1)
  const totalLoaded = rows.length
  const filteredTotal = filteredRows.length
  const hasNoRows = !isLoadingRows && rowsError === null && columns.length === 0
  const [lastUpdatedLabel, setLastUpdatedLabel] = React.useState(null)
  const currentPage = pagination.pageIndex + 1
  const totalPages = Math.max(table.getPageCount(), 1)
  const currentPageSize = table.getRowModel().rows.length

  /* ===========================
   * 사이드 이펙트
   * =========================== */
  // 로딩이 끝날 때마다 마지막 갱신 시각을 기록
  React.useEffect(() => {
    if (isLoadingRows) return
    setLastUpdatedLabel(timeFormatter.format(new Date()))
  }, [isLoadingRows])

  // 필터/정렬 변경 시 항상 첫 페이지로 이동
  React.useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0
        ? prev
        : {
          ...prev,
          pageIndex: 0,
        }
    )
  }, [filter, sorting, quickFilters])

  // 페이지 수가 줄어들면 현재 페이지를 안전한 범위로 조정
  React.useEffect(() => {
    const maxIndex = Math.max(table.getPageCount() - 1, 0)
    setPagination((prev) =>
      prev.pageIndex > maxIndex
        ? {
          ...prev,
          pageIndex: maxIndex,
        }
        : prev
    )
  }, [table, rows.length, filteredRows.length, pagination.pageSize])

  const activeQuickFilterCount = React.useMemo(
    () => Object.values(quickFilters).filter((value) => value !== null).length,
    [quickFilters]
  )

  const handleQuickFilterToggle = React.useCallback((key, value) => {
    setQuickFilters((previous) => {
      const current = previous[key]
      if (current === value) {
        if (current === null) return previous
        return { ...previous, [key]: null }
      }
      return { ...previous, [key]: value }
    })
  }, [])

  const handleQuickFilterClearAll = React.useCallback(() => {
    setQuickFilters(() => createInitialQuickFilters())
  }, [])

  /* ===========================
   * 이벤트 핸들러
   * =========================== */
  const handleRefresh = React.useCallback(() => {
    void fetchRows()
  }, [fetchRows])

  /* ===========================
   * 렌더 헬퍼
   * =========================== */
  const renderTableBody = React.useCallback(() => {
    if (isLoadingRows) {
      return (
        <TableRow>
          <TableCell colSpan={emptyStateColSpan} className="h-26 text-center text-sm text-muted-foreground">
            Loading rows…
          </TableCell>
        </TableRow>
      )
    }

    if (rowsError) {
      return (
        <TableRow>
          <TableCell colSpan={emptyStateColSpan} className="h-26 text-center text-sm text-destructive">
            {rowsError}
          </TableCell>
        </TableRow>
      )
    }

    if (hasNoRows) {
      return (
        <TableRow>
          <TableCell colSpan={emptyStateColSpan} className="h-26 text-center text-sm text-muted-foreground">
            No rows returned.
          </TableCell>
        </TableRow>
      )
    }

    const visibleRows = table.getRowModel().rows
    if (visibleRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={emptyStateColSpan} className="h-26 text-center text-sm text-muted-foreground">
            No rows match your filter.
          </TableCell>
        </TableRow>
      )
    }

    return visibleRows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => {
          const isEditable = Boolean(cell.column.columnDef.meta?.isEditable)
          const cellAlignment = resolveCellAlignment(cell.column.columnDef.meta)
          const cellTextClass = getTextAlignClass(cellAlignment)
          return (
            <TableCell
              key={cell.id}
              data-editable={isEditable ? "true" : "false"}
              className={cn(
                "align-top",
                cellTextClass,
                !isEditable && "caret-transparent focus:outline-none"
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          )
        })}
      </TableRow>
    ))
  }, [emptyStateColSpan, hasNoRows, isLoadingRows, rowsError, table])

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-2 px-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <IconDatabase className="size-5" />
            {lineId}Line E-SOP Status
          </div>
        </div>
      </div>
      {quickFilterSections.length > 0 ? (
        <div className="flex flex-col gap-3 border p-2 rounded-lg">
          {/* 상단 타이틀 + 초기화 버튼 */}
          <div className="flex items-center gap-6">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground">
              Quick Filters
            </span>
            {activeQuickFilterCount > 0 && (
              <button
                type="button"
                onClick={handleQuickFilterClearAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* ⬇️ 섹션 그룹들을 가로로 이어붙임 */}
          <div className="flex flex-wrap items-start gap-3">
            {quickFilterSections.map((section) => {
              const current = quickFilters[section.key]
              const allSelected = current === null

              return (
                <fieldset
                  key={section.key}
                  className="flex flex-col rounded-xl bg-muted/30 p-1 px-3"
                >
                  <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </legend>

                  {/* 각 그룹 안 버튼들 가로 배열 */}
                  <div className="flex flex-wrap items-center">
                    <button
                      type="button"
                      onClick={() => handleQuickFilterToggle(section.key, null)}
                      className={cn(
                        "h-8 px-3 text-xs font-medium border border-input bg-background",
                        "-ml-px first:ml-0 first:rounded-l last:rounded-r",
                        "transition-colors",
                        allSelected
                          ? "relative z-[1] border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      전체
                    </button>

                    {section.options.map((option) => {
                      const isActive = current === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleQuickFilterToggle(section.key, option.value)}
                          className={cn(
                            "h-8 px-3 text-xs font-medium border border-input bg-background",
                            "-ml-px first:ml-0 first:rounded-l last:rounded-r",
                            "transition-colors",
                            isActive
                              ? "relative z-[1] border-primary bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}
          </div>
        </div>
      ) : null}


      <TableContainer className="flex-1 h-[calc(100vh-3rem)] overflow-y-auto rounded-lg border">
        <Table className="min-w-max" stickyHeader>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  const columnMeta = header.column.columnDef.meta
                  const headerAlignment = resolveHeaderAlignment(columnMeta)
                  const headerTextClass = getTextAlignClass(headerAlignment)
                  const headerJustifyClass = getJustifyClass(headerAlignment)
                  const headerContent = flexRender(header.column.columnDef.header, header.getContext())
                  return (
                    <TableHead key={header.id} className={cn("whitespace-nowrap", headerTextClass)}>
                      {canSort ? (
                        <button
                          className={cn("flex w-full items-center gap-1", headerJustifyClass)}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {headerContent}
                          {sortDir === "asc" && <IconChevronUp className="size-4" />}
                          {sortDir === "desc" && <IconChevronDown className="size-4" />}
                        </button>
                      ) : (
                        <div className={cn("flex w-full items-center gap-1", headerJustifyClass)}>
                          {headerContent}
                        </div>
                      )}
                      <span
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none"
                      />
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {isLoadingRows ? "just now" : lastUpdatedLabel ?? "just now"}</span>
          <span>
            Showing {numberFormatter.format(currentPageSize)} of {numberFormatter.format(filteredTotal)} rows
            {filteredTotal !== totalLoaded
              ? ` (filtered from ${numberFormatter.format(totalLoaded)})`
              : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to first page"
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium">
              Page {numberFormatter.format(currentPage)} of {numberFormatter.format(totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Go to last page"
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <select
              value={pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {[15, 25, 30, 40, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}
