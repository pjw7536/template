"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className, ...props }) {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const currentTheme = theme === "system" ? systemTheme : theme

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className={cn("pointer-events-none opacity-0", className)}
        {...props}
      >
        <SunIcon className="size-4 rotate-0 scale-100 transition-all" />
      </Button>
    )
  }

  const isDark = currentTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("transition-all", className)}
      {...props}
    >
      <span className="relative flex size-full items-center justify-center">
        <SunIcon className={cn("size-4 rotate-0 scale-100 transition-transform", isDark && "-rotate-90 scale-0")} />
        <MoonIcon className={cn("absolute size-4 rotate-90 scale-0 transition-transform", isDark && "rotate-0 scale-100")} />
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
