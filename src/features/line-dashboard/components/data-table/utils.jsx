import { IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

import { STEP_COLUMN_KEY_SET } from "./constants"

/* ============================================
 * 공통 상수
 * ============================================ */

/** 길이가 긴 문자열을 줄여 보여줄지 결정할 기준(초과 시 작은 폰트로 표시) */
const LONG_STRING_THRESHOLD = 120

/** metro_steps 문자열을 배열로 바꿀 때 사용할 구분자들 */
const STEP_SPLIT_REGEX = />|→|,|\|/g

/** NULL/빈문자열 시 보여줄 플레이스홀더 */
const PLACEHOLDER = {
  null: <span className="text-muted-foreground">NULL</span>,
  emptyString: <span className="text-muted-foreground">{"\"\""}</span>,
  noSteps: <span className="text-muted-foreground">-</span>,
}

/* ============================================
 * 날짜/문자 유틸
 * ============================================ */

/**
 * (표시용) 짧은 날짜 포맷으로 변환: MM/DD HH:mm
 * @param {Date} date 유효한 Date 인스턴스
 * @returns {string}
 */
function formatShortDateTime(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${month}/${day} ${hours}:${minutes}`
}

/**
 * 문자열/Date 값을 Date로 파싱. 실패 시 null.
 * 허용 형식:
 *  - YYYY-MM-DD
 *  - YYYY-MM-DD HH:mm
 *  - YYYY-MM-DDTHH:mm(초/타임존 포함 가능)
 */
function tryParseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "string") {
    const s = value.trim()
    if (!s) return null

    // 빠른 가드: 날짜 형태가 아니면 즉시 탈출
    const looksLikeDateTime = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(s)
    const looksLikeDateOnly = /\d{4}-\d{2}-\d{2}$/.test(s)
    if (!looksLikeDateTime && !looksLikeDateOnly) return null

    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * 모든 타입을 소문자 문자열로 안전 변환 (검색용)
 * @param {any} v
 * @returns {string}
 */
function toLowerSafeString(v) {
  try {
    if (v === null || v === undefined) return ""
    if (typeof v === "string") return v.toLowerCase()
    if (typeof v === "number" || typeof v === "bigint") return String(v).toLowerCase()
    if (typeof v === "boolean") return v ? "true" : "false"
    return JSON.stringify(v).toLowerCase()
  } catch {
    return String(v).toLowerCase()
  }
}

/* ============================================
 * 셀 값 포맷터 / 검색 토큰
 * ============================================ */

/**
 * 표 셀에 표시할 값 렌더링 (ReactNode 반환)
 * - null/undefined → 회색 "NULL"
 * - boolean → TRUE/FALSE
 * - number/bigint → 문자열화
 * - 날짜 문자열/객체 → MM/DD HH:mm
 * - string(빈문자) → 회색 "" 표시
 * - string(길이>LONG_STRING_THRESHOLD) → 작은 폰트로 프리랩
 * - 기타 → JSON.stringify 또는 String
 */
export function formatCellValue(value) {
  if (value === null || value === undefined) return PLACEHOLDER.null
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  if (typeof value === "number" || typeof value === "bigint") return String(value)

  // 날짜 처리: 문자열/Date 모두 tryParseDate 사용
  const parsedDate = tryParseDate(value)
  if (parsedDate) return formatShortDateTime(parsedDate)

  if (typeof value === "string") {
    if (value.length === 0) return PLACEHOLDER.emptyString
    if (value.length > LONG_STRING_THRESHOLD) {
      return (
        <span className="whitespace-pre-wrap break-all text-xs leading-relaxed">
          {value}
        </span>
      )
    }
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * 검색 인덱싱용 값 변환 (plain string)
 * - 날짜는 표시형(MM/DD HH:mm) + ISO 문자열을 함께 포함해 검색 확장
 */
export function searchableValue(value) {
  if (value === null || value === undefined) return ""
  const parsedDate = tryParseDate(value)
  if (parsedDate) {
    const human = formatShortDateTime(parsedDate)
    return `${human} ${parsedDate.toISOString()}`.toLowerCase()
  }
  return toLowerSafeString(value)
}

/* ============================================
 * 스텝 관련 유틸
 * ============================================ */

/**
 * 스텝 값 정규화: 문자열로 캐스팅 → 트림 → 빈문자면 null
 */
export function normalizeStepValue(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : null
}

/**
 * metro_steps → 문자열/배열 모두를 "정규화된 문자열 배열"로 통일
 * - 허용 구분자: '>', '→', ',', '|'
 * - 각 원소는 normalizeStepValue 거쳐 공백 제거
 * - falsy 원소 제거
 */
export function parseMetroSteps(value) {
  if (Array.isArray(value)) {
    return value
      .map(normalizeStepValue)
      .filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(STEP_SPLIT_REGEX)
      .map(normalizeStepValue)
      .filter(Boolean)
  }
  const single = normalizeStepValue(value)
  return single ? [single] : []
}

/**
 * 배열의 순서를 유지한 채 중복 제거
 */
function uniquePreserveOrder(arr) {
  const seen = new Set()
  const out = []
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x)
      out.push(x)
    }
  }
  return out
}

/* ============================================
 * 스텝 플로우 렌더링
 * ============================================ */

/**
 * 스텝 배지의 스타일 클래스를 결정 (강조/끝/기본)
 * - 강조(highlight)가 끝(end)보다 우선
 */
function getStepPillClasses({ isHighlight, isEnd }) {
  return cn(
    "rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
    isHighlight
      ? "border-primary bg-blue-600 text-primary-foreground"
      : isEnd
        ? "border-border bg-slate-800 text-muted-foreground"
        : "border-border bg-white text-foreground"
  )
}

/**
 * 스텝 플로우 렌더러
 * - main_step, metro_steps, inform_step, endStep(=custom_end_step 우선) 를
 *   순서에 맞게 합치고, 중복 제거하여 칩 형태로 렌더링
 * - highlightStep은 상태/메인/현재스텝 규칙에 따라 결정
 */
export function renderMetroStepFlow(rowData) {
  // 1) 원천 값 정규화
  const mainStep = normalizeStepValue(rowData.main_step)
  const metroSteps = parseMetroSteps(rowData.metro_steps)
  const statusValue = normalizeStepValue(rowData.status)
  const metroCurrentStep = normalizeStepValue(rowData.metro_current_step)
  const metroEndStep = normalizeStepValue(rowData.metro_end_step)
  const customEndStep = normalizeStepValue(rowData.custom_end_step)
  const informStep = normalizeStepValue(rowData.inform_step)

  // 2) 강조/종료 스텝 결정
  //  - MAIN_COMPLETE 상태라면 mainStep을 우선 강조(없으면 metroCurrent)
  //  - 그 외에는 metroCurrent를 우선 강조(없으면 mainStep)
  const highlightStep =
    statusValue === "MAIN_COMPLETE"
      ? (mainStep ?? metroCurrentStep ?? null)
      : (metroCurrentStep ?? mainStep ?? null)

  const endStep = customEndStep ?? metroEndStep ?? null

  // 3) 표시 순서: main → metroSteps[] → inform → end(없으면 생략)
  const orderedSteps = uniquePreserveOrder([
    ...(mainStep ? [mainStep] : []),
    ...metroSteps,
    ...(informStep ? [informStep] : []),
    ...(endStep ? [endStep] : []),
  ])

  if (orderedSteps.length === 0) {
    return PLACEHOLDER.noSteps
  }

  // 4) 렌더
  return (
    <div className="flex flex-wrap items-center gap-1">
      {orderedSteps.map((step, index) => {
        const isHighlight = highlightStep ? step === highlightStep : false
        const isEnd = endStep ? step === endStep : false

        return (
          <div key={`${step}-${index}`} className="flex items-center gap-1">
            {index > 0 && (
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={getStepPillClasses({ isHighlight, isEnd })}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================
 * 컬럼 결합 여부
 * ============================================ */

/**
 * 스텝 관련 컬럼을 단일 flow 컬럼으로 합칠지 결정
 * - main_step 또는 metro_steps 둘 중 하나라도 있으면 true
 */
export function shouldCombineStepColumns(columns) {
  return columns.some((key) =>
    STEP_COLUMN_KEY_SET.has(key) && (key === "main_step" || key === "metro_steps")
  )
}
