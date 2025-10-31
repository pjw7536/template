"use client"

import * as React from "react"

export function useLineDashboardData(initialLineId = "") {
  const [lineId, setLineId] = React.useState(initialLineId)
  const [status, setStatus] = React.useState({ isLoading: false, error: null })
  const [summary, setSummary] = React.useState(null)
  React.useEffect(() => {
    setLineId(initialLineId)
    setSummary(null)
    setStatus({ isLoading: false, error: null })
  }, [initialLineId])

  const refresh = React.useCallback(async (overrideLineId) => {
    const targetLine = overrideLineId ?? lineId
    if (!targetLine) return

    setStatus({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/line-dashboard/summary?lineId=${encodeURIComponent(targetLine)}`)
      if (!response.ok) throw new Error(`Failed to load summary (${response.status})`)
      const payload = await response.json()
      setSummary(payload)
    } catch (error) {
      setStatus({ isLoading: false, error: error instanceof Error ? error.message : "Unknown error" })
      return
    }
    setStatus({ isLoading: false, error: null })
  }, [lineId])

  return React.useMemo(
    () => ({ lineId, setLineId, summary, refresh, status }),
    [lineId, summary, refresh, status]
  )
}
