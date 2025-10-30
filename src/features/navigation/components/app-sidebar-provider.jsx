"use client";

import { usePathname } from "next/navigation";

import { SidebarProvider } from "@/components/ui/sidebar";

export function AppSidebarProvider({ children }) {
  const pathname = usePathname();

  const defaultOpen = pathname !== "/";

  return (
    <SidebarProvider key={pathname} defaultOpen={defaultOpen}>
      {children}
    </SidebarProvider>
  );
}
