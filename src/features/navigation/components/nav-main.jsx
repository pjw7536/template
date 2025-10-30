"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronRight } from "lucide-react"

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

function resolveLineScopedUrl(url, scope, lineId) {
  if (!url) return "#"
  if (scope !== "line") return url
  if (!lineId) return url

  if (url.startsWith("/")) {
    const normalized = url.replace(/^\/+/, "")
    return `/${lineId}/${normalized}`
  }

  return `/${lineId}/${url}`
}

export function NavMain({ items }) {
  const params = useParams()
  const lineParam = params?.lineId
  const lineId = Array.isArray(lineParam) ? lineParam[0] : lineParam
  const { lineId: selectedLineId } = useActiveLine()
  const resolvedLineId = lineId ?? selectedLineId

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = Array.isArray(item.items) && item.items.length > 0
          const itemHref = resolveLineScopedUrl(item.url, item.scope, resolvedLineId)

          if (hasChildren) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
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
                      {item.items.map((subItem) => {
                        const subHref = resolveLineScopedUrl(
                          subItem.url,
                          subItem.scope ?? item.scope,
                          resolvedLineId
                        )
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <Link href={subHref}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                      {itemHref !== "#" ? (
                        <SidebarMenuSubItem key={`${item.title}-overview`}>
                          <SidebarMenuSubButton asChild>
                            <Link href={itemHref}>
                              <span>Overview</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ) : null}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={itemHref}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
