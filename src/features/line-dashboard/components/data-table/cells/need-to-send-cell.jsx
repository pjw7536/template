// /src/features/line-dashboard/components/data-table/cells/need-to-send-cell.jsx
"use client"

import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Check, CalendarCheck2, CalendarX2, XCircle } from "lucide-react"

/**
 * ✅ 변경 요약
 * - 성공 / 취소 / 실패 모두 같은 강조 디자인
 * - justify-content: "flex-start" + gap: 8px (양 끝 배치 대신 간격 유지)
 * - 색상만 초록 / 파랑 / 빨강으로 구분
 */

export function NeedToSendCell({ meta, recordId, baseValue }) {
  const draftValue = meta.needToSendDrafts?.[recordId]
  const nextValue = draftValue ?? baseValue
  const isChecked = Number(nextValue) === 1
  const isSaving = Boolean(meta.updatingCells?.[`${recordId}:needtosend`])

  // ✅ 공통 스타일
  const baseToastStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start", // 왼쪽 정렬
    gap: "20px", // 아이콘과 텍스트 사이 여백
    fontWeight: "600",
    fontSize: "14px",
    padding: "15px 20px",
    borderRadius: "8px",
    backgroundColor: "#f9fafb", // 은은한 배경
  }

  // ✅ 0 → 1 : 예약 성공
  const showReserveToast = () =>
    toast.success("예약 성공", {
      description: "E-SOP Inform 예약 되었습니다.",
      icon: <CalendarCheck2 className="h-5 w-5 text-emerald-500" />,
      style: {
        ...baseToastStyle,
        color: "#065f46", // 진한 초록
      },
      duration: 1800,
    })

  // ✅ 1 → 0 : 예약 취소
  const showCancelToast = () =>
    toast("예약 취소", {
      description: "E-SOP Inform 예약 취소 되었습니다.",
      icon: <CalendarX2 className="h-5 w-5 text-sky-600" />,
      style: {
        ...baseToastStyle,
        color: "#1e40af", // 파랑 강조
      },
      duration: 1800,
    })

  // ✅ 실패
  const showErrorToast = (msg) =>
    toast.error("저장 실패", {
      description: msg || "저장 중 오류가 발생했습니다.",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      style: {
        ...baseToastStyle,
        color: "#991b1b", // 진한 빨강
      },
      duration: 3000,
    })

  // ────────────────────────────────────────────────
  // 토글 핸들러
  // ────────────────────────────────────────────────
  const handleToggle = async () => {
    if (isSaving) return

    const targetValue = isChecked ? 0 : 1
    const key = `${recordId}:needtosend`

    if (targetValue === baseValue) {
      meta.removeNeedToSendDraftValue?.(recordId)
      meta.clearUpdateError?.(key)
      return
    }

    meta.setNeedToSendDraftValue?.(recordId, targetValue)
    meta.clearUpdateError?.(key)

    const ok = await meta.handleUpdate?.(recordId, { needtosend: targetValue })

    if (ok) {
      meta.removeNeedToSendDraftValue?.(recordId)
      if (targetValue === 1) showReserveToast()
      else showCancelToast()
    } else {
      const msg = meta.updateErrors?.[key]
      meta.removeNeedToSendDraftValue?.(recordId)
      showErrorToast(msg)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {/* ✅ 원형 체크버튼 */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSaving}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          isChecked
            ? "bg-emerald-500 border-emerald-500"
            : "border-muted-foreground/30 hover:border-emerald-300",
          isSaving && "opacity-60 cursor-not-allowed"
        )}
        title={isChecked ? "Need to send" : "Not selected"}
        aria-label={isChecked ? "Need to send" : "Not selected"}
      >
        {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>
    </div>
  )
}

export default NeedToSendCell
