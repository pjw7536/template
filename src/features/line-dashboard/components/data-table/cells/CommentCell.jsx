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

/** 🔹 댓글 문자열 파서 */
function parseComment(raw) {
  const s = typeof raw === "string" ? raw : ""
  const MARK = "$@$"
  const idx = s.indexOf(MARK)
  if (idx === -1) return { visibleText: s, suffixWithMarker: "" }
  return { visibleText: s.slice(0, idx), suffixWithMarker: s.slice(idx) }
}

export function CommentCell({ meta, recordId, baseValue }) {
  const { visibleText: baseVisibleText, suffixWithMarker } = parseComment(baseValue)

  const isEditing = Boolean(meta.commentEditing[recordId])
  const draftValue = meta.commentDrafts[recordId]
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

  /** 💾 저장: 보이는 텍스트 + 원본 suffix를 재조합 */
  const handleSave = async () => {
    const nextVisible = draftValue ?? baseVisibleText
    const composed = `${nextVisible}${suffixWithMarker}`
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

  /** ⌨️ 엔터 저장: Enter → 저장, Shift+Enter → 줄바꿈, Ctrl/Cmd+Enter → 저장 */
  const handleEditorKeyDown = (e) => {
    if (e.key !== "Enter") return
    const isCtrlOrCmd = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey

    if (isCtrlOrCmd || !isShift) {
      // Ctrl/Cmd+Enter 또는 단독 Enter -> 저장
      e.preventDefault()
      if (!isSaving) void handleSave()
    }
    // Shift+Enter는 기본 줄바꿈 허용
  }

  const renderDialogStatusMessage = () => {
    if (errorMessage) return <div className="text-xs text-destructive">{errorMessage}</div>
    if (indicatorStatus === "saving") return <div className="text-xs text-muted-foreground">Saving…</div>
    if (indicatorStatus === "saved" && showSuccessIndicator) return <div className="text-xs text-emerald-600">Saved</div>
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <Dialog
        open={isEditing}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
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
            title={baseVisibleText || "Tap to add a comment"}
            className="block w-full cursor-pointer truncate rounded-md border border-transparent px-2 py-1 text-left text-sm transition-colors hover:border-border hover:bg-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open comment editor"
          >
            {baseVisibleText.length > 0 ? (
              <span className="block truncate">{baseVisibleText}</span>
            ) : (
              <span className="text-muted-foreground">Tap to add a comment</span>
            )}
          </button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit comment</DialogTitle>
          </DialogHeader>

          {/* 📝 에디터: Enter 저장 / Shift+Enter 줄바꿈 / Ctrl|Cmd+Enter 저장 */}
          <textarea
            value={value}
            disabled={isSaving}
            onChange={(e) => {
              meta.setCommentDraftValue(recordId, e.target.value)
              meta.clearUpdateError(`${recordId}:comment`)
            }}
            onKeyDown={handleEditorKeyDown}
            className="min-h-[6rem] resize-y rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
            aria-label="Edit comment"
            placeholder="Shift+Enter :줄바꿈  ||  Enter : 저장"
            autoFocus
          />

          {renderDialogStatusMessage()}

          <DialogFooter className="flex items-center gap-2">
            <span className="mr-auto text-[11px] text-muted-foreground">
              Enter: 저장 || Shift+Enter: 줄바꿈
            </span>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
