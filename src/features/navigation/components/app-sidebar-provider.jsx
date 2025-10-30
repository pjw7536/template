"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { SidebarProvider } from "@/components/ui/sidebar";

export function AppSidebarProvider({ children }) {
  const pathname = usePathname();

  const defaultOpen = useMemo(() => pathname !== "/", [pathname]);

  return (
    <SidebarProvider key={pathname} defaultOpen={defaultOpen}>
      {children}
    </SidebarProvider>
  );
}
