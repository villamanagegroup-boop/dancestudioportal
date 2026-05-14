export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-28 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 h-72 animate-pulse" />
    </div>
  )
}
