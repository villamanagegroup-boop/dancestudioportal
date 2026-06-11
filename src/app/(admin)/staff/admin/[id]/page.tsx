import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail, Phone, MapPin, Settings as SettingsIcon } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import RolesPanelModal from '@/components/admin/RolesPanelModal'

export const dynamic = 'force-dynamic'

interface ActivityRow {
  id: string
  action: string
  target_label: string | null
  created_at: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, secondary_email, secondary_phone, address_street, address_city, address_state, address_zip, job_title, bio, photo_url, role, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') notFound()

  const { data: activity } = await supabase
    .from('activity_log')
    .select('id, action, target_label, created_at')
    .eq('actor_id', id)
    .order('created_at', { ascending: false })
    .limit(25)
  const rows = (activity ?? []) as ActivityRow[]

  // Is the viewer looking at their own profile? If so, offer the self-edit form.
  const ssr = await createClient()
  const { data: { user } } = await ssr.auth.getUser()
  const isSelf = user?.id === id

  const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email
  const initials = `${(profile.first_name?.[0] ?? '').toUpperCase()}${(profile.last_name?.[0] ?? '').toUpperCase()}`
  const addr = [profile.address_street, profile.address_city, profile.address_state, profile.address_zip].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col h-full">
      <Header title={fullName} subtitle="Administrator profile" back="/staff" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: identity + contact */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-studio-100 text-studio-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {profile.photo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                        : (initials || '·')}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{fullName}</h2>
                      <p className="text-sm text-gray-500">{profile.job_title || 'Administrator'}</p>
                      <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-studio-50 text-studio-700">Admin</span>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-gray-600 mt-4 whitespace-pre-line">{profile.bio}</p>
                  )}

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={14} className="text-gray-400" />
                      <a href={`mailto:${profile.email}`} className="hover:text-studio-700 truncate">{profile.email}</a>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} className="text-gray-400" />
                        <a href={`tel:${profile.phone}`} className="hover:text-studio-700">{profile.phone}</a>
                      </div>
                    )}
                    {addr && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin size={14} className="text-gray-400 mt-0.5" />
                        <span>{addr}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <RolesPanelModal profileId={profile.id} />
                    {isSelf && (
                      <Link
                        href="/settings"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <SettingsIcon size={14} /> Edit my profile
                      </Link>
                    )}
                  </div>
                  {!isSelf && (
                    <p className="text-xs text-gray-400 mt-2">
                      Contact details are edited by the account owner in Settings → Account. Permissions are editable here.
                    </p>
                  )}
                </div>
              </div>

              {/* Right: recent activity */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Recent activity</h2>
                    <Link href={`/activity?q=${encodeURIComponent(fullName)}`} className="text-xs font-medium text-studio-700 hover:underline">
                      View all →
                    </Link>
                  </div>
                  {rows.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">No recorded activity yet</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {rows.map(r => (
                        <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 truncate">
                              {r.action.replace(/[._]/g, ' ')}
                              {r.target_label && <span className="text-gray-500"> · {r.target_label}</span>}
                            </p>
                            <p className="text-xs text-gray-400">{r.action}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{relTime(r.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
