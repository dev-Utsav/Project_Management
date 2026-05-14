import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateInput(d) { return d ? d.slice(0, 10) : '' }
function daysLeft(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}
function progressColor(p) {
  return p >= 80 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
}
function avatarColor(name) {
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}
function initials(name) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }

// ─── tiny atoms ──────────────────────────────────────────────────────────────
function Pill({ label, color }) {
  const map = {
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    gray:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${map[color] || map.gray}`}>{label}</span>
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</label>}
      <input className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 placeholder-gray-600 transition-colors" {...props} />
    </div>
  )
}

function Select({ label, options, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</label>}
      <select className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 transition-colors" {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-agency-sidebar border border-agency-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-agency-border">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function AddBtn({ onClick, label = 'Add' }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-agency-card border border-agency-border hover:border-agency-accent/40 rounded-lg transition-all">
      <span className="text-agency-accent text-base leading-none">+</span>{label}
    </button>
  )
}

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide">{title}</h2>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

const RAG = { green: 'bg-green-500', amber: 'bg-yellow-500', red: 'bg-red-500' }

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT LIST VIEW
// ══════════════════════════════════════════════════════════════════════════════
function ProjectList({ onSelect }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '', client: '', status: 'active', rag_status: 'green',
    go_live_date: '', estimated_hours: '', team_lead: '',
  })

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*, milestones(id, status), team_members(id), tasks(id, status)')
      .order('id', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function createProject() {
    if (!form.name || !form.client) return
    const payload = {
      name: form.name,
      client: form.client,
      status: form.status || 'active',
      rag_status: form.rag_status || 'green',
      team_lead: form.team_lead || null,
      go_live_date: form.go_live_date || null,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
    }
    const { data, error } = await supabase.from('projects').insert(payload).select()
    if (error) {
      alert('Failed to create project: ' + error.message)
      return
    }
    setAdding(false)
    setForm({ name: '', client: '', status: 'active', rag_status: 'green', go_live_date: '', estimated_hours: '', team_lead: '' })
    fetchProjects()
  }

  const filtered = projects.filter(p =>
    filter === 'all' ? true :
    filter === 'active' ? p.status === 'active' :
    p.status !== 'active'
  )

  const statusCfg = {
    active:    { label: 'Active',    color: 'green' },
    on_hold:   { label: 'On Hold',   color: 'yellow' },
    completed: { label: 'Completed', color: 'blue' },
    cancelled: { label: 'Cancelled', color: 'red' },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-5 h-5 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">

        {/* page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Projects</h1>
            <p className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> New Project
          </button>
        </div>

        {/* filter tabs */}
        <div className="flex gap-1 mb-5 bg-agency-card border border-agency-border rounded-lg p-1 w-fit">
          {[
            { key: 'all',      label: `All (${projects.length})` },
            { key: 'active',   label: `Active (${projects.filter(p => p.status === 'active').length})` },
            { key: 'inactive', label: `Inactive (${projects.filter(p => p.status !== 'active').length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === tab.key ? 'bg-agency-accent text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* project cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-agency-card border border-agency-border flex items-center justify-center text-2xl mb-3">📂</div>
            <p className="text-gray-400 text-sm font-medium">No projects found</p>
            <p className="text-gray-600 text-xs mt-1">
              {filter !== 'all' ? 'Try switching the filter above.' : 'Click "New Project" to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const tasks = p.tasks || []
              const doneTasks = tasks.filter(t => t.status?.toLowerCase() === 'done').length
              const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0
              const milestones = p.milestones || []
              const doneMilestones = milestones.filter(m => m.status === 'done').length
              const teamCount = (p.team_members || []).length
              const days = daysLeft(p.go_live_date)
              const cfg = statusCfg[p.status] || statusCfg.active

              return (
                <div
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="group bg-agency-card border border-agency-border hover:border-agency-accent/40 rounded-xl p-5 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${RAG[p.rag_status] || 'bg-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-white group-hover:text-agency-accent transition-colors truncate">{p.name}</h3>
                        <Pill label={cfg.label} color={cfg.color} />
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{p.client}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        {p.go_live_date && (
                          <span className={days !== null && days < 0 ? 'text-red-400' : days !== null && days <= 14 ? 'text-yellow-400' : ''}>
                            🗓 {formatDate(p.go_live_date)}{days !== null && (days < 0 ? ` · ${Math.abs(days)}d overdue` : days === 0 ? ' · Today' : ` · ${days}d left`)}
                          </span>
                        )}
                        {p.estimated_hours && <span>⏱ {p.estimated_hours}h</span>}
                        {p.team_lead && <span>👤 {p.team_lead}</span>}
                        {teamCount > 0 && <span>👥 {teamCount} member{teamCount !== 1 ? 's' : ''}</span>}
                        {milestones.length > 0 && <span>🏁 {doneMilestones}/{milestones.length} milestones</span>}
                      </div>
                    </div>
                    {tasks.length > 0 && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-semibold" style={{ color: progressColor(pct) }}>{pct}%</p>
                        <p className="text-[11px] text-gray-600">{doneTasks}/{tasks.length} tasks</p>
                      </div>
                    )}
                    <span className="text-gray-600 group-hover:text-agency-accent text-lg flex-shrink-0 mt-0.5 transition-colors">›</span>
                  </div>
                  {tasks.length > 0 && (
                    <div className="mt-4 ml-6">
                      <div className="h-1 bg-agency-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {adding && (
        <Modal title="New Project" onClose={() => setAdding(false)}>
          <Input label="Project Name *" placeholder="e.g. Shopify Redesign" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Client *" placeholder="e.g. Acme Corp" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
          <Input label="Team Lead" placeholder="e.g. Sarah Connor" value={form.team_lead} onChange={e => setForm(f => ({ ...f, team_lead: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Go-Live Date" type="date" value={form.go_live_date} onChange={e => setForm(f => ({ ...f, go_live_date: e.target.value }))} />
            <Input label="Estimated Hours" type="number" placeholder="320" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Select
              label="RAG Status"
              value={form.rag_status}
              onChange={e => setForm(f => ({ ...f, rag_status: e.target.value }))}
              options={[
                { value: 'green', label: '🟢 Green' },
                { value: 'amber', label: '🟡 Amber' },
                { value: 'red', label: '🔴 Red' },
              ]}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={createProject}
              disabled={!form.name || !form.client}
              className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create Project
            </button>
            <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MILESTONES
// ══════════════════════════════════════════════════════════════════════════════
function Milestones({ projectId }) {
  const [milestones, setMilestones] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', due_date: '', status: 'upcoming' })
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetch() }, [projectId])
  async function fetch() {
    const { data } = await supabase.from('milestones').select('*').eq('project_id', projectId).order('due_date')
    setMilestones(data || [])
  }
  async function save() {
    if (!form.title) return
    const payload = { name: form.title, status: form.status || 'upcoming', project_id: projectId, due_date: form.due_date || null }
    const { error } = await supabase.from('milestones').insert(payload)
    if (error) { alert('Milestone error: ' + error.message); return }
    setAdding(false); setForm({ title: '', due_date: '', status: 'upcoming' }); fetch()
  }
  async function toggleStatus(m) {
    const next = { upcoming: 'in_progress', in_progress: 'done', done: 'upcoming', at_risk: 'upcoming' }
    await supabase.from('milestones').update({ status: next[m.status] }).eq('id', m.id); fetch()
  }
  async function remove(id) { await supabase.from('milestones').delete().eq('id', id); fetch() }
  async function edit(m) { setEditing(m) }
  async function saveEdit() {
    if (!editing.name) return
    const { error } = await supabase.from('milestones').update({
      name: editing.name, due_date: editing.due_date || null, status: editing.status
    }).eq('id', editing.id)
    if (error) { alert('Error: ' + error.message); return }
    setEditing(null); fetch()
  }

  const statusLabel = { upcoming: 'Upcoming', in_progress: 'In Progress', done: 'Done', at_risk: 'At Risk' }
  const statusColor = { upcoming: 'gray', in_progress: 'blue', done: 'green', at_risk: 'red' }

  return (
    <div className="bg-agency-card border border-agency-border rounded-xl p-5">
      <SectionHeader
        title="Milestones"
        sub={`${milestones.filter(m => m.status === 'done').length}/${milestones.length} complete`}
        action={<AddBtn onClick={() => setAdding(true)} label="Add Milestone" />}
      />
      {milestones.length === 0 && <p className="text-gray-600 text-sm text-center py-5">No milestones yet.</p>}
      <div className="space-y-2">
        {milestones.map(m => {
          const days = daysLeft(m.due_date)
          return (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-agency-bg border border-agency-border group transition-all">
              <button
                onClick={() => toggleStatus(m)}
                title="Cycle status"
                className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${
                  m.status === 'done' ? 'bg-green-500 border-green-500' :
                  m.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                  m.status === 'at_risk' ? 'bg-red-500 border-red-500' :
                  'bg-transparent border-gray-600'
                }`}
              />
              <p className={`flex-1 text-sm font-medium truncate ${m.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{m.name || m.title}</p>
              {m.due_date && m.status !== 'done' && (
                <span className={`text-xs flex-shrink-0 ${days < 0 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                </span>
              )}
              <Pill label={statusLabel[m.status] || 'Upcoming'} color={statusColor[m.status] || 'gray'} />
              <button onClick={() => setEditing({ ...m })} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white text-xs transition-all mr-1">✎</button>
              <button onClick={() => setEditingMember({ ...m })} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white text-xs transition-all mr-1">✎</button>
            <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
            </div>
          )
        })}
      </div>
      {editing && (
        <Modal title="Edit Milestone" onClose={() => setEditing(null)}>
          <Input label="Title" value={editing.name} onChange={e => setEditing(v => ({ ...v, name: e.target.value }))} />
          <Input label="Due Date" type="date" value={editing.due_date?.slice(0,10) || ''} onChange={e => setEditing(v => ({ ...v, due_date: e.target.value }))} />
          <Select label="Status" value={editing.status} onChange={e => setEditing(v => ({ ...v, status: e.target.value }))} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'in_progress', label: 'In Progress' }, { value: 'at_risk', label: 'At Risk' }, { value: 'done', label: 'Done' }]} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setEditing(null)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Add Milestone" onClose={() => setAdding(false)}>
          <Input label="Title" placeholder="e.g. Design sign-off" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'in_progress', label: 'In Progress' }, { value: 'at_risk', label: 'At Risk' }, { value: 'done', label: 'Done' }]} />
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SPRINTS
// ══════════════════════════════════════════════════════════════════════════════
function Sprints({ projectId }) {
  const [sprints, setSprints] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', goal: '', status: 'planned' })
  const [editingSprint, setEditingSprint] = useState(null)

  useEffect(() => { fetch() }, [projectId])
  async function fetch() {
    const { data } = await supabase.from('sprints').select('*, tasks(id, status)').eq('project_id', projectId).order('start_date')
    setSprints(data || [])
  }
  async function save() {
    if (!form.name) return
    const sprintPayload = { name: form.name, goal: form.goal || null, status: form.status || 'planned', start_date: form.start_date || null, end_date: form.end_date || null, project_id: projectId }
    const { error } = await supabase.from('sprints').insert(sprintPayload)
    if (error) { alert('Sprint error: ' + error.message); return }
    setAdding(false); setForm({ name: '', start_date: '', end_date: '', goal: '', status: 'planned' }); fetch()
  }
  async function remove(id) { await supabase.from('sprints').delete().eq('id', id); fetch() }
  async function saveSprintEdit() {
    if (!editingSprint.name) return
    const { error } = await supabase.from('sprints').update({
      name: editingSprint.name, goal: editingSprint.goal || null,
      start_date: editingSprint.start_date || null, end_date: editingSprint.end_date || null,
      status: editingSprint.status
    }).eq('id', editingSprint.id)
    if (error) { alert('Error: ' + error.message); return }
    setEditingSprint(null); fetch()
  }

  const statusCfg = { planned: 'gray', active: 'blue', completed: 'green', cancelled: 'red' }
  const statusLabel = { planned: 'Planned', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }

  return (
    <div className="bg-agency-card border border-agency-border rounded-xl p-5">
      <SectionHeader
        title="Sprints"
        sub={`${sprints.filter(s => s.status === 'completed').length}/${sprints.length} completed`}
        action={<AddBtn onClick={() => setAdding(true)} label="Add Sprint" />}
      />
      {sprints.length === 0 && <p className="text-gray-600 text-sm text-center py-5">No sprints yet.</p>}
      <div className="space-y-3">
        {sprints.map((s, i) => {
          const tasks = s.tasks || []
          const done = tasks.filter(t => t.status?.toLowerCase() === 'done').length
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
          return (
            <div key={s.id} className="p-4 rounded-lg bg-agency-bg border border-agency-border group transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] text-gray-600 font-mono">S{i + 1}</span>
                    <p className="text-sm font-medium text-white truncate">{s.name}</p>
                  </div>
                  {s.goal && <p className="text-xs text-gray-500 truncate">{s.goal}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Pill label={statusLabel[s.status] || 'Planned'} color={statusCfg[s.status] || 'gray'} />
                  <button onClick={e => { e.stopPropagation(); setEditingSprint({ ...s }) }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white text-xs transition-all mr-1">✎</button>
                  <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
                </div>
              </div>
              {(s.start_date || s.end_date) && (
                <p className="text-xs text-gray-500 mb-3">{formatDate(s.start_date)} → {formatDate(s.end_date)}</p>
              )}
              {tasks.length > 0 && (
                <div>
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1"><span>{done}/{tasks.length} tasks</span><span>{pct}%</span></div>
                  <div className="h-1 bg-agency-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {editingSprint && (
        <Modal title="Edit Sprint" onClose={() => setEditingSprint(null)}>
          <Input label="Sprint Name" value={editingSprint.name} onChange={e => setEditingSprint(v => ({ ...v, name: e.target.value }))} />
          <Input label="Goal" value={editingSprint.goal || ''} onChange={e => setEditingSprint(v => ({ ...v, goal: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={editingSprint.start_date?.slice(0,10) || ''} onChange={e => setEditingSprint(v => ({ ...v, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={editingSprint.end_date?.slice(0,10) || ''} onChange={e => setEditingSprint(v => ({ ...v, end_date: e.target.value }))} />
          </div>
          <Select label="Status" value={editingSprint.status} onChange={e => setEditingSprint(v => ({ ...v, status: e.target.value }))} options={[{ value: 'planned', label: 'Planned' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveSprintEdit} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setEditingSprint(null)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Add Sprint" onClose={() => setAdding(false)}>
          <Input label="Sprint Name" placeholder="e.g. Sprint 3 – Checkout" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Goal" placeholder="What does this sprint achieve?" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={[{ value: 'planned', label: 'Planned' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EPICS
// ══════════════════════════════════════════════════════════════════════════════
const EPIC_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4']

function Epics({ projectId }) {
  const [epics, setEpics] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: EPIC_COLORS[0] })
  const [editingEpic, setEditingEpic] = useState(null)

  useEffect(() => { fetch() }, [projectId])
  async function fetch() {
    const { data } = await supabase.from('epics').select('*, tasks(id, status)').eq('project_id', projectId).order('id')
    setEpics(data || [])
  }
  async function save() {
    if (!form.name) return
    const epicPayload = { name: form.name, description: form.description || null, color: form.color || EPIC_COLORS[0], project_id: projectId }
    const { error } = await supabase.from('epics').insert(epicPayload)
    if (error) { alert('Epic error: ' + error.message); return }
    setAdding(false); setForm({ name: '', description: '', color: EPIC_COLORS[0] }); fetch()
  }
  async function remove(id) { await supabase.from('epics').delete().eq('id', id); fetch() }
  async function saveEpicEdit() {
    if (!editingEpic.name) return
    const { error } = await supabase.from('epics').update({
      name: editingEpic.name, description: editingEpic.description || null, color: editingEpic.color
    }).eq('id', editingEpic.id)
    if (error) { alert('Error: ' + error.message); return }
    setEditingEpic(null); fetch()
  }

  return (
    <div className="bg-agency-card border border-agency-border rounded-xl p-5">
      <SectionHeader title="Epics" sub={`${epics.length} epic${epics.length !== 1 ? 's' : ''}`} action={<AddBtn onClick={() => setAdding(true)} label="Add Epic" />} />
      {epics.length === 0 && <p className="text-gray-600 text-sm text-center py-5">No epics yet.</p>}
      <div className="space-y-2">
        {epics.map(e => {
          const tasks = e.tasks || []
          const done = tasks.filter(t => t.status?.toLowerCase() === 'done').length
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
          return (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-agency-bg border border-agency-border group transition-all">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color || EPIC_COLORS[0] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{e.name}</p>
                {e.description && <p className="text-xs text-gray-500 truncate">{e.description}</p>}
              </div>
              {tasks.length > 0 ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-1 bg-agency-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: e.color || EPIC_COLORS[0] }} />
                  </div>
                  <span className="text-[11px] text-gray-500 w-8 text-right">{pct}%</span>
                </div>
              ) : <span className="text-xs text-gray-600">0 tasks</span>}
              <button onClick={() => setEditingEpic({ ...e })} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white text-xs transition-all mr-1">✎</button>
              <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
            </div>
          )
        })}
      </div>
      {editingEpic && (
        <Modal title="Edit Epic" onClose={() => setEditingEpic(null)}>
          <Input label="Epic Name" value={editingEpic.name} onChange={e => setEditingEpic(v => ({ ...v, name: e.target.value }))} />
          <Input label="Description" value={editingEpic.description || ''} onChange={e => setEditingEpic(v => ({ ...v, description: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-500 uppercase tracking-wide">Color</label>
            <div className="flex gap-2">
              {EPIC_COLORS.map(c => (
                <button key={c} onClick={() => setEditingEpic(v => ({ ...v, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${editingEpic.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveEpicEdit} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setEditingEpic(null)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Add Epic" onClose={() => setAdding(false)}>
          <Input label="Epic Name" placeholder="e.g. Checkout Flow" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Description" placeholder="What does this epic cover?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-500 uppercase tracking-wide">Color</label>
            <div className="flex gap-2">
              {EPIC_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════════════════════════════════════════
const ROLES = ['Project Manager','Lead Designer','Frontend Dev','Backend Dev','QA','DevOps','Account Manager','Other']

function Team({ projectId }) {
  const [team, setTeam] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', role: ROLES[0], email: '', capacity: 40 })
  const [editingMember, setEditingMember] = useState(null)

  useEffect(() => { fetch() }, [projectId])
  async function fetch() {
    const { data } = await supabase.from('team_members').select('*').eq('project_id', projectId).order('id')
    setTeam(data || [])
  }
  async function save() {
    if (!form.name) return
    const memberPayload = { name: form.name, role: form.role || ROLES[0], email: form.email || null, capacity: Number(form.capacity) || 40, project_id: projectId }
    const { error } = await supabase.from('team_members').insert(memberPayload)
    if (error) { alert('Team member error: ' + error.message); return }
    setAdding(false); setForm({ name: '', role: ROLES[0], email: '', capacity: 40 }); fetch()
  }
  async function remove(id) { await supabase.from('team_members').delete().eq('id', id); fetch() }
  async function saveMemberEdit() {
    if (!editingMember.name) return
    const { error } = await supabase.from('team_members').update({
      name: editingMember.name, role: editingMember.role,
      email: editingMember.email || null, capacity: Number(editingMember.capacity) || 40
    }).eq('id', editingMember.id)
    if (error) { alert('Error: ' + error.message); return }
    setEditingMember(null); fetch()
  }

  return (
    <div className="bg-agency-card border border-agency-border rounded-xl p-5">
      <SectionHeader title="Team Members" sub={`${team.length} member${team.length !== 1 ? 's' : ''}`} action={<AddBtn onClick={() => setAdding(true)} label="Add Member" />} />
      {team.length === 0 && <p className="text-gray-600 text-sm text-center py-5">No team members yet.</p>}
      <div className="space-y-2">
        {team.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-agency-bg border border-agency-border group transition-all">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor(m.name) }}>
              {initials(m.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{m.name}</p>
              <p className="text-xs text-gray-500">{m.role}</p>
            </div>
            {m.email && <span className="text-xs text-gray-600 truncate hidden sm:block max-w-[140px]">{m.email}</span>}
            <span className="text-xs text-gray-500 flex-shrink-0">{m.capacity || 40}h/wk</span>
            <button onClick={() => setEditingMember({ ...m })} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white text-xs transition-all mr-1">✎</button>
            <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
          </div>
        ))}
      </div>
      {editingMember && (
        <Modal title="Edit Team Member" onClose={() => setEditingMember(null)}>
          <Input label="Full Name" value={editingMember.name} onChange={e => setEditingMember(v => ({ ...v, name: e.target.value }))} />
          <Select label="Role" value={editingMember.role} onChange={e => setEditingMember(v => ({ ...v, role: e.target.value }))} options={ROLES.map(r => ({ value: r, label: r }))} />
          <Input label="Email" type="email" value={editingMember.email || ''} onChange={e => setEditingMember(v => ({ ...v, email: e.target.value }))} />
          <Input label="Weekly Capacity (hours)" type="number" min="1" max="60" value={editingMember.capacity} onChange={e => setEditingMember(v => ({ ...v, capacity: e.target.value }))} />
          <div className="flex gap-2 pt-1">
            <button onClick={saveMemberEdit} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setEditingMember(null)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Add Team Member" onClose={() => setAdding(false)}>
          <Input label="Full Name" placeholder="e.g. Alex Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} options={ROLES.map(r => ({ value: r, label: r }))} />
          <Input label="Email" type="email" placeholder="alex@agency.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Weekly Capacity (hours)" type="number" min="1" max="60" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT INFO (editable header)
// ══════════════════════════════════════════════════════════════════════════════
function ProjectInfo({ project, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  function startEdit() {
    setForm({
      name: project?.name || '',
      client: project?.client || '',
      go_live_date: formatDateInput(project?.go_live_date),
      estimated_hours: project?.estimated_hours || '',
      team_lead: project?.team_lead || '',
      rag_status: project?.rag_status || 'green',
      status: project?.status || 'active',
    })
    setEditing(true)
  }

  async function save() {
    await supabase.from('projects').update(form).eq('id', project.id)
    setEditing(false); onSaved()
  }

  const ragColors = { green: 'bg-green-500', amber: 'bg-yellow-500', red: 'bg-red-500' }

  return (
    <div className="bg-agency-card border border-agency-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ragColors[project.rag_status] || 'bg-green-500'}`} />
          <div>
            <h2 className="text-base font-semibold text-white">{project.name}</h2>
            <p className="text-xs text-gray-500">{project.client}</p>
          </div>
        </div>
        <button onClick={startEdit} className="text-xs text-gray-500 hover:text-white px-2.5 py-1.5 rounded-lg border border-agency-border hover:border-agency-accent/40 transition-all">Edit</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Go-Live', value: formatDate(project.go_live_date) },
          { label: 'Est. Hours', value: project.estimated_hours ? `${project.estimated_hours}h` : '—' },
          { label: 'Team Lead', value: project.team_lead || '—' },
          { label: 'Status', value: project.status || 'Active' },
        ].map(item => (
          <div key={item.label} className="bg-agency-bg border border-agency-border rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-0.5">{item.label}</p>
            <p className="text-sm font-medium text-white capitalize">{item.value}</p>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title="Edit Project Info" onClose={() => setEditing(false)}>
          <Input label="Project Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Client" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Go-Live Date" type="date" value={form.go_live_date} onChange={e => setForm(f => ({ ...f, go_live_date: e.target.value }))} />
            <Input label="Estimated Hours" type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: Number(e.target.value) }))} />
          </div>
          <Input label="Team Lead" value={form.team_lead} onChange={e => setForm(f => ({ ...f, team_lead: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="RAG Status" value={form.rag_status} onChange={e => setForm(f => ({ ...f, rag_status: e.target.value }))} options={[{ value: 'green', label: '🟢 Green' }, { value: 'amber', label: '🟡 Amber' }, { value: 'red', label: '🔴 Red' }]} />
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On Hold' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT DETAIL VIEW
// ══════════════════════════════════════════════════════════════════════════════
function ProjectDetail({ project: initialProject, onBack }) {
  const [project, setProject] = useState(initialProject)

  async function refetch() {
    const { data } = await supabase.from('projects').select('*').eq('id', initialProject.id).single()
    if (data) setProject(data)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Back to Projects
          </button>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-white font-medium">{project.name}</span>
        </div>

        <div className="space-y-5">
          <ProjectInfo project={project} onSaved={refetch} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Milestones projectId={project.id} />
            <Sprints projectId={project.id} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Epics projectId={project.id} />
            <Team projectId={project.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function ProjectSetup() {
  const [selected, setSelected] = useState(null)

  return selected
    ? <ProjectDetail project={selected} onBack={() => setSelected(null)} />
    : <ProjectList onSelect={setSelected} />
}