export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      <div>
        <div className="h-4 bg-gray-200 rounded w-28 mb-3 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />
        <div className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />
      </div>
    </div>
  )
}
