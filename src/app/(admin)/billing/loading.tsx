export default function BillingLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 h-96 animate-pulse" />
    </div>
  )
}
