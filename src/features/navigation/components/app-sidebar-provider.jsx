"use client"

import { usePathname } from "next/navigation"

import { SidebarProvider } from "@/components/ui/sidebar"

export function AppSidebarProvider({ children }) {
  const pathname = usePathname()
  // 루트 페이지("/")에서는 사이드바를 닫은 상태로 시작
  const defaultOpen = pathname !== "/"

  return (
    <SidebarProvider key={pathname} defaultOpen={defaultOpen}>
      {children}
    </SidebarProvider>
  )
}
