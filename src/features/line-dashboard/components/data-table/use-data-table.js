"use client"

import * as React from "react"

import { DEFAULT_TABLE, getDefaultSinceValue } from "./constants"
import { useCellIndicators } from "./use-cell-indicators"

function deleteKeys(record, keys) {
  if (keys.length === 0) return record
  let next = null
  keys.forEach((key) => {
    if (key in record) {
      if (next === null) next = { ...record }
      delete next[key]
    }
  })
  return next ?? record
}

function removeKey(record, key) {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

function normalizeTablePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      table: DEFAULT_TABLE,
      since: getDefaultSinceValue(),
      rowCount: 0,
      columns: [],
      rows: [],
    }
  }

  const normalizedColumns = Array.isArray(payload.columns)
    ? payload.columns.filter((value) => typeof value === "string")
    : []

  const normalizedRows = Array.isArray(payload.rows)
    ? payload.rows
        .filter((row) => row && typeof row === "object")
        .map((row) => ({ ...row }))
    : []

  const rowCountRaw = Number(payload.rowCount)
  const normalizedRowCount = Number.isFinite(rowCountRaw) ? rowCountRaw : normalizedRows.length

  const normalizedSince =
    typeof payload.since === "string"
      ? payload.since
      : payload.since === null
        ? null
        : null

  const normalizedTable = typeof payload.table === "string" ? payload.table : null

  return {
    table: normalizedTable,
    since: normalizedSince,
    rowCount: normalizedRowCount,
    columns: normalizedColumns,
    rows: normalizedRows,
  }
}

export function useDataTableState({ lineId }) {
  const [selectedTable, setSelectedTable] = React.useState(DEFAULT_TABLE)
  const [columns, setColumns] = React.useState([])
  const [rows, setRows] = React.useState([])
  const [since, setSince] = React.useState(() => getDefaultSinceValue())
  const [appliedSince, setAppliedSince] = React.useState(() => getDefaultSinceValue())
  const [filter, setFilter] = React.useState("")
  const [sorting, setSorting] = React.useState([])
  const [commentDrafts, setCommentDrafts] = React.useState({})
  const [commentEditing, setCommentEditing] = React.useState({})
  const [needToSendDrafts, setNeedToSendDrafts] = React.useState({})
  const [updatingCells, setUpdatingCells] = React.useState({})
  const [updateErrors, setUpdateErrors] = React.useState({})
  const [isLoadingRows, setIsLoadingRows] = React.useState(false)
  const [rowsError, setRowsError] = React.useState(null)
  const [lastFetchedCount, setLastFetchedCount] = React.useState(0)

  const rowsRequestRef = React.useRef(0)
  const { cellIndicators, begin, finalize } = useCellIndicators()

  const fetchRows = React.useCallback(async () => {
    const requestId = ++rowsRequestRef.current
    setIsLoadingRows(true)
    setRowsError(null)

    try {
      const effectiveSince = since && since.length > 0 ? since : getDefaultSinceValue()
      const params = new URLSearchParams({ table: selectedTable, since: effectiveSince })
      if (lineId) params.set("lineId", lineId)

      const response = await fetch(`/api/tables?${params.toString()}`, { cache: "no-store" })
      let payload = {}

      try {
        payload = await response.json()
      } catch {
        payload = {}
      }

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : `Request failed with status ${response.status}`
        throw new Error(message)
      }

      if (rowsRequestRef.current !== requestId) return

      const {
        columns: fetchedColumns,
        rows: fetchedRows,
        rowCount,
        since: applied,
        table,
      } = normalizeTablePayload(payload)

      setColumns(fetchedColumns)
      setRows(fetchedRows)
      setLastFetchedCount(rowCount)
      setAppliedSince(applied)
      setCommentDrafts({})
      setCommentEditing({})
      setNeedToSendDrafts({})

      if (table && table !== selectedTable) {
        setSelectedTable(table)
      }
    } catch (error) {
      if (rowsRequestRef.current !== requestId) return
      const message = error instanceof Error ? error.message : "Failed to load table rows"
      setRowsError(message)
      setColumns([])
      setRows([])
      setLastFetchedCount(0)
    } finally {
      if (rowsRequestRef.current === requestId) setIsLoadingRows(false)
    }
  }, [since, selectedTable, lineId])

  React.useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const clearUpdateError = React.useCallback((key) => {
    setUpdateErrors((prev) => removeKey(prev, key))
  }, [])

  const handleUpdate = React.useCallback(
    async (recordId, updates) => {
      const fields = Object.keys(updates)
      if (!recordId || fields.length === 0) return false

      const cellKeys = fields.map((field) => `${recordId}:${field}`)

      setUpdatingCells((prev) => {
        const next = { ...prev }
        cellKeys.forEach((key) => {
          next[key] = true
        })
        return next
      })

      setUpdateErrors((prev) => {
        const next = { ...prev }
        cellKeys.forEach((key) => {
          if (key in next) delete next[key]
        })
        return next
      })

      begin(cellKeys)

      let updateSucceeded = false

      try {
        const response = await fetch("/api/tables/update", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table: selectedTable,
            id: recordId,
            updates,
          }),
        })

        let payload = {}
        try {
          payload = await response.json()
        } catch {
          payload = {}
        }

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : `Failed to update (status ${response.status})`
          throw new Error(message)
        }

        setRows((previousRows) =>
          previousRows.map((row) => {
            const rowId = String(row?.id ?? "")
            if (rowId !== recordId) return row
            return {
              ...row,
              ...updates,
            }
          })
        )

        if ("comment" in updates) {
          setCommentDrafts((prev) => removeKey(prev, recordId))
          setCommentEditing((prev) => removeKey(prev, recordId))
        }

        if ("needtosend" in updates) {
          setNeedToSendDrafts((prev) => removeKey(prev, recordId))
        }

        updateSucceeded = true
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update"

        setUpdateErrors((prev) => {
          const next = { ...prev }
          cellKeys.forEach((key) => {
            next[key] = message
          })
          return next
        })

        return false
      } finally {
        setUpdatingCells((prev) => deleteKeys(prev, cellKeys))
        finalize(cellKeys, updateSucceeded ? "success" : "error")
      }
    },
    [selectedTable, begin, finalize]
  )

  const setCommentEditingState = React.useCallback((recordId, editing) => {
    if (!recordId) return
    setCommentEditing((prev) => {
      if (editing) {
        return {
          ...prev,
          [recordId]: true,
        }
      }
      return removeKey(prev, recordId)
    })
  }, [])

  const setCommentDraftValue = React.useCallback((recordId, value) => {
    if (!recordId) return
    setCommentDrafts((prev) => ({
      ...prev,
      [recordId]: value,
    }))
  }, [])

  const removeCommentDraftValue = React.useCallback((recordId) => {
    if (!recordId) return
    setCommentDrafts((prev) => removeKey(prev, recordId))
  }, [])

  const setNeedToSendDraftValue = React.useCallback((recordId, value) => {
    if (!recordId) return
    setNeedToSendDrafts((prev) => ({
      ...prev,
      [recordId]: value,
    }))
  }, [])

  const removeNeedToSendDraftValue = React.useCallback((recordId) => {
    if (!recordId) return
    setNeedToSendDrafts((prev) => removeKey(prev, recordId))
  }, [])

  const tableMeta = React.useMemo(
    () => ({
      commentDrafts,
      commentEditing,
      needToSendDrafts,
      updatingCells,
      updateErrors,
      cellIndicators,
      clearUpdateError,
      setCommentDraftValue,
      removeCommentDraftValue,
      setCommentEditingState,
      setNeedToSendDraftValue,
      removeNeedToSendDraftValue,
      handleUpdate,
    }),
    [
      commentDrafts,
      commentEditing,
      needToSendDrafts,
      updatingCells,
      updateErrors,
      cellIndicators,
      clearUpdateError,
      setCommentDraftValue,
      removeCommentDraftValue,
      setCommentEditingState,
      setNeedToSendDraftValue,
      removeNeedToSendDraftValue,
      handleUpdate,
    ]
  )

  return {
    selectedTable,
    columns,
    rows,
    since,
    setSince,
    appliedSince,
    filter,
    setFilter,
    sorting,
    setSorting,
    isLoadingRows,
    rowsError,
    lastFetchedCount,
    fetchRows,
    tableMeta,
  }
}
