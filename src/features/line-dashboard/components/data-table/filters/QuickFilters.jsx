"use client"

import { cn } from "@/lib/utils"
import { GlobalFilter } from "./GlobalFilter"
import { isMultiSelectFilter } from "./quickFilters"

export function QuickFilters({
  sections,
  filters,
  onToggle,
  onClear,
  activeCount,
  globalFilterValue,
  onGlobalFilterChange,
  globalFilterPlaceholder = "Search rows",
}) {
  const hasSections = sections.length > 0
  const showGlobalFilter = typeof onGlobalFilterChange === "function"
  const showContainer = hasSections || showGlobalFilter
  const hasGlobalValue = showGlobalFilter && Boolean(globalFilterValue)

  const handleClearAll = () => {
    onClear?.()
    if (showGlobalFilter) onGlobalFilterChange?.("")
  }

  if (!showContainer) return null

  // ✅ 섹션 블록들(각 fieldset) 생성
  const sectionBlocks = sections.map((section) => {
    const isMulti = isMultiSelectFilter(section.key)
    const current = filters[section.key]
    const selectedValues = isMulti
      ? Array.isArray(current)
        ? current
        : []
      : [current].filter(Boolean)
    const allSelected = isMulti ? selectedValues.length === 0 : current === null
    const legendId = `legend-${section.key}`

    return (
      <fieldset
        key={section.key}
        className="flex flex-col rounded-xl p-1 px-3"
        aria-labelledby={legendId}
      >
        <legend
          id={legendId}
          className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {section.label}
        </legend>

        <div className="flex flex-wrap items-center">
          {/* 전체 */}
          <button
            type="button"
            onClick={() => onToggle(section.key, null)}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-input bg-background",
              "-ml-px first:ml-0 first:rounded-l last:rounded-r",
              "transition-colors",
              allSelected
                ? "relative z-[1] border-primary bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            전체
          </button>

          {/* 옵션들 */}
          {section.options.map((option) => {
            const isActive = selectedValues.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(section.key, option.value)}
                className={cn(
                  "h-8 px-3 text-xs font-medium border border-input bg-background",
                  "-ml-px first:ml-0 first:rounded-l last:rounded-r",
                  "transition-colors",
                  isActive
                    ? "relative z-[1] border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  })

  // ✅ 글로벌 필터도 “같은 줄의 섹션”으로 추가
  if (showGlobalFilter) {
    sectionBlocks.push(
      <fieldset
        key="__global__"
        className="flex flex-col rounded-xl p-1 px-3"
        aria-labelledby="legend-global-filter"
      >
        <legend
          id="legend-global-filter"
          className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          검색
        </legend>

        {/* 입력 너비를 버튼 그룹과 균형 잡히게 고정 폭 부여 */}
        <div className="w-52 sm:w-64 lg:w-80">
          <GlobalFilter
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={globalFilterPlaceholder}
          />
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="flex items-center gap-3 px-1 text-xs font-semibold tracking-wide text-muted-foreground">
        <span>Quick Filters</span>
        {(activeCount > 0 || hasGlobalValue) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </legend>

      {/* ✅ 동일 컨테이너(한 줄/여러 줄 래핑) 안에 섹션 + 글로벌 섹션을 함께 배치 */}
      <div className="flex flex-wrap items-start gap-2">
        {sectionBlocks}
      </div>
    </fieldset>
  )
}
