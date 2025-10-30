"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { STEP_COLUMN_KEY_SET } from "./constants"
import { CommentCell } from "./cells/comment-cell"
import { NeedToSendCell } from "./cells/need-to-send-cell"
import { formatCellValue, renderMetroStepFlow } from "./utils"

/**
 * ------------------------------------------------------------
 * Utilities: 값 정규화 / 공통 로직
 * ------------------------------------------------------------
 */

/** 문자열처럼 보이는 값을 안전하게 URL로 변환 (http/https 없는 경우 https로 보정) */
function toHttpUrl(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

/** 레코드 원본에서 id를 안전하게 추출 (없으면 null) */
function getRecordId(rowOriginal) {
  const rawId = rowOriginal?.id
  if (rawId === undefined || rawId === null) return null
  return String(rawId)
}

/** 코멘트 기본값을 빈 문자열로 정규화 */
function normalizeComment(raw) {
  if (typeof raw === "string") return raw
  if (raw == null) return ""
  return String(raw)
}

/** needtosend 기본값을 0/1 수로 정규화 */
function normalizeNeedToSend(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

/**
 * ------------------------------------------------------------
 * Cell Renderers: 컬럼별 셀 렌더링을 한 곳에서 관리
 * ------------------------------------------------------------
 * - meta 접근, 원본 레코드, 현재 값 등을 인수로 받아 각 셀을 렌더링
 * - 새로운 특수 컬럼이 생기면 여기만 추가하면 됨
 */

/**
 * @typedef {object} RenderArgs
 * @property {any} value            - info.getValue()
 * @property {any} rowOriginal      - info.row.original
 * @property {any} meta             - info.table.options.meta
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

  /** 📝 comment: 인라인 에디터 셀 */
  comment: ({ value, rowOriginal, meta }) => {
    const recordId = getRecordId(rowOriginal)
    if (!meta || !recordId) {
      // 편집 메타/ID가 없으면 일반 포맷으로만 표시
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

  /** ✅ needtosend: 체크/토글 셀 */
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
}

/** 컬럼 키에 맞는 셀 렌더러를 가져오되, 없으면 기본 포맷터 사용 */
function renderCellByKey(colKey, info) {
  const meta = info.table?.options?.meta
  const value = info.getValue()
  const rowOriginal = info.row?.original
  const renderer = CellRenderers[colKey]
  if (renderer) {
    return renderer({ value, rowOriginal, meta })
  }
  return formatCellValue(value)
}

/**
 * ------------------------------------------------------------
 * Step Columns: main_step / metro_steps를 하나의 흐름 컬럼으로 병합
 * ------------------------------------------------------------
 */

/** 열 목록에서 스텝 관련 열들만 추출(키/인덱스) */
function pickStepColumnsWithIndex(columns) {
  return columns
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => STEP_COLUMN_KEY_SET.has(key))
}

/** 스텝 열을 단일 "flow" 컬럼으로 대체해야 하는지 판단 */
function shouldCombineSteps(stepCols) {
  if (!stepCols.length) return false
  return stepCols.some(({ key }) => key === "main_step") || stepCols.some(({ key }) => key === "metro_steps")
}

/** 스텝 플로우 컬럼 정의 생성 */
function makeStepFlowColumn(stepCols) {
  const headerLabel = stepCols[0]?.key ?? "Step Flow"
  return {
    id: "metro_step_flow",
    header: () => headerLabel,
    accessorFn: (row) => row?.["main_step"] ?? row?.["metro_steps"] ?? null,
    cell: (info) => renderMetroStepFlow(info.row.original),
    enableSorting: false,
    meta: { isEditable: false },
  }
}

/**
 * ------------------------------------------------------------
 * Column Factory
 * ------------------------------------------------------------
 */

/** 개별 컬럼 정의 생성기 (특수 렌더링/편집 메타/정렬 여부 포함) */
function makeColumnDef(colKey) {
  return {
    id: colKey,
    header: () => colKey,
    accessorFn: (row) => row?.[colKey],
    meta: {
      // 편집 가능 컬럼만 true
      isEditable: colKey === "comment" || colKey === "needtosend",
    },
    cell: (info) => renderCellByKey(colKey, info),
    enableSorting: colKey !== "comment" && colKey !== "defect_url",
  }
}

/**
 * ------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------
 * @param {string[]} columns - 서버/스키마에서 넘어온 전체 컬럼 키 배열
 * @returns {import("@tanstack/react-table").ColumnDef<any, any>[]}
 */
export function createColumnDefs(columns) {
  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  // 스텝을 합칠 때는 스텝 관련 키를 제외하고 기본 컬럼 생성
  const baseKeys = combineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  const defs = baseKeys.map((key) => makeColumnDef(key))

  // 스텝 플로우 컬럼을 원래 스텝 컬럼 중 가장 앞 인덱스에 삽입
  if (combineSteps) {
    const insertionIndex = stepCols.length
      ? Math.min(...stepCols.map(({ index }) => index))
      : defs.length
    const stepFlowCol = makeStepFlowColumn(stepCols)
    defs.splice(Math.min(Math.max(insertionIndex, 0), defs.length), 0, stepFlowCol)
  }

  return defs
}
