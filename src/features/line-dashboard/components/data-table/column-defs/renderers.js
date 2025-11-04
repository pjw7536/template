import Link from "next/link"
import { ExternalLink, Check } from "lucide-react"

import { CommentCell, NeedToSendCell } from "../cells"
import { formatCellValue } from "../utils/formatters"
import {
  buildJiraBrowseUrl,
  getRecordId,
  normalizeBinaryFlag,
  normalizeComment,
  normalizeJiraKey,
  normalizeNeedToSend,
  normalizeStatus,
  toHttpUrl,
} from "./normalizers"
import { computeMetroProgress } from "./processFlow"

const STATUS_LABELS = {
  ESOP_STARTED: "ESOP시작",
  ESOP_STRATED: "ESOP시작",
  MAIN_COMPLETE: "MAIN완료",
  PARTIAL_COMPLETE: "계측중",
  COMPLETE: "완료",
}

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
    const status = normalizeStatus(value)
    const label = STATUS_LABELS[status] ?? status ?? "Unknown"
    const { completed, total } = computeMetroProgress(rowOriginal, status)
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

/**
 * Safely look up a renderer by column key, falling back to the standard
 * formatter so that unexpected columns still display sensible values.
 */
export function renderCellByKey(colKey, info) {
  const meta = info.table?.options?.meta
  const value = info.getValue()
  const rowOriginal = info.row?.original
  const renderer = CellRenderers[colKey]
  if (renderer) return renderer({ value, rowOriginal, meta })
  return formatCellValue(value)
}
