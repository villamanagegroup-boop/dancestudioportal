export default function StudentsLoading() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex gap-3">
          <div className="h-9 bg-gray-200 rounded-lg w-64 animate-pulse" />
          <div className="h-9 bg-gray-200 rounded-lg w-32 animate-pulse" />
          <div className="ml-auto h-9 bg-gray-200 rounded-lg w-28 animate-pulse" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-gray-50 flex items-center gap-4 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
