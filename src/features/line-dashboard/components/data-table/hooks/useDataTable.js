"use client"

import * as React from "react"

import { DEFAULT_TABLE, getDefaultFromValue, getDefaultToValue } from "../utils/constants"
import { composeEqpChamber, normalizeTablePayload } from "../../../utils"
import { useCellIndicators } from "./useCellIndicators"

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

export function useDataTableState({ lineId }) {
  const [selectedTable, setSelectedTable] = React.useState(DEFAULT_TABLE)
  const [columns, setColumns] = React.useState([])
  const [rows, setRows] = React.useState([])
  const [fromDate, setFromDate] = React.useState(() => getDefaultFromValue())
  const [toDate, setToDate] = React.useState(() => getDefaultToValue())
  const [appliedFrom, setAppliedFrom] = React.useState(() => getDefaultFromValue())
  const [appliedTo, setAppliedTo] = React.useState(() => getDefaultToValue())
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
      let effectiveFrom = fromDate && fromDate.length > 0 ? fromDate : null
      let effectiveTo = toDate && toDate.length > 0 ? toDate : null

      if (effectiveFrom && effectiveTo) {
        const fromTime = new Date(`${effectiveFrom}T00:00:00Z`).getTime()
        const toTime = new Date(`${effectiveTo}T23:59:59Z`).getTime()
        if (Number.isFinite(fromTime) && Number.isFinite(toTime) && fromTime > toTime) {
          ;[effectiveFrom, effectiveTo] = [effectiveTo, effectiveFrom]
        }
      }

      const params = new URLSearchParams({ table: selectedTable })
      if (effectiveFrom) params.set("from", effectiveFrom)
      if (effectiveTo) params.set("to", effectiveTo)
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

      const defaults = {
        table: DEFAULT_TABLE,
        from: getDefaultFromValue(),
        to: getDefaultToValue(),
      }
      const {
        columns: fetchedColumns,
        rows: fetchedRows,
        rowCount,
        from: appliedFromValue,
        to: appliedToValue,
        table,
      } = normalizeTablePayload(payload, defaults)

      const baseColumns = fetchedColumns.filter(
        (column) => column && column.toLowerCase() !== "id"
      )

      const composedRows = fetchedRows.map((row) => {
        const eqpId = row?.eqp_id ?? row?.EQP_ID ?? row?.EqpId
        const chamber = row?.chamber_ids ?? row?.CHAMBER_IDS ?? row?.ChamberIds
        return {
          ...row,
          EQP_CB: composeEqpChamber(eqpId, chamber),
        }
      })

      const columnsWithoutOriginals = baseColumns.filter((column) => {
        const normalized = column.toLowerCase()
        return normalized !== "eqp_id" && normalized !== "chamber_ids"
      })

      const nextColumns = columnsWithoutOriginals.includes("EQP_CB")
        ? columnsWithoutOriginals
        : ["EQP_CB", ...columnsWithoutOriginals]

      setColumns(nextColumns)
      setRows(composedRows)
      setLastFetchedCount(rowCount)
      setAppliedFrom(appliedFromValue ?? null)
      setAppliedTo(appliedToValue ?? null)
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
  }, [fromDate, toDate, selectedTable, lineId])

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

  const tableMeta = {
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
  }

  return {
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
    lastFetchedCount,
    fetchRows,
    tableMeta,
  }
}
