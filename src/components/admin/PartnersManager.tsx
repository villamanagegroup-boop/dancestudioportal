'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Handshake, Globe, Mail, Phone } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import RowActions from '@/components/admin/RowActions'
import PartnerFormModal from '@/components/forms/PartnerFormModal'
import KpiStrip from '@/components/admin/KpiStrip'

interface Partner {
  id: string
  name: string
  partner_type: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  rate_amount: number | null
  rate_unit: string
  notes: string | null
  active: boolean
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  studio: { label: 'Studio', cls: 'bg-purple-100 text-purple-700' },
  business: { label: 'Business', cls: 'bg-blue-100 text-blue-700' },
  vendor: { label: 'Vendor', cls: 'bg-amber-100 text-amber-700' },
  venue: { label: 'Venue', cls: 'bg-teal-100 text-teal-700' },
  other: { label: 'Other', cls: 'bg-gray-100 text-gray-600' },
}

const RATE_UNIT_LABEL: Record<string, string> = {
  flat: 'flat', hour: '/hr', day: '/day', event: '/event', month: '/mo',
}

export default function PartnersManager({ partners }: { partners: Partner[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const stats = useMemo(() => {
    const active = partners.filter(p => p.active)
    const studios = partners.filter(p => p.partner_type === 'studio').length
    return { total: partners.length, active: active.length, studios }
  }, [partners])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return partners.filter(p => {
      if (statusFilter === 'active' && !p.active) return false
      if (statusFilter === 'inactive' && p.active) return false
      if (typeFilter && p.partner_type !== typeFilter) return false
      if (q && !(`${p.name} ${p.contact_name ?? ''} ${p.email ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [partners, query, typeFilter, statusFilter])

  const selectCls = 'px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-studio-500'

  return (
    <>
      <KpiStrip items={[
        { label: 'Total partners', value: String(stats.total) },
        { label: 'Active', value: String(stats.active) },
        { label: 'Partner studios', value: String(stats.studios) },
      ]} />

      <hr className="section-rule" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, contact, or email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="active">Active</option>
          <option value="inactive">Archived</option>
          <option value="all">All</option>
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors ml-auto"
        >
          <Plus size={16} /> Add Partner
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2 text-center">
          <Handshake size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400">No partners match</p>
          <p className="text-xs text-gray-400">Add other studios, local businesses, vendors, or venues you work with.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const meta = TYPE_META[p.partner_type] ?? TYPE_META.other
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative">
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="Edit partner"
                  >
                    <Pencil size={15} />
                  </button>
                  <RowActions
                    endpoint={`/api/partners/${p.id}`}
                    entityLabel="partner"
                    archived={!p.active}
                    archivePatch={{ active: false }}
                    restorePatch={{ active: true }}
                  />
                </div>
                <div className="flex items-center gap-2 mb-2 pr-16">
                  <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', meta.cls)}>{meta.label}</span>
                  {!p.active && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>}
                </div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                {p.contact_name && <p className="text-sm text-gray-500 mt-0.5">{p.contact_name}</p>}

                <div className="mt-3 space-y-1">
                  {p.email && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={12} /> {p.email}</p>
                  )}
                  {p.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={12} /> {p.phone}</p>
                  )}
                  {p.website && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Globe size={12} />
                      <a href={p.website} target="_blank" rel="noreferrer" className="hover:text-studio-600 truncate">{p.website}</a>
                    </p>
                  )}
                </div>

                {p.rate_amount != null && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(p.rate_amount))}</span>
                    <span className="text-xs text-gray-400 ml-1">{RATE_UNIT_LABEL[p.rate_unit] ?? p.rate_unit}</span>
                  </div>
                )}
                {p.notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{p.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <PartnerFormModal onClose={() => setShowAdd(false)} />}
      {editing && <PartnerFormModal onClose={() => setEditing(null)} partner={editing} />}
    </>
  )
}
