'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import type { PartyTask } from '@/components/admin/PartyDetail'

interface Props {
  partyId: string
  tasks: PartyTask[]
}

const SUGGESTIONS = ['Confirm cake', 'Decorations', 'Music playlist', 'Staffing', 'Room setup', 'Send reminder']

export default function PartyChecklistTab({ partyId, tasks }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sorted = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.sort_order - b.sort_order,
  )
  const done = tasks.filter(t => t.done).length

  async function add(value?: string) {
    const t = (value ?? title).trim()
    if (!t) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/parties/${partyId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, sort_order: tasks.length }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to add task')
      }
      setTitle('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(task: PartyTask) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/parties/${partyId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to update task')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/parties/${partyId}/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete task')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const unusedSuggestions = SUGGESTIONS.filter(
    s => !tasks.some(t => t.title.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900 mr-auto">
          Checklist <span className="text-gray-400 font-normal">· {done}/{tasks.length} done</span>
        </h2>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Add a task…"
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 min-w-56"
        />
        <button
          onClick={() => add()}
          disabled={busy || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
        >
          <Plus size={15} /> Add
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {unusedSuggestions.length > 0 && (
        <div className="px-5 pt-4 flex flex-wrap gap-1.5">
          {unusedSuggestions.map(s => (
            <button
              key={s}
              onClick={() => add(s)}
              disabled={busy}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-studio-300 hover:text-studio-700 disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No tasks yet — add one or pick a suggestion</div>
      ) : (
        <div className="divide-y divide-gray-50 mt-2">
          {sorted.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-5 py-2.5">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggle(task)}
                disabled={busy}
                className="w-4 h-4 rounded text-studio-600 focus:ring-studio-500"
              />
              <span className={`text-sm flex-1 ${task.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {task.title}
              </span>
              <button
                onClick={() => remove(task.id)}
                disabled={busy}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
