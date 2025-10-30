import { DataTable } from "@/features/line-dashboard/components/data-table"

export default function Page({ params }) {
  const paramValue = params?.lineId
  const lineId = Array.isArray(paramValue) ? paramValue[0] : paramValue ?? ""

  return <DataTable lineId={lineId} />
}
