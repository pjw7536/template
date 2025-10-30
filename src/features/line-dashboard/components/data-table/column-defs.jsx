"use client"

import { STEP_COLUMN_KEY_SET } from "./constants"
import { CommentCell } from "./cells/comment-cell"
import { NeedToSendCell } from "./cells/need-to-send-cell"
import { formatCellValue, renderMetroStepFlow } from "./utils"

export function createColumnDefs(columns) {
  const stepColumnsWithIndex = columns
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => STEP_COLUMN_KEY_SET.has(key))

  const shouldCombineSteps =
    stepColumnsWithIndex.some(({ key }) => key === "main_step") ||
    stepColumnsWithIndex.some(({ key }) => key === "metro_steps")

  const baseColumnKeys = shouldCombineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  const makeColumnDef = (colKey) => ({
    id: colKey,
    header: () => colKey,
    accessorFn: (row) => row[colKey],
    meta: {
      isEditable: colKey === "comment" || colKey === "needtosend",
    },
    cell: (info) => {
      const meta = info.table.options.meta

      if (colKey === "comment") {
        const rowData = info.row.original
        const rawId = rowData?.id
        if (!meta || rawId === undefined || rawId === null) {
          return formatCellValue(info.getValue())
        }
        const recordId = String(rawId)
        const baseValueRaw = rowData?.comment
        const baseValue =
          typeof baseValueRaw === "string"
            ? baseValueRaw
            : baseValueRaw == null
              ? ""
              : String(baseValueRaw)
        return <CommentCell meta={meta} recordId={recordId} baseValue={baseValue} />
      }

      if (colKey === "needtosend") {
        const rowData = info.row.original
        const rawId = rowData?.id
        if (!meta || rawId === undefined || rawId === null) {
          return formatCellValue(info.getValue())
        }
        const recordId = String(rawId)
        const baseValueRaw = rowData?.needtosend
        const baseValue =
          typeof baseValueRaw === "number"
            ? baseValueRaw
            : typeof baseValueRaw === "string"
              ? Number.parseInt(baseValueRaw, 10) || 0
              : Number(baseValueRaw) || 0
        return <NeedToSendCell meta={meta} recordId={recordId} baseValue={baseValue} />
      }

      return formatCellValue(info.getValue())
    },
    enableSorting: colKey !== "comment",
  })

  const defs = baseColumnKeys.map((key) => makeColumnDef(key))

  if (shouldCombineSteps) {
    const insertionIndex = stepColumnsWithIndex.length
      ? Math.min(...stepColumnsWithIndex.map(({ index }) => index))
      : defs.length
    const headerLabel = stepColumnsWithIndex[0]?.key ?? "Step Flow"
    const stepColumnDef = {
      id: "metro_step_flow",
      header: () => headerLabel,
      accessorFn: (row) => row["main_step"] ?? row["metro_steps"] ?? null,
      cell: (info) => renderMetroStepFlow(info.row.original),
      enableSorting: false,
      meta: {
        isEditable: false,
      },
    }
    defs.splice(Math.min(Math.max(insertionIndex, 0), defs.length), 0, stepColumnDef)
  }

  return defs
}
