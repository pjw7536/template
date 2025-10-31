"use client"

import * as React from "react"

import { useLineDashboardData } from "../hooks/useLineDashboardData"

const LineDashboardContext = React.createContext(null)

export function LineDashboardProvider({ lineId, children }) {
  const value = useLineDashboardData(lineId)
  return <LineDashboardContext.Provider value={value}>{children}</LineDashboardContext.Provider>
}

export function useLineDashboardContext() {
  const context = React.useContext(LineDashboardContext)
  if (!context) {
    throw new Error("useLineDashboardContext must be used within LineDashboardProvider")
  }
  return context
}
