import Header from '@/components/admin/Header'
import ImportWizard from '@/components/admin/ImportWizard'

export default function ImportPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Import data" subtitle="Migrate from your previous studio portal via CSV upload" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <ImportWizard />
          </div>
        </div>
      </div>
    </div>
  )
}
