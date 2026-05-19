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
    green:  'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    red:    'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
    gray:   'bg-gray-500/10 text-gray-400 border-gray-500/30 shadow-[0_0_8px_rgba(107,114,128,0.2)]',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.3)] bg-gradient-to-r from-purple-600/20 to-indigo-600/20',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${map[color] || map.gray}`}>{label}</span>
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <input className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-agency-accent focus:shadow-[0_0_15px_rgba(var(--agency-accent),0.2)] placeholder-gray-600 transition-all" {...props} />
    </div>
  )
}

function Select({ label, options, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <select className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-agency-accent focus:shadow-[0_0_15px_rgba(var(--agency-accent),0.2)] transition-all" {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-agency-sidebar border border-agency-border/60 rounded-2xl w-full max-w-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${mounted ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-agency-border/50">
          <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-agency-accent hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all hover:shadow-[0_0_15px_rgba(var(--agency-accent),0.4)]"
          >
            <span className="text-lg leading-none">+</span> New Project
          </button>
        </div>

        {/* filter tabs */}
        <div className="flex gap-5 mb-6 border-b border-agency-border/50">
          {[
            { key: 'all',      label: `All (${projects.length})` },
            { key: 'active',   label: `Active (${projects.filter(p => p.status === 'active').length})` },
            { key: 'inactive', label: `Inactive (${projects.filter(p => p.status !== 'active').length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                filter === tab.key ? 'text-agency-accent' : 'text-gray-500 hover:text-white'
              }`}
            >
              {tab.label}
              {filter === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-agency-accent rounded-t-full shadow-[0_-2px_10px_rgba(var(--agency-accent),0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* project cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-agency-card border border-agency-border rounded-2xl shadow-xl shadow-black/20">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-agency-accent blur-2xl opacity-20 rounded-full animate-pulse"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-agency-bg border border-agency-border/50 flex items-center justify-center text-3xl shadow-lg">📂</div>
            </div>
            <p className="text-white text-lg font-bold mb-1">No projects found</p>
            <p className="text-gray-500 text-sm max-w-sm">
              {filter !== 'all' ? 'Try switching the filter above to find what you are looking for.' : 'Click "New Project" to create your first workspace.'}
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
                  className="group relative bg-agency-card border border-agency-border rounded-xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{ '--hover-color': p.rag_status === 'red' ? 'rgba(239,68,68,0.3)' : p.rag_status === 'amber' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)' }}
                >
                  <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-white/10 transition-colors pointer-events-none" />
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: '0 10px 30px var(--hover-color)' }} />
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
          <div className="flex flex-col gap-3 pt-3">
            <button
              onClick={createProject}
              disabled={!form.name || !form.client}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              Create Project
            </button>
            <button onClick={() => setAdding(false)} className="w-full py-2 bg-transparent text-gray-500 hover:text-white text-sm font-semibold transition-colors">
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
            <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border group transition-all ${days !== null && days < 0 && m.status !== 'done' ? 'bg-red-500/5 border-red-500/20' : 'bg-agency-bg border-agency-border'}`} style={{ borderLeftWidth: '4px', borderLeftColor: m.status === 'done' ? '#22c55e' : m.status === 'in_progress' ? '#3b82f6' : m.status === 'at_risk' ? '#ef4444' : '#6b7280' }}>
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
function Sprints({ projectId, onOpenTasks }) {
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
    <div className="bg-agency-bg">
      <SectionHeader
        title="Sprints"
        sub={`${sprints.filter(s => s.status === 'completed').length}/${sprints.length} completed`}
        action={<AddBtn onClick={() => setAdding(true)} label="Add Sprint" />}
      />
      {sprints.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-agency-card border border-agency-border rounded-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-agency-bg border border-agency-border flex items-center justify-center text-2xl mb-3">🏃</div>
          <p className="text-gray-400 text-sm font-medium">No sprints yet</p>
          <p className="text-gray-600 text-xs mt-1">Break down your work into manageable chunks.</p>
        </div>
      )}
      <div className="space-y-4">
        {sprints.map((s, i) => {
          const tasks = s.tasks || []
          const done = tasks.filter(t => t.status?.toLowerCase() === 'done').length
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
          return (
            <div key={s.id} className={`p-5 rounded-xl bg-agency-card border group transition-all hover:-translate-y-1 flex flex-col sm:flex-row gap-5 items-start sm:items-center ${s.status === 'active' ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-agency-border hover:border-agency-accent/40'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[11px] font-bold text-gray-500 font-mono tracking-widest uppercase">S{i + 1}</span>
                  <h3 className="text-base font-semibold text-white truncate">{s.name}</h3>
                  <Pill label={statusLabel[s.status] || 'Planned'} color={statusCfg[s.status] || 'gray'} />
                </div>
                {s.goal && <p className="text-sm text-gray-400 truncate mb-2">{s.goal}</p>}
                
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  {(s.start_date || s.end_date) && (
                    <span>🗓 {formatDate(s.start_date)} → {formatDate(s.end_date)}</span>
                  )}
                  <span>📋 {tasks.length} tasks</span>
                </div>
              </div>

              {/* Progress & Actions */}
              <div className="w-full sm:w-auto flex flex-col items-end gap-3 flex-shrink-0">
                {tasks.length > 0 && (
                  <div className="w-full sm:w-32">
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1.5 font-medium">
                      <span>{done}/{tasks.length} done</span>
                      <span style={{ color: progressColor(pct) }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-agency-bg rounded-full overflow-hidden border border-agency-border/50">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }} />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-auto w-full sm:w-auto">
                  <button onClick={() => setEditingSprint({ ...s })} className="px-3 py-1.5 text-xs font-medium bg-agency-bg border border-agency-border text-gray-400 hover:text-white rounded-lg transition-colors">Edit</button>
                  <button onClick={() => remove(s.id)} className="px-3 py-1.5 text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">Delete</button>
                  <button onClick={() => onOpenTasks(s.id)} className="px-4 py-1.5 text-xs font-semibold bg-agency-accent hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all ml-auto sm:ml-2">Open Board →</button>
                </div>
              </div>
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => { fetch(); setMounted(true) }, [projectId])
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
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-agency-bg border border-agency-border group transition-all hover:border-agency-accent/40" style={{ borderLeftWidth: '4px', borderLeftColor: e.color || EPIC_COLORS[0] }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{e.name}</p>
                {e.description && <p className="text-xs text-gray-500 truncate">{e.description}</p>}
              </div>
              {tasks.length > 0 ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-1.5 bg-agency-card border border-agency-border/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: e.color || EPIC_COLORS[0], boxShadow: `0 0 10px ${e.color || EPIC_COLORS[0]}` }} />
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
        {team.map((m, i) => {
          const capPct = Math.min(((m.capacity || 40) / 40) * 100, 100)
          const isAdmin = m.role === 'Project Manager'
          return (
            <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg bg-agency-bg border group transition-all hover:-translate-y-0.5 animate-[fadeIn_0.3s_ease-out_forwards] ${isAdmin ? 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-agency-border'}`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor(m.name) }}>
                {initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${isAdmin ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {isAdmin ? 'Admin' : 'Member'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{m.role}</p>
                </div>
              </div>
              {m.email && <span className="text-xs text-gray-600 truncate hidden sm:block max-w-[140px]">{m.email}</span>}
              <div className="flex flex-col items-end flex-shrink-0 w-24">
                <span className="text-[11px] text-gray-500 mb-1">{m.capacity || 40}h/wk</span>
                <div className="w-full h-1 bg-agency-card rounded-full overflow-hidden border border-agency-border/50">
                  <div className={`h-full rounded-full ${capPct > 100 ? 'bg-red-500' : capPct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(capPct, 100)}%` }} />
                </div>
              </div>
              <button onClick={() => setEditingMember({ ...m })} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white text-xs transition-all mr-1 ml-2">✎</button>
              <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">✕</button>
            </div>
          )
        })}
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
  const [saved, setSaved] = useState(false)

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
    setSaved(false)
  }

  async function save() {
    await supabase.from('projects').update(form).eq('id', project.id)
    setSaved(true)
    setTimeout(() => {
      setEditing(false); onSaved()
    }, 800)
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
            <button onClick={save} disabled={saved} className={`flex-1 py-2 text-white text-sm font-bold rounded-lg transition-all ${saved ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-agency-accent hover:bg-blue-500'}`}>
              {saved ? '✓ Saved' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm font-semibold rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function OverviewDashboard({ project, onGoToRoadmap }) {
  const [mounted, setMounted] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const [displayTasks, setDisplayTasks] = useState(0)
  
  const tasks = project.tasks || []
  const doneTasks = tasks.filter(t => t.status?.toLowerCase() === 'done').length
  const pct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0
  
  const milestones = project.milestones || []
  const activeSprints = (project.sprints || []).filter(s => s.status === 'active')
  const days = daysLeft(project.go_live_date)

  useEffect(() => {
    setMounted(true)
    let startP = 0, startT = 0
    const timer = setInterval(() => {
      startP += Math.ceil((pct - startP) / 5) || 1
      startT += Math.ceil((tasks.length - startT) / 5) || 1
      if (startP >= pct) startP = pct
      if (startT >= tasks.length) startT = tasks.length
      setDisplayPct(startP); setDisplayTasks(startT)
      if (startP === pct && startT === tasks.length) clearInterval(timer)
    }, 30)
    return () => clearInterval(timer)
  }, [pct, tasks.length])

  if (tasks.length === 0 && milestones.length === 0 && activeSprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center py-10 animate-[fadeIn_0.5s_ease-out]">
        <div className="relative mb-8 group cursor-default">
          <div className="absolute inset-0 rounded-full bg-agency-accent blur-3xl opacity-20 animate-pulse"></div>
          <div className="relative w-32 h-32 rounded-full border border-agency-border/50 flex items-center justify-center text-6xl shadow-[0_0_40px_rgba(var(--agency-accent),0.3)] bg-agency-card">
            🚀
          </div>
        </div>
        <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Let's build something great</h2>
        <p className="text-gray-400 text-lg mb-10">You're all set up. Start by adding some epics, creating your first sprint, or inviting your team.</p>
        <button onClick={onGoToRoadmap} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1 flex items-center gap-2 group">
          Let's go <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-agency-card border-t-2 border-x border-b border-agency-border rounded-xl p-5" style={{ borderTopColor: progressColor(pct) }}>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Project Progress</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold" style={{ color: progressColor(pct) }}>{displayPct}%</span>
            <span className="text-sm text-gray-500">completed</span>
          </div>
          <div className="h-1.5 bg-agency-bg rounded-full overflow-hidden border border-agency-border/50">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: progressColor(pct) }} />
          </div>
        </div>

        <div className="bg-agency-card border-t-2 border-x border-b border-agency-border rounded-xl p-5" style={{ borderTopColor: '#3b82f6' }}>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Tasks</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-white">{displayTasks}</span>
            <span className="text-sm text-gray-500">total</span>
          </div>
          <p className="text-xs text-gray-400">{tasks.length - doneTasks} remaining tasks</p>
        </div>

        <div className="bg-agency-card border border-agency-border rounded-xl p-5">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Timeline</p>
          {days !== null ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-3xl font-bold ${days < 0 ? 'text-red-400' : 'text-white'}`}>{Math.abs(days)}</span>
                <span className="text-sm text-gray-500">{days < 0 ? 'days overdue' : 'days left'}</span>
              </div>
              <p className="text-xs text-gray-400">Go live: {formatDate(project.go_live_date)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No go-live date set</p>
          )}
        </div>

        <div className="bg-agency-card border border-agency-border rounded-xl p-5">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Budget Status</p>
          {project.estimated_hours ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-white">{project.estimated_hours}</span>
                <span className="text-sm text-gray-500">hrs</span>
              </div>
              <p className="text-xs text-gray-400">Total estimated time</p>
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No budget set</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sprints */}
        <div className="bg-agency-card border border-agency-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Active Sprints</h3>
          {activeSprints.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No active sprints.</p>
          ) : (
            <div className="space-y-3">
              {activeSprints.map(s => {
                const sTasks = project.tasks?.filter(t => t.sprint_id === s.id) || []
                const sDone = sTasks.filter(t => t.status?.toLowerCase() === 'done').length
                const sPct = sTasks.length ? Math.round((sDone / sTasks.length) * 100) : 0
                return (
                  <div key={s.id} className="p-4 bg-agency-bg border border-agency-border rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-white">{s.name}</p>
                      <span className="text-xs font-semibold text-blue-400">{sPct}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{formatDate(s.start_date)} → {formatDate(s.end_date)}</p>
                    <div className="h-1.5 bg-agency-card rounded-full overflow-hidden border border-agency-border/50">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out bg-blue-500" style={{ width: mounted ? `${sPct}%` : '0%', boxShadow: '0 0 10px rgba(59,130,246,0.5)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-agency-card border border-agency-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Upcoming Milestones</h3>
          {milestones.filter(m => m.status !== 'done').length === 0 ? (
            <p className="text-sm text-gray-500 italic">No upcoming milestones.</p>
          ) : (
            <div className="space-y-3">
              {milestones.filter(m => m.status !== 'done').slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-agency-bg border border-agency-border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${m.status === 'at_risk' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <p className="flex-1 text-sm font-medium text-white truncate">{m.name}</p>
                  <span className="text-xs text-gray-500">{formatDate(m.due_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN TASKS (replaces WorkBoard in ProjectSetup)
// ══════════════════════════════════════════════════════════════════════════════
function AdminTasks({ projectId, defaultSprintId }) {
  const [tasks, setTasks] = useState([])
  const [sprints, setSprints] = useState([])
  const [epics, setEpics] = useState([])
  const [team, setTeam] = useState([])
  
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState(defaultSprintId || 'all')
  
  const [form, setForm] = useState({ title: '', description: '', status: 'To Do', sprint_id: '', epic_id: '', assignee: '', estimate: '' })

  useEffect(() => { fetchAll() }, [projectId, defaultSprintId])

  async function fetchAll() {
    const [tRes, sRes, eRes, tmRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('sprints').select('id, name').eq('project_id', projectId),
      supabase.from('epics').select('id, name').eq('project_id', projectId),
      supabase.from('team_members').select('id, name').eq('project_id', projectId)
    ])
    setTasks(tRes.data || [])
    setSprints(sRes.data || [])
    setEpics(eRes.data || [])
    setTeam(tmRes.data || [])
    if (defaultSprintId && defaultSprintId !== 'all') {
      setFilter(defaultSprintId)
    }
  }

  async function save() {
    if (!form.title) return
    const payload = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      sprint_id: form.sprint_id || null,
      epic_id: form.epic_id || null,
      assignee: form.assignee || null,
      estimated_hours: Number(form.estimate) || null,
      project_id: projectId
    }
    const { error } = await supabase.from('tasks').insert(payload)
    if (error) { alert('Error: ' + error.message); return }
    setAdding(false); setForm({ title: '', description: '', status: 'To Do', sprint_id: filter !== 'all' ? filter : '', epic_id: '', assignee: '', estimate: '' }); fetchAll()
  }

  async function saveEdit() {
    if (!editing.title) return
    const payload = {
      title: editing.title,
      description: editing.description || null,
      status: editing.status,
      sprint_id: editing.sprint_id || null,
      epic_id: editing.epic_id || null,
      assignee: editing.assignee || null,
      estimated_hours: Number(editing.estimate) || null
    }
    const { error } = await supabase.from('tasks').update(payload).eq('id', editing.id)
    if (error) { alert('Error: ' + error.message); return }
    setEditing(null); fetchAll()
  }

  async function remove(id) { await supabase.from('tasks').delete().eq('id', id); fetchAll() }

  const filteredTasks = tasks.filter(t => filter === 'all' || t.sprint_id === filter)

  const statusOptions = [
    { value: 'To Do', label: 'To Do' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Done', label: 'Done' }
  ]

  const getFormContent = (state, setter, saveFn, cancelFn) => (
    <div className="space-y-4">
      <Input label="Task Title *" placeholder="e.g. Implement authentication" value={state.title} onChange={e => setter(f => ({ ...f, title: e.target.value }))} />
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Description</label>
        <textarea 
          className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-agency-accent focus:shadow-[0_0_15px_rgba(var(--agency-accent),0.2)] placeholder-gray-600 transition-all h-24 resize-none"
          placeholder="Add task details, links, and acceptance criteria..."
          value={state.description || ''} 
          onChange={e => setter(f => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={state.status} onChange={e => setter(f => ({ ...f, status: e.target.value }))} options={statusOptions} />
        <Select label="Assignee" value={state.assignee} onChange={e => setter(f => ({ ...f, assignee: e.target.value }))} options={[{ value: '', label: 'Unassigned' }, ...team.map(t => ({ value: t.name, label: t.name }))]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Sprint" value={state.sprint_id} onChange={e => setter(f => ({ ...f, sprint_id: e.target.value }))} options={[{ value: '', label: 'Backlog (No Sprint)' }, ...sprints.map(s => ({ value: s.id, label: s.name }))]} />
        <Select label="Epic" value={state.epic_id} onChange={e => setter(f => ({ ...f, epic_id: e.target.value }))} options={[{ value: '', label: 'None' }, ...epics.map(e => ({ value: e.id, label: e.name }))]} />
      </div>
      <Input label="Estimate (Hours)" type="number" placeholder="4" value={state.estimate} onChange={e => setter(f => ({ ...f, estimate: e.target.value }))} />
      <div className="flex gap-2 pt-2">
        <button onClick={saveFn} className="flex-1 py-2.5 bg-agency-accent hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">Save Task</button>
        <button onClick={cancelFn} className="flex-1 py-2.5 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm font-semibold rounded-lg transition-colors">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-agency-bg p-6 max-w-6xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Project Backlog</h2>
          <p className="text-sm text-gray-500">Manage and allocate tasks</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="bg-agency-card border border-agency-border text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-agency-accent transition-all"
          >
            <option value="all">All Sprints</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => { setForm(f => ({ ...f, sprint_id: filter !== 'all' ? filter : '' })); setAdding(true) }} className="px-4 py-2 bg-agency-accent hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            + Add Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-agency-card border border-agency-border rounded-xl">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-5 group cursor-default">
              <div className="absolute inset-0 bg-agency-accent blur-xl opacity-10 rounded-full animate-pulse"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-agency-bg border border-agency-border/50 flex items-center justify-center text-3xl shadow-lg">📋</div>
            </div>
            <p className="text-white text-lg font-bold mb-1">No tasks found</p>
            <p className="text-gray-500 text-sm">Create some tasks to start allocating work.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-agency-border bg-agency-sidebar/50 text-[11px] text-gray-500 uppercase tracking-widest">
                <th className="px-5 py-4 font-bold w-[40%]">Task</th>
                <th className="px-5 py-4 font-bold w-32">Status</th>
                <th className="px-5 py-4 font-bold w-48">Assignee</th>
                <th className="px-5 py-4 font-bold w-48">Sprint</th>
                <th className="px-5 py-4 font-bold w-20 text-center">Est.</th>
                <th className="px-5 py-4 font-bold w-40 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-agency-border/50">
              {filteredTasks.map(t => (
                <tr key={t.id} onClick={() => setEditing({ ...t, estimate: t.estimated_hours || '' })} className="hover:bg-agency-bg/50 transition-colors group cursor-pointer">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-white line-clamp-2 pr-4">{t.title}</p>
                    {t.epic_id && <p className="text-[10px] text-gray-500 font-mono mt-1 truncate max-w-[250px]">{epics.find(e => e.id === t.epic_id)?.name}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <Pill 
                      label={t.status} 
                      color={t.status === 'Done' ? 'green' : t.status === 'In Progress' ? 'blue' : t.status === 'In Review' ? 'purple' : 'gray'} 
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {t.assignee ? (
                        <>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor(t.assignee) }}>
                            {initials(t.assignee)}
                          </div>
                          <span className="truncate">{t.assignee}</span>
                        </>
                      ) : (
                        <span className="italic text-gray-600">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 truncate">
                    {sprints.find(s => s.id === t.sprint_id)?.name || 'Backlog'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400 text-center font-mono">
                    {t.estimated_hours || '—'}
                  </td>
                  <td className="px-5 py-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditing({ ...t, estimate: t.estimated_hours || '' }) }} className="px-3 py-1.5 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-xs font-semibold rounded-md transition-colors">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); remove(t.id) }} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-md transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <Modal title="Add New Task" onClose={() => setAdding(false)}>
          {getFormContent(form, setForm, save, () => setAdding(false))}
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Task" onClose={() => setEditing(null)}>
          {getFormContent(editing, setEditing, saveEdit, () => setEditing(null))}
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
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSprintId, setSelectedSprintId] = useState('all')

  async function refetch() {
    const { data } = await supabase.from('projects').select('*, milestones(*), tasks(*), sprints(*)').eq('id', initialProject.id).single()
    if (data) setProject(data)
  }

  // Initial fetch to get relational data if missing
  useEffect(() => { refetch() }, [])

  const TABS = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'sprints', label: 'Sprints' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'team', label: 'Team' },
    { id: 'settings', label: 'Settings' },
  ]

  const openSprintTasks = (sprintId) => {
    setSelectedSprintId(sprintId)
    setActiveTab('tasks')
  }

  return (
    <div className="h-full flex flex-col bg-agency-bg">
      {/* header & tabs container */}
      <div className="px-6 pt-6 border-b border-agency-border bg-agency-card flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          {/* breadcrumb & title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-white transition-colors">
                  ← Projects
                </button>
                <span className="text-gray-700 text-xs">/</span>
                <span className="text-xs text-gray-400 font-medium">{project.name}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">{project.name}</h1>
              <p className="text-sm text-gray-500 font-medium">{project.client}</p>
            </div>
            
            {/* Stats Strip */}
            <div className="flex items-center gap-3 bg-agency-bg border border-agency-border/50 rounded-xl p-2 shadow-inner">
              <div className="flex flex-col px-3 border-r border-agency-border/50">
                <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Status</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${RAG[project.rag_status] || 'bg-green-500'}`} style={{ color: RAG[project.rag_status] === 'bg-green-500' ? '#22c55e' : RAG[project.rag_status] === 'bg-yellow-500' ? '#f59e0b' : '#ef4444' }} />
                  <span className="text-xs font-semibold text-white capitalize">{project.status}</span>
                </div>
              </div>
              <div className="flex flex-col px-3 border-r border-agency-border/50">
                <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Progress</span>
                <span className="text-xs font-semibold text-white mt-0.5">{project.tasks?.length ? Math.round((project.tasks.filter(t => t.status?.toLowerCase() === 'done').length / project.tasks.length) * 100) : 0}%</span>
              </div>
              <div className="flex flex-col px-3">
                <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Days Left</span>
                <span className="text-xs font-semibold text-white mt-0.5">{daysLeft(project.go_live_date) ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* tabs */}
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id ? 'text-agency-accent' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-agency-accent rounded-t-full shadow-[0_-2px_10px_rgba(var(--agency-accent),0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto p-6">
            <OverviewDashboard project={project} onGoToRoadmap={() => setActiveTab('roadmap')} />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
            <ProjectInfo project={project} onSaved={refetch} />
          </div>
        )}
        {activeTab === 'roadmap' && (
          <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Epics projectId={project.id} />
              <Milestones projectId={project.id} />
            </div>
          </div>
        )}
        {activeTab === 'team' && (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
            <Team projectId={project.id} />
          </div>
        )}
        {activeTab === 'sprints' && (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
            <Sprints projectId={project.id} onOpenTasks={openSprintTasks} />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="h-full">
            <AdminTasks projectId={project.id} defaultSprintId={selectedSprintId} />
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function ProjectSetup({ selectedProjectId, onClearProject }) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (selectedProjectId) {
      // Create a temporary project object with just the ID. 
      // ProjectDetail's refetch() will load the rest.
      setSelected({ id: selectedProjectId })
    } else {
      setSelected(null)
    }
  }, [selectedProjectId])

  const handleBack = () => {
    setSelected(null)
    if (onClearProject) onClearProject()
  }

  return selected
    ? <ProjectDetail project={selected} onBack={handleBack} />
    : <ProjectList onSelect={setSelected} />
}