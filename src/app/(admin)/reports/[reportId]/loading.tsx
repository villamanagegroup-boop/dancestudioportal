export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3" style={{ color: 'var(--ink-3)' }}>
              <div
                className="w-7 h-7 rounded-full animate-spin"
                style={{
                  border: '2px solid var(--line)',
                  borderTopColor: 'var(--grad-1)',
                }}
              />
              <p style={{ fontSize: 13 }}>Running report…</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
