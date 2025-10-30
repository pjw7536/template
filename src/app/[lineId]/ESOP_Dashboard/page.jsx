export default function Page({ params }) {
  const paramValue = params?.lineId
  const lineId = Array.isArray(paramValue) ? paramValue[0] : paramValue ?? ""

  return (
    <section className="grid gap-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">ESOP Dashboard · {lineId}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a view from the sidebar to explore the latest E-SOP metrics for this production line.
        </p>
      </div>
    </section>
  )
}
