"use client"

/**
 * column-defs.jsx (Refactored)
 * -----------------------------------------------------------------------------
 * ✅ 핵심 아이디어
 * 1) "현재 보이는 데이터(rowsForSizing)"를 기준으로 텍스트/프로세스 흐름 컬럼의 자동 폭을 계산
 * 2) comment뿐 아니라 sdwt_prod, ppid, sample_type, knoxid/knox_id, user_sdwt_prod에도 동일 로직 적용
 * 3) 모든 폭은 안전한 최소/최대값 사이로 클램프하여 레이아웃 안정성 보장
 * 4) TanStack Table v8의 size/minSize/maxSize 힌트를 통해 사용자 리사이즈/레이아웃 일관성 유지
 * 5) main_step + metro_steps을 하나의 "process_flow" 컬럼으로 병합 표현(옵션)
 *
 * 사용 팁
 * - DataTable.jsx에서 createColumnDefs(columns, userConfig, firstVisibleRow, filteredRows)를 호출하세요.
 * - rowsForSizing에는 "현재 보이는 데이터(예: filteredRows)"를 전달해야 동적 폭이 실시간 반영됩니다.
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

/* ────────────────────────────────────────────────────────────────────────────
 * 0) 폭/레이아웃 상수 (프로젝트 폰트/크기에 맞게 미세 조정 가능)
 * ──────────────────────────────────────────────────────────────────────────── */
// 공통 기본 폭
const DEFAULT_MIN_WIDTH = 72
const DEFAULT_MAX_WIDTH = 480
const DEFAULT_TEXT_WIDTH = 140
const DEFAULT_NUMBER_WIDTH = 110
const DEFAULT_ID_WIDTH = 130
const DEFAULT_DATE_WIDTH = 100
const DEFAULT_BOOL_ICON_WIDTH = 70
const DEFAULT_PROCESS_FLOW_WIDTH = 360

// comment 폭 계산용(문자 폭 근사치 + 셀 패딩 + 상한)
const COMMENT_CHAR_UNIT_PX = 7.2
const COMMENT_CELL_PADDING = 48
const COMMENT_MAX_WIDTH = 960

// process_flow 폭 계산용(스텝 라벨/칩/화살표의 근사 폭 요소)
const PROCESS_FLOW_STEP_CHAR_UNIT_PX = 2
const PROCESS_FLOW_STEP_PADDING = 5
const PROCESS_FLOW_LABEL_CHAR_UNIT_PX = 15
const PROCESS_FLOW_LABEL_PADDING = 5
const PROCESS_FLOW_ARROW_WITH_GAP = 10
const PROCESS_FLOW_CELL_PADDING = 20
const PROCESS_FLOW_MIN_STEP_BLOCK_WIDTH = 30
const PROCESS_FLOW_MAX_WIDTH = 1200
const PROCESS_FLOW_MIN_WIDTH = DEFAULT_MIN_WIDTH

/* ────────────────────────────────────────────────────────────────────────────
 * 1) UserConfig 타입/기본값
 *    - autoWidth: 각 컬럼의 자동 폭 사용 여부를 토글합니다.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} UserConfig
 * @property {string[]} [order]                // 최종 컬럼 표시 순서(명시되지 않은 키는 뒤에 자동 배치)
 * @property {Record<string, string>} [labels] // 컬럼 라벨(표시이름) 매핑
 * @property {Record<string, boolean>} [sortable] // 정렬 허용 여부
 * @property {Record<string, "auto"|"text"|"number"|"datetime">} [sortTypes] // 정렬 타입
 * @property {Record<string, number>} [width]  // 기본 폭(px) 힌트
 * @property {string} [processFlowHeader]      // 스텝 병합 컬럼 헤더 라벨
 * @property {Record<string, "left"|"center"|"right">} [cellAlign]   // 셀 정렬
 * @property {Record<string, "left"|"center"|"right">} [headerAlign] // 헤더 정렬
 * @property {Record<string, boolean>} [autoWidth] // 컬럼별 자동 폭 사용 여부
 */

const DEFAULT_CONFIG = /** @type {UserConfig} */ ({
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
    "knoxid",          // ⚠️ 실제 스키마가 knox_id면 labels/order/autoWidth에서 키를 맞춰주세요
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
    jira_key: true,
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
    lot_id: 80,
    status: 150,
    process_flow: 40,
    comment: 400,
    needtosend: 40,
    send_jira: 40,
    informed_at: 100,
    jira_key: 40,
    defect_url: 60,
    knoxid: 100,
    user_sdwt_prod: 120,
    updated_at: 100,
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

    process_flow: true,
    comment: true,
    sdwt_prod: true,
    ppid: true,
    sample_group: true,
    user_sdwt_prod: true,
    knoxid: true,

  },
})

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

/* ────────────────────────────────────────────────────────────────────────────
 * 2) 공통 유틸 (URL, ID, JIRA, 상태/정렬/정렬함수 추론)
 * ──────────────────────────────────────────────────────────────────────────── */

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

// 정렬 타입/함수
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

// 정렬 방향(셀/헤더 정렬)
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

/* ────────────────────────────────────────────────────────────────────────────
 * 3) 진행률/프로세스 흐름 계산(상태 바/퍼센트 등)
 * ──────────────────────────────────────────────────────────────────────────── */

function computeMetroProgress(rowOriginal, normalizedStatus) {
  const mainStep = normalizeStepValue(rowOriginal?.main_step)
  const metroSteps = parseMetroSteps(rowOriginal?.metro_steps)
  const customEndStep = normalizeStepValue(rowOriginal?.custom_end_step)
  const currentStep = normalizeStepValue(rowOriginal?.metro_current_step)

  // custom_end_step까지 유효한 metro steps 슬라이싱
  const effectiveMetroSteps = (() => {
    if (!metroSteps.length) return []
    if (!customEndStep) return metroSteps
    const endIndex = metroSteps.findIndex((step) => step === customEndStep)
    return endIndex >= 0 ? metroSteps.slice(0, endIndex + 1) : metroSteps
  })()

  // main이 metro에 없으면 선두에 삽입
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
      // current가 custom_end 이후면 100%
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

/* ────────────────────────────────────────────────────────────────────────────
 * 4) 가시 텍스트 길이 기반 폭 계산 유틸
 *    - 멀티바이트(한글/이모지) 가중치 반영
 * ──────────────────────────────────────────────────────────────────────────── */

/** 텍스트의 가시 길이를 근사(ASCII=1, CJK/emoji=2) */
function estimateVisualUnits(value) {
  if (value === null || value === undefined) return 0
  const str = typeof value === "string" ? value : String(value)
  if (!str) return 0

  let units = 0
  for (const char of Array.from(str)) {
    const codePoint = char.codePointAt(0) ?? 0
    if (codePoint === 0) continue
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) continue
    if (codePoint <= 0xff) units += 1
    else units += 2
  }
  return units
}

/** 멀티라인 텍스트에서 가장 긴 라인의 units 반환 */
function measureLongestLineUnits(value) {
  if (value === null || value === undefined) return 0
  const str = typeof value === "string" ? value : String(value)
  if (!str) return 0
  const expanded = str.replace(/\t/g, "    ")
  const lines = expanded.split(/\r?\n/)
  let maxUnits = 0
  for (const line of lines) {
    const units = estimateVisualUnits(line)
    if (units > maxUnits) maxUnits = units
  }
  return maxUnits
}

/** (기존) comment 컬럼: 현재 보이는 rows 중 최장 라인 길이 기반 px 폭(클램프 포함) */
function computeCommentWidthFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxUnits = 0
  for (const row of rows) {
    const units = measureLongestLineUnits(row?.comment)
    if (units > maxUnits) maxUnits = units
  }
  if (maxUnits === 0) return null
  const width = Math.ceil(maxUnits * COMMENT_CHAR_UNIT_PX + COMMENT_CELL_PADDING)
  return Math.max(DEFAULT_MIN_WIDTH, Math.min(width, COMMENT_MAX_WIDTH))
}

/** ✅ 공용 텍스트 자동폭: 특정 key의 최장 라인 길이로 px 폭을 근사 */
function computeAutoTextWidthFromRows(
  rows,
  key,
  {
    charUnitPx = COMMENT_CHAR_UNIT_PX, // 영문 1, CJK/이모지 2로 환산 + 단위폭
    cellPadding = 40,                  // 좌우 패딩 여유
    min = DEFAULT_MIN_WIDTH,
    max = 720,                         // 텍스트 과도 확장 방지 상한
  } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxUnits = 0
  for (const row of rows) {
    const units = measureLongestLineUnits(row?.[key])
    if (units > maxUnits) maxUnits = units
  }
  if (maxUnits === 0) return null
  const width = Math.ceil(maxUnits * charUnitPx + cellPadding)
  return Math.max(min, Math.min(width, max))
}

/** 유니크 푸시(순서 유지) */
function pushUnique(list, value) {
  if (!value) return
  if (!list.includes(value)) list.push(value)
}

/** 한 행의 process_flow 블록 전체 폭 근사 */
function computeProcessFlowWidthFromRow(row) {
  if (!row || typeof row !== "object") return 0

  const mainStep = normalizeStepValue(row?.main_step)
  const metroSteps = parseMetroSteps(row?.metro_steps)
  const informStep = normalizeStepValue(row?.inform_step)
  const customEndStep = normalizeStepValue(row?.custom_end_step)
  const metroEndStep = normalizeStepValue(row?.metro_end_step)
  const needToSend = Number(row?.needtosend) === 1 ? 1 : 0
  const sendJira = Number(row?.send_jira) === 1 ? 1 : 0

  const orderedSteps = []
  pushUnique(orderedSteps, mainStep)
  if (Array.isArray(metroSteps)) for (const step of metroSteps) pushUnique(orderedSteps, step)
  pushUnique(orderedSteps, informStep)
  if (orderedSteps.length === 0) return 0

  const endStep = customEndStep || metroEndStep

  // 라벨 표시 위치/종류 결정
  let informLabelType = "none" // none | planned | done
  let informLabelStep = null
  if (sendJira === 1) {
    informLabelType = "done"
    informLabelStep = informStep || endStep || null
  } else if (needToSend === 1) {
    if (customEndStep) informLabelType = "planned", informLabelStep = customEndStep
    else if (metroEndStep) informLabelType = "planned", informLabelStep = metroEndStep
  }

  // 전체 폭 근사
  let totalWidth = PROCESS_FLOW_CELL_PADDING
  orderedSteps.forEach((step, index) => {
    if (index > 0) totalWidth += PROCESS_FLOW_ARROW_WITH_GAP

    // 스텝 칩(이름)
    const pillUnits = Math.max(estimateVisualUnits(step), 1)
    const pillWidth = pillUnits * PROCESS_FLOW_STEP_CHAR_UNIT_PX + PROCESS_FLOW_STEP_PADDING

    // 라벨(END/CustomEND/Inform)의 최대 폭
    const labels = []
    if (mainStep && step === mainStep) labels.push("MAIN")
    const isEndHere = Boolean(endStep && step === endStep)
    const isInformHere = Boolean(informLabelType !== "none" && informLabelStep && step === informLabelStep)
    if (!isInformHere && isEndHere) labels.push(customEndStep ? "CustomEND" : "END")
    if (isInformHere) labels.push(informLabelType === "done" ? "Inform 완료" : "인폼예정")

    let labelWidth = 0
    for (const label of labels) {
      const labelUnits = Math.max(estimateVisualUnits(label), 1)
      const w = labelUnits * PROCESS_FLOW_LABEL_CHAR_UNIT_PX + PROCESS_FLOW_LABEL_PADDING
      if (w > labelWidth) labelWidth = w
    }

    const blockWidth = Math.max(pillWidth, labelWidth, PROCESS_FLOW_MIN_STEP_BLOCK_WIDTH)
    totalWidth += blockWidth
  })

  return totalWidth
}

/** process_flow 컬럼: 현재 보이는 rows 중 최장 행의 폭(px) (클램프 포함) */
function computeProcessFlowWidthFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxWidth = 0
  for (const row of rows) {
    const width = computeProcessFlowWidthFromRow(row)
    if (width > maxWidth) maxWidth = width
  }
  if (maxWidth === 0) return null
  return Math.max(PROCESS_FLOW_MIN_WIDTH, Math.min(maxWidth, PROCESS_FLOW_MAX_WIDTH))
}

/** rowsForSizing로부터 동적 폭 힌트 계산 (autoWidth 토글 반영) */
function computeDynamicWidthHints(rows, cfg) {
  if (!Array.isArray(rows) || rows.length === 0) return {}
  const hints = {}

  // 기존: comment 자동 폭
  if (cfg?.autoWidth?.comment) {
    const w = computeCommentWidthFromRows(rows)
    if (w !== null) hints.comment = w
  }

  // 기존: process_flow 자동 폭
  if (cfg?.autoWidth?.process_flow) {
    const w = computeProcessFlowWidthFromRows(rows)
    if (w !== null) hints.process_flow = w
  }

  // ✅ 추가: 일반 텍스트 컬럼 자동 폭 (comment와 동일한 방식)
  // - knoxid vs knox_id: 실제 존재하는 키만 반영되므로 둘 다 시도 가능
  const textKeys = [
    "sdwt_prod",
    "ppid",
    "sample_type",
    cfg?.autoWidth?.knox_id ? "knox_id" : "knoxid",
    "user_sdwt_prod",
  ]

  for (const key of textKeys) {
    if (!key) continue
    if (cfg?.autoWidth?.[key]) {
      const w = computeAutoTextWidthFromRows(rows, key, {
        max: 720,      // 과도 확장 방지 상한
        cellPadding: 40,
      })
      if (w !== null) hints[key] = w
    }
  }

  return hints
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5) 타입/키 기반 기본폭 + 최종 사이즈 힌트
 * ──────────────────────────────────────────────────────────────────────────── */

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

/** 동적 힌트 → user width → 기본폭 순서로 size/min/max를 결정 */
function resolveColumnSizes(colKey, config, sampleValue, dynamicWidthHints) {
  const dynamicWidth = dynamicWidthHints?.[colKey]
  const base = dynamicWidth !== undefined ? dynamicWidth : config.width?.[colKey]
  const inferred = inferDefaultWidth(colKey, sampleValue)
  const size = toSafeNumber(base, inferred)

  const minSize = Math.min(Math.max(DEFAULT_MIN_WIDTH, Math.floor(size * 0.5)), size)
  const maxSize = Math.max(DEFAULT_MAX_WIDTH, Math.ceil(size * 2))

  return { size, minSize, maxSize }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6) 셀 렌더러 (링크/토글/상태바 등)
 * ──────────────────────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────────────────────
 * 7) 스텝 병합(main_step + metro_steps → process_flow)
 * ──────────────────────────────────────────────────────────────────────────── */

function pickStepColumnsWithIndex(columns) {
  return columns
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => STEP_COLUMN_KEY_SET.has(key))
}
function shouldCombineSteps(stepCols) {
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
function makeStepFlowColumn(stepCols, label, config, firstRow, dynamicWidthHints) {
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

/* ────────────────────────────────────────────────────────────────────────────
 * 8) 컬럼 팩토리 (정렬/정렬함수/정렬방향/폭/렌더러 일괄 설정)
 * ──────────────────────────────────────────────────────────────────────────── */

function makeColumnDef(colKey, config, sampleValueFromFirstRow, dynamicWidthHints) {
  const label = (config.labels && config.labels[colKey]) || colKey

  // 정렬 허용 여부: userConfig.sortable 우선, 없으면 링크 컬럼은 비권장
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

/* ────────────────────────────────────────────────────────────────────────────
 * 9) Public API
 *    createColumnDefs(rawColumns, userConfig?, firstRowForTypeGuess?, rowsForSizing?)
 *    - rowsForSizing: ✅ 현재 보이는 데이터(예: filteredRows)를 넘기세요!
 * ──────────────────────────────────────────────────────────────────────────── */

export function createColumnDefs(
  rawColumns,
  userConfig,
  firstRowForTypeGuess,
  rowsForSizing
) {
  const config = mergeConfig(userConfig)
  const dynamicWidthHints = computeDynamicWidthHints(rowsForSizing, config)
  const columns = Array.isArray(rawColumns) ? rawColumns : []

  // 스텝 병합 판단
  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  // 병합 시, 원본 스텝 키(main_step/metro_steps)는 제거하고 process_flow 1개로 대체
  const baseKeys = combineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  // 전체 컬럼 Def 생성
  const defs = baseKeys.map((key) => {
    const sample = firstRowForTypeGuess ? firstRowForTypeGuess?.[key] : undefined
    return makeColumnDef(key, config, sample, dynamicWidthHints)
  })

  // 병합 컬럼 삽입
  if (combineSteps) {
    const headerText = config.labels?.process_flow || config.processFlowHeader || "process_flow"
    const stepFlowCol = makeStepFlowColumn(
      stepCols,
      headerText,
      config,
      firstRowForTypeGuess,
      dynamicWidthHints
    )
    const insertionIndex = stepCols.length ? Math.min(...stepCols.map(({ index }) => index)) : defs.length
    defs.splice(Math.min(Math.max(insertionIndex, 0), defs.length), 0, stepFlowCol)
  }

  // userConfig.order 적용(지정된 순서를 우선으로 머지)
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

/* ────────────────────────────────────────────────────────────────────────────
 * 10) 사용 예 (참고)
 * -----------------------------------------------------------------------------
 * const rawColumns = Object.keys(filteredRows?.[0] ?? {})
 * const defs = createColumnDefs(
 *   rawColumns,
 *   {
 *     order: ["status","process_flow","lot_id","defect_url","jira_key","comment","needtosend"],
 *     labels: { process_flow: "Flow", needtosend: "Send?", jira_key: "Jira" },
 *     sortable: { defect_url: false, jira_key: false, send_jira: false, status: true },
 *     sortTypes: { lot_id: "text", needtosend: "number", status: "text" },
 *     width: { status: 180, process_flow: 320, comment: 260, jira_key: 160 },
 *     cellAlign: { defect_url: "center", jira_key: "center", needtosend: "right" },
 *     headerAlign: { needtosend: "right", jira_key: "center" },
 *     processFlowHeader: "process_flow",
 *     autoWidth: {
 *       process_flow: true,
 *       comment: true,
 *       sdwt_prod: true, ppid: true, sample_type: true, user_sdwt_prod: true, knoxid: true
 *     },
 *   },
 *   filteredRows?.[0],  // 타입/정렬 추론 샘플
 *   filteredRows        // ✅ 폭 계산 기준(현재 보이는 데이터)
 * )
 * -----------------------------------------------------------------------------
 */
