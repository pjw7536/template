"use client"

import * as React from "react"
import { useParams } from "next/navigation"

const ActiveLineContext = React.createContext(null)

function getLineIdFromParams(params) {
  if (!params || typeof params !== "object") return null
  const raw = params.lineId
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) return raw[0] ?? null
  return null
}

export function ActiveLineProvider({ children, lineOptions }) {
  const params = useParams()
  const paramLineId = React.useMemo(() => getLineIdFromParams(params), [params])
  const fallbackLineId = React.useMemo(() => {
    if (!Array.isArray(lineOptions)) return null
    return lineOptions.find((option) => option && option.id)?.id ?? null
  }, [lineOptions])

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
    if (!Array.isArray(lineOptions) || !lineOptions.length) return
    const hasSelectedLine = selectedLineId
      ? lineOptions.some((option) => option && option.id === selectedLineId)
      : false

    if (!hasSelectedLine) {
      const nextLineId =
        (paramLineId && lineOptions.some((option) => option && option.id === paramLineId)
          ? paramLineId
          : null) ?? fallbackLineId

      if (nextLineId !== selectedLineId) {
        setSelectedLineId(nextLineId ?? null)
      }
    }
  }, [fallbackLineId, lineOptions, paramLineId, selectedLineId])

  const setLineId = React.useCallback((nextLineId) => {
    setSelectedLineId(nextLineId ?? null)
  }, [])

  const value = React.useMemo(
    () => ({
      lineId: selectedLineId ?? null,
      setLineId,
    }),
    [selectedLineId, setLineId]
  )

  return <ActiveLineContext.Provider value={value}>{children}</ActiveLineContext.Provider>
}

export function useActiveLine() {
  const context = React.useContext(ActiveLineContext)
  if (!context) {
    throw new Error("useActiveLine must be used within an ActiveLineProvider")
  }
  return context
}
