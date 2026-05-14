export default function CommunicationsLoading() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-5 bg-gray-200 rounded w-40" />
          </div>
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg" />
            ))}
            <div className="h-28 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-5 bg-gray-200 rounded w-32" />
          </div>
          <div className="divide-y divide-gray-50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
