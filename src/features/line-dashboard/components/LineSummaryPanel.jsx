"use client"

import { Button } from "@/components/ui/button"

import { useLineDashboardContext } from "../context/LineDashboardProvider"

export function LineSummaryPanel() {
  const { lineId, summary, refresh, status } = useLineDashboardContext()

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <h2 className="text-base font-semibold">{lineId} Line Overview</h2>
        <p className="text-sm text-muted-foreground">
          {summary
            ? `Tracking ${summary.activeLots} active lots out of ${summary.totalLots}.`
            : "Summary data will appear once loaded."}
        </p>
        {status.error ? (
          <p className="text-xs text-destructive">{status.error}</p>
        ) : null}
      </div>

      <Button size="sm" onClick={() => refresh()} disabled={status.isLoading}>
        {status.isLoading ? "Loading…" : "Refresh summary"}
      </Button>
    </section>
  )
}
