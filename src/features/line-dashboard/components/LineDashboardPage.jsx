"use client"

import { LineDashboardProvider } from "../context/LineDashboardProvider"
import { DataTable } from "./data-table"

export function LineDashboardPage({ lineId }) {
  return (
    <LineDashboardProvider lineId={lineId}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex-1 min-h-0">
          <DataTable lineId={lineId} />
        </div>
      </div>
    </LineDashboardProvider>
  )
}
