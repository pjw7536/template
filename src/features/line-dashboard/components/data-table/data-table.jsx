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

import {
  dateFormatter,
  numberFormatter,
  timeFormatter,
  toDateInputValue,
} from "./constants"
import { cn } from "@/lib/utils"

import { createColumnDefs } from "./column-defs"
import { createGlobalFilterFn } from "./global-filter"
import { useDataTableState } from "./use-data-table"

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

  const columnDefs = createColumnDefs(columns)
  const globalFilterFn = createGlobalFilterFn(columns)
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
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

  const emptyStateColSpan = Math.max(table.getVisibleLeafColumns().length, 1)
  const totalLoaded = rows.length
  const hasNoRows = !isLoadingRows && rowsError === null && columns.length === 0
  const todayInputValue = toDateInputValue(new Date())
  const fromLabel = appliedFrom
    ? dateFormatter.format(new Date(`${appliedFrom}T00:00:00Z`))
    : null
  const toLabel = appliedTo
    ? dateFormatter.format(new Date(`${appliedTo}T00:00:00Z`))
    : null
  const rangeLabel = fromLabel && toLabel
    ? `between ${fromLabel} – ${toLabel}`
    : fromLabel
      ? `since ${fromLabel}`
      : toLabel
        ? `through ${toLabel}`
        : "for all time"
  const [lastUpdatedLabel, setLastUpdatedLabel] = React.useState(null)
  const currentPage = pagination.pageIndex + 1
  const totalPages = Math.max(table.getPageCount(), 1)
  const currentPageSize = table.getRowModel().rows.length

  React.useEffect(() => {
    if (isLoadingRows) return
    setLastUpdatedLabel(timeFormatter.format(new Date()))
  }, [isLoadingRows])

  React.useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0
        ? prev
        : {
          ...prev,
          pageIndex: 0,
        }
    )
  }, [filter, sorting])

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
  }, [table, rows.length, pagination.pageSize])

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-2 px-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <IconDatabase className="size-5" />
            데이터 테이블 · {lineId}
          </div>
          <p className="text-sm text-muted-foreground">
            Loaded {numberFormatter.format(totalLoaded)} rows from {selectedTable} ({rangeLabel}).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Filter rows…"
          value={filter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="sm:w-80"
          aria-label="Filter table rows"
        />

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            type="date"
            max={toDate ?? todayInputValue}
            value={fromDate ?? ""}
            onChange={(event) => setFromDate(event.target.value || null)}
            className="w-full sm:w-40"
            aria-label="From date"
          />

          <Input
            type="date"
            min={fromDate ?? undefined}
            max={todayInputValue}
            value={toDate ?? ""}
            onChange={(event) => setToDate(event.target.value || null)}
            className="w-full sm:w-40"
            aria-label="To date"
          />

          <Button variant="outline" onClick={() => void fetchRows()} disabled={isLoadingRows}>
            {isLoadingRows ? <IconLoader className="mr-2 size-4 animate-spin" /> : <IconReload className="mr-2 size-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {rowsError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <IconAlertCircle className="size-5 shrink-0" />
          <span>{rowsError}</span>
        </div>
      ) : null}

      <TableContainer className="flex-1 min-h-0 max-w-full overflow-auto rounded-lg border">
        <Table className="min-w-max" stickyHeader>
          <TableHeader className="sticky top-0 z-10 bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {canSort ? (
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === "asc" && <IconChevronUp className="size-4" />}
                          {sortDir === "desc" && <IconChevronDown className="size-4" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
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
            {isLoadingRows ? (
              <TableRow>
                <TableCell colSpan={emptyStateColSpan} className="h-24 text-center text-sm text-muted-foreground">
                  Loading rows…
                </TableCell>
              </TableRow>
            ) : rowsError ? (
              <TableRow>
                <TableCell colSpan={emptyStateColSpan} className="h-24 text-center text-sm text-destructive">
                  {rowsError}
                </TableCell>
              </TableRow>
            ) : hasNoRows ? (
              <TableRow>
                <TableCell colSpan={emptyStateColSpan} className="h-24 text-center text-sm text-muted-foreground">
                  No rows returned.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={emptyStateColSpan} className="h-24 text-center text-sm text-muted-foreground">
                  No rows match your filter.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const isEditable = Boolean(cell.column.columnDef.meta?.isEditable)
                    return (
                      <TableCell
                        key={cell.id}
                        data-editable={isEditable ? "true" : "false"}
                        className={cn(
                          "align-top",
                          !isEditable && "caret-transparent focus:outline-none"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Updated {isLoadingRows ? "just now" : lastUpdatedLabel ?? "just now"}</span>
          <span>
            Showing {numberFormatter.format(currentPageSize)} of {numberFormatter.format(totalLoaded)} rows
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
              {[10, 20, 30, 40, 50].map((size) => (
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
