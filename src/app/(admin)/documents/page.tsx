import Header from '@/components/admin/Header'
import DocumentsManager from '@/components/admin/DocumentsManager'

export default function DocumentsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Documents" subtitle="Upload and store admin files: contracts, branding assets, legal, finance" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <DocumentsManager />
          </div>
        </div>
      </div>
    </div>
  )
}
