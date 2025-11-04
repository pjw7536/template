import { STEP_COLUMN_KEY_SET } from "../utils/constants"
import { renderMetroStepFlow } from "../utils/formatters"
import { resolveAlignment } from "./alignment"
import { resolveColumnSizes } from "./dynamicWidth"

export function pickStepColumnsWithIndex(columns) {
  return columns
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => STEP_COLUMN_KEY_SET.has(key))
}

export function shouldCombineSteps(stepCols) {
  if (!stepCols.length) return false
  return (
    stepCols.some(({ key }) => key === "main_step") ||
    stepCols.some(({ key }) => key === "metro_steps")
  )
}

function getSampleValueForColumns(row, columns) {
  if (!row || typeof row !== "object" || !Array.isArray(columns)) return undefined
  for (const { key } of columns) {
    if (row[key] !== undefined) return row[key]
  }
  return undefined
}

export function makeStepFlowColumn(stepCols, label, config, firstRow, dynamicWidthHints) {
  const sample = getSampleValueForColumns(firstRow, stepCols)
  const alignment = resolveAlignment("process_flow", config, sample)
  const { size, minSize, maxSize } = resolveColumnSizes(
    "process_flow",
    config,
    sample,
    dynamicWidthHints
  )

  return {
    id: "process_flow",
    header: () => label,
    accessorFn: (row) => row?.["main_step"] ?? row?.["metro_steps"] ?? null,
    cell: (info) => renderMetroStepFlow(info.row.original),
    enableSorting: false,
    meta: { isEditable: false, alignment },
    size,
    minSize,
    maxSize,
  }
}
