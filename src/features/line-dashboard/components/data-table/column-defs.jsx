// /src/features/line-dashboard/components/data-table/column-defs.jsx
"use client"

import Link from "next/link"
import { ExternalLink, Check } from "lucide-react"

import { STEP_COLUMN_KEY_SET } from "./constants"
import { CommentCell } from "./cells/comment-cell"
import { NeedToSendCell } from "./cells/need-to-send-cell"
import {
  formatCellValue,
  renderMetroStepFlow,
  parseMetroSteps,
  normalizeStepValue,
} from "./utils"

/* =================================================================================
 * 구성 가능한 옵션 레이어 (UserConfig)
 * - 컬럼 순서/레이블/정렬 허용/정렬 타입/기본 너비/정렬 방향을 한 번에 커스터마이즈
 * - 필요 옵션만 넘기면 나머지는 기본값 사용
 * ================================================================================= */

/**
 * @typedef {Object} UserConfig
 * @property {string[]} [order]                // 최종 컬럼 표시 순서(명시되지 않은 키는 뒤에 자동 배치)
 * @property {Record<string, string>} [labels] // 컬럼 표시이름 매핑 (key -> label)
 * @property {Record<string, boolean>} [sortable] // 각 컬럼 정렬 허용 여부 (true/false)
 * @property {Record<string, "auto"|"text"|"number"|"datetime">} [sortTypes] // 정렬 방식 지정
 * @property {Record<string, number>} [width]  // 각 컬럼 "기본" 너비(px) 힌트
 * @property {string} [processFlowHeader]      // 병합 스텝컬럼 라벨 (기본: "process_flow")
 * @property {Record<string, "left"|"center"|"right">} [cellAlign]   // 셀 정렬 방향
 * @property {Record<string, "left"|"center"|"right">} [headerAlign] // 헤더 정렬 방향 (없으면 셀과 동일)
 */

/* ----------------------- 기본 사이즈 정책 -----------------------
 * - size: 초기/기본 폭
 * - minSize/maxSize: 사용자 리사이즈 시 허용 범위
 *   (TanStack Table v8은 size 힌트를 바인딩하면 리사이저/colgroup과 함께 안정적으로 반영됨)
 */
const DEFAULT_MIN_WIDTH = 72
const DEFAULT_MAX_WIDTH = 480
const DEFAULT_TEXT_WIDTH = 140
const DEFAULT_NUMBER_WIDTH = 110
const DEFAULT_ID_WIDTH = 130
const DEFAULT_DATE_WIDTH = 100
const DEFAULT_BOOL_ICON_WIDTH = 60
const DEFAULT_PROCESS_FLOW_WIDTH = 360

/** 기본 설정 */
const DEFAULT_CONFIG = /** @type {UserConfig} */ ({
  // 제공 시 해당 순서를 우선(명시되지 않은 키는 뒤에 자동 배치)
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
    "comment",
    "process_flow",
    "needtosend",
    "send_jira",
    "informed_at",
    "jira_key",
    "user_sdwt_prod",
  ],

  // 표시 이름 기본 매핑 (원하면 userConfig.labels로 덮어쓰기)
  labels: {
    defect_url: "Defect",
    jira_key: "Jira", // ⬅️ Jira 컬럼 라벨
    comment: "Comment",
    needtosend: "예약",
    send_jira: "JIRA",
    status: "Status",
    knoxid: "KnoxID",
    process_flow: "Process Flow",
  },

  // 기본 정렬 허용/비허용
  // 링크 컬럼(외부 이동)은 보통 정렬 비권장
  sortable: {
    defect_url: false,
    jira_key: false, // ⬅️ Jira 링크 컬럼 정렬 비활성화(원하면 true로 바꾸세요)
    comment: true,
    needtosend: true,
    send_jira: true,
    status: true,
  },

  // 기본 정렬 타입: 지정 없으면 "auto"
  sortTypes: {
    comment: "text",
    needtosend: "number",
    send_jira: "number",
    status: "text",
    // 기타 컬럼은 auto 추론
  },

  // ⛳ 기본 폭 힌트 (없으면 타입/키명 기반으로 안전한 기본값 추론)
  width: {
    // 아이콘/불린류
    needtosend: DEFAULT_BOOL_ICON_WIDTH,
    send_jira: DEFAULT_BOOL_ICON_WIDTH,
    status: 150,

    // 식별자/ID류
    line_id: 90,
    lot_id: 90,
    sample_type: 150,

    // 링크류
    defect_url: 80,
    jira_key: 160, // ⬅️ Jira 키 텍스트+아이콘에 적절한 폭

    // 긴 텍스트
    comment: 350,

    // 스텝 플로우(병합 컬럼)
    process_flow: 600,
    user_sdwt_prod: 150,
  },

  // 병합 스텝 라벨
  processFlowHeader: "process_flow",

  // 정렬 방향(셀/헤더)
  cellAlign: {
    line_id: "center",
    EQP_CB: "center",
    lot_id: "center",
    defect_url: "center",
    jira_key: "center", // ⬅️ Jira 키도 중앙 정렬
    send_jira: "center",
    status: "center",
    needtosend: "center",
    sdwt_prod: "center",
    sample_type: "center",
    sample_group: "center",
    knoxid: "center",
    user_sdwt_prod: "center",
    ppid: "center",
  },
  headerAlign: {
    needtosend: "center",
    send_jira: "center",
    jira_key: "center", // ⬅️ 헤더 정렬
    status: "center",
    knoxid: "center",
    user_sdwt_prod: "center",
    sample_type: "center",
    sample_group: "center",
    ppid: "center",
  },
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

/** 문자열을 http(s) URL로 정규화(스킴 없으면 https 가정) */
function toHttpUrl(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

/** 행의 id를 문자열로 안전 추출 */
function getRecordId(rowOriginal) {
  const rawId = rowOriginal?.id
  if (rawId === undefined || rawId === null) return null
  return String(rawId)
}

/** Jira 키(예: ABC-123)를 안전히 정규화 */
function normalizeJiraKey(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toUpperCase()
  // 간단한 패턴 필터: PROJECTKEY-숫자
  return /^[A-Z0-9]+-\d+$/.test(s) ? s : null
}

/** Jira 브라우즈 URL 생성: https://jira.apple.net/browse/{KEY} */
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
  return s
}

/** 진행률 계산: main_step + metro_steps 상에서 current/end/complete 고려 */
function computeMetroProgress(rowOriginal, normalizedStatus) {
  const mainStep = normalizeStepValue(rowOriginal?.main_step)
  const metroSteps = parseMetroSteps(rowOriginal?.metro_steps)
  const customEndStep = normalizeStepValue(rowOriginal?.custom_end_step)
  const currentStep = normalizeStepValue(rowOriginal?.metro_current_step)

  // ① 유효한 metro step 목록 계산 (custom_end_step 전까지만 유효)
  const effectiveMetroSteps = (() => {
    if (!metroSteps.length) return []
    if (!customEndStep) return metroSteps
    const endIndex = metroSteps.findIndex((step) => step === customEndStep)
    return endIndex >= 0 ? metroSteps.slice(0, endIndex + 1) : metroSteps
  })()

  // ② main + metro 결합
  const orderedSteps = []
  if (mainStep) {
    // 중복 방지: metroSteps에 이미 있으면 추가하지 않음
    if (!metroSteps.includes(mainStep)) {
      orderedSteps.push(mainStep)
    }
  }
  orderedSteps.push(...effectiveMetroSteps)

  const total = orderedSteps.length
  if (total === 0) return { completed: 0, total: 0 }

  // ③ 현재 단계 위치 계산
  let completed = 0

  if (!currentStep) {
    completed = 0
  } else {
    const currentIndex = orderedSteps.findIndex((step) => step === currentStep)

    if (customEndStep) {
      const currentIndexInFull = metroSteps.findIndex((step) => step === currentStep)
      const endIndexInFull = metroSteps.findIndex((step) => step === customEndStep)
      if (currentIndexInFull >= 0 && endIndexInFull >= 0 && currentIndexInFull > endIndexInFull) {
        completed = total // end 이후면 강제 100%
      } else if (currentIndex >= 0) {
        completed = currentIndex + 1
      }
    } else if (currentIndex >= 0) {
      completed = currentIndex + 1
    }
  }

  // ④ 상태 COMPLETE면 100%
  if (normalizedStatus === "COMPLETE") {
    completed = total
  }

  return {
    completed: Math.max(0, Math.min(completed, total)),
    total,
  }
}

/* =================================================================================
 * 정렬 유틸 (TanStack v8 sortingFn comparator)
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
  const t = (config.sortTypes && config.sortTypes[colKey]) || "auto"
  const sortType = t === "auto" ? autoSortType(sampleValue) : t

  if (sortType === "number")
    return (rowA, rowB) => cmpNumber(rowA.getValue(colKey), rowB.getValue(colKey))
  if (sortType === "datetime")
    return (rowA, rowB) => cmpDate(rowA.getValue(colKey), rowB.getValue(colKey))
  // 기본 text
  return (rowA, rowB) => cmpText(rowA.getValue(colKey), rowB.getValue(colKey))
}

/* =================================================================================
 * 컬럼 width 유틸: 타입/키 기반 기본 폭 자동 추론 + 범위 클램프
 * ================================================================================= */

/** 숫자/날짜/ID/불린/텍스트에 따라 안전한 기본 폭을 제시 */
function inferDefaultWidth(colKey, sampleValue) {
  if (colKey === "process_flow") return DEFAULT_PROCESS_FLOW_WIDTH
  if (colKey === "needtosend" || colKey === "send_jira") return DEFAULT_BOOL_ICON_WIDTH
  if (/(_?id)$/i.test(colKey)) return DEFAULT_ID_WIDTH

  if (tryDate(sampleValue)) return DEFAULT_DATE_WIDTH
  if (isNumeric(sampleValue)) return DEFAULT_NUMBER_WIDTH

  // 기본 텍스트
  return DEFAULT_TEXT_WIDTH
}

/** 안전한 px 숫자만 허용 */
function toSafeNumber(n, fallback) {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

/** 최종 size/min/max 산출 */
function resolveColumnSizes(colKey, config, sampleValue) {
  const base = config.width?.[colKey]
  const inferred = inferDefaultWidth(colKey, sampleValue)
  const size = toSafeNumber(base, inferred)

  // min/max는 공통 기본 범위를 주되, size가 너무 작거나 큰 경우 보정
  const minSize = Math.min(Math.max(DEFAULT_MIN_WIDTH, Math.floor(size * 0.5)), size)
  const maxSize = Math.max(DEFAULT_MAX_WIDTH, Math.ceil(size * 2))

  return { size, minSize, maxSize }
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
  /** 🔗 defect_url: 아이콘 하이퍼링크(아이콘만 노출) */
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

  /**
   * 🧷 jira_key: https://jira.apple.net/browse/{JiraKey} 로 변환하여
   * 하이퍼링크 + 외부링크 아이콘을 함께 표시
   * - 키 텍스트도 함께 보여주어 한눈에 확인 가능
   */
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
        {/* <span className="font-medium">{key}</span> */}
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

  /** 🧭 status: 진행률 바 + 라벨 */
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

function makeStepFlowColumn(stepCols, label, config, firstRow) {
  const sample = getSampleValueForColumns(firstRow, stepCols)
  const alignment = resolveAlignment("process_flow", config, sample)
  const { size, minSize, maxSize } = resolveColumnSizes("process_flow", config, sample)

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

/* =================================================================================
 * 컬럼 팩토리
 * ================================================================================= */

function makeColumnDef(colKey, config, sampleValueFromFirstRow) {
  const label = (config.labels && config.labels[colKey]) || colKey

  // enableSorting 결정: userConfig.sortable 우선, 없으면 기본 규칙
  const enableSorting =
    (config.sortable && typeof config.sortable[colKey] === "boolean")
      ? config.sortable[colKey]
      : colKey !== "defect_url" && colKey !== "jira_key" // 링크 컬럼은 기본 비권장

  // sortingFn: 정렬 허용일 때만 타입별 comparator 제공
  const sortingFn = enableSorting
    ? getSortingFnForKey(colKey, config, sampleValueFromFirstRow)
    : undefined

  // 🔧 사이즈(기본/최소/최대) 계산
  const { size, minSize, maxSize } = resolveColumnSizes(colKey, config, sampleValueFromFirstRow)

  // 정렬(헤더/셀) 방향
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
    // ⛳ TanStack Table v8 사이징 힌트
    size,
    minSize,
    maxSize,
  }
}

/* =================================================================================
 * Public API
 * - createColumnDefs(rawColumns, userConfig, firstRowForTypeGuess?)
 *   - rawColumns: 원본 컬럼 키 배열
 *   - userConfig: 위 UserConfig
 *   - firstRowForTypeGuess: 첫 행 데이터(정렬 타입/폭 추론 정확도 향상용 · 선택)
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

  // 4) 병합 컬럼 삽입 (라벨은 labels.process_flow > processFlowHeader 순으로 사용)
  if (combineSteps) {
    const headerText = config.labels?.process_flow || config.processFlowHeader || "process_flow"
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
 *   order: ["status","process_flow","lot_id","defect_url","jira_key","comment","needtosend"],
 *   labels: {
 *     lot_id: "LOT",
 *     process_flow: "Flow",
 *     needtosend: "Send?",
 *     jira_key: "Jira",
 *   },
 *   sortable: {
 *     defect_url: false,
 *     jira_key: false, // 텍스트 정렬 원하면 true
 *     send_jira: false,
 *     status: true,
 *   },
 *   sortTypes: {
 *     lot_id: "text",
 *     needtosend: "number",
 *     status: "text",
 *   },
 *   width: {
 *     status: 180,
 *     process_flow: 320,
 *     comment: 260,
 *     jira_key: 160,
 *   },
 *   cellAlign: {
 *     defect_url: "center",
 *     jira_key: "center",
 *     needtosend: "right",
 *   },
 *   headerAlign: {
 *     needtosend: "right",
 *     jira_key: "center",
 *   },
 *   processFlowHeader: "process_flow", // 또는 "Flow"
 * }, rows?.[0])
 * ================================================================================= */
