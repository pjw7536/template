"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/** 🔹 댓글 문자열 파서
 *  - 입력: "내용$@$aaaa"
 *  - 출력: { visibleText: "내용", suffixWithMarker: "$@$aaaa" }
 *  - "$@$"가 없으면 suffixWithMarker는 "" (빈문자열)
 */
function parseComment(raw) {
  const s = typeof raw === "string" ? raw : ""
  const MARK = "$@$"
  const idx = s.indexOf(MARK)
  if (idx === -1) return { visibleText: s, suffixWithMarker: "" }
  return {
    visibleText: s.slice(0, idx),
    suffixWithMarker: s.slice(idx), // "$@$" 포함해서 그대로 보존
  }
}

export function CommentCell({ meta, recordId, baseValue }) {
  // ✅ baseValue에서 화면/에디터에 보여줄 부분과 숨길 메타 부분 분리
  const { visibleText: baseVisibleText, suffixWithMarker } = parseComment(baseValue)

  const isEditing = Boolean(meta.commentEditing[recordId])
  const draftValue = meta.commentDrafts[recordId]
  // 에디터 value는 "보이는 텍스트"만 사용 (suffix는 절대 보여주지 않음)
  const value = isEditing ? (draftValue ?? baseVisibleText) : baseVisibleText

  const isSaving = Boolean(meta.updatingCells[`${recordId}:comment`])
  const errorMessage = meta.updateErrors[`${recordId}:comment`]
  const indicator = meta.cellIndicators[`${recordId}:comment`]
  const indicatorStatus = indicator?.status
  const [showSuccessIndicator, setShowSuccessIndicator] = React.useState(false)
  const successDismissTimerRef = React.useRef(null)

  React.useEffect(() => {
    if (!isEditing) {
      setShowSuccessIndicator(false)
      return
    }

    if (indicatorStatus === "saving") {
      setShowSuccessIndicator(false)
      return
    }

    if (indicatorStatus === "saved") {
      setShowSuccessIndicator(true)
      if (successDismissTimerRef.current) {
        window.clearTimeout(successDismissTimerRef.current)
      }
      successDismissTimerRef.current = window.setTimeout(() => {
        meta.setCommentEditingState(recordId, false)
        meta.removeCommentDraftValue(recordId)
        meta.clearUpdateError(`${recordId}:comment`)
        setShowSuccessIndicator(false)
        successDismissTimerRef.current = null
      }, 800)
    }

    return () => {
      if (successDismissTimerRef.current) {
        window.clearTimeout(successDismissTimerRef.current)
        successDismissTimerRef.current = null
      }
    }
  }, [indicatorStatus, isEditing, meta, recordId])

  /** 💾 저장 로직
   *  1) draft(=보이는 텍스트) 가져오기
   *  2) 원래의 suffix("$@$...") 그대로 뒤에 붙여 최종 문자열 생성
   *  3) baseValue와 동일하면 변경 없음 처리
   *  4) 변경이 있으면 meta.handleUpdate(recordId, { comment: 최종값 })
   */
  const handleSave = async () => {
    const nextVisible = draftValue ?? baseVisibleText
    const composed = `${nextVisible}${suffixWithMarker}` // 원본 메타 복원
    const noChange = composed === (typeof baseValue === "string" ? baseValue : "")

    if (noChange) {
      meta.setCommentEditingState(recordId, false)
      meta.removeCommentDraftValue(recordId)
      return
    }

    const success = await meta.handleUpdate(recordId, { comment: composed })
    if (!success) return
  }

  const handleCancel = () => {
    if (successDismissTimerRef.current) {
      window.clearTimeout(successDismissTimerRef.current)
      successDismissTimerRef.current = null
    }
    setShowSuccessIndicator(false)
    meta.setCommentEditingState(recordId, false)
    meta.removeCommentDraftValue(recordId)
    meta.clearUpdateError(`${recordId}:comment`)
  }

  const renderDialogStatusMessage = () => {
    if (errorMessage) {
      return <div className="text-xs text-destructive">{errorMessage}</div>
    }
    if (indicatorStatus === "saving") {
      return <div className="text-xs text-muted-foreground">Saving…</div>
    }
    if (indicatorStatus === "saved" && showSuccessIndicator) {
      return <div className="text-xs text-emerald-600">Saved</div>
    }
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <Dialog
        open={isEditing}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            // ✨ 에디터 초깃값으로는 "보이는 텍스트"만 주입
            meta.setCommentDraftValue(recordId, baseVisibleText)
            meta.setCommentEditingState(recordId, true)
          } else {
            meta.setCommentEditingState(recordId, false)
            meta.removeCommentDraftValue(recordId)
          }
          meta.clearUpdateError(`${recordId}:comment`)
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="whitespace-pre-wrap break-words rounded-md border border-transparent px-2 py-1 text-left text-sm transition-colors hover:border-border hover:bg-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {baseVisibleText.length > 0 ? (
              baseVisibleText
            ) : (
              <span className="text-muted-foreground">Tap to add a comment</span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit comment</DialogTitle>
          </DialogHeader>

          {/* 📝 에디터에는 항상 "보이는 텍스트"만 (suffix는 숨김) */}
          <textarea
            value={value}
            disabled={isSaving}
            onChange={(event) => {
              const nextValue = event.target.value
              meta.setCommentDraftValue(recordId, nextValue)
              meta.clearUpdateError(`${recordId}:comment`)
            }}
            className="min-h-[6rem] resize-y rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
            aria-label="Edit comment"
            autoFocus
          />

          {/* ℹ️ 상태 메시지: 에러 / Saving / Saved */}
          {renderDialogStatusMessage()}

          <DialogFooter>
            <Button
              onClick={() => {
                void handleSave()
              }}
              disabled={isSaving}
            >
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 인라인 인디케이터는 다이얼로그 안에서만 표시 */}
    </div>
  )
}
