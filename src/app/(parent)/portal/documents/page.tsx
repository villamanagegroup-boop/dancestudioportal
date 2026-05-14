import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Upload } from 'lucide-react'

const REQUIRED_DOCUMENTS = [
  { type: 'liability_waiver', title: 'Liability Waiver', description: 'Required before first class' },
  { type: 'photo_release', title: 'Photo Release', description: 'Permission for photos and videos' },
  { type: 'emergency_authorization', title: 'Emergency Authorization', description: 'Medical emergency consent' },
]

export default async function ParentDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('guardian_id', user.id)

  const signedTypes = new Set(documents?.filter(d => d.signed_at).map(d => d.document_type) ?? [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      <p className="text-gray-500 text-sm">Required forms and waivers for studio participation.</p>

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map(doc => {
          const signed = signedTypes.has(doc.type)
          return (
            <div key={doc.type} className={cn(
              'bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between gap-4',
              signed ? 'border-green-100' : 'border-orange-100'
            )}>
              <div className="flex items-center gap-3">
                {signed ? (
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">{doc.title}</p>
                  <p className="text-sm text-gray-500">{doc.description}</p>
                  {signed && documents?.find(d => d.document_type === doc.type)?.signed_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Signed {formatDate(documents.find(d => d.document_type === doc.type)!.signed_at!)}
                    </p>
                  )}
                </div>
              </div>
              {!signed && (
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 cursor-pointer transition-colors">
                  <Upload size={15} />
                  Upload
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
