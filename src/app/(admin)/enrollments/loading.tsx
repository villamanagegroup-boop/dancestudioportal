export default function EnrollmentsLoading() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse">
        <div className="p-4 border-b border-gray-100 flex gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-9 bg-gray-200 rounded-lg w-32" />)}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-gray-50 flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
