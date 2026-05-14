import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell flex h-screen">
      {/* Header backdrop: full-width strip at the top that the sidebar overlaps */}
      <div className="admin-header-bar" aria-hidden="true" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden admin-content">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
