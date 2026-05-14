export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-5 bg-gray-200 rounded w-40" />
          </div>
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
