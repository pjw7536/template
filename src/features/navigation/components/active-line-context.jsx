"use client"

import * as React from "react"
import { useParams } from "next/navigation"

const ActiveLineContext = React.createContext(null)

/** 숫자/문자 혼합으로 들어오는 라인 ID를 문자열로 통일 */
function normalizeLineId(value) {
  if (value === null || value === undefined) return null
  return typeof value === "string" ? value : String(value)
}

/** URL 파라미터(lineId)를 안전하게 추출 */
function getLineIdFromParams(params) {
  if (!params || typeof params !== "object") return null
  const raw = params.lineId
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) return raw[0] ?? null
  return null
}

/** 라인 옵션 배열에서 ID 목록을 뽑아낸다. (문자열/숫자/객체 혼합 대응) */
function normalizeLineOptionIds(lineOptions) {
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
}

export function ActiveLineProvider({ children, lineOptions }) {
  const params = useParams()
  const paramLineId = normalizeLineId(getLineIdFromParams(params))

  const availableLineIds = React.useMemo(
    () => normalizeLineOptionIds(lineOptions),
    [lineOptions]
  )
  const fallbackLineId = availableLineIds[0] ?? null

  // URL 우선 → fallback 순서로 초기 라인 선택
  const [selectedLineId, setSelectedLineId] = React.useState(
    () => paramLineId ?? fallbackLineId
  )

  // URL 파라미터가 바뀌면 즉시 동기화
  React.useEffect(() => {
    if (paramLineId && paramLineId !== selectedLineId) {
      setSelectedLineId(paramLineId)
    }
  }, [paramLineId, selectedLineId])

  // URL 파라미터가 없을 때는 fallback을 자동 적용
  React.useEffect(() => {
    if (!paramLineId && !selectedLineId && fallbackLineId) {
      setSelectedLineId(fallbackLineId)
    }
  }, [fallbackLineId, paramLineId, selectedLineId])

  // 옵션 리스트가 변경될 때 현재 선택값이 유효한지 재검증
  React.useEffect(() => {
    if (!availableLineIds.length) return
    const hasSelectedLine =
      selectedLineId && availableLineIds.includes(selectedLineId)

    if (!hasSelectedLine) {
      const nextLineId =
        (paramLineId && availableLineIds.includes(paramLineId) ? paramLineId : null) ??
        fallbackLineId

      if (nextLineId !== selectedLineId) {
        setSelectedLineId(nextLineId ?? null)
      }
    }
  }, [availableLineIds, fallbackLineId, paramLineId, selectedLineId])

  const setLineId = React.useCallback((nextLineId) => {
    setSelectedLineId(normalizeLineId(nextLineId))
  }, [])

  const contextValue = React.useMemo(
    () => ({
      lineId: selectedLineId ?? null,
      setLineId,
    }),
    [selectedLineId, setLineId]
  )

  return (
    <ActiveLineContext.Provider value={contextValue}>
      {children}
    </ActiveLineContext.Provider>
  )
}

export function useActiveLine() {
  const context = React.useContext(ActiveLineContext)
  if (!context) {
    throw new Error("useActiveLine must be used within an ActiveLineProvider")
  }
  return context
}
