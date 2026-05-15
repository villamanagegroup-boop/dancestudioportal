import { getPortalViewer } from '@/lib/portal-viewer'
import { formatDate } from '@/lib/utils'
import { CheckCircle, AlertCircle } from 'lucide-react'
import DocumentUpload from '@/components/portal/DocumentUpload'

const NO_ID = '00000000-0000-0000-0000-000000000000'

const REQUIRED_DOCUMENTS = [
  { type: 'liability_waiver', title: 'Liability Waiver', description: 'Required before first class' },
  { type: 'photo_release', title: 'Photo Release', description: 'Permission for photos and videos' },
  { type: 'emergency_authorization', title: 'Emergency Authorization', description: 'Medical emergency consent' },
]

export default async function ParentDocumentsPage() {
  const { db, effectiveId } = await getPortalViewer('g')
  const gid = effectiveId ?? NO_ID

  const { data: documents } = await db
    .from('documents')
    .select('*')
    .eq('guardian_id', gid)

  const signedTypes = new Set(documents?.filter(d => d.signed_at).map(d => d.document_type) ?? [])
  const signedCount = signedTypes.size
  const totalCount = REQUIRED_DOCUMENTS.length

  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Documents</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
          Required forms & waivers.
        </h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          {signedCount === totalCount
            ? 'All required documents are on file.'
            : `${signedCount} of ${totalCount} signed — please complete the remaining ${totalCount - signedCount}.`}
        </p>
      </div>

      <div className="tight-list">
        {REQUIRED_DOCUMENTS.map(doc => {
          const signed = signedTypes.has(doc.type)
          const signedAt = documents?.find(d => d.document_type === doc.type)?.signed_at
          return (
            <div key={doc.type} className="tl-row no-lead">
              <div className="tl-main">
                <div className="t flex items-center gap-2">
                  {signed
                    ? <CheckCircle size={14} style={{ color: '#16a34a' }} />
                    : <AlertCircle size={14} style={{ color: '#d97706' }} />
                  }
                  {doc.title}
                </div>
                <div className="s">
                  {doc.description}
                  {signed && signedAt && <> · Signed {formatDate(signedAt)}</>}
                </div>
              </div>
              <div className="tl-trail">
                {signed
                  ? <span className="tag tag-mint">Signed</span>
                  : <DocumentUpload documentType={doc.type} title={doc.title} />
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
