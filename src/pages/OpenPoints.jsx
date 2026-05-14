import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['blocker', 'decision_needed', 'dependency', 'risk']
const STATUSES = ['open', 'in_progress', 'resolved', 'escalated']
const ASSIGNEES = ['Mukesh Purohit', 'Utsav Dodiya', 'Jigar Patel', 'Piyush Patel', 'Dhananjay Chowksi']

const categoryStyles = {
  blocker: 'bg-red-500/10 text-red-400 border-red-500/20',
  decision_needed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  dependency: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  risk: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const categoryLabels = {
  blocker: '🔴 Blocker',
  decision_needed: '🟡 Decision Needed',
  dependency: '🔵 Dependency',
  risk: '🟣 Risk',
}

const statusStyles = {
  open: 'bg-red-500/10 text-red-400 border-red-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
  escalated: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const statusLabels = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
}

export default function OpenPoints() {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'blocker',
    raised_by: 'Utsav Dodiya',
    assigned_to: '',
    due_date: '',
    blocking_what: '',
    status: 'open',
    resolution_notes: '',
  })

  useEffect(() => { fetchPoints() }, [])

  async function fetchPoints() {
    setLoading(true)
    const { data, error } = await supabase
      .from('open_points')
      .select('*')
      .eq('project_id', 1)
      .order('created_at', { ascending: false })
    if (!error) setPoints(data || [])
    setLoading(false)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function resetForm() {
    setForm({
      title: '', description: '', category: 'blocker',
      raised_by: 'Utsav Dodiya', assigned_to: '', due_date: '',
      blocking_what: '', status: 'open', resolution_notes: '',
    })
    setError(null)
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('open_points').insert([{
        project_id: 1,
        title: form.title,
        description: form.description,
        category: form.category,
        raised_by: form.raised_by,
        raised_date: new Date().toISOString().split('T')[0],
        assigned_to: form.assigned_to,
        due_date: form.due_date || null,
        blocking_what: form.blocking_what,
        status: 'open',
      }])
      if (err) throw err
      setShowModal(false)
      resetForm()
      fetchPoints()
    } catch (e) {
      setError('Failed to save. Please try again.')
    }
    setSubmitting(false)
  }

  async function handleStatusUpdate(id, newStatus, resolutionNotes = '') {
    const updates = { status: newStatus }
    if (newStatus === 'resolved') {
      updates.resolved_date = new Date().toISOString().split('T')[0]
      if (resolutionNotes) updates.resolution_notes = resolutionNotes
    }
    await supabase.from('open_points').update(updates).eq('id', id)
    fetchPoints()
    if (showDetail?.id === id) setShowDetail(prev => ({ ...prev, status: newStatus, ...updates }))
  }

  async function handleDelete(id) {
    await supabase.from('open_points').delete().eq('id', id)
    setShowDetail(null)
    fetchPoints()
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function isOverdue(point) {
    if (!point.due_date || point.status === 'resolved') return false
    return new Date(point.due_date) < new Date()
  }

  const filtered = filter === 'all' ? points : points.filter(p => p.status === filter)
  const openCount = points.filter(p => p.status === 'open').length
  const blockerCount = points.filter(p => p.category === 'blocker' && p.status !== 'resolved').length
  const overdueCount = points.filter(p => isOverdue(p)).length
  const resolvedCount = points.filter(p => p.status === 'resolved').length

  return (
    <div className="p-8 space-y-8 h-[calc(100vh-64px)] overflow-y-auto">

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border">
          <div className="text-gray-400 text-sm mb-2 font-medium">Open Points</div>
          <div className={`text-3xl font-semibold ${openCount > 0 ? 'text-red-400' : 'text-green-500'}`}>{openCount}</div>
        </div>
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border">
          <div className="text-gray-400 text-sm mb-2 font-medium">Blockers</div>
          <div className={`text-3xl font-semibold ${blockerCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{blockerCount}</div>
        </div>
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border">
          <div className="text-gray-400 text-sm mb-2 font-medium">Overdue</div>
          <div className={`text-3xl font-semibold ${overdueCount > 0 ? 'text-amber-500' : 'text-green-500'}`}>{overdueCount}</div>
        </div>
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border">
          <div className="text-gray-400 text-sm mb-2 font-medium">Resolved</div>
          <div className="text-3xl font-semibold text-green-500">{resolvedCount}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-agency-card rounded-xl border border-agency-border overflow-hidden">
        <div className="p-5 border-b border-agency-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-gray-200">Open Points Log</h2>
            <div className="flex gap-2">
              {['all', 'open', 'in_progress', 'resolved', 'escalated'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-agency-accent text-white' : 'bg-agency-bg border border-agency-border text-gray-400 hover:text-gray-200'}`}>
                  {f === 'all' ? 'All' : statusLabels[f]}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="px-4 py-2 bg-agency-accent hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            + Add Open Point
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-600">No open points found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-agency-bg/50 border-b border-agency-border text-xs font-medium text-gray-400">
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Assigned To</th>
                  <th className="py-3 px-5">Due Date</th>
                  <th className="py-3 px-5">Blocking</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-agency-border text-sm text-gray-300">
                {filtered.map(point => (
                  <tr key={point.id}
                    className={`hover:bg-agency-bg/30 transition-colors cursor-pointer ${isOverdue(point) ? 'bg-amber-500/5' : ''}`}
                    onClick={() => setShowDetail(point)}>
                    <td className="py-4 px-5">
                      <div className="font-medium text-gray-200 max-w-xs truncate">{point.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">Raised by {point.raised_by} · {formatDate(point.raised_date)}</div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryStyles[point.category]}`}>
                        {categoryLabels[point.category]}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {point.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">{point.assigned_to.charAt(0)}</div>
                          <span className="text-gray-400">{point.assigned_to.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-5">
                      <span className={isOverdue(point) ? 'text-amber-400 font-medium' : 'text-gray-400'}>
                        {formatDate(point.due_date)}
                        {isOverdue(point) && <span className="ml-1 text-xs">⚠️</span>}
                      </span>
                    </td>
                    <td className="py-4 px-5 max-w-[160px]">
                      <span className="text-gray-500 text-xs truncate block">{point.blocking_what || '—'}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[point.status]}`}>
                        {statusLabels[point.status]}
                      </span>
                    </td>
                    <td className="py-4 px-5" onClick={e => e.stopPropagation()}>
                      <select
                        value={point.status}
                        onChange={e => handleStatusUpdate(point.id, e.target.value)}
                        className="bg-agency-bg border border-agency-border rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-agency-accent">
                        {STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-agency-card border border-agency-border rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-100">Add Open Point</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="What is the open point?" className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-agency-accent" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Full details, context, what needs to happen..." rows={3} className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-agency-accent resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                  <select name="category" value={form.category} onChange={handleChange} className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-agency-accent">
                    {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Raised by</label>
                  <select name="raised_by" value={form.raised_by} onChange={handleChange} className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-agency-accent">
                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Assigned to</label>
                  <select name="assigned_to" value={form.assigned_to} onChange={handleChange} className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-agency-accent">
                    <option value="">Select person</option>
                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Due date</label>
                  <input name="due_date" type="date" value={form.due_date} onChange={handleChange} className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-agency-accent" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Blocking what?</label>
                <input name="blocking_what" value={form.blocking_what} onChange={handleChange} placeholder="e.g. Sprint 3 Middleware Setup" className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-agency-accent" />
              </div>
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-agency-bg border border-agency-border text-gray-400 rounded-lg text-sm font-medium hover:text-gray-200 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-agency-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {submitting ? 'Saving...' : 'Add Open Point'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-end z-50" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="bg-agency-card border-l border-agency-border w-full max-w-lg h-full overflow-y-auto p-8 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mb-2 ${categoryStyles[showDetail.category]}`}>
                  {categoryLabels[showDetail.category]}
                </span>
                <h3 className="text-lg font-semibold text-gray-100">{showDetail.title}</h3>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-500 hover:text-gray-300 text-xl ml-4">✕</button>
            </div>

            <div className="space-y-5">
              {showDetail.description && (
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Description</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{showDetail.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Status</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[showDetail.status]}`}>
                    {statusLabels[showDetail.status]}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Assigned to</div>
                  <div className="text-sm text-gray-300">{showDetail.assigned_to || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Raised by</div>
                  <div className="text-sm text-gray-300">{showDetail.raised_by} · {formatDate(showDetail.raised_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Due date</div>
                  <div className={`text-sm ${isOverdue(showDetail) ? 'text-amber-400' : 'text-gray-300'}`}>
                    {formatDate(showDetail.due_date)}
                    {isOverdue(showDetail) && ' ⚠️ Overdue'}
                  </div>
                </div>
              </div>

              {showDetail.blocking_what && (
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Blocking</div>
                  <div className="text-sm text-red-400">{showDetail.blocking_what}</div>
                </div>
              )}

              {showDetail.resolution_notes && (
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Resolution notes</div>
                  <p className="text-sm text-green-400 leading-relaxed">{showDetail.resolution_notes}</p>
                </div>
              )}

              {showDetail.resolved_date && (
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Resolved on</div>
                  <div className="text-sm text-green-400">{formatDate(showDetail.resolved_date)}</div>
                </div>
              )}

              {/* Update status */}
              <div className="border-t border-agency-border pt-5">
                <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Update Status</div>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(showDetail.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${showDetail.status === s ? 'bg-agency-accent text-white border-transparent' : 'bg-agency-bg border-agency-border text-gray-400 hover:text-gray-200'}`}>
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-agency-border pt-5 flex gap-3">
                <button onClick={() => handleDelete(showDetail.id)}
                  className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors">
                  Delete
                </button>
                <button onClick={() => setShowDetail(null)}
                  className="flex-1 px-4 py-2.5 bg-agency-bg border border-agency-border text-gray-400 hover:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}