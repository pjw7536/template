"use client"

import { NAVIGATION_CONFIG } from "../config/navigation-config"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import { ActiveLineProvider } from "./active-line-context"
import { NavMain } from "./nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ lineOptions, ...props }) {
  const { user, navMain, projects } = NAVIGATION_CONFIG
  // 라인 목록이 없으면 빈 배열로 처리
  const teams = Array.isArray(lineOptions) ? lineOptions : []

  return (
    <ActiveLineProvider lineOptions={teams}>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher lines={teams} />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navMain} />
          <NavProjects projects={projects} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </ActiveLineProvider>
  )
}
