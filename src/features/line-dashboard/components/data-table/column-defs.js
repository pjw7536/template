"use client"

/**
 * column-defs.jsx (초보자 친화 주석 버전)
 * -----------------------------------------------------------------------------
 * 이 파일은 TanStack Table v8용 컬럼 정의를 "데이터와 설정"을 바탕으로 동적으로 생성합니다.
 * 핵심 포인트:
 * 1) process_flow 컬럼은 "총 노드 수(=스텝 개수)"에 비례해서 폭이 자동으로 커집니다.
 *    - rowsForSizing(화면에 보이는 행들)을 훑어서 가장 큰 total을 찾아 근사 폭을 계산
 * 2) comment 컬럼은 폭 고정 + 셀 내부에서 긴 텍스트는 … 처리 + 마우스 호버 시 전체 노출
 * 3) sdwt_prod/ppid/sample_type/knoxid(user_knox)/user_sdwt_prod 등은 텍스트 길이에 따라 자동 폭
 * 4) 정렬/정렬함수/헤더·셀 정렬 방향(좌/중/우)을 데이터 타입/키명에 따라 자연스럽게 추론
 * 5) main_step/metro_steps 등을 "process_flow" 하나로 합쳐서 흐름(노드 진행)을 시각화
 *
 * 아래 코드는 "초보자도 코드를 읽으며 설계 의도를 이해"할 수 있도록 주석을 자세히 넣었습니다.
 * - "왜 이렇게 계산하는지" / "fallback은 무엇인지" / "에지 케이스 처리"를 설명합니다.
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

/* ──────────────────────────────────────────────────────────────────────────
 * 0) 공통 상수: 폭(Width) 기본값과 가드레일(최소/최대)
 *    - 테이블 레이아웃이 지나치게 일그러지지 않도록 최소/최대 폭 범위를 설정합니다.
 * ────────────────────────────────────────────────────────────────────────── */
const DEFAULT_MIN_WIDTH = 72
const DEFAULT_MAX_WIDTH = 480
const DEFAULT_TEXT_WIDTH = 140
const DEFAULT_NUMBER_WIDTH = 110
const DEFAULT_ID_WIDTH = 130
const DEFAULT_DATE_WIDTH = 100
const DEFAULT_BOOL_ICON_WIDTH = 70
const DEFAULT_PROCESS_FLOW_WIDTH = 360

// process_flow(흐름 다이어그램) 폭을 "노드 수"로 근사 계산하는 파라미터들
const PROCESS_FLOW_NODE_BLOCK_WIDTH = 50     // 노드 하나를 표현하는 블록의 가로폭(근사)
const PROCESS_FLOW_ARROW_GAP_WIDTH = 14      // 노드-노드 사이 화살표 간격(근사)
const PROCESS_FLOW_CELL_SIDE_PADDING = 24    // 셀 내부 좌우 패딩 합
const PROCESS_FLOW_MIN_WIDTH = Math.max(DEFAULT_MIN_WIDTH, 220) // 너무 좁지 않게 하한
const PROCESS_FLOW_MAX_WIDTH = 1200                              // 너무 넓지 않게 상한

/* ──────────────────────────────────────────────────────────────────────────
 * 1) 사용자 구성(UserConfig) 기본값
 *    - 컬럼 순서/레이블/정렬가능여부/정렬 타입/기본 너비/정렬 방향/자동 폭 대상
 *    - "userConfig"가 들어오면 병합(override)되며, 미지정은 기본값을 사용합니다.
 * ────────────────────────────────────────────────────────────────────────── */
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
    defect_url: false, // 아이콘 링크 컬럼은 정렬 의미가 약하므로 비활성
    jira_key: false,
    comment: true,
    needtosend: true,
    send_jira: true,
    status: true,
  },
  sortTypes: {
    // 명시 없으면 auto 추론(숫자/날짜/텍스트) 사용
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
    // ✅ comment: 폭 고정(긴 텍스트는 셀 내부에서 … 처리 + 호버 title로 전체 노출)
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
  // 정렬 방향(좌/중/우): 기본은 데이터 타입/키명으로 추론, 여기서 강제 지정 가능
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
    process_flow: true, // ✅ 총 노드 수 기반 동적 폭 활성화
    comment: false,     // ✅ comment는 고정 폭(셀 내부 … 처리)
    // 요청한 자동 폭 텍스트 컬럼들
    sdwt_prod: true,
    ppid: true,
    sample_type: true,
    user_sdwt_prod: true,
    knoxid: true,
    knox_id: true, // 환경에 따라 키명이 knoxid / knox_id 섞일 수 있어 옵션 제공
  },
}

/** userConfig 병합: 사용자가 준 값만 덮어쓰고 나머지는 기본값 사용 */
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

/* ──────────────────────────────────────────────────────────────────────────
 * 2) 소도구(Utilities): URL/JIRA/정렬/정렬함수/정렬방향/타입 추론 등
 *    - "작게 쪼개진 판단 로직"을 재사용 가능하게 분리합니다.
 * ────────────────────────────────────────────────────────────────────────── */
function toHttpUrl(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}
function getRecordId(rowOriginal) {
  // 셀 편집 컴포넌트(CommentCell/NeedToSendCell)가 레코드 id를 필요로 함
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
  // null → ""로 정규화해서 편집 컴포넌트가 다루기 쉽게
  if (typeof raw === "string") return raw
  if (raw == null) return ""
  return String(raw)
}
function normalizeNeedToSend(raw) {
  // "1"/1/true로 다양하게 올 수 있는 값을 0/1 정수로 맞춥니다.
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}
function normalizeBinaryFlag(raw) {
  // send_jira 같은 0/1 플래그를 boolean으로 표현
  if (raw === 1 || raw === "1") return true
  if (raw === "." || raw === "" || raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) ? n === 1 : false
}
function normalizeStatus(raw) {
  if (raw == null) return null
  // "Main Complete" → "MAIN_COMPLETE" 처럼 통일
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "_")
  return s
}
function isNumeric(value) {
  if (value == null || value === "") return false
  const n = Number(value)
  return Number.isFinite(n)
}
function tryDate(value) {
  // 문자열/Date → 유효한 Date 객체 or null
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
  // 정렬 타입 자동 추론(숫자/날짜/텍스트)
  if (sample == null) return "text"
  if (isNumeric(sample)) return "number"
  if (tryDate(sample)) return "datetime"
  return "text"
}
const ALIGNMENT_VALUES = new Set(["left", "center", "right"])
function normalizeAlignment(value, fallback = "left") {
  // 사용자가 지정한 정렬 값이 이상하면 안전하게 fallback
  if (typeof value !== "string") return fallback
  const lower = value.toLowerCase()
  return ALIGNMENT_VALUES.has(lower) ? lower : fallback
}
function inferDefaultAlignment(colKey, sampleValue) {
  // 숫자/ID/카운트류는 오른쪽 정렬이 눈으로 비교하기 편함
  if (typeof sampleValue === "number") return "right"
  if (isNumeric(sampleValue)) return "right"
  if (colKey && /(_?id|count|qty|amount|number)$/i.test(colKey)) return "right"
  return "left"
}
function resolveAlignment(colKey, config, sampleValue) {
  // "기본 추론" → "사용자 지정(cellAlign/headerAlign)" 순으로 적용
  const inferred = inferDefaultAlignment(colKey, sampleValue)
  const cellAlignment = normalizeAlignment(config.cellAlign?.[colKey], inferred)
  const headerAlignment = normalizeAlignment(config.headerAlign?.[colKey], cellAlignment)
  return { cell: cellAlignment, header: headerAlignment }
}
function getSortingFnForKey(colKey, config, sampleValue) {
  // 명시된 sortTypes가 있으면 사용, 없으면 auto
  const t = (config.sortTypes && config.sortTypes[colKey]) || "auto"
  const sortType = t === "auto" ? autoSortType(sampleValue) : t
  if (sortType === "number")
    return (rowA, rowB) => cmpNumber(rowA.getValue(colKey), rowB.getValue(colKey))
  if (sortType === "datetime")
    return (rowA, rowB) => cmpDate(rowA.getValue(colKey), rowB.getValue(colKey))
  return (rowA, rowB) => cmpText(rowA.getValue(colKey), rowB.getValue(colKey))
}

/* ──────────────────────────────────────────────────────────────────────────
 * 3) 진행률/Flow 계산 로직(process_flow)
 *    - main_step + metro_steps를 한 줄의 "흐름"으로 보고 총 노드수/완료 노드수를 구합니다.
 *    - currentStep이 없으면 0% / custom_end_step 앞까지만 유효 / COMPLETE면 강제 100%
 * ────────────────────────────────────────────────────────────────────────── */
function computeMetroProgress(rowOriginal, normalizedStatus) {
  const mainStep = normalizeStepValue(rowOriginal?.main_step)
  const metroSteps = parseMetroSteps(rowOriginal?.metro_steps)
  const customEndStep = normalizeStepValue(rowOriginal?.custom_end_step)
  const currentStep = normalizeStepValue(rowOriginal?.metro_current_step)

  // 1) 유효 metro 스텝: custom_end_step가 존재하면 그 지점까지만 컷
  const effectiveMetroSteps = (() => {
    if (!metroSteps.length) return []
    if (!customEndStep) return metroSteps
    const endIndex = metroSteps.findIndex((step) => step === customEndStep)
    return endIndex >= 0 ? metroSteps.slice(0, endIndex + 1) : metroSteps
  })()

  // 2) main_step이 metro 배열에 "이미 포함"되어 있지 않으면 선두에 한 번만 추가
  const orderedSteps = []
  if (mainStep && !metroSteps.includes(mainStep)) orderedSteps.push(mainStep)
  orderedSteps.push(...effectiveMetroSteps)

  const total = orderedSteps.length
  if (total === 0) return { completed: 0, total: 0 }

  // 3) 완료 개수 계산 규칙
  //    - currentStep이 없으면 0
  //    - custom_end_step 존재 시, current가 end 뒤로 넘어갔다면 100%
  //    - 그 외에는 current의 인덱스(+1)를 완료 개수로 사용
  let completed = 0
  if (!currentStep) {
    completed = 0
  } else {
    const currentIndex = orderedSteps.findIndex((step) => step === currentStep)

    if (customEndStep) {
      const currentIndexInFull = metroSteps.findIndex((step) => step === currentStep)
      const endIndexInFull = metroSteps.findIndex((step) => step === customEndStep)

      // current가 end를 넘어선 상황: 실사용 데이터에서 발생 가능 → 100% 처리
      if (currentIndexInFull >= 0 && endIndexInFull >= 0 && currentIndexInFull > endIndexInFull) {
        completed = total
      } else if (currentIndex >= 0) {
        completed = currentIndex + 1
      }
    } else if (currentIndex >= 0) {
      completed = currentIndex + 1
    }
  }

  // 4) 상태가 "COMPLETE"면 강제로 100%
  const status = normalizedStatus
  if (status === "COMPLETE") completed = total

  // 범위를 벗어나는 값 방어
  return { completed: Math.max(0, Math.min(completed, total)), total }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4) process_flow 폭 계산(총 노드 수 기반의 근사)
 *    - "노드 블록 * 개수 + 화살표 간격 * (개수-1) + 좌우 패딩"으로 빠르게 근사
 *    - 화면에 보이는 행들의 최댓값을 써서 "너무 작지도, 너무 크지도 않게" 단일 폭 힌트 제공
 * ────────────────────────────────────────────────────────────────────────── */
function estimateProcessFlowWidthByTotal(total) {
  if (!Number.isFinite(total) || total <= 0) return PROCESS_FLOW_MIN_WIDTH
  const arrowCount = Math.max(0, total - 1)
  const width =
    PROCESS_FLOW_CELL_SIDE_PADDING +
    total * PROCESS_FLOW_NODE_BLOCK_WIDTH +
    arrowCount * PROCESS_FLOW_ARROW_GAP_WIDTH

  // 최소/최대 클램프(가드레일)
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

/* ──────────────────────────────────────────────────────────────────────────
 * 5) 일반 텍스트 컬럼 자동 폭 계산
 *    - "첫 줄" 텍스트 길이를 한글 2칸, 영문/숫자 1칸으로 가중치 계산한 뒤
 *      charUnitPx(문자 1칸 픽셀) * 가중치 + 패딩 으로 근사 폭 산출
 * ────────────────────────────────────────────────────────────────────────── */
function computeAutoTextWidthFromRows(
  rows,
  key,
  { charUnitPx = 7, cellPadding = 40, min = DEFAULT_MIN_WIDTH, max = 720 } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  let maxUnits = 0

  for (const row of rows) {
    const v = row?.[key]
    const str = v == null ? "" : String(v)

    // 탭/개행 등은 첫 줄 기준으로만 계산(표시도 보통 한 줄에 보이므로)
    const line = str.replace(/\t/g, "    ").split(/\r?\n/)[0] ?? ""
    let units = 0

    // 한글/한자 등 BMP 바깥 문자도 고려(코드포인트 기준)
    for (const ch of Array.from(line)) {
      const cp = ch.codePointAt(0) ?? 0
      if (cp === 0) continue
      if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) continue // 제어문자 skip
      units += cp <= 0xff ? 1 : 2 // ASCII류=1칸, 그 외=2칸
    }
    if (units > maxUnits) maxUnits = units
  }

  if (maxUnits === 0) return null
  const width = Math.ceil(maxUnits * charUnitPx + cellPadding)
  return Math.max(min, Math.min(width, max))
}

/* ──────────────────────────────────────────────────────────────────────────
 * 6) 동적 폭 힌트 모으기
 *    - process_flow: 최댓값(total) 기반 근사 폭
 *    - 텍스트 컬럼: sdwt_prod/ppid/sample_type/knox(id)/user_sdwt_prod 자동 폭
 * ────────────────────────────────────────────────────────────────────────── */
function computeDynamicWidthHints(rows, cfg) {
  if (!Array.isArray(rows) || rows.length === 0) return {}
  const hints = {}

  // ✅ process_flow 동적 폭
  if (cfg?.autoWidth?.process_flow) {
    const w = computeProcessFlowWidthFromRows_TotalBased(rows)
    if (w !== null) hints.process_flow = w
  }

  // ✅ 텍스트 자동 폭(target 키만)
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
      const w = computeAutoTextWidthFromRows(rows, key, { max: 720, cellPadding: 40 })
      if (w !== null) hints[key] = w
    }
  }
  return hints
}

/* ──────────────────────────────────────────────────────────────────────────
 * 7) 폭 기본값 추론 + 최종 사이즈 산출
 *    - 데이터 샘플로 텍스트/숫자/날짜/ID 추론 → 기본 폭 결정
 *    - 동적 폭 힌트/사용자 지정/기본 추론 순으로 size 선택
 *    - minSize/maxSize는 size를 기준으로 적당한 범위로 클램프
 * ────────────────────────────────────────────────────────────────────────── */
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

  // size를 기준으로 min/max를 상대적으로 산정 → 리사이즈/레이아웃 안정성 ↑
  const minSize = Math.min(Math.max(DEFAULT_MIN_WIDTH, Math.floor(size * 0.5)), size)
  const maxSize = Math.max(DEFAULT_MAX_WIDTH, Math.ceil(size * 2))
  return { size, minSize, maxSize }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 8) 셀 렌더러 모음
 *    - 컬럼 키에 따라 셀을 다르게 렌더링합니다.
 *    - (예) jira_key는 링크+아이콘, comment는 편집 컴포넌트 등
 * ────────────────────────────────────────────────────────────────────────── */
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
    // 편집 가능한 CommentCell: 고정 폭 + 내부 …처리 + hover title 처리
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
    // needtosend는 JIRA가 이미 전송된(send_jira=1) 경우 수정 불가
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
    // 진행률 바 + 라벨 + (완료/전체) 카운트
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

/** 키로 셀 렌더러를 찾아 실행(없으면 기본 포맷터) */
function renderCellByKey(colKey, info) {
  const meta = info.table?.options?.meta
  const value = info.getValue()
  const rowOriginal = info.row?.original
  const renderer = CellRenderers[colKey]
  if (renderer) return renderer({ value, rowOriginal, meta })
  return formatCellValue(value)
}

/* ──────────────────────────────────────────────────────────────────────────
 * 9) process_flow 컬럼 동적 생성
 *    - main_step/metro_steps 등 스텝 컬럼이 존재하면 하나로 합쳐 "흐름" 표시
 *    - 삽입 위치는 가장 앞쪽 스텝 컬럼 위치로
 * ────────────────────────────────────────────────────────────────────────── */
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
    enableSorting: false, // 흐름 그림은 정렬 무의미
    meta: { isEditable: false, alignment },
    size,
    minSize,
    maxSize,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 10) 일반 컬럼 정의 생성
 *     - 정렬 가능 여부/정렬 함수/폭/정렬 방향/편집 가능 여부 등을 설정합니다.
 * ────────────────────────────────────────────────────────────────────────── */
function makeColumnDef(colKey, config, sampleValueFromFirstRow, dynamicWidthHints) {
  const label = (config.labels && config.labels[colKey]) || colKey
  const enableSorting =
    (config.sortable && typeof config.sortable[colKey] === "boolean")
      ? config.sortable[colKey]
      // 기본값: 링크 아이콘류(defect_url/jira_key)는 정렬 비활성, 그 외 활성
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

/* ──────────────────────────────────────────────────────────────────────────
 * 11) 엔트리 포인트: createColumnDefs
 *     - (1) 사용자 설정 병합 → (2) 동적 폭 힌트 계산 → (3) 기본 컬럼 정의 생성
 *     - (4) step 컬럼이 있으면 process_flow 컬럼으로 통합하여 적절한 위치에 삽입
 *     - (5) 최종 표출 순서를 order에 맞춰 재배치
 * ────────────────────────────────────────────────────────────────────────── */
export function createColumnDefs(rawColumns, userConfig, firstRowForTypeGuess, rowsForSizing) {
  const config = mergeConfig(userConfig)
  const dynamicWidthHints = computeDynamicWidthHints(rowsForSizing, config)
  const columns = Array.isArray(rawColumns) ? rawColumns : []

  // 1) 스텝 컬럼 수집 및 통합 여부 판단
  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  // 2) 통합 대상 스텝 컬럼을 뺀 "기본 키 목록" → 각 키에 대한 컬럼 정의 생성
  const baseKeys = combineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  const defs = baseKeys.map((key) => {
    const sample = firstRowForTypeGuess ? firstRowForTypeGuess?.[key] : undefined
    return makeColumnDef(key, config, sample, dynamicWidthHints)
  })

  // 3) process_flow 컬럼을 스텝 컬럼들 중 가장 앞 위치에 삽입
  if (combineSteps) {
    const headerText =
      config.labels?.process_flow || config.processFlowHeader || "process_flow"
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

  // 4) 사용자 지정 order에 맞게 최종 재배치
  const order = Array.isArray(config.order) ? config.order : null
  if (order && order.length > 0) {
    const idSet = new Set(defs.map((d) => d.id))
    const head = order.filter((id) => idSet.has(id))           // order에 있으면서 실제로 존재
    const tail = defs.map((d) => d.id).filter((id) => !head.includes(id)) // 나머지
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
