export default function ClassesLoading() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
        <div className="grid grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-full" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
