"use client"

/**
 * column-defs.jsx (Process Flow width ∝ total node count)
 * -----------------------------------------------------------------------------
 * - process_flow: total 노드 개수 비례 자동폭 (동일)
 * - ✅ comment: 기본 폭 고정, 길면 … 처리(셀 내부에서 처리), 호버 시 전체 텍스트 title로 노출
 */

import Link from "next/link"
import { ExternalLink, Check } from "lucide-react"

import { STEP_COLUMN_KEY_SET } from "./utils/constants"
import { CommentCell, NeedToSendCell } from "./cells"
import {
  formatCellValue,
  renderMetroStepFlow,
  parseMetroSteps,
  normalizeStepValue,
} from "./utils/formatters"

// ── 공통 기본 폭들
const DEFAULT_MIN_WIDTH = 72
const DEFAULT_MAX_WIDTH = 480
const DEFAULT_TEXT_WIDTH = 140
const DEFAULT_NUMBER_WIDTH = 110
const DEFAULT_ID_WIDTH = 130
const DEFAULT_DATE_WIDTH = 100
const DEFAULT_BOOL_ICON_WIDTH = 70
const DEFAULT_PROCESS_FLOW_WIDTH = 360

// process_flow 노드 폭 근사 모델
const PROCESS_FLOW_NODE_BLOCK_WIDTH = 50
const PROCESS_FLOW_ARROW_GAP_WIDTH = 14
const PROCESS_FLOW_CELL_SIDE_PADDING = 24
const PROCESS_FLOW_MIN_WIDTH = Math.max(DEFAULT_MIN_WIDTH, 220)
const PROCESS_FLOW_MAX_WIDTH = 1200

/** UserConfig 기본값 */
const DEFAULT_CONFIG = {
  order: [
    "created_at",
    "line_id",
    "sdwt_prod",
    "EQP_CB",
    "proc_id",
    "ppid",
    "sample_type",
    "sample_group",
    "lot_id",
    "status",
    "process_flow",
    "comment",
    "needtosend",
    "send_jira",
    "informed_at",
    "jira_key",
    "defect_url",
    "knoxid",
    "user_sdwt_prod",
  ],
  labels: {
    defect_url: "Defect",
    jira_key: "Jira",
    comment: "Comment",
    needtosend: "예약",
    send_jira: "JIRA",
    status: "Status",
    knoxid: "KnoxID",
    process_flow: "Process Flow",
  },
  sortable: {
    defect_url: false,
    jira_key: false,
    comment: true,
    needtosend: true,
    send_jira: true,
    status: true,
  },
  sortTypes: {
    comment: "text",
    needtosend: "number",
    send_jira: "number",
    status: "text",
  },
  width: {
    created_at: 100,
    line_id: 80,
    sdwt_prod: 120,
    EQP_CB: 110,
    proc_id: 110,
    ppid: 80,
    sample_type: 200,
    sample_group: 200,
    lot_id: 80,
    status: 150,
    // ✅ comment 컬럼 기본 폭(원하는 값으로 조정)
    comment: 320,
    needtosend: 40,
    send_jira: 40,
    informed_at: 100,
    jira_key: 40,
    defect_url: 60,
    knoxid: 100,
    user_sdwt_prod: 120,
    updated_at: 90,
  },
  processFlowHeader: "process_flow",
  cellAlign: {
    created_at: "left",
    line_id: "left",
    sdwt_prod: "left",
    EQP_CB: "left",
    proc_id: "left",
    ppid: "left",
    sample_type: "left",
    sample_group: "left",
    lot_id: "center",
    status: "center",
    process_flow: "left",
    comment: "left",
    needtosend: "center",
    send_jira: "center",
    informed_at: "center",
    jira_key: "center",
    defect_url: "center",
    knoxid: "center",
    user_sdwt_prod: "center",
  },
  headerAlign: {
    created_at: "left",
    line_id: "left",
    sdwt_prod: "left",
    EQP_CB: "left",
    proc_id: "left",
    ppid: "left",
    sample_type: "left",
    sample_group: "left",
    lot_id: "left",
    status: "left",
    process_flow: "left",
    comment: "left",
    needtosend: "left",
    send_jira: "left",
    informed_at: "left",
    jira_key: "left",
    defect_url: "left",
    knoxid: "left",
    user_sdwt_prod: "left",
  },
  autoWidth: {
    process_flow: true, // 유지: total 기반 동적 폭
    // ✅ comment 자동 폭 비활성화(고정 폭 + 셀 내부 … 처리)
    comment: false,
    // 요청에 맞춘 텍스트 자동 폭 컬럼들(원하면 유지)
    sdwt_prod: true,
    ppid: true,
    sample_type: true,
    user_sdwt_prod: true,
    knoxid: true,
    knox_id: true,
  },
}

function mergeConfig(userConfig) {
  const u = userConfig ?? {}
  return {
    order: u.order ?? DEFAULT_CONFIG.order,
    labels: { ...DEFAULT_CONFIG.labels, ...(u.labels ?? {}) },
    sortable: { ...DEFAULT_CONFIG.sortable, ...(u.sortable ?? {}) },
    sortTypes: { ...DEFAULT_CONFIG.sortTypes, ...(u.sortTypes ?? {}) },
    width: { ...DEFAULT_CONFIG.width, ...(u.width ?? {}) },
    processFlowHeader: u.processFlowHeader ?? DEFAULT_CONFIG.processFlowHeader,
    cellAlign: { ...DEFAULT_CONFIG.cellAlign, ...(u.cellAlign ?? {}) },
    headerAlign: { ...DEFAULT_CONFIG.headerAlign, ...(u.headerAlign ?? {}) },
    autoWidth: { ...DEFAULT_CONFIG.autoWidth, ...(u.autoWidth ?? {}) },
  }
}

// ── 유틸 (URL/JIRA/정렬/정렬함수/정렬방향 추론) ─────────────────────────────
function toHttpUrl(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}
function getRecordId(rowOriginal) {
  const rawId = rowOriginal?.id
  if (rawId === undefined || rawId === null) return null
  return String(rawId)
}
function normalizeJiraKey(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toUpperCase()
  return /^[A-Z0-9]+-\d+$/.test(s) ? s : null
}
function buildJiraBrowseUrl(jiraKey) {
  const key = normalizeJiraKey(jiraKey)
  return key ? `https://jira.apple.net/browse/${key}` : null
}
function normalizeComment(raw) {
  if (typeof raw === "string") return raw
  if (raw == null) return ""
  return String(raw)
}
function normalizeNeedToSend(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}
function normalizeBinaryFlag(raw) {
  if (raw === 1 || raw === "1") return true
  if (raw === "." || raw === "" || raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) ? n === 1 : false
}
function normalizeStatus(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "_")
  return s
}
function isNumeric(value) {
  if (value == null || value === "") return false
  const n = Number(value)
  return Number.isFinite(n)
}
function tryDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "string") {
    const t = Date.parse(value)
    return Number.isNaN(t) ? null : new Date(t)
  }
  return null
}
function cmpText(a, b) {
  const sa = a == null ? "" : String(a)
  const sb = b == null ? "" : String(b)
  return sa.localeCompare(sb)
}
function cmpNumber(a, b) {
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0
  if (!Number.isFinite(na)) return -1
  if (!Number.isFinite(nb)) return 1
  return na - nb
}
function cmpDate(a, b) {
  const da = tryDate(a)
  const db = tryDate(b)
  if (!da && !db) return 0
  if (!da) return -1
  if (!db) return 1
  return da.getTime() - db.getTime()
}
function autoSortType(sample) {
  if (sample == null) return "text"
  if (isNumeric(sample)) return "number"
  if (tryDate(sample)) return "datetime"
  return "text"
}
const ALIGNMENT_VALUES = new Set(["left", "center", "right"])
function normalizeAlignment(value, fallback = "left") {
  if (typeof value !== "string") return fallback
  const lower = value.toLowerCase()
  return ALIGNMENT_VALUES.has(lower) ? lower : fallback
}
function inferDefaultAlignment(colKey, sampleValue) {
  if (typeof sampleValue === "number") return "right"
  if (isNumeric(sampleValue)) return "right"
  if (colKey && /(_?id|count|qty|amount|number)$/i.test(colKey)) return "right"
  return "left"
}
function resolveAlignment(colKey, config, sampleValue) {
  const inferred = inferDefaultAlignment(colKey, sampleValue)
  const cellAlignment = normalizeAlignment(config.cellAlign?.[colKey], inferred)
  const headerAlignment = normalizeAlignment(config.headerAlign?.[colKey], cellAlignment)
  return { cell: cellAlignment, header: headerAlignment }
}
function getSortingFnForKey(colKey, config, sampleValue) {
  const t = (config.sortTypes && config.sortTypes[colKey]) || "auto"
  const sortType = t === "auto" ? autoSortType(sampleValue) : t
  if (sortType === "number")
    return (rowA, rowB) => cmpNumber(rowA.getValue(colKey), rowB.getValue(colKey))
  if (sortType === "datetime")
    return (rowA, rowB) => cmpDate(rowA.getValue(colKey), rowB.getValue(colKey))
  return (rowA, rowB) => cmpText(rowA.getValue(colKey), rowB.getValue(colKey))
}

// ── 진행률/flow 폭 계산 (process_flow) ──────────────────────────────────────
function computeMetroProgress(rowOriginal, normalizedStatus) {
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

  const status = normalizedStatus
  if (status === "COMPLETE") completed = total
  return { completed: Math.max(0, Math.min(completed, total)), total }
}

function estimateProcessFlowWidthByTotal(total) {
  if (!Number.isFinite(total) || total <= 0) return PROCESS_FLOW_MIN_WIDTH
  const arrowCount = Math.max(0, total - 1)
  const width =
    PROCESS_FLOW_CELL_SIDE_PADDING +
    total * PROCESS_FLOW_NODE_BLOCK_WIDTH +
    arrowCount * PROCESS_FLOW_ARROW_GAP_WIDTH
  return Math.max(PROCESS_FLOW_MIN_WIDTH, Math.min(width, PROCESS_FLOW_MAX_WIDTH))
}
function computeProcessFlowWidthFromRows_TotalBased(rows) {
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

function computeAutoTextWidthFromRows(rows, key, { charUnitPx = 7, cellPadding = 40, min = DEFAULT_MIN_WIDTH, max = 720 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxUnits = 0
  for (const row of rows) {
    const v = row?.[key]
    const str = v == null ? "" : String(v)
    const line = str.replace(/\t/g, "    ").split(/\r?\n/)[0] ?? ""
    let units = 0
    for (const ch of Array.from(line)) {
      const cp = ch.codePointAt(0) ?? 0
      if (cp === 0) continue
      if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) continue
      units += cp <= 0xff ? 1 : 2
    }
    if (units > maxUnits) maxUnits = units
  }
  if (maxUnits === 0) return null
  const width = Math.ceil(maxUnits * charUnitPx + cellPadding)
  return Math.max(min, Math.min(width, max))
}

function computeDynamicWidthHints(rows, cfg) {
  if (!Array.isArray(rows) || rows.length === 0) return {}
  const hints = {}

  // ✅ process_flow: 최대 total 기반
  if (cfg?.autoWidth?.process_flow) {
    const w = computeProcessFlowWidthFromRows_TotalBased(rows)
    if (w !== null) hints.process_flow = w
  }

  // 텍스트 자동폭(요청 컬럼)
  const textKeys = ["sdwt_prod", "ppid", "sample_type", cfg?.autoWidth?.knox_id ? "knox_id" : "knoxid", "user_sdwt_prod"]
  for (const key of textKeys) {
    if (!key) continue
    if (cfg?.autoWidth?.[key]) {
      const w = computeAutoTextWidthFromRows(rows, key, { max: 720, cellPadding: 40 })
      if (w !== null) hints[key] = w
    }
  }
  return hints
}

function inferDefaultWidth(colKey, sampleValue) {
  if (colKey === "process_flow") return DEFAULT_PROCESS_FLOW_WIDTH
  if (colKey === "needtosend" || colKey === "send_jira") return DEFAULT_BOOL_ICON_WIDTH
  if (/(_?id)$/i.test(colKey)) return DEFAULT_ID_WIDTH
  if (tryDate(sampleValue)) return DEFAULT_DATE_WIDTH
  if (isNumeric(sampleValue)) return DEFAULT_NUMBER_WIDTH
  return DEFAULT_TEXT_WIDTH
}
function toSafeNumber(n, fallback) {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? v : fallback
}
function resolveColumnSizes(colKey, config, sampleValue, dynamicWidthHints) {
  const dynamicWidth = dynamicWidthHints?.[colKey]
  const base = dynamicWidth !== undefined ? dynamicWidth : config.width?.[colKey]
  const inferred = inferDefaultWidth(colKey, sampleValue)
  const size = toSafeNumber(base, inferred)
  const minSize = Math.min(Math.max(DEFAULT_MIN_WIDTH, Math.floor(size * 0.5)), size)
  const maxSize = Math.max(DEFAULT_MAX_WIDTH, Math.ceil(size * 2))
  return { size, minSize, maxSize }
}

// ── 셀 렌더러들 ──────────────────────────────────────────────────────────────
const CellRenderers = {
  defect_url: ({ value }) => {
    const href = toHttpUrl(value)
    if (!href) return null
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center text-blue-600 hover:underline"
        aria-label="Open defect URL in a new tab"
        title="Open defect"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    )
  },

  jira_key: ({ value }) => {
    const key = normalizeJiraKey(value)
    const href = buildJiraBrowseUrl(key)
    if (!href || !key) return null
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        aria-label={`Open JIRA issue ${key} in a new tab`}
        title={key}
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    )
  },

  comment: ({ value, rowOriginal, meta }) => {
    const recordId = getRecordId(rowOriginal)
    if (!meta || !recordId) return formatCellValue(value)
    return (
      <CommentCell
        meta={meta}
        recordId={recordId}
        baseValue={normalizeComment(rowOriginal?.comment)}
      // 표시 방식은 CommentCell 내부에서 처리(… + hover title)
      />
    )
  },

  needtosend: ({ value, rowOriginal, meta }) => {
    const recordId = getRecordId(rowOriginal)
    if (!meta || !recordId) return formatCellValue(value)
    const baseValue = normalizeNeedToSend(rowOriginal?.needtosend)
    const isLocked = Number(rowOriginal?.send_jira) === 1
    return (
      <NeedToSendCell
        meta={meta}
        recordId={recordId}
        baseValue={baseValue}
        disabled={isLocked}
        disabledReason="이미 JIRA 전송됨 (needtosend 수정 불가)"
      />
    )
  },

  send_jira: ({ value }) => {
    const ok = normalizeBinaryFlag(value)
    return (
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full border",
          ok ? "bg-blue-500 border-blue-500" : "border-muted-foreground/30",
        ].join(" ")}
        title={ok ? "Sent to JIRA" : "Not sent"}
        aria-label={ok ? "Sent to JIRA" : "Not sent"}
        role="img"
      >
        {ok ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
      </span>
    )
  },
  status: ({ value, rowOriginal }) => {
    const st = normalizeStatus(value)
    const labels = {
      ESOP_STARTED: "ESOP Started",
      MAIN_COMPLETE: "Main Complete",
      PARTIAL_COMPLETE: "Partial Complete",
      COMPLETE: "Complete",
    }
    const label = labels[st] ?? st ?? "Unknown"
    const { completed, total } = computeMetroProgress(rowOriginal, st)
    const percent = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0

    return (
      <div className="flex w-full flex-col gap-1">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Number.isFinite(percent) ? Math.round(percent) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${completed} of ${total} steps`}
        >
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${percent}%` }}
            role="presentation"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="truncate" title={label}>
            {label}
          </span>
          <span>
            {completed}
            <span aria-hidden="true">/</span>
            {total}
          </span>
        </div>
      </div>
    )
  },
}

function renderCellByKey(colKey, info) {
  const meta = info.table?.options?.meta
  const value = info.getValue()
  const rowOriginal = info.row?.original
  const renderer = CellRenderers[colKey]
  if (renderer) return renderer({ value, rowOriginal, meta })
  return formatCellValue(value)
}

// ── process_flow 컬럼 생성/삽입 로직(생략 없이 유지) ─────────────────────────
function pickStepColumnsWithIndex(columns) {
  return columns
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => STEP_COLUMN_KEY_SET.has(key))
}
function shouldCombineSteps(stepCols) {
  if (!stepCols.length) return false
  return stepCols.some(({ key }) => key === "main_step") || stepCols.some(({ key }) => key === "metro_steps")
}
function getSampleValueForColumns(row, columns) {
  if (!row || typeof row !== "object" || !Array.isArray(columns)) return undefined
  for (const { key } of columns) {
    if (row[key] !== undefined) return row[key]
  }
  return undefined
}
function makeStepFlowColumn(stepCols, label, config, firstRow, dynamicWidthHints) {
  const sample = getSampleValueForColumns(firstRow, stepCols)
  const alignment = resolveAlignment("process_flow", config, sample)
  const { size, minSize, maxSize } = resolveColumnSizes("process_flow", config, sample, dynamicWidthHints)
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

function makeColumnDef(colKey, config, sampleValueFromFirstRow, dynamicWidthHints) {
  const label = (config.labels && config.labels[colKey]) || colKey
  const enableSorting =
    (config.sortable && typeof config.sortable[colKey] === "boolean")
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

export function createColumnDefs(rawColumns, userConfig, firstRowForTypeGuess, rowsForSizing) {
  const config = mergeConfig(userConfig)
  const dynamicWidthHints = computeDynamicWidthHints(rowsForSizing, config)
  const columns = Array.isArray(rawColumns) ? rawColumns : []

  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  const baseKeys = combineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  const defs = baseKeys.map((key) => {
    const sample = firstRowForTypeGuess ? firstRowForTypeGuess?.[key] : undefined
    return makeColumnDef(key, config, sample, dynamicWidthHints)
  })

  if (combineSteps) {
    const headerText = config.labels?.process_flow || config.processFlowHeader || "process_flow"
    const stepFlowCol = makeStepFlowColumn(stepCols, headerText, config, firstRowForTypeGuess, dynamicWidthHints)
    const insertionIndex = stepCols.length ? Math.min(...stepCols.map(({ index }) => index)) : defs.length
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
