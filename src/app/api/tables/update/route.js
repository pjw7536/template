import { NextResponse } from "next/server"

import { getPool, runQuery } from "@/lib/db"
import { DEFAULT_TABLE } from "@/features/line-dashboard/components/data-table/constants"

const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/
const ALLOWED_UPDATE_COLUMNS = new Set(["comment", "needtosend"])

function sanitizeIdentifier(value, fallback = null) {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!SAFE_IDENTIFIER.test(trimmed)) return fallback
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

function normalizeUpdateValue(key, value) {
  if (key === "comment") {
    if (value === null || value === undefined) return ""
    return String(value)
  }
  if (key === "needtosend") {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return 0
    return numeric === 0 ? 0 : 1
  }
  return value
}

export async function PATCH(request) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const tableName = sanitizeIdentifier(payload?.table, DEFAULT_TABLE)
  const recordId = payload?.id
  const updates = payload?.updates

  if (recordId === null || recordId === undefined || (typeof recordId === "string" && recordId.trim().length === 0)) {
    return NextResponse.json({ error: "Record id is required" }, { status: 400 })
  }

  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return NextResponse.json({ error: "Updates must be an object" }, { status: 400 })
  }

  const filteredEntries = Object.entries(updates).filter(
    ([key, value]) => ALLOWED_UPDATE_COLUMNS.has(key) && value !== undefined
  )

  if (filteredEntries.length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 })
  }

  try {
    const columnRows = await runQuery(`SHOW COLUMNS FROM \`${tableName}\``)
    const columnNames = columnRows
      .map((column) => column?.Field)
      .filter((value) => typeof value === "string")

    const idColumn = findColumn(columnNames, "id")
    if (!idColumn) {
      return NextResponse.json({ error: `Table "${tableName}" does not expose an id column` }, { status: 400 })
    }

    const assignments = []
    const params = []

    for (const [key, value] of filteredEntries) {
      const columnName = findColumn(columnNames, key)
      if (!columnName) continue
      assignments.push(`\`${columnName}\` = ?`)
      params.push(normalizeUpdateValue(key, value))
    }

    if (assignments.length === 0) {
      return NextResponse.json({ error: "No matching columns to update" }, { status: 400 })
    }

    params.push(recordId)

    const pool = getPool()
    const [result] = await pool.execute(
      `
        UPDATE \`${tableName}\`
        SET ${assignments.join(", ")}
        WHERE \`${idColumn}\` = ?
        LIMIT 1
      `,
      params
    )

    if (result?.affectedRows === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ error: `Table "${tableName}" was not found` }, { status: 404 })
    }

    console.error("Failed to update table record", error)
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
  }
}
