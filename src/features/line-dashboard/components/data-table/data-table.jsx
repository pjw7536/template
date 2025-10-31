"use client"

/**
 * ✅ 요구사항 반영
 * - UI 변경 없이 기능만 수정
 * - status / sdwt_prod 필터는 다중 선택 가능 (나머지는 단일 선택 유지)
 * - "전체" 버튼 로직: 단일선택 → null / 다중선택 → 빈 배열([])
 * - 하이라이트(선택색)도 동일 UI로 유지하되, 내부 비교만 배열 포함여부로 변경
 */

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
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconDatabase,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

/* =========================
 * 정렬/정렬방향 유틸 클래스
 * ========================= */
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
const getTextAlignClass = (alignment = "left") => TEXT_ALIGN_CLASS[alignment] ?? TEXT_ALIGN_CLASS.left
const getJustifyClass = (alignment = "left") => JUSTIFY_ALIGN_CLASS[alignment] ?? JUSTIFY_ALIGN_CLASS.left
const resolveHeaderAlignment = (meta) => meta?.alignment?.header ?? meta?.alignment?.cell ?? "left"
const resolveCellAlignment = (meta) => meta?.alignment?.cell ?? meta?.alignment?.header ?? "left"

/* =========================
 * 퀵필터 정의(원본 유지)
 * ========================= */
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

/* =========================
 * ⭐ 다중 선택 허용 키만 지정
 *    - UI는 그대로, 동작만 변경
 * ========================= */
const MULTI_KEYS = new Set(["status", "sdwt_prod"])

/* 초기값 생성: 단일(null) / 다중([]) */
function createInitialQuickFilters() {
  return QUICK_FILTER_DEFINITIONS.reduce((acc, def) => {
    acc[def.key] = MULTI_KEYS.has(def.key) ? [] : null
    return acc
  }, {})
}

function findMatchingColumn(columns, target) {
  if (!Array.isArray(columns)) return null
  const targetLower = target.toLowerCase()
  return columns.find((c) => typeof c === "string" && c.toLowerCase() === targetLower) ?? null
}

/* =========================
 * Null 표시 규칙 (공통)
 * ========================= */
function isNullishDisplay(value) {
  // null, undefined, "null" (대소문자/공백 무시) → 빈칸
  if (value == null) return true
  if (typeof value === "string" && value.trim().toLowerCase() === "null") return true
  return false
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

  /* =========================
   * 1) Column/Filter 메모
   * ========================= */
  const firstRow = rows[0]
  const columnDefs = React.useMemo(
    () => createColumnDefs(columns, undefined, firstRow),
    [columns, firstRow]
  )
  const globalFilterFn = React.useMemo(() => createGlobalFilterFn(columns), [columns])

  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 })
  const [quickFilters, setQuickFilters] = React.useState(() => createInitialQuickFilters())

  /* =========================
   * 2) 컬럼 사이징 상태 연결
   * ========================= */
  const [columnSizing, setColumnSizing] = React.useState({})

  /* =========================
   * 3) 퀵필터 섹션 계산 (원본 로직 유지)
   * ========================= */
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

      const options = Array.from(valueMap.entries()).map(([value, label]) => ({ value, label }))
      if (typeof definition.compareOptions === "function") {
        options.sort((a, b) => definition.compareOptions(a, b))
      }

      return {
        key: definition.key,
        label: definition.label,
        options,
        getValue: (row) => definition.normalizeValue(row?.[columnKey]),
        isMulti: MULTI_KEYS.has(definition.key), // ⭐ 섹션별 다중 여부
      }
    }).filter(Boolean)
  }, [columns, rows])

  /* =========================
   * 4) 퀵필터 유효성 유지 (다중/단일 모두 지원)
   * ========================= */
  React.useEffect(() => {
    const sectionMap = new Map(quickFilterSections.map((s) => [s.key, s]))
    setQuickFilters((prev) => {
      let next = prev
      for (const def of QUICK_FILTER_DEFINITIONS) {
        const section = sectionMap.get(def.key)
        const current = prev[def.key]

        // 섹션이 사라졌으면 초기화
        if (!section) {
          const resetVal = MULTI_KEYS.has(def.key) ? [] : null
          if (JSON.stringify(current) !== JSON.stringify(resetVal)) {
            if (next === prev) next = { ...prev }
            next[def.key] = resetVal
          }
          continue
        }

        // 옵션 변경 시 현재 선택값 정리
        const validSet = new Set(section.options.map((o) => o.value))
        if (section.isMulti) {
          const curArr = Array.isArray(current) ? current : []
          const filtered = curArr.filter((v) => validSet.has(v))
          if (curArr.length !== filtered.length) {
            if (next === prev) next = { ...prev }
            next[def.key] = filtered
          }
        } else {
          if (current !== null && !validSet.has(current)) {
            if (next === prev) next = { ...prev }
            next[def.key] = null
          }
        }
      }
      return next
    })
  }, [quickFilterSections])

  /* =========================
   * 5) 퀵필터 적용 결과
   *    - 단일: 값이 null이면 미적용
   *    - 다중: 배열 길이 0이면 미적용
   * ========================= */
  const filteredRows = React.useMemo(() => {
    if (quickFilterSections.length === 0) return rows
    return rows.filter((row) =>
      quickFilterSections.every((s) => {
        const cur = quickFilters[s.key]
        const rowVal = s.getValue(row)
        if (s.isMulti) {
          return Array.isArray(cur) && cur.length > 0 ? cur.includes(rowVal) : true
        }
        return cur !== null ? rowVal === cur : true
      })
    )
  }, [rows, quickFilterSections, quickFilters])

  /* =========================
   * 6) 테이블 인스턴스
   * ========================= */
  /* eslint-disable react-hooks/incompatible-library */
  const table = useReactTable({
    data: filteredRows,
    columns: columnDefs,
    meta: tableMeta,
    state: {
      sorting,
      globalFilter: filter,
      pagination,
      columnSizing,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
  })
  /* eslint-enable react-hooks/incompatible-library */

  /* =========================
   * 파생 상태
   * ========================= */
  const emptyStateColSpan = Math.max(table.getVisibleLeafColumns().length, 1)
  const totalLoaded = rows.length
  const filteredTotal = filteredRows.length
  const hasNoRows = !isLoadingRows && rowsError === null && columns.length === 0
  const [lastUpdatedLabel, setLastUpdatedLabel] = React.useState(null)
  const currentPage = pagination.pageIndex + 1
  const totalPages = Math.max(table.getPageCount(), 1)
  const currentPageSize = table.getRowModel().rows.length

  React.useEffect(() => {
    if (isLoadingRows) return
    setLastUpdatedLabel(timeFormatter.format(new Date()))
  }, [isLoadingRows])

  React.useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
  }, [filter, sorting, quickFilters])

  React.useEffect(() => {
    const maxIndex = Math.max(table.getPageCount() - 1, 0)
    setPagination((prev) => (prev.pageIndex > maxIndex ? { ...prev, pageIndex: maxIndex } : prev))
  }, [table, rows.length, filteredRows.length, pagination.pageSize])

  const activeQuickFilterCount = React.useMemo(
    () =>
      Object.entries(quickFilters).reduce((sum, [key, val]) => {
        return sum + (MULTI_KEYS.has(key) ? (Array.isArray(val) ? val.length : 0) : val !== null ? 1 : 0)
      }, 0),
    [quickFilters]
  )

  /* =========================
   * 7) 핸들러 (UI 불변)
   * ========================= */
  const handleQuickFilterToggle = React.useCallback((key, value) => {
    setQuickFilters((prev) => {
      const isMulti = MULTI_KEYS.has(key)

      // "전체" 버튼: value === null
      if (value === null) {
        return { ...prev, [key]: isMulti ? [] : null } // ⭐ 핵심
      }

      if (!isMulti) {
        // 단일
        return { ...prev, [key]: prev[key] === value ? null : value }
      }

      // 다중
      const curArr = Array.isArray(prev[key]) ? prev[key] : []
      const exists = curArr.includes(value)
      const nextArr = exists ? curArr.filter((v) => v !== value) : [...curArr, value]
      return { ...prev, [key]: nextArr }
    })
  }, [])

  const handleQuickFilterClearAll = React.useCallback(
    () => setQuickFilters(() => createInitialQuickFilters()),
    []
  )

  const handleRefresh = React.useCallback(() => {
    void fetchRows()
  }, [fetchRows])

  /* =========================
   * 8) 본문 렌더러 (원본 유지)
   * ========================= */
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
          const w = cell.column.getSize()

          // ✅ null → 빈칸 처리 (문자열 "null" 포함)
          const raw = cell.getValue()
          const content = isNullishDisplay(raw)
            ? "" // 빈칸
            : flexRender(cell.column.columnDef.cell, cell.getContext())

          return (
            <TableCell
              key={cell.id}
              data-editable={isEditable ? "true" : "false"}
              style={{ width: w, minWidth: w, maxWidth: w }}
              className={cn(
                "align-center",
                cellTextClass,
                !isEditable && "caret-transparent focus:outline-none"
              )}
            >
              {content}
            </TableCell>
          )
        })}
      </TableRow>
    ))

  }, [emptyStateColSpan, hasNoRows, isLoadingRows, rowsError, table])

  /* =========================
   * 9) 렌더 (퀵필터 UI 그대로)
   * ========================= */
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

      {/* 퀵필터 (UI 동일) */}
      {quickFilterSections.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border p-2">
          <div className="flex items-center gap-6">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground">Quick Filters</span>
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

          <div className="flex flex-wrap items-start gap-3">
            {quickFilterSections.map((section) => {
              const isMulti = section.isMulti
              const current = quickFilters[section.key]
              const selectedValues = isMulti ? (Array.isArray(current) ? current : []) : [current].filter(Boolean)
              const allSelected = isMulti ? selectedValues.length === 0 : current === null

              return (
                <fieldset key={section.key} className="flex flex-col rounded-xl bg-muted/30 p-1 px-3">
                  <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </legend>

                  <div className="flex flex-wrap items-center">
                    {/* 전체 버튼: 다중 → [] / 단일 → null */}
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
                      // ⭐ 하이라이트 조건만 배열 포함 여부로 확장
                      const isActive = selectedValues.includes(option.value)
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

      {/* 테이블 (원본 유지) */}
      <TableContainer className="flex-1 h-[calc(100vh-3rem)] overflow-y-auto overflow-x-auto rounded-lg border px-1">
        <Table
          className="table-fixed w-full"
          style={{ width: table.getTotalSize() }}
          stickyHeader
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((col) => (
              <col key={col.id} style={{ width: col.getSize() }} />
            ))}
          </colgroup>

          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  const columnMeta = header.column.columnDef.meta
                  const headerAlignment = resolveHeaderAlignment(columnMeta)
                  const headerJustifyClass = getJustifyClass(headerAlignment)
                  const headerContent = flexRender(header.column.columnDef.header, header.getContext())
                  const w = header.getSize()

                  return (
                    <TableHead
                      key={header.id}
                      className={cn("relative whitespace-nowrap sticky top-0 z-10 bg-muted")}
                      style={{ width: w, minWidth: w, maxWidth: w }}
                    >
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

          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </TableContainer>

      {/* 하단 상태/페이징 (원본과 동일) */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing {numberFormatter.format(currentPageSize)} of {numberFormatter.format(filteredTotal)} rows
            {filteredTotal !== totalLoaded ? ` (filtered from ${numberFormatter.format(totalLoaded)})` : ""}
          </span>
          <span>(Updated {isLoadingRows ? "just now" : lastUpdatedLabel ?? "just now"})</span>
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
              onChange={(e) => table.setPageSize(Number(e.target.value))}
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
