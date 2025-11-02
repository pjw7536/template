// /src/features/line-dashboard/components/data-table/cells/need-to-send-cell.jsx
"use client"

import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Check, CalendarCheck2, CalendarX2, XCircle } from "lucide-react"

/**
 * ✅ 변경 요약
 * - disabled / disabledReason props 추가
 * - 비활성화 시: 클릭 가드 + 토스트 안내 + 버튼 disabled 처리
 * - 성공 / 취소 / 실패 토스트는 기존 디자인 유지
 */
export function NeedToSendCell({
  meta,
  recordId,
  baseValue,
  disabled = false,
  disabledReason = "이미 JIRA 전송됨 (needtosend 수정 불가)",
}) {
  const draftValue = meta.needToSendDrafts?.[recordId]
  const nextValue = draftValue ?? baseValue
  const isChecked = Number(nextValue) === 1
  const isSaving = Boolean(meta.updatingCells?.[`${recordId}:needtosend`])

  // ✅ 공통 스타일
  const baseToastStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "20px",
    fontWeight: "600",
    fontSize: "14px",
    padding: "15px 20px",
    borderRadius: "8px",
    backgroundColor: "#f9fafb",
  }

  // ✅ 0 → 1 : 예약 성공
  const showReserveToast = () =>
    toast.success("예약 성공", {
      description: "E-SOP Inform 예약 되었습니다.",
      icon: <CalendarCheck2 className="h-5 w-5 text-blue-500" />,
      style: { ...baseToastStyle, color: "#065f46" },
      duration: 1800,
    })

  // ✅ 1 → 0 : 예약 취소
  const showCancelToast = () =>
    toast("예약 취소", {
      description: "E-SOP Inform 예약 취소 되었습니다.",
      icon: <CalendarX2 className="h-5 w-5 text-sky-600" />,
      style: { ...baseToastStyle, color: "#1e40af" },
      duration: 1800,
    })

  // ✅ 실패
  const showErrorToast = (msg) =>
    toast.error("저장 실패", {
      description: msg || "저장 중 오류가 발생했습니다.",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      style: { ...baseToastStyle, color: "#991b1b" },
      duration: 3000,
    })

  // ────────────────────────────────────────────────
  // 토글 핸들러 + 가드
  // ────────────────────────────────────────────────
  const handleToggle = async () => {
    // ⛔ 비활성 or 저장 중이면 중단
    if (disabled) {
      toast.info(disabledReason)
      return
    }
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

    // 실제 업데이트
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
    <div className="inline-flex justify-center">
      {/* ✅ 원형 체크버튼 */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isSaving}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          isChecked
            ? "bg-blue-500 border-blue-500"
            : "border-muted-foreground/30 hover:border-blue-300",
          (disabled || isSaving) && "bg-gray-400 border-gray-400 cursor-not-allowed"
        )}
        title={
          disabled
            ? disabledReason
            : isChecked
              ? "Need to send"
              : "Not selected"
        }
        aria-disabled={disabled || isSaving}
        aria-label={isChecked ? "Need to send" : "Not selected"}
      >
        {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>
    </div>
  )
}

export default NeedToSendCell
