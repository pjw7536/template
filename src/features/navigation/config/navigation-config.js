import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

const DEFAULT_TEAMS = [
  {
    id: "line-01",
    label: "LINE-01",
    icon: GalleryVerticalEnd,
    description: "Enterprise",
  },
  {
    id: "line-02",
    label: "LINE-02",
    icon: AudioWaveform,
    description: "Startup",
  },
  {
    id: "line-03",
    label: "LINE-03",
    icon: Command,
    description: "Free",
  },
]

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
    // {
    //   name: "Sales & Marketing",
    //   url: "#",
    //   icon: PieChart,
    // },
    // {
    //   name: "Travel",
    //   url: "#",
    //   icon: Map,
    // },
  ],
  teams: DEFAULT_TEAMS,
}

export function mapLinesToNavigationOptions(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return DEFAULT_TEAMS
  }

  return lines
    .map((line) => {
      if (typeof line === "string") {
        return { id: line, label: line }
      }

      if (line && typeof line === "object") {
        const id = line.id ?? line.lineId ?? line.value ?? line.label ?? line.name
        const label = line.label ?? line.name ?? id
        if (!id || !label) {
          return null
        }

        return {
          id,
          label,
          description: line.description ?? line.plan ?? line.subtitle ?? "",
        }
      }

      return null
    })
    .filter((item) => item && item.id && item.label)
}
