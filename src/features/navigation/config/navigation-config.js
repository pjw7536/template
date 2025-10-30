import { BookOpen, Bot, Frame, Settings2, SquareTerminal } from "lucide-react"

/**
 * 내비게이션 기본 구성.
 * - scope === "line" 인 메뉴는 라인 ID를 앞에 붙여야 하므로 주의.
 * - 실제 데이터 연동 시 이 구조를 그대로 유지하면서 값만 교체하면 된다.
 */
export const NAVIGATION_CONFIG = Object.freeze({
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "E-SOP Dashboard",
      url: "/E-SOP_Dashboard",
      icon: SquareTerminal,
      isActive: true,
      scope: "line",
      items: [
        {
          title: "Status",
          url: "/ESOP_Dashboard/status",
          scope: "line",
        },
        {
          title: "History",
          url: "/ESOP_Dashboard/history",
          scope: "line",
        },
        {
          title: "Settings",
          url: "/ESOP_Dashboard/settings",
          scope: "line",
        },
      ],
    },
    {
      title: "Models",
      url: "/models",
      icon: Bot,
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
  ],
})
