// src/features/navigation/components/nav-user.jsx
"use client"

import * as React from "react"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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

/* -----------------------------------------------------------------------------
 * 유틸: 사용자 표기 처리
 * ---------------------------------------------------------------------------*/

/** 이름에서 이니셜(머리글자) 추출: 'Jane Doe' -> 'JD', 'LINE-01' -> 'L1' 등 */
function getInitials(name) {
  if (!name) return "?" // 이름이 비어있을 때 안전 폴백
  const parts = String(name).trim().split(/[\s-_]+/).filter(Boolean)
  if (parts.length === 0) return name.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** 다양한 형태의 user 입력을 화면 렌더에 필요한 구조로 정규화 */
function normalizeUser(u) {
  if (!u || typeof u !== "object") return null
  const name = u.name ?? u.displayName ?? u.username ?? ""
  const email = u.email ?? u.mail ?? ""
  const avatar = u.avatar ?? u.photoUrl ?? u.image ?? ""
  // name/email 둘 다 없으면 렌더 의미가 낮으므로 null 처리
  if (!name && !email) return null
  return { name, email, avatar }
}

/* -----------------------------------------------------------------------------
 * 컴포넌트
 * ---------------------------------------------------------------------------*/

/**
 * NavUser
 * - 사이드바 하단(또는 상단)에 표시되는 사용자 아바타 + 사용자 메뉴
 * - 클릭 핸들러는 props 콜백으로 주입 가능 (미제공 시 no-op)
 *
 * @param {Object} props
 * @param {Object} props.user               - 사용자 객체 { name, email, avatar } (느슨히 수용, normalizeUser에서 정규화)
 * @param {Function} [props.onUpgrade]      - "Upgrade to Pro" 클릭 콜백
 * @param {Function} [props.onAccount]      - "Account" 클릭 콜백
 * @param {Function} [props.onBilling]      - "Billing" 클릭 콜백
 * @param {Function} [props.onNotifications]- "Notifications" 클릭 콜백
 * @param {Function} [props.onLogout]       - "Log out" 클릭 콜백
 */
export function NavUser({
  user,
  onUpgrade = () => { },
  onAccount = () => { },
  onBilling = () => { },
  onNotifications = () => { },
  onLogout = () => { },
}) {
  const { isMobile } = useSidebar()

  // 사용자 입력 정규화 (표시 가능한 값이 없으면 숨김)
  const normalized = React.useMemo(() => normalizeUser(user), [user])
  if (!normalized) return null

  const { name, email, avatar } = normalized
  const initials = getInitials(name || email || "U") // 이름 없으면 이메일에서라도 생성

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {/* 트리거: 아바타 + 이름/이메일 표시 */}
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="사용자 메뉴 열기"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {/* 아바타 이미지 로딩 실패 시 AvatarFallback이 자동으로 노출 */}
                <AvatarImage src={avatar} alt={name || email || "User avatar"} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight">
                {/* 이름/이메일은 길어질 수 있어 truncate 적용 */}
                {name ? <span className="truncate font-medium">{name}</span> : null}
                {email ? <span className="truncate text-xs">{email}</span> : null}
              </div>

              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          {/* 드롭다운: 사용자 카드 + 메뉴 그룹들 */}
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* 상단 사용자 카드(간단 요약) */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatar} alt={name || email || "User avatar"} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  {name ? <span className="truncate font-medium">{name}</span> : null}
                  {email ? <span className="truncate text-xs">{email}</span> : null}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* 업그레이드 섹션: 필요 없으면 상위에서 onUpgrade 미전달 후 숨기고 싶다면 아래 map 방식으로 제어 가능 */}
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onUpgrade}>
                <Sparkles className="mr-2 size-4" aria-hidden="true" />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* 계정 관련 섹션 */}
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onAccount}>
                <BadgeCheck className="mr-2 size-4" aria-hidden="true" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onBilling}>
                <CreditCard className="mr-2 size-4" aria-hidden="true" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onNotifications}>
                <Bell className="mr-2 size-4" aria-hidden="true" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* 로그아웃 */}
            <DropdownMenuItem onSelect={onLogout}>
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
