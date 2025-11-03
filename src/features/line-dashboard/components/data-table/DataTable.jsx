"use client"

/**
 * DataTable.jsx (React 19용: useMemo/useCallback 제거 버전)
 * - React Compiler가 참조 안정성과 계산 캐시를 자동 최적화해 주므로
 *   명시적 useMemo/useCallback 없이도 성능/재렌더를 안전하게 유지합니다.
 * - TanStack Table v8: 정렬/검색/컬럼 사이징/페이지네이션/퀵필터 동일 동작
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
  IconRefresh,
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

import { createColumnDefs } from "./column-defs"
import { createGlobalFilterFn } from "./filters/GlobalFilter"
import { QuickFilters } from "./filters/QuickFilters"
import { useDataTableState } from "./hooks/useDataTable"
import { useQuickFilters } from "./hooks/useQuickFilters"
import { numberFormatter, timeFormatter } from "./utils/constants"
import {
  getJustifyClass,
  getTextAlignClass,
  isNullishDisplay,
  resolveCellAlignment,
  resolveHeaderAlignment,
} from "./utils/table"

/* ────────────────────────────────────────────────────────────────────────────
 * 1) 라벨/문구 상수
 * ──────────────────────────────────────────────────────────────────────────── */
const EMPTY = {
  text: "",
  loading: "Loading rows…",
  noRows: "No rows returned.",
  noMatches: "No rows match your filter.",
}

const LABELS = {
  titleSuffix: "Line E-SOP Status",
  updated: "Updated",
  refresh: "Refresh",
  showing: "Showing",
  rows: "rows",
  filteredFrom: " (filtered from ",
  filteredFromSuffix: ")",
  rowsPerPage: "Rows per page",
  page: "Page",
  of: "of",
  goFirst: "Go to first page",
  goPrev: "Go to previous page",
  goNext: "Go to next page",
  goLast: "Go to last page",
}

/**
 * @param {{ lineId: string }} props
 */
export function DataTable({ lineId }) {
  /* ──────────────────────────────────────────────────────────────────────────
   * 2) 데이터/상태 훅
   * ──────────────────────────────────────────────────────────────────────── */
  const {
    columns,
    rows,
    filter,
    setFilter,
    sorting,
    setSorting,
    isLoadingRows,
    rowsError,
    fetchRows,
    tableMeta,
  } = useDataTableState({ lineId })

  const { sections, filters, filteredRows, activeCount, toggleFilter, resetFilters } =
    useQuickFilters(columns, rows)

  /* ──────────────────────────────────────────────────────────────────────────
   * 3) React 19 스타일: 계산은 그냥 선언
   *    - Compiler가 안전하게 캐시/참조 안정성을 보장
   * ──────────────────────────────────────────────────────────────────────── */
  const firstRow = rows[0]
  const columnDefs = React.useMemo(
    () => createColumnDefs(columns, undefined, firstRow),
    [columns, firstRow]
  )
  const globalFilterFn = React.useMemo(
    () => createGlobalFilterFn(columns),
    [columns]
  )

  /* 페이지네이션/컬럼 사이징 로컬 상태 */
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 })
  const [columnSizing, setColumnSizing] = React.useState({})

  /* TanStack Table 인스턴스 */
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

  /* 파생 값(렌더 편의) */
  const emptyStateColSpan = Math.max(table.getVisibleLeafColumns().length, 1)
  const totalLoaded = rows.length
  const filteredTotal = filteredRows.length
  const hasNoRows = !isLoadingRows && rowsError === null && columns.length === 0

  const currentPage = pagination.pageIndex + 1
  const totalPages = Math.max(table.getPageCount(), 1)
  const currentPageSize = table.getRowModel().rows.length

  /* 상단 "Updated ..." 라벨 */
  const [lastUpdatedLabel, setLastUpdatedLabel] = React.useState(null)

  /* ──────────────────────────────────────────────────────────────────────────
   * 4) Effects
   * ──────────────────────────────────────────────────────────────────────── */
  // 로딩이 끝나면 "마지막 갱신 시각" 업데이트
  React.useEffect(() => {
    if (isLoadingRows) return
    setLastUpdatedLabel(timeFormatter.format(new Date()))
  }, [isLoadingRows])

  // 필터/정렬/퀵필터가 바뀌면 1페이지로 리셋
  React.useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
  }, [filter, sorting, filters])

  // 페이지 수 감소 시 pageIndex 보정
  React.useEffect(() => {
    const maxIndex = Math.max(table.getPageCount() - 1, 0)
    setPagination((prev) => (prev.pageIndex > maxIndex ? { ...prev, pageIndex: maxIndex } : prev))
  }, [table, rows.length, filteredRows.length, pagination.pageSize])

  /* ──────────────────────────────────────────────────────────────────────────
   * 5) 이벤트 핸들러 (그냥 함수로 선언)
   * ──────────────────────────────────────────────────────────────────────── */
  function handleRefresh() {
    void fetchRows()
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * 6) 테이블 바디 렌더 (그냥 함수로 선언)
   *    - 상태별 분기: 로딩 → 에러 → 스키마 없음 → 필터 결과 없음 → 일반 행
   * ──────────────────────────────────────────────────────────────────────── */
  function renderTableBody() {
    if (isLoadingRows) {
      return (
        <TableRow>
          <TableCell
            colSpan={emptyStateColSpan}
            className="h-26 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {EMPTY.loading}
          </TableCell>
        </TableRow>
      )
    }
    if (rowsError) {
      return (
        <TableRow>
          <TableCell
            colSpan={emptyStateColSpan}
            className="h-26 text-center text-sm text-destructive"
            role="alert"
          >
            {rowsError}
          </TableCell>
        </TableRow>
      )
    }
    if (hasNoRows) {
      return (
        <TableRow>
          <TableCell
            colSpan={emptyStateColSpan}
            className="h-26 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {EMPTY.noRows}
          </TableCell>
        </TableRow>
      )
    }

    const visibleRows = table.getRowModel().rows
    if (visibleRows.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={emptyStateColSpan}
            className="h-26 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {EMPTY.noMatches}
          </TableCell>
        </TableRow>
      )
    }

    return visibleRows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => {
          const isEditable = Boolean(cell.column.columnDef.meta?.isEditable)
          const align = resolveCellAlignment(cell.column.columnDef.meta) // "left" | "center" | "right"
          const textAlignClass = getTextAlignClass(align)
          const width = cell.column.getSize()

          const raw = cell.getValue()
          const content = isNullishDisplay(raw)
            ? EMPTY.text
            : flexRender(cell.column.columnDef.cell, cell.getContext())

          return (
            <TableCell
              key={cell.id}
              data-editable={isEditable ? "true" : "false"}
              style={{ width, minWidth: width, maxWidth: width }}
              className={cn(
                "align-center",
                textAlignClass,
                !isEditable && "caret-transparent focus:outline-none"
              )}
            >
              {content}
            </TableCell>
          )
        })}
      </TableRow>
    ))
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * 7) 렌더
   * ──────────────────────────────────────────────────────────────────────── */
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 px-4 lg:px-6">
      {/* 상단: 타이틀/검색/리프레시 */}
      <div className="flex flex-wrap justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <IconDatabase className="size-5" />
            {lineId} {LABELS.titleSuffix}
            <span className="ml-2 text-[10px] font-normal text-muted-foreground self-end" aria-live="polite">
              {LABELS.updated} {lastUpdatedLabel || "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end mr-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1"
            aria-label={LABELS.refresh}
            title={LABELS.refresh}
          >
            <IconRefresh className="size-3" />
            {LABELS.refresh}
          </Button>
        </div>
      </div>

      {/* 퀵 필터 */}
      <QuickFilters
        sections={sections}
        filters={filters}
        activeCount={activeCount}
        onToggle={toggleFilter}
        onClear={resetFilters}
        globalFilterValue={filter}
        onGlobalFilterChange={setFilter}
      />

      {/* 테이블 */}
      <TableContainer className="flex-1 h-[calc(100vh-3rem)] overflow-y-auto overflow-x-auto rounded-lg border px-1">
        <Table className="table-fixed w-full" style={{ width: table.getTotalSize() }} stickyHeader>
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>

          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDirection = header.column.getIsSorted() // "asc" | "desc" | false
                  const meta = header.column.columnDef.meta
                  const align = resolveHeaderAlignment(meta)
                  const justifyClass = getJustifyClass(align)
                  const headerContent = flexRender(header.column.columnDef.header, header.getContext())
                  const width = header.getSize()

                  const ariaSort =
                    sortDirection === "asc"
                      ? "ascending"
                      : sortDirection === "desc"
                        ? "descending"
                        : "none"

                  return (
                    <TableHead
                      key={header.id}
                      className={cn("relative whitespace-nowrap sticky top-0 z-10 bg-muted")}
                      style={{ width, minWidth: width, maxWidth: width }}
                      scope="col"
                      aria-sort={ariaSort}
                    >
                      {canSort ? (
                        <button
                          className={cn("flex w-full items-center gap-1", justifyClass)}
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sort by ${String(header.column.id)}`}
                        >
                          {headerContent}
                          {sortDirection === "asc" && <IconChevronUp className="size-4" />}
                          {sortDirection === "desc" && <IconChevronDown className="size-4" />}
                        </button>
                      ) : (
                        <div className={cn("flex w-full items-center gap-1", justifyClass)}>
                          {headerContent}
                        </div>
                      )}

                      {/* 컬럼 리사이저 */}
                      <span
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize column ${String(header.column.id)}`}
                        tabIndex={-1}
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

      {/* 하단: 요약/페이지네이션 */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            {LABELS.showing} {numberFormatter.format(currentPageSize)} {LABELS.rows}
            {" of "} {numberFormatter.format(filteredTotal)} {LABELS.rows}
            {filteredTotal !== totalLoaded
              ? `${LABELS.filteredFrom}${numberFormatter.format(totalLoaded)}${LABELS.filteredFromSuffix}`
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
              aria-label={LABELS.goFirst}
              title={LABELS.goFirst}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label={LABELS.goPrev}
              title={LABELS.goPrev}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium" aria-live="polite">
              {LABELS.page} {numberFormatter.format(currentPage)} {LABELS.of} {numberFormatter.format(totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label={LABELS.goNext}
              title={LABELS.goNext}
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
              aria-label={LABELS.goLast}
              title={LABELS.goLast}
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">{LABELS.rowsPerPage}</span>
            <select
              value={pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              aria-label={LABELS.rowsPerPage}
              title={LABELS.rowsPerPage}
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
