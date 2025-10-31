// /src/features/line-dashboard/components/data-table/column-defs.jsx
"use client"

import Link from "next/link"
import {
  ExternalLink,
  Check,
  Circle,
  CircleDot,
  CircleCheck,
} from "lucide-react"

import { STEP_COLUMN_KEY_SET } from "./constants"
import { CommentCell } from "./cells/comment-cell"
import { NeedToSendCell } from "./cells/need-to-send-cell"
import { formatCellValue, renderMetroStepFlow } from "./utils"

/* =================================================================================
 * 구성 가능한 옵션 레이어
 * - 컬럼 순서/정렬 허용/정렬 방식/표시이름/기본 너비 등을 userConfig로 제어
 * - 필요 옵션만 넘기면 나머지는 기본값 사용
 * ================================================================================= */

/**
 * @typedef {Object} UserConfig
 * @property {string[]} [order]                // 최종 컬럼 표시 순서(명시되지 않은 키는 뒤에 자동 배치)
 * @property {Record<string, string>} [labels] // 컬럼 표시이름 매핑 (key -> label)
 * @property {Record<string, boolean>} [sortable] // 각 컬럼 정렬 허용 여부 (true/false)
 * @property {Record<string, "auto"|"text"|"number"|"datetime">} [sortTypes] // 정렬 방식 지정
 * @property {Record<string, number>} [width]  // (선택) 각 컬럼 기본 너비 힌트
 * @property {string} [processFlowHeader]      // 병합 스텝컬럼 라벨 (기본: "process_flow")
 * @property {Record<string, "left"|"center"|"right">} [cellAlign]   // 셀 정렬 방향
 * @property {Record<string, "left"|"center"|"right">} [headerAlign] // 헤더 정렬 방향 (지정 없으면 셀과 동일하게 적용)
 */

/** 기본 설정 */
const DEFAULT_CONFIG = /** @type {UserConfig} */ ({
  order: ["created_at", "line_id", "sdwt_prod", "EQP_CB", "proc_id", "ppid", "sample_type", "sample_group", "lot_id", "status", "comment", "process_flow", "needtosend", "send_jira", "informed_at", "user_sdwt_prod"],          // 제공 시 해당 순서를 우선
  labels: {
    // 여기서 자주 쓰는 표시이름을 기본 세팅(원하면 userConfig로 덮어쓰기)
    defect_url: "Defect",
    comment: "Comment",
    needtosend: "예약",
    send_jira: "JIRA",
    status: "Status",
    knoxid: "KnoxID"
  },
  sortable: {
    // 기본 정렬 허용/비허용
    defect_url: false,
    comment: true,
    needtosend: true,
    send_jira: false,   // 아이콘 기반이므로 기본 비허용
    status: true,
  },
  sortTypes: {
    // 기본 정렬 타입: 지정 없으면 "auto"
    comment: "text",
    needtosend: "number",
    send_jira: "number",
    status: "text",

  },
  width: {
    needtosend: 200,
  },                 // 필요 시 너비 힌트
  processFlowHeader: "Process_flow",
  cellAlign: {
    line_id: "center",
    EQP_CB: "center",
    lot_id: "center",
    defect_url: "center",
    send_jira: "center",
    status: "center",
    needtosend: "center",
    sdwt_prod: "center",
    sample_type: "center",
  },
  headerAlign: {},
})

/** config 병합 유틸 */
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
  }
}

/* =================================================================================
 * 공통 유틸
 * ================================================================================= */

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

/** ✅ '1'만 참으로, 그 외(0, ".", "", null, undefined)는 거짓 */
function normalizeBinaryFlag(raw) {
  if (raw === 1 || raw === "1") return true
  if (raw === "." || raw === "" || raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) ? n === 1 : false
}

/** STATUS 문자열 표준화 */
function normalizeStatus(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "_")
  if (s === "MAIN_COMPLTE") return "MAIN_COMPLETE" // 오타 보정
  return s
}

/* =================================================================================
 * 정렬 유틸
 * - TanStack Table v8 기준: columnDef.sortingFn 에 comparator 함수 전달 가능
 * - 여기서는 간단한 타입별 comparator 제공 + "auto" 추론
 * ================================================================================= */

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

/** 정렬 방식 auto 추론 */
function autoSortType(sample) {
  if (sample == null) return "text"
  if (isNumeric(sample)) return "number"
  if (tryDate(sample)) return "datetime"
  return "text"
}

/* =================================================================================
 * 정렬 방향(Alignment) 유틸
 * ================================================================================= */

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

/** 정렬 comparator를 반환 */
function getSortingFnForKey(colKey, config, sampleValue) {
  const t =
    (config.sortTypes && config.sortTypes[colKey]) || "auto"

  const sortType = t === "auto" ? autoSortType(sampleValue) : t

  if (sortType === "number") return (rowA, rowB) => cmpNumber(rowA.getValue(colKey), rowB.getValue(colKey))
  if (sortType === "datetime") return (rowA, rowB) => cmpDate(rowA.getValue(colKey), rowB.getValue(colKey))
  // 기본 text
  return (rowA, rowB) => cmpText(rowA.getValue(colKey), rowB.getValue(colKey))
}

/* =================================================================================
 * 셀 렌더러
 * ================================================================================= */

/**
 * @typedef {object} RenderArgs
 * @property {any} value
 * @property {any} rowOriginal
 * @property {any} meta
 */
const CellRenderers = {
  /** 🔗 defect_url: 아이콘 하이퍼링크 */
  defect_url: ({ value }) => {
    const href = toHttpUrl(value)
    if (!href) return null
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        aria-label="Open defect URL in a new tab"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    )
  },

  /** 📝 comment: 인라인 에디터 */
  comment: ({ value, rowOriginal, meta }) => {
    const recordId = getRecordId(rowOriginal)
    if (!meta || !recordId) {
      return formatCellValue(value)
    }
    return (
      <CommentCell
        meta={meta}
        recordId={recordId}
        baseValue={normalizeComment(rowOriginal?.comment)}
      />
    )
  },

  /** ✅ needtosend: 토글 */
  needtosend: ({ value, rowOriginal, meta }) => {
    const recordId = getRecordId(rowOriginal)
    if (!meta || !recordId) {
      return formatCellValue(value)
    }
    return (
      <NeedToSendCell
        meta={meta}
        recordId={recordId}
        baseValue={normalizeNeedToSend(rowOriginal?.needtosend)}
      />
    )
  },

  /** 🟢 send_jira: 1이면 “원형 내부 체크”, 아니면 빈 원형 */
  send_jira: ({ value }) => {
    const ok = normalizeBinaryFlag(value)
    return (
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full border",
          ok ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30",
        ].join(" ")}
        title={ok ? "Sent to JIRA" : "Not sent"}
        aria-label={ok ? "Sent to JIRA" : "Not sent"}
        role="img"
      >
        {ok ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
      </span>
    )
  },

  /** 🧭 status: 상태별 아이콘/색상 */
  status: ({ value }) => {
    const st = normalizeStatus(value)
    const map = {
      ESOP_STARTED: { icon: Check, className: "text-blue-600", label: "ESOP Started" },
      MAIN_COMPLETE: { icon: Circle, className: "text-amber-500", label: "Main Complete" },
      PARTIAL_COMPLETE: { icon: CircleDot, className: "text-teal-600", label: "Partial Complete" },
      COMPLETE: { icon: CircleCheck, className: "text-emerald-600", label: "Complete" },
    }
    const fallback = { icon: Circle, className: "text-muted-foreground", label: st || "Unknown" }
    const { icon: IconCmp, className, label } = map[st] ?? fallback

    return (
      <span className="inline-flex items-center gap-2" title={label} aria-label={label} role="img">
        <IconCmp className={`h-5 w-5 ${className}`} />
        <span className="text-sm text-foreground/80">{label}</span>
      </span>
    )
  },
}

/** 컬럼 키에 맞는 셀 렌더러 선택 (없으면 기본 포맷) */
function renderCellByKey(colKey, info) {
  const meta = info.table?.options?.meta
  const value = info.getValue()
  const rowOriginal = info.row?.original
  const renderer = CellRenderers[colKey]
  if (renderer) return renderer({ value, rowOriginal, meta })
  return formatCellValue(value)
}

/* =================================================================================
 * 스텝 병합 관련( main_step + metro_steps → process_flow )
 * ================================================================================= */

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

function makeStepFlowColumn(stepCols, label, config, firstRow) {
  const sample = getSampleValueForColumns(firstRow, stepCols)
  const alignment = resolveAlignment("process_flow", config, sample)
  return {
    id: "process_flow",
    header: () => label,
    accessorFn: (row) => row?.["main_step"] ?? row?.["metro_steps"] ?? null,
    cell: (info) => renderMetroStepFlow(info.row.original),
    enableSorting: false,
    meta: { isEditable: false, alignment },
  }
}

/* =================================================================================
 * 컬럼 팩토리
 * ================================================================================= */

function makeColumnDef(colKey, config, sampleValueFromFirstRow) {
  const label = (config.labels && config.labels[colKey]) || colKey

  // enableSorting 결정: userConfig.sortable 우선, 없으면 기본 규칙
  const enableSorting =
    (config.sortable && typeof config.sortable[colKey] === "boolean")
      ? config.sortable[colKey]
      : colKey !== "defect_url" // 기본 규칙(링크 컬럼은 비권장)

  // sortingFn: 정렬 허용일 때만 타입별 comparator 제공
  const sortingFn = enableSorting
    ? getSortingFnForKey(colKey, config, sampleValueFromFirstRow)
    : undefined

  // 너비 힌트(optional)
  const size = config.width?.[colKey]

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
    size, // TanStack Table v8에서 크기 힌트로 활용 가능
  }
}

/* =================================================================================
 * Public API
 * - createColumnDefs(rawColumns, userConfig, firstRowForTypeGuess?)
 *   - rawColumns: 원본 컬럼 키 배열
 *   - userConfig: 위 UserConfig
 *   - firstRowForTypeGuess: 첫 행 데이터(정렬 타입 auto 추론 정확도 향상용 · 선택)
 * ================================================================================= */

export function createColumnDefs(rawColumns, userConfig, firstRowForTypeGuess) {
  const config = mergeConfig(userConfig)
  const columns = Array.isArray(rawColumns) ? rawColumns : []

  // 1) 스텝 병합 판단
  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  // 2) 병합 시, 스텝 관련 키 제거 → baseKeys
  const baseKeys = combineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  // 3) 우선 전체 컬럼Def 생성
  const defs = baseKeys.map((key) => {
    const sample = firstRowForTypeGuess ? firstRowForTypeGuess?.[key] : undefined
    return makeColumnDef(key, config, sample)
  })

  // 4) 병합 컬럼 삽입 (이름은 config.processFlowHeader 또는 labels.process_flow 사용 가능)
  if (combineSteps) {
    const headerText = config.labels?.process_flow || config.processFlowHeader
    const stepFlowCol = makeStepFlowColumn(stepCols, headerText, config, firstRowForTypeGuess)
    // 기본 삽입 위치: 원래 스텝 컬럼들 중 가장 앞 인덱스
    const insertionIndex = stepCols.length ? Math.min(...stepCols.map(({ index }) => index)) : defs.length
    defs.splice(Math.min(Math.max(insertionIndex, 0), defs.length), 0, stepFlowCol)
  }

  // 5) userConfig.order 로 최종 순서 재정렬
  const order = Array.isArray(config.order) ? config.order : null
  if (order && order.length > 0) {
    // 현재 defs에 존재하는 컬럼 id만 사용
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


/* =================================================================================
 * 사용 예시 (참고)
 * ---------------------------------------------------------------------------------
 * const cols = Object.keys(rows[0] ?? {})
 * const defs = createColumnDefs(cols, {
 *   order: ["status","process_flow","lot_id","defect_url","comment","needtosend"],
 *   labels: {
 *     lot_id: "LOT",
 *     process_flow: "Flow",
 *     needtosend: "Send?",
 *   },
 *   sortable: {
 *     defect_url: false,
 *     send_jira: false,
 *     status: true,
 *   },
 *   sortTypes: {
 *     lot_id: "text",
 *     needtosend: "number",
 *     status: "text",
 *     // 명시 없으면 auto
 *   },
 *   width: {
 *     status: 180,
 *     process_flow: 320,
 *   },
 *   cellAlign: {
 *     defect_url: "center",
 *     needtosend: "right",
 *   },
 *   headerAlign: {
 *     needtosend: "right",
 *   },
 *   processFlowHeader: "process_flow", // 또는 "Flow"
 * }, rows?.[0])
 * ================================================================================= */
