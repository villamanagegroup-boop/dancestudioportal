export interface KpiItem {
  label: string
  value: string
  sub?: string
}

export default function KpiStrip({ items }: { items: KpiItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="kpi-strip" style={{ ['--kpi-cols' as any]: items.length }}>
      {items.map((k, i) => (
        <div key={i}>
          <div className="l">{k.label}</div>
          <div className="v">{k.value}</div>
          {k.sub && <div className="kpi-sub">{k.sub}</div>}
        </div>
      ))}
    </div>
  )
}
