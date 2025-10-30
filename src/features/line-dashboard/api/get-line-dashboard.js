import { runQuery } from "@/lib/db"

const DEFAULT_TABLE_NAME = "drone_sop_v3"
const TREND_LOOKBACK_DAYS = 90
const RECENT_LIMIT = 10

const toISODate = (input) => {
  if (!input) return null
  const date = input instanceof Date ? input : new Date(input)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const mapSummaryRow = (row) => ({
  totalCount: Number(row.totalCount ?? 0),
  activeCount: Number(row.activeCount ?? 0),
  completedCount: Number(row.completedCount ?? 0),
  pendingJiraCount: Number(row.pendingJiraCount ?? 0),
  lotCount: Number(row.lotCount ?? 0),
  latestUpdatedAt: toISODate(row.latestUpdatedAt),
})

const mapTrendRows = (rows) =>
  rows.map((row) => ({
    date: toISODate(row.day)?.slice(0, 10) ?? "",
    activeCount: Number(row.activeCount ?? 0),
    completedCount: Number(row.completedCount ?? 0),
  }))

const mapRecentRows = (rows) =>
  rows.map((row) => ({
    id: row.id,
    lotId: row.lot_id ?? null,
    status: row.status ?? null,
    createdAt: toISODate(row.created_at) ?? "",
  }))

export async function getLineDashboard(lineId) {
  const [summaryRow] = await runQuery(
    `
      SELECT
        COUNT(*) AS totalCount,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN status <> 'Completed' THEN 1 ELSE 0 END) AS activeCount,
        SUM(CASE WHEN send_jira = 0 AND needtosend = 1 THEN 1 ELSE 0 END) AS pendingJiraCount,
        COUNT(DISTINCT lot_id) AS lotCount,
        MAX(updated_at) AS latestUpdatedAt
      FROM ${DEFAULT_TABLE_NAME}
      WHERE line_id = ?
    `,
    [lineId]
  )

  if (!summaryRow || Number(summaryRow.totalCount ?? 0) === 0) {
    return null
  }

  const trendRows = await runQuery(
    `
      SELECT
        DATE(created_at) AS day,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN status <> 'Completed' THEN 1 ELSE 0 END) AS activeCount
      FROM ${DEFAULT_TABLE_NAME}
      WHERE line_id = ? AND created_at IS NOT NULL
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `,
    [lineId, TREND_LOOKBACK_DAYS]
  )

  const recentRows = await runQuery(
    `
      SELECT
        id,
        lot_id,
        status,
        created_at
      FROM ${DEFAULT_TABLE_NAME}
      WHERE line_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [lineId, RECENT_LIMIT]
  )

  return {
    lineId,
    summary: mapSummaryRow(summaryRow),
    trend: mapTrendRows(trendRows),
    recent: mapRecentRows(recentRows),
  }
}
