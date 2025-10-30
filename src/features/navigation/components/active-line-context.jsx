"use client"

import * as React from "react"
import { useParams } from "next/navigation"

const ActiveLineContext = React.createContext(null)

function normalizeLineId(value) {
  if (value === null || value === undefined) return null
  return typeof value === "string" ? value : String(value)
}

function getLineIdFromParams(params) {
  if (!params || typeof params !== "object") return null
  const raw = params.lineId
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) return raw[0] ?? null
  return null
}

export function ActiveLineProvider({ children, lineOptions }) {
  const params = useParams()
  const paramLineId = normalizeLineId(getLineIdFromParams(params))

  const normalizedLineOptionIds = React.useMemo(() => {
    if (!Array.isArray(lineOptions)) return []
    return lineOptions
      .map((option) => {
        if (!option) return null
        if (typeof option === "string" || typeof option === "number") {
          return normalizeLineId(option)
        }
        if (option && option.id !== undefined && option.id !== null) {
          return normalizeLineId(option.id)
        }
        return null
      })
      .filter((id) => id !== null)
  }, [lineOptions])

  const fallbackLineId = normalizedLineOptionIds[0] ?? null

  const [selectedLineId, setSelectedLineId] = React.useState(() => paramLineId ?? fallbackLineId)

  React.useEffect(() => {
    if (paramLineId && paramLineId !== selectedLineId) {
      setSelectedLineId(paramLineId)
    }
  }, [paramLineId, selectedLineId])

  React.useEffect(() => {
    if (!paramLineId && !selectedLineId && fallbackLineId) {
      setSelectedLineId(fallbackLineId)
    }
  }, [fallbackLineId, paramLineId, selectedLineId])

  React.useEffect(() => {
    if (!normalizedLineOptionIds.length) return
    const hasSelectedLine = selectedLineId ? normalizedLineOptionIds.includes(selectedLineId) : false

    if (!hasSelectedLine) {
      const nextLineId =
        (paramLineId && normalizedLineOptionIds.includes(paramLineId) ? paramLineId : null) ??
        fallbackLineId

      if (nextLineId !== selectedLineId) {
        setSelectedLineId(nextLineId ?? null)
      }
    }
  }, [fallbackLineId, normalizedLineOptionIds, paramLineId, selectedLineId])

  const setLineId = React.useCallback((nextLineId) => {
    setSelectedLineId(normalizeLineId(nextLineId))
  }, [])

  const value = {
    lineId: selectedLineId ?? null,
    setLineId,
  }

  return <ActiveLineContext.Provider value={value}>{children}</ActiveLineContext.Provider>
}

export function useActiveLine() {
  const context = React.useContext(ActiveLineContext)
  if (!context) {
    throw new Error("useActiveLine must be used within an ActiveLineProvider")
  }
  return context
}
