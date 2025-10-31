import { NextResponse } from "next/server"

import { runQuery } from "@/lib/db"
import { DEFAULT_TABLE } from "@/features/line-dashboard/components/data-table/utils/constants"

const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const ROW_LIMIT = 500
const DATE_COLUMN_CANDIDATES = ["updated_at", "created_at", "timestamp", "ts", "date"]
const LINE_SDWT_TABLE_NAME = "line_sdwt"

function sanitizeIdentifier(value, fallback = null) {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!SAFE_IDENTIFIER.test(trimmed)) return fallback
  return trimmed
}

function normalizeDateOnly(value) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!DATE_ONLY_REGEX.test(trimmed)) return null
  const parsed = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return trimmed
}

function findColumn(columnNames, target) {
  const targetLower = target.toLowerCase()
  for (const name of columnNames) {
    if (typeof name !== "string") continue
    if (name.toLowerCase() === targetLower) return name
  }
  return null
}

export async function GET(request) {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  const tableParam = searchParams.get("table")
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const lineIdParam = searchParams.get("lineId")

  const tableName = sanitizeIdentifier(tableParam, DEFAULT_TABLE)
  let normalizedFrom = normalizeDateOnly(fromParam)
  let normalizedTo = normalizeDateOnly(toParam)
  const normalizedLineId =
    typeof lineIdParam === "string" && lineIdParam.trim().length > 0 ? lineIdParam.trim() : null

  if (normalizedFrom && normalizedTo) {
    const fromTime = new Date(`${normalizedFrom}T00:00:00Z`).getTime()
    const toTime = new Date(`${normalizedTo}T23:59:59Z`).getTime()
    if (Number.isFinite(fromTime) && Number.isFinite(toTime) && fromTime > toTime) {
      const temp = normalizedFrom
      normalizedFrom = normalizedTo
      normalizedTo = temp
    }
  }

  try {
    const columnRows = await runQuery(`SHOW COLUMNS FROM \`${tableName}\``)
    const columnNames = columnRows
      .map((column) => column?.Field)
      .filter((value) => typeof value === "string")

    const lineIdColumn = normalizedLineId ? findColumn(columnNames, "line_id") : null
    const userSdwtProdColumn = normalizedLineId ? findColumn(columnNames, "user_sdwt_prod") : null
    const dateColumn =
      (normalizedFrom || normalizedTo) &&
      DATE_COLUMN_CANDIDATES.map((candidate) => findColumn(columnNames, candidate)).find(Boolean)

    const filters = []
    const params = []

    let userSdwtProds = []
    if (normalizedLineId && userSdwtProdColumn) {
      const mappingRows = await runQuery(
        `
          SELECT DISTINCT user_sdwt_prod
          FROM ${LINE_SDWT_TABLE_NAME}
          WHERE line_id = ?
            AND user_sdwt_prod IS NOT NULL
            AND user_sdwt_prod <> ''
        `,
        [normalizedLineId]
      )

      userSdwtProds = Array.from(
        new Set(
          mappingRows
            .map((row) => (typeof row?.user_sdwt_prod === "string" ? row.user_sdwt_prod.trim() : ""))
            .filter((value) => value.length > 0)
        )
      )

      if (userSdwtProds.length === 0) {
        return NextResponse.json({
          table: tableName,
          from: normalizedFrom && dateColumn ? normalizedFrom : null,
          to: normalizedTo && dateColumn ? normalizedTo : null,
          rowCount: 0,
          columns: columnNames,
          rows: [],
        })
      }

      filters.push(`\`${userSdwtProdColumn}\` IN (${userSdwtProds.map(() => "?").join(", ")})`)
      params.push(...userSdwtProds)
    } else if (normalizedLineId && lineIdColumn) {
      filters.push(`\`${lineIdColumn}\` = ?`)
      params.push(normalizedLineId)
    }

    if (normalizedFrom && dateColumn) {
      filters.push(`\`${dateColumn}\` >= ?`)
      params.push(`${normalizedFrom} 00:00:00`)
    }

    if (normalizedTo && dateColumn) {
      filters.push(`\`${dateColumn}\` <= ?`)
      params.push(`${normalizedTo} 23:59:59`)
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""

    const orderColumn =
      dateColumn ??
      findColumn(columnNames, "updated_at") ??
      findColumn(columnNames, "created_at") ??
      findColumn(columnNames, "id")
    const orderClause = orderColumn ? `ORDER BY \`${orderColumn}\` DESC` : ""

    const limit = Math.max(1, Math.min(ROW_LIMIT, Number.parseInt(searchParams.get("limit") ?? "", 10) || ROW_LIMIT))

    const rows = await runQuery(
      `
        SELECT *
        FROM \`${tableName}\`
        ${whereClause}
        ${orderClause}
      `,
      params
    )

    return NextResponse.json({
      table: tableName,
      from: normalizedFrom && dateColumn ? normalizedFrom : null,
      to: normalizedTo && dateColumn ? normalizedTo : null,
      rowCount: rows.length,
      columns: columnNames,
      rows,
    })
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ error: `Table "${tableName}" was not found` }, { status: 404 })
    }

    console.error("Failed to load table data", error)
    return NextResponse.json({ error: "Failed to load table data" }, { status: 500 })
  }
}
