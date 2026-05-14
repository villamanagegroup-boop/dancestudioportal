'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import RowActions from '@/components/admin/RowActions'

interface Season {
  id: string; name: string; start_date: string; end_date: string
  registration_opens: string | null; active: boolean; tuition_due_day: number
}
interface Room {
  id: string; name: string; capacity: number | null
  floor_type: string | null; has_mirrors: boolean; has_barres: boolean; active: boolean
}
interface ClassType {
  id: string; name: string; style: string; level: string
  min_age: number | null; max_age: number | null; color: string; active: boolean
}

interface Props {
  seasons: Season[]
  rooms: Room[]
  classTypes: ClassType[]
}

type Tab = 'Studio' | 'Seasons' | 'Rooms' | 'Class Types'
const TABS: Tab[] = ['Studio', 'Seasons', 'Rooms', 'Class Types']

const fieldClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function SettingsPanel({ seasons, rooms, classTypes }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Studio')
  const [studioForm, setStudioForm] = useState({
    name: 'Capital Core Dance Studio',
    email: 'info@capitalcoredance.com',
    phone: '(804) 234-4014',
    address: '13110 Midlothian Turnpike, Midlothian, VA 23113',
    timezone: 'America/New_York',
  })
  const [saved, setSaved] = useState(false)

  function handleStudioSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Studio' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-w-2xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Studio Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">Basic details shown to families</p>
          </div>
          <form onSubmit={handleStudioSave} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Studio Name</label>
              <input
                value={studioForm.name}
                onChange={e => setStudioForm(f => ({ ...f, name: e.target.value }))}
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={studioForm.email}
                  onChange={e => setStudioForm(f => ({ ...f, email: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={studioForm.phone}
                  onChange={e => setStudioForm(f => ({ ...f, phone: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                value={studioForm.address}
                onChange={e => setStudioForm(f => ({ ...f, address: e.target.value }))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={studioForm.timezone}
                onChange={e => setStudioForm(f => ({ ...f, timezone: e.target.value }))}
                className={fieldClass}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-studio-600 hover:bg-studio-700 text-white'
                )}
              >
                {saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'Seasons' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Seasons</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage registration periods</p>
            </div>
          </div>
          {seasons.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No seasons configured</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Start</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">End</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tuition Due</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {seasons.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(s.start_date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(s.end_date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">Day {s.tuition_due_day}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Rooms' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Rooms & Spaces</h2>
              <p className="text-sm text-gray-500 mt-0.5">Studio rooms available for scheduling</p>
            </div>
          </div>
          {rooms.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No rooms configured</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Room</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Capacity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Floor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Features</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="sticky right-0 bg-white border-l border-gray-100 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map(r => (
                  <tr key={r.id} className="group hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{r.capacity ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">{r.floor_type ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        {r.has_mirrors && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Mirrors</span>}
                        {r.has_barres && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Barres</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 px-5 py-3 text-right transition-colors">
                      <RowActions
                        endpoint={`/api/rooms/${r.id}`}
                        entityLabel="room"
                        archived={!r.active}
                        archivePatch={{ active: false }}
                        restorePatch={{ active: true }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Class Types' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Class Types</h2>
              <p className="text-sm text-gray-500 mt-0.5">Dance styles and class catalog</p>
            </div>
          </div>
          {classTypes.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No class types configured</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Style</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Level</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Age Range</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classTypes.map(ct => (
                  <tr key={ct.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{ct.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{ct.style}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">{ct.level.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {ct.min_age && ct.max_age ? `${ct.min_age}–${ct.max_age} yrs` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: ct.color }} />
                        <span className="text-xs text-gray-500 font-mono">{ct.color}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
