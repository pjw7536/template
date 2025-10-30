import { DataTable } from "@/features/line-dashboard/components/data-table"

export default async function Page({ params }) {
  const { lineId: raw } = await params; // ← 여기!
  const lineId = Array.isArray(raw) ? raw[0] : raw ?? "";

  return <DataTable lineId={lineId} />;
}