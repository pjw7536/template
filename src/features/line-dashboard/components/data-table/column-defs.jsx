"use client"

import Link from "next/link"
import { ExternalLink, Check, PlayCircle, Circle, CircleDot, CircleCheck } from "lucide-react"

import { STEP_COLUMN_KEY_SET } from "./constants"
import { CommentCell } from "./cells/comment-cell"
import { NeedToSendCell } from "./cells/need-to-send-cell"
import { formatCellValue, renderMetroStepFlow } from "./utils"

/* ----------------------- 공통 유틸 ----------------------- */
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
  // 종종 '.' 문자로 들어오는 케이스 방지
  if (raw === "." || raw === "" || raw == null) return false
  const n = Number(raw)
  return Number.isFinite(n) ? n === 1 : false
}

/** STATUS 문자열을 표준화: 오타/공백/대소문자 대응 */
function normalizeStatus(raw) {
  if (raw == null) return null
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "_")
  if (s === "MAIN_COMPLTE") return "MAIN_COMPLETE" // 오타 보정
  return s
}


/* --------------------- 셀 렌더러 --------------------- */
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

  /** ✅ needtosend: 체크/토글 */
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

    // 상태별 아이콘/색상/레이블 매핑
    const map = {
      ESOP_STARTED: {
        icon: Check,
        className: "text-blue-600",
        label: "ESOP Started",
      },
      MAIN_COMPLETE: {
        icon: Circle,
        className: "text-amber-500",
        label: "Main Complete",
      },
      PARTIAL_COMPLETE: {
        icon: CircleDot,
        className: "text-teal-600",
        label: "Partial Complete",
      },
      COMPLETE: {
        icon: CircleCheck,
        className: "text-emerald-600",
        label: "Complete",
      },
    }

    const fallback = {
      icon: Circle,
      className: "text-muted-foreground",
      label: st || "Unknown",
    }

    const { icon: IconCmp, className, label } = map[st] ?? fallback

    return (
      <span
        className="inline-flex items-center gap-2"
        title={label}
        aria-label={label}
        role="img"
      >
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
  if (renderer) {
    return renderer({ value, rowOriginal, meta })
  }
  return formatCellValue(value)
}

/* --------------------- 스텝 병합 관련 --------------------- */
function pickStepColumnsWithIndex(columns) {
  return columns
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => STEP_COLUMN_KEY_SET.has(key))
}

function shouldCombineSteps(stepCols) {
  if (!stepCols.length) return false
  return stepCols.some(({ key }) => key === "main_step") || stepCols.some(({ key }) => key === "metro_steps")
}

function makeStepFlowColumn(stepCols) {
  const headerLabel = "process_flow"
  return {
    id: "process_flow",
    header: () => headerLabel,
    accessorFn: (row) => row?.["main_step"] ?? row?.["metro_steps"] ?? null,
    cell: (info) => renderMetroStepFlow(info.row.original),
    enableSorting: false,
    meta: { isEditable: false },
  }
}

/* --------------------- 컬럼 팩토리 --------------------- */
function makeColumnDef(colKey) {
  return {
    id: colKey,
    header: () => colKey,
    accessorFn: (row) => row?.[colKey],
    meta: {
      isEditable: colKey === "comment" || colKey === "needtosend",
    },
    cell: (info) => renderCellByKey(colKey, info),
    // 필요시 정렬 끄기: send_jira는 아이콘이라 끄고 싶다면 아래 조건에 추가
    enableSorting: colKey !== "comment" && colKey !== "defect_url",
  }
}

/* --------------------- Public API --------------------- */
export function createColumnDefs(columns) {
  const stepCols = pickStepColumnsWithIndex(columns)
  const combineSteps = shouldCombineSteps(stepCols)

  const baseKeys = combineSteps
    ? columns.filter((key) => !STEP_COLUMN_KEY_SET.has(key))
    : [...columns]

  const defs = baseKeys.map((key) => makeColumnDef(key))

  if (combineSteps) {
    const insertionIndex = stepCols.length
      ? Math.min(...stepCols.map(({ index }) => index))
      : defs.length
    const stepFlowCol = makeStepFlowColumn(stepCols)
    defs.splice(Math.min(Math.max(insertionIndex, 0), defs.length), 0, stepFlowCol)
  }

  return defs
}
