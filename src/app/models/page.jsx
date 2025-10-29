import { DynamicBreadcrumb } from "@/components/navigation/dynamic-breadcrumb"

export default function Page() {
  return (
    <DynamicBreadcrumb
      rootLabel="Home"
      hideRootOnMobile
    />
  )
}
