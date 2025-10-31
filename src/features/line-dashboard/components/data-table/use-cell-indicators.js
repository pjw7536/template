"use client"

import * as React from "react"

import { MIN_SAVING_VISIBLE_MS, SAVED_VISIBLE_MS, SAVING_DELAY_MS } from "./constants"

// 각 셀 상태마다 관리하는 타이머 이름 정의
const TIMER_NAMES = ["savingDelay", "transition", "savedCleanup"]

export function useCellIndicators() {
  const [cellIndicators, setCellIndicators] = React.useState({})
  // 비동기 콜백에서 최신 상태를 읽기 위해 ref로 별도 보관
  const cellIndicatorsRef = React.useRef(cellIndicators)
  // 셀 키 → { savingDelay, transition, savedCleanup } 형태의 타이머 저장소
  const indicatorTimersRef = React.useRef({})
  // begin 이후 finalize가 아직 오지 않은 셀 키 집합
  const activeIndicatorKeysRef = React.useRef(new Set())

  React.useEffect(() => {
    cellIndicatorsRef.current = cellIndicators
  }, [cellIndicators])

  React.useEffect(() => {
    const timersRef = indicatorTimersRef
    const activeIndicatorKeys = activeIndicatorKeysRef.current

    return () => {
      Object.keys(timersRef.current).forEach((key) => {
        TIMER_NAMES.forEach((timerName) => {
          const timerId = timersRef.current[key]?.[timerName]
          if (timerId) clearTimeout(timerId)
        })
      })
      timersRef.current = {}
      activeIndicatorKeys.clear()
    }
  }, [])

  /** 셀 키에 대응하는 타이머 버킷을 확보 */
  const ensureTimerBucket = React.useCallback((key) => {
    const bucket = indicatorTimersRef.current[key]
    if (bucket) return bucket
    const created = {}
    indicatorTimersRef.current[key] = created
    return created
  }, [])

  /** 특정 타이머를 해제 */
  const cancelTimer = React.useCallback((key, timerName) => {
    const entry = indicatorTimersRef.current[key]
    if (!entry) return
    const timer = entry[timerName]
    if (timer !== undefined) {
      clearTimeout(timer)
      delete entry[timerName]
    }
  }, [])

  /** 여러 타이머를 한꺼번에 해제 */
  const cancelTimers = React.useCallback(
    (key, timerNames = TIMER_NAMES) => {
      timerNames.forEach((timerName) => cancelTimer(key, timerName))
    },
    [cancelTimer]
  )

  /** 인디케이터를 즉시 제거 (allowedStatuses가 있으면 해당 상태일 때만) */
  const clearIndicatorImmediate = React.useCallback((key, allowedStatuses) => {
    setCellIndicators((prev) => {
      const current = prev[key]
      if (!current) return prev
      if (allowedStatuses && !allowedStatuses.includes(current.status)) {
        return prev
      }
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  /** saving 상태가 최소 시간만큼 노출되도록 보장 */
  const withMinimumSavingVisibility = React.useCallback(
    (key, now, task) => {
      const indicator = cellIndicatorsRef.current[key]
      if (indicator?.status === "saving") {
        const elapsed = now - indicator.visibleSince
        const remaining = Math.max(0, MIN_SAVING_VISIBLE_MS - elapsed)
        if (remaining > 0) {
          const timers = ensureTimerBucket(key)
          cancelTimers(key, ["transition"])
          timers.transition = setTimeout(() => {
            delete timers.transition
            task()
          }, remaining)
          return
        }
      }
      task()
    },
    [cancelTimers, ensureTimerBucket]
  )

  /** saving 지연 타이머를 걸어 UI 깜빡임을 줄인다 */
  const scheduleSavingIndicator = React.useCallback(
    (key) => {
      const timers = ensureTimerBucket(key)
      cancelTimers(key)
      timers.savingDelay = setTimeout(() => {
        delete timers.savingDelay
        if (!activeIndicatorKeysRef.current.has(key)) return
        setCellIndicators((prev) => ({
          ...prev,
          [key]: { status: "saving", visibleSince: Date.now() },
        }))
      }, SAVING_DELAY_MS)
    },
    [cancelTimers, ensureTimerBucket]
  )

  const begin = React.useCallback(
    (keys) => {
      if (keys.length === 0) return

      setCellIndicators((prev) => {
        let next = null
        keys.forEach((key) => {
          if (key in prev) {
            if (next === null) next = { ...prev }
            delete next[key]
          }
        })
        return next ?? prev
      })

      keys.forEach((key) => {
        activeIndicatorKeysRef.current.add(key)
        scheduleSavingIndicator(key)
      })
    },
    [scheduleSavingIndicator]
  )

  const finalize = React.useCallback(
    (keys, outcome) => {
      if (keys.length === 0) return
      const now = Date.now()

      keys.forEach((key) => {
        activeIndicatorKeysRef.current.delete(key)
        cancelTimers(key)

        if (outcome === "success") {
          withMinimumSavingVisibility(key, now, () => {
            if (activeIndicatorKeysRef.current.has(key)) return
            const timers = ensureTimerBucket(key)
            setCellIndicators((prev) => ({
              ...prev,
              [key]: { status: "saved", visibleSince: Date.now() },
            }))
            timers.savedCleanup = setTimeout(() => {
              delete timers.savedCleanup
              if (activeIndicatorKeysRef.current.has(key)) return
              clearIndicatorImmediate(key, ["saved"])
            }, SAVED_VISIBLE_MS)
          })
        } else {
          withMinimumSavingVisibility(key, now, () => {
            if (activeIndicatorKeysRef.current.has(key)) return
            clearIndicatorImmediate(key, ["saving"])
          })
        }
      })
    },
    [cancelTimers, clearIndicatorImmediate, ensureTimerBucket, withMinimumSavingVisibility]
  )

  return { cellIndicators, begin, finalize }
}
