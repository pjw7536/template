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
import { GlobalFilter, createGlobalFilterFn } from "./filters/GlobalFilter"
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

export function DataTable({ lineId }) {
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

  const { sections, filters, filteredRows, activeCount, toggleFilter, resetFilters } = useQuickFilters(columns, rows)

  const firstRow = rows[0]
  const columnDefs = React.useMemo(
    () => createColumnDefs(columns, undefined, firstRow),
    [columns, firstRow]
  )
  const globalFilterFn = React.useMemo(() => createGlobalFilterFn(columns), [columns])

  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 15 })
  const [columnSizing, setColumnSizing] = React.useState({})

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
  }, [filter, sorting, filters])

  React.useEffect(() => {
    const maxIndex = Math.max(table.getPageCount() - 1, 0)
    setPagination((prev) => (prev.pageIndex > maxIndex ? { ...prev, pageIndex: maxIndex } : prev))
  }, [table, rows.length, filteredRows.length, pagination.pageSize])

  const handleRefresh = React.useCallback(() => {
    void fetchRows()
  }, [fetchRows])

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
          const width = cell.column.getSize()

          const raw = cell.getValue()
          const content = isNullishDisplay(raw)
            ? ""
            : flexRender(cell.column.columnDef.cell, cell.getContext())

          return (
            <TableCell
              key={cell.id}
              data-editable={isEditable ? "true" : "false"}
              style={{ width, minWidth: width, maxWidth: width }}
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

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <IconDatabase className="size-5" />
            {lineId}Line E-SOP Status
            <span className="ml-2 text-[10px] font-normal text-muted-foreground self-end">
              Updated {lastUpdatedLabel}
            </span>
          </div>

        </div>

        <div className="flex self-end gap-2">
          <GlobalFilter value={filter} onChange={setFilter} />
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1">
            <IconRefresh className="size-3" />
            Refresh
          </Button>
        </div>
      </div>

      <QuickFilters
        sections={sections}
        filters={filters}
        activeCount={activeCount}
        onToggle={toggleFilter}
        onClear={resetFilters}
      />

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
                  const sortDirection = header.column.getIsSorted()
                  const columnMeta = header.column.columnDef.meta
                  const headerAlignment = resolveHeaderAlignment(columnMeta)
                  const headerJustifyClass = getJustifyClass(headerAlignment)
                  const headerContent = flexRender(header.column.columnDef.header, header.getContext())
                  const width = header.getSize()

                  return (
                    <TableHead
                      key={header.id}
                      className={cn("relative whitespace-nowrap sticky top-0 z-10 bg-muted")}
                      style={{ width, minWidth: width, maxWidth: width }}
                    >
                      {canSort ? (
                        <button
                          className={cn("flex w-full items-center gap-1", headerJustifyClass)}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {headerContent}
                          {sortDirection === "asc" && <IconChevronUp className="size-4" />}
                          {sortDirection === "desc" && <IconChevronDown className="size-4" />}
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

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing {numberFormatter.format(currentPageSize)} of {numberFormatter.format(filteredTotal)} rows
            {filteredTotal !== totalLoaded ? ` (filtered from ${numberFormatter.format(totalLoaded)})` : ""}
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
