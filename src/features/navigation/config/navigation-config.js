import { BookOpen, Bot, Frame, Settings2, SquareTerminal } from "lucide-react"

export const NAVIGATION_CONFIG = {
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
}
