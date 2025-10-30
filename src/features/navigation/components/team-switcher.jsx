// src/features/navigation/components/team-switcher.jsx
"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { useParams, usePathname, useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useActiveLine } from "./active-line-context"

/* -----------------------------------------------------------------------------
 * 유틸: 라인 옵션/표기 처리
 * ---------------------------------------------------------------------------*/

/** 라인 ID를 문자열로 정규화 (null/undefined는 null 유지) */
function normalizeLineId(value) {
  if (value === null || value === undefined) return null
  return typeof value === "string" ? value : String(value)
}

/** 라벨에서 머리글자(이니셜) 추출: 'LINE-01' -> 'L1' 등 */
function getInitials(label) {
  if (!label) return "?"
  const parts = label.split(/[\s-_]+/).filter(Boolean)
  if (parts.length === 0) return label.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** 다양한 입력 형태(lines 배열 요소)를 { id, label, description }로 통일 */
function toLineOption(line) {
  if (!line) return null

  // 문자열만 넘어오면 label=id로 취급
  if (typeof line === "string") {
    const id = normalizeLineId(line)
    return id ? { id, label: line, description: "" } : null
  }

  // 객체 형태일 때: id/label/description 우선순위 지정
  const rawId = line.id ?? line.label ?? line.name
  const id = normalizeLineId(rawId)
  const label = line.label ?? line.name ?? id
  const description = line.description ?? ""
  if (!id || !label) return null
  return { id, label, description }
}

/** URL params에서 lineId 추출 (동적 라우트 /[lineId]/...) */
function getLineIdFromParams(params) {
  if (!params) return null
  const raw = params.lineId
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) return normalizeLineId(raw[0])
  return null
}

/** 현재 경로와 선택된 라인ID를 기반으로 이동할 경로를 생성 */
function buildNextPath({ pathname, newLineId, hasLineIdInPath }) {
  // 1) 기본 이동 경로 (라인 선택 후 최초 진입 등)
  const DEFAULT_TARGET = `/${newLineId}/ESOP_Dashboard/status`

  if (!pathname) return DEFAULT_TARGET

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return DEFAULT_TARGET

  // 2) 현재 경로가 /[lineId]/... 형태라면 첫 세그먼트를 교체
  if (hasLineIdInPath) {
    segments[0] = newLineId
    return `/${segments.join("/")}`
  }

  // 3) lineId 세그먼트가 없으면 기본 진입 경로로 이동
  return DEFAULT_TARGET
}

/* -----------------------------------------------------------------------------
 * 컴포넌트
 * ---------------------------------------------------------------------------*/

/**
 * TeamSwitcher
 * - 사이드바 상단에서 "라인(팀)"을 전환하는 드롭다운
 * - 우선순위(선택 라인 결정): 컨텍스트 값 > URL 파라미터 > 첫 옵션
 */
export function TeamSwitcher({ lines }) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const paramLineId = getLineIdFromParams(params)

  // 전역(컨텍스트)에서 현재 선택된 라인ID와 setter 획득
  const { lineId: ctxLineId, setLineId: setCtxLineId } = useActiveLine()

  // 1) 입력 받은 lines를 화면 렌더용 옵션 배열로 정규화
  const options = React.useMemo(() => {
    if (!Array.isArray(lines)) return []
    return lines.map(toLineOption).filter(Boolean)
  }, [lines])

  // 2) 활성 라인ID 결정: 컨텍스트 > URL 파라미터 > 첫 옵션
  const activeLineId = React.useMemo(() => {
    if (ctxLineId) return ctxLineId
    if (paramLineId) return paramLineId
    return options[0]?.id ?? null
  }, [ctxLineId, paramLineId, options])

  // 3) 활성 라인 객체 (라벨/설명 표시용)
  const activeLine = options.find((o) => o.id === activeLineId) ?? options[0] ?? null

  // 4) 활성 라인ID가 바뀌면 컨텍스트도 동기화 (URL 진입 → UI 반영)
  React.useEffect(() => {
    if (activeLineId && activeLineId !== ctxLineId) {
      setCtxLineId(activeLineId)
    }
  }, [activeLineId, ctxLineId, setCtxLineId])

  // 5) 드롭다운에서 라인 선택 시 실행할 라우팅/상태 업데이트
  const handleSelect = React.useCallback(
    (nextId) => {
      if (!nextId || nextId === activeLineId) return

      // (a) 먼저 컨텍스트 갱신 → UI 즉시 반영
      setCtxLineId(nextId)

      // (b) 경로 재구성 후 이동
      const target = buildNextPath({
        pathname,
        newLineId: nextId,
        hasLineIdInPath: Boolean(paramLineId),
      })
      router.push(target)
    },
    [activeLineId, paramLineId, pathname, router, setCtxLineId]
  )

  // 라인 옵션이 없으면 렌더 생략
  if (!activeLine) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {/* 트리거: 현재 활성 라인의 이니셜/라벨 표시 */}
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* 왼쪽 원형 배지: 이니셜 */}
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold">
                {getInitials(activeLine.label)}
              </div>

              {/* 가운데: 라벨 + 서브텍스트(설명) */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeLine.label}</span>
                {activeLine.description ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {activeLine.description}
                  </span>
                ) : null}
              </div>

              {/* 오른쪽: 펼치기 아이콘 */}
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          {/* 드롭다운 목록 */}
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Production Lines
            </DropdownMenuLabel>

            {/* 라인 목록 */}
            {options.map((line) => {
              const isActive = line.id === activeLineId
              return (
                <DropdownMenuItem
                  key={line.id}
                  className={cn("gap-2 p-2", isActive && "bg-sidebar-accent/20 focus:bg-sidebar-accent/20")}
                  onSelect={() => handleSelect(line.id)}
                >
                  {/* 좌측 작은 배지(이니셜) */}
                  <div className="flex size-6 items-center justify-center rounded-md border text-xs font-semibold">
                    {getInitials(line.label)}
                  </div>

                  {/* 라벨/설명 */}
                  <div className="flex flex-col">
                    <span>{line.label}</span>
                    {line.description ? (
                      <span className="text-muted-foreground text-xs">{line.description}</span>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              )
            })}

            {/* 추후 '라인 관리' 기능 연결 예정인 플레이스홀더 */}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" disabled>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Manage lines</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
