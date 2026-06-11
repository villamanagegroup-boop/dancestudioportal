import { getPortalViewer } from '@/lib/portal-viewer'
import PortalDocuments from '@/components/portal/PortalDocuments'

const NO_ID = '00000000-0000-0000-0000-000000000000'

export const dynamic = 'force-dynamic'

export default async function ParentDocumentsPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: documents } = await db
    .from('documents')
    .select('id, title, document_type, description, source, signed_at')
    .eq('guardian_id', gid)
    .order('signed_at', { ascending: false })

  const shared = (documents ?? []).filter(d => d.source === 'studio')
  const own = (documents ?? []).filter(d => d.source !== 'studio')

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Documents</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Your documents.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          Forms the studio has shared with you, plus anything you&apos;d like to upload.
        </p>
      </div>

      <PortalDocuments shared={shared as any} own={own as any} />
    </div>
  )
}
