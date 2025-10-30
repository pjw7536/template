import { runQuery } from "@/lib/db"

const LINE_SDWT_TABLE_NAME = "line_sdwt"

export async function getDistinctLineIds() {
  const rows = await runQuery(
    `
      SELECT DISTINCT line_id
      FROM ${LINE_SDWT_TABLE_NAME}
      WHERE line_id IS NOT NULL AND line_id <> ''
      ORDER BY line_id
    `
  )

  return rows
    .map((row) => row.line_id)
    .filter((lineId) => typeof lineId === "string" && lineId.length > 0)
}
