// src/features/line-dashboard/api/get-line-dashboard.js
import { runQuery } from "@/lib/db"

/**
 * ---------------------------------------------------------------------------------------
 * 상수/환경
 * ---------------------------------------------------------------------------------------
 */
const DEFAULT_TABLE_NAME = "drone_sop_v3" // 기본 테이블명
const TREND_LOOKBACK_DAYS = 90 // 트렌드 조회 기간(일)
const RECENT_LIMIT = 10 // 최근 항목 개수

/**
 * ---------------------------------------------------------------------------------------
 * 유틸: 안전한 날짜 변환 / 입력 정리
 * ---------------------------------------------------------------------------------------
 */

/**
 * 주어진 값(Date | string | number | null | undefined)을 ISO8601 문자열로 안전 변환
 * 변환 실패 시 null 반환
 */
function toISODate(input) {
  if (!input) return null
  const date = input instanceof Date ? input : new Date(String(input))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * 라인 ID 문자열을 정리 (공백 제거 + 빈 문자열일 경우 null)
 */
function normalizeLineId(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  return s.length === 0 ? null : s
}

/**
 * ---------------------------------------------------------------------------------------
 * Row → ViewModel 매핑
 * DB 결과를 프론트엔드에서 쓰기 좋은 형태로 가공
 * ---------------------------------------------------------------------------------------
 */
function mapSummaryRow(row) {
  return {
    totalCount: Number(row.totalCount ?? 0),
    activeCount: Number(row.activeCount ?? 0),
    completedCount: Number(row.completedCount ?? 0),
    pendingJiraCount: Number(row.pendingJiraCount ?? 0),
    lotCount: Number(row.lotCount ?? 0),
    latestUpdatedAt: toISODate(row.latestUpdatedAt),
  }
}

function mapTrendRows(rows) {
  return rows.map((row) => ({
    date: (toISODate(row.day) ?? "").slice(0, 10),
    activeCount: Number(row.activeCount ?? 0),
    completedCount: Number(row.completedCount ?? 0),
  }))
}

function mapRecentRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    lotId: row.lot_id ?? null,
    status: row.status ?? null,
    createdAt: toISODate(row.created_at) ?? "",
  }))
}

/**
 * ---------------------------------------------------------------------------------------
 * SQL 템플릿
 * 식별자는 상수로, 값은 전부 바인딩
 * ---------------------------------------------------------------------------------------
 */
const SQL = {
  summary: `
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
  trend: `
    SELECT
      DATE(created_at) AS day,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedCount,
      SUM(CASE WHEN status <> 'Completed' THEN 1 ELSE 0 END) AS activeCount
    FROM ${DEFAULT_TABLE_NAME}
    WHERE line_id = ?
      AND created_at IS NOT NULL
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `,
  recent: `
    SELECT
      id, lot_id, status, created_at
    FROM ${DEFAULT_TABLE_NAME}
    WHERE line_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
}

/**
 * ---------------------------------------------------------------------------------------
 * 메인 서비스 함수
 * ---------------------------------------------------------------------------------------
 */
export async function getLineDashboard(lineIdRaw) {
  const lineId = normalizeLineId(lineIdRaw)
  if (!lineId) {
    throw new Error("lineId가 비어있습니다.")
  }

  // 1) 요약 데이터 조회
  const [summaryRow] = await runQuery(SQL.summary, [lineId])

  const total = Number(summaryRow?.totalCount ?? 0)
  if (!summaryRow || total === 0) {
    return null
  }

  // 2) 트렌드 + 최근 목록 병렬 조회 (성능 향상)
  const [trendRows, recentRows] = await Promise.all([
    runQuery(SQL.trend, [lineId, TREND_LOOKBACK_DAYS]),
    runQuery(SQL.recent, [lineId, RECENT_LIMIT]),
  ])

  return {
    lineId,
    summary: mapSummaryRow(summaryRow),
    trend: mapTrendRows(trendRows),
    recent: mapRecentRows(recentRows),
  }
}
