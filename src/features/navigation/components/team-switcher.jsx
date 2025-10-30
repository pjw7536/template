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

function getInitials(label) {
  if (!label) return "?"
  const parts = label.split(/[\s-_]+/).filter(Boolean)
  if (parts.length === 0) return label.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function TeamSwitcher({ lines }) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const lineParam = params?.lineId
  const { lineId: selectedLineId, setLineId: setSelectedLineId } = useActiveLine()

  const options = Array.isArray(lines)
    ? lines
        .map((line) => {
          if (!line) return null
          if (typeof line === "string") {
            return { id: line, label: line, description: "" }
          }
          const id = line.id ?? line.label ?? line.name
          const label = line.label ?? line.name ?? id
          const description = line.description ?? ""
          if (!id || !label) return null
          return { id, label, description }
        })
        .filter((option) => option !== null)
    : []

  const activeLineId = selectedLineId
    ? selectedLineId
    : typeof lineParam === "string"
      ? lineParam
      : Array.isArray(lineParam)
        ? lineParam[0]
        : options[0]?.id ?? null

  const activeLine = options.find((option) => option.id === activeLineId) ?? options[0] ?? null

  React.useEffect(() => {
    if (activeLineId && activeLineId !== selectedLineId) {
      setSelectedLineId(activeLineId)
    }
  }, [activeLineId, selectedLineId, setSelectedLineId])

  const handleSelect = React.useCallback(
    (lineId) => {
      if (!lineId || lineId === activeLineId) return

      setSelectedLineId(lineId)

      if (!pathname) {
        router.push(`/${lineId}/ESOP_Dashboard/status`)
        return
      }

      const segments = pathname.split("/").filter(Boolean)
      const hasLineParam = typeof lineParam === "string" || Array.isArray(lineParam)

      if (hasLineParam && segments.length > 0) {
        segments[0] = lineId
        router.push(`/${segments.join("/")}`)
        return
      }

      router.push(`/${lineId}/ESOP_Dashboard/status`)
    },
    [activeLineId, lineParam, pathname, router, setSelectedLineId]
  )

  if (!activeLine) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold">
                {getInitials(activeLine.label)}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeLine.label}</span>
                {activeLine.description ? (
                  <span className="truncate text-xs text-muted-foreground">{activeLine.description}</span>
                ) : null}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Production Lines
            </DropdownMenuLabel>
            {options.map((line) => (
              <DropdownMenuItem
                key={line.id}
                className={cn(
                  "gap-2 p-2",
                  line.id === activeLineId && "bg-sidebar-accent/20 focus:bg-sidebar-accent/20"
                )}
                onSelect={() => handleSelect(line.id)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border text-xs font-semibold">
                  {getInitials(line.label)}
                </div>
                <div className="flex flex-col">
                  <span>{line.label}</span>
                  {line.description ? (
                    <span className="text-muted-foreground text-xs">{line.description}</span>
                  ) : null}
                </div>
              </DropdownMenuItem>
            ))}
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
