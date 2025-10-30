"use client"

/**
 * NavMain (리팩토링 버전)
 * - URL 스코프(특히 line 스코프)를 일관되게 처리
 * - 단일 항목 / 하위 항목이 있는 그룹 항목을 컴포넌트로 분리
 * - useParams + useActiveLine 를 안전하게 병합하여 lineId 결정
 * - 키/접근성/방어코드 강화
 */

import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useActiveLine } from "./active-line-context"

/* =========================================================
 * 타입 정의 (JSDoc) — 에디터 인텔리센스 도움
 * ======================================================= */
/**
 * @typedef {"line" | "global" | undefined} Scope
 *
 * @typedef {Object} NavSubItem
 * @property {string} title
 * @property {string=} url
 * @property {Scope=} scope
 *
 * @typedef {Object} NavItem
 * @property {string} title
 * @property {string=} url
 * @property {Scope=} scope
 * @property {React.ComponentType<any>=} icon
 * @property {boolean=} isActive
 * @property {NavSubItem[]=} items
 */

/* =========================================
 * 유틸: URL 스코프(line) 접두어 붙이기
 *  - scope === "line" 이고 lineId가 있으면 `/{lineId}/...` 형태로 변환
 *  - url이 절대경로/상대경로 모두 안전처리
 *  - url이 비어있으면 "#" 반환
 * ======================================= */
/** @param {string|undefined} url @param {Scope} scope @param {string|null} lineId */
function withLineScope(url, scope, lineId) {
  if (!url) return "#"
  if (scope !== "line" || !lineId) return url

  // 앞의 슬래시를 정규화하여 중복 슬래시 방지
  const normalized = url.startsWith("/") ? url.replace(/^\/+/, "") : url
  return `/${lineId}/${normalized}`
}

/* =========================================
 * 유틸: params에서 lineId 추출 (배열/문자열 방어)
 * ======================================= */
function extractLineIdFromParams(params) {
  if (!params) return null
  const raw = params.lineId
  if (Array.isArray(raw)) return raw[0] ?? null
  return typeof raw === "string" ? raw : null
}

/* =========================================================
 * 하위 컴포넌트: 단일 메뉴 항목 (children 없음)
 * ======================================================= */
/** @param {{ item: NavItem, href: string }} props */
function LeafItem({ item, href }) {
  const Key = useMemo(() => `${item.title}-${item.url ?? "leaf"}`, [item.title, item.url])
  return (
    <SidebarMenuItem key={Key}>
      <SidebarMenuButton asChild tooltip={item.title}>
        <Link href={href}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/* =========================================================
 * 하위 컴포넌트: 자식이 있는 그룹 항목 (Collapsible)
 *  - 부모 scope를 자식이 기본 상속 (subItem.scope ?? item.scope)
 *  - Overview 링크(부모 url) 옵션 제공
 * ======================================================= */
/** @param {{ item: NavItem, resolvedLineId: string|null }} props */
function GroupItem({ item, resolvedLineId }) {
  const parentHref = withLineScope(item.url, item.scope, resolvedLineId)
  const key = `${item.title}-${item.url ?? "group"}`
  const children = Array.isArray(item.items) ? item.items : []

  return (
    <Collapsible asChild defaultOpen={!!item.isActive} className="group/collapsible" key={key}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((sub) => {
              const href = withLineScope(sub.url, sub.scope ?? item.scope, resolvedLineId)
              const subKey = `${key}-sub-${sub.title}-${sub.url ?? "no-url"}`
              return (
                <SidebarMenuSubItem key={subKey}>
                  <SidebarMenuSubButton asChild>
                    <Link href={href}>
                      <span>{sub.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
            {/* 부모 자체로 이동하는 "Overview" 항목 (부모 url이 있을 때만) */}
            {parentHref !== "#" && (
              <SidebarMenuSubItem key={`${key}-overview`}>
                <SidebarMenuSubButton asChild>
                  <Link href={parentHref}>
                    <span>Overview</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

/* =========================================================
 * 최상위 컴포넌트: NavMain
 *  - lineId 우선순위: URL 파라미터 > ActiveLine 컨텍스트
 *  - 각 item에 대해 LeafItem 또는 GroupItem으로 분기 렌더
 * ======================================================= */
/** @param {{ items: NavItem[] }} props */
export function NavMain({ items }) {
  const params = useParams()
  const { lineId: activeLineId } = useActiveLine()

  // URL 파라미터 우선, 없다면 컨텍스트의 선택 라인 사용
  const resolvedLineId = useMemo(
    () => extractLineIdFromParams(params) ?? activeLineId ?? null,
    [params, activeLineId]
  )

  const safeItems = Array.isArray(items) ? items : []

  return (
    <SidebarGroup>
      {/* 필요 시 라벨 문구를 props로 받도록 확장 가능 */}
      <SidebarGroupLabel>Platform</SidebarGroupLabel>

      <SidebarMenu>
        {safeItems.map((item) => {
          const hasChildren = Array.isArray(item.items) && item.items.length > 0
          if (hasChildren) {
            return <GroupItem key={`${item.title}-${item.url ?? "group"}`} item={item} resolvedLineId={resolvedLineId} />
          }
          const href = withLineScope(item.url, item.scope, resolvedLineId)
          return <LeafItem key={`${item.title}-${item.url ?? "leaf"}`} item={item} href={href} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
