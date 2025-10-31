"use client"

import { cn } from "@/lib/utils"

import { isMultiSelectFilter } from "./quickFilters"

export function QuickFilters({ sections, filters, onToggle, onClear, activeCount }) {
  if (sections.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-2">
      <div className="flex items-center gap-6">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">Quick Filters</span>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {sections.map((section) => {
          const isMulti = isMultiSelectFilter(section.key)
          const current = filters[section.key]
          const selectedValues = isMulti
            ? Array.isArray(current)
              ? current
              : []
            : [current].filter(Boolean)
          const allSelected = isMulti ? selectedValues.length === 0 : current === null

          return (
            <fieldset key={section.key} className="flex flex-col rounded-xl bg-muted/30 p-1 px-3">
              <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </legend>

              <div className="flex flex-wrap items-center">
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
        })}
      </div>
    </div>
  )
}
