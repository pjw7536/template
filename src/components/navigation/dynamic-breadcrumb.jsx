"use client"

import { Fragment, useMemo } from "react"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function toTitleCase(segment) {
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/** 현재 경로를 segment 단위로 잘라 breadcrumb 모델 배열로 변환 */
function buildBreadcrumbs(pathname, overrides) {
  if (!pathname) return []
  const segments = pathname.split("/").filter(Boolean)

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const label = overrides[segment] ?? toTitleCase(segment)
    return { href, segment, label, isLast: index === segments.length - 1 }
  })
}

export function DynamicBreadcrumb({ overrides = {} }) {
  const pathname = usePathname()
  const crumbs = useMemo(
    () => buildBreadcrumbs(pathname, overrides),
    [pathname, overrides]
  )

  // 루트("/")면 아무것도 안 보여줌
  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          return (
            <Fragment key={crumb.href}>
              {/* 첫 항목 앞에는 구분자 표시 X */}
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast
                  ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  : <span className="text-muted-foreground">{crumb.label}</span>}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
