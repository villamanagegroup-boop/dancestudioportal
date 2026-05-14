export default function StaffLoading() {
  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-gray-200 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full mb-3" />
            <div className="flex gap-1">
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-5 bg-gray-100 rounded-full w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
