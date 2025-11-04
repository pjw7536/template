"use client"

/**
 * Column definition builder
 * -------------------------
 * The original implementation mixed heuristics, rendering helpers and TanStack
 * Table wiring inside a single 800+ line file. This wrapper keeps the public
 * API identical (`createColumnDefs`) but delegates the heavy lifting to small,
 * well-named modules under `column-defs/`. Each module explains one concern:
 * configuration defaults, alignment, sorting, renderer selection, dynamic
 * width hints, and process-flow specific behaviour.
 */

import { mergeConfig } from "./column-defs/config"
import { resolveAlignment } from "./column-defs/alignment"
import { getSortingFnForKey } from "./column-defs/sorting"
import { renderCellByKey } from "./column-defs/renderers"
import { computeDynamicWidthHints, resolveColumnSizes } from "./column-defs/dynamicWidth"
import {
  makeStepFlowColumn,
  pickStepColumnsWithIndex,
  shouldCombineSteps,
} from "./column-defs/steps"

/**
 * Create a single TanStack Table column definition.
 */
function makeColumnDef(colKey, config, sampleValueFromFirstRow, dynamicWidthHints) {
  const label = config.labels?.[colKey] ?? colKey
  const enableSorting =
    typeof config.sortable?.[colKey] === "boolean"
      ? config.sortable[colKey]
      : colKey !== "defect_url" && colKey !== "jira_key"

  const sortingFn = enableSorting
    ? getSortingFnForKey(colKey, config, sampleValueFromFirstRow)
    : undefined

  const { size, minSize, maxSize } = resolveColumnSizes(
    colKey,
    config,
    sampleValueFromFirstRow,
    dynamicWidthHints
  )
  const alignment = resolveAlignment(colKey, config, sampleValueFromFirstRow)

  return {
    id: colKey,
    header: () => label,
    accessorFn: (row) => row?.[colKey],
    meta: {
      isEditable: colKey === "comment" || colKey === "needtosend",
      alignment,
    },
    cell: (info) => renderCellByKey(colKey, info),
    enableSorting,
    sortingFn,
    size,
    minSize,
    maxSize,
  }
}

/**
 * Build the full list of column definitions used by the data table.
 */
export function createColumnDefs(rawColumns, userConfig, firstRowForTypeGuess, rowsForSizing) {
  const config = mergeConfig(userConfig)
  const dynamicWidthHints = computeDynamicWidthHints(rowsForSizing, config)
  const columns = Array.isArray(rawColumns) ? rawColumns : []

  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  const stepKeySet = new Set(stepCols.map(({ key }) => key))
  const baseKeys = combineSteps ? columns.filter((key) => !stepKeySet.has(key)) : [...columns]

  const defs = baseKeys.map((key) => {
    const sample = firstRowForTypeGuess ? firstRowForTypeGuess?.[key] : undefined
    return makeColumnDef(key, config, sample, dynamicWidthHints)
  })

  if (combineSteps) {
    const headerText = config.labels?.process_flow ?? config.processFlowHeader ?? "process_flow"
    const stepFlowCol = makeStepFlowColumn(
      stepCols,
      headerText,
      config,
      firstRowForTypeGuess,
      dynamicWidthHints
    )

    const insertionIndex = stepCols.length
      ? Math.min(...stepCols.map(({ index }) => index))
      : defs.length

    defs.splice(Math.min(Math.max(insertionIndex, 0), defs.length), 0, stepFlowCol)
  }

  const order = Array.isArray(config.order) ? config.order : null
  if (order && order.length > 0) {
    const idSet = new Set(defs.map((d) => d.id))
    const head = order.filter((id) => idSet.has(id))
    const tail = defs.map((d) => d.id).filter((id) => !head.includes(id))
    const finalIds = [...head, ...tail]

    finalIds.forEach((id, i) => {
      const idx = defs.findIndex((d) => d.id === id)
      if (idx !== -1 && idx !== i) {
        const [moved] = defs.splice(idx, 1)
        defs.splice(i, 0, moved)
      }
    })
  }

  return defs
}
