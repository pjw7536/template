import {
  PROCESS_FLOW_ARROW_GAP_WIDTH,
  PROCESS_FLOW_CELL_SIDE_PADDING,
  PROCESS_FLOW_MAX_WIDTH,
  PROCESS_FLOW_MIN_WIDTH,
  PROCESS_FLOW_NODE_BLOCK_WIDTH,
} from "./constants"
import { normalizeStatus } from "./normalizers"
import { normalizeStepValue, parseMetroSteps } from "../utils/formatters"

/**
 * Calculate how many steps have been completed for a given row. The logic is
 * unchanged from the original implementation; it is extracted only for
 * readability and testing.
 */
export function computeMetroProgress(rowOriginal, normalizedStatus) {
  const mainStep = normalizeStepValue(rowOriginal?.main_step)
  const metroSteps = parseMetroSteps(rowOriginal?.metro_steps)
  const customEndStep = normalizeStepValue(rowOriginal?.custom_end_step)
  const currentStep = normalizeStepValue(rowOriginal?.metro_current_step)

  const effectiveMetroSteps = (() => {
    if (!metroSteps.length) return []
    if (!customEndStep) return metroSteps
    const endIndex = metroSteps.findIndex((step) => step === customEndStep)
    return endIndex >= 0 ? metroSteps.slice(0, endIndex + 1) : metroSteps
  })()

  const orderedSteps = []
  if (mainStep && !metroSteps.includes(mainStep)) orderedSteps.push(mainStep)
  orderedSteps.push(...effectiveMetroSteps)

  const total = orderedSteps.length
  if (total === 0) return { completed: 0, total: 0 }

  let completed = 0
  if (!currentStep) {
    completed = 0
  } else {
    const currentIndex = orderedSteps.findIndex((step) => step === currentStep)

    if (customEndStep) {
      const currentIndexInFull = metroSteps.findIndex((step) => step === currentStep)
      const endIndexInFull = metroSteps.findIndex((step) => step === customEndStep)

      if (currentIndexInFull >= 0 && endIndexInFull >= 0 && currentIndexInFull > endIndexInFull) {
        completed = total
      } else if (currentIndex >= 0) {
        completed = currentIndex + 1
      }
    } else if (currentIndex >= 0) {
      completed = currentIndex + 1
    }
  }

  if (normalizedStatus === "COMPLETE") completed = total
  return { completed: Math.max(0, Math.min(completed, total)), total }
}

/**
 * Convert a step count into an approximate pixel width for the process flow
 * column. A few guard rails keep the table from collapsing or exploding.
 */
export function estimateProcessFlowWidthByTotal(total) {
  if (!Number.isFinite(total) || total <= 0) return PROCESS_FLOW_MIN_WIDTH
  const arrowCount = Math.max(0, total - 1)
  const width =
    PROCESS_FLOW_CELL_SIDE_PADDING +
    total * PROCESS_FLOW_NODE_BLOCK_WIDTH +
    arrowCount * PROCESS_FLOW_ARROW_GAP_WIDTH

  return Math.max(PROCESS_FLOW_MIN_WIDTH, Math.min(width, PROCESS_FLOW_MAX_WIDTH))
}

/**
 * Look at every visible row and return a single width hint that can be reused
 * by the process flow column definition.
 */
export function computeProcessFlowWidthFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxTotal = 0

  for (const row of rows) {
    const status = normalizeStatus(row?.status)
    const { total } = computeMetroProgress(row, status)
    if (Number.isFinite(total) && total > maxTotal) maxTotal = total
  }

  if (maxTotal <= 0) return null
  return estimateProcessFlowWidthByTotal(maxTotal)
}
