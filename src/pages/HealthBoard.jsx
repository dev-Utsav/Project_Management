import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PROJECT_ID = 1

const STATUSES = ['To Do', 'In Progress', 'Review', 'Blocked', 'Done']

const STATUS_CFG = {
  'To Do':       { color: '#6b7280', bg: 'bg-gray-500/10',   text: 'text-gray-400',   border: 'border-gray-500/20' },
  'In Progress': { color: '#3b82f6', bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',  accent: '#3b82f6' },
  'Review':      { color: '#8b5cf6', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', accent: '#8b5cf6' },
  'Blocked':     { color: '#ef4444', bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',   accent: '#ef4444' },
  'Done':        { color: '#22c55e', bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
}

const PRIORITY_CFG = {
  'Critical': { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: '#ef4444' },
  'High':     { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: '#f97316' },
  'Medium':   { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: '#f59e0b' },
  'Low':      { bg: 'bg-gray-500/15',   text: 'text-gray-400',   dot: '#6b7280' },
}

const MILESTONE_CFG = {
  done:        { label: 'Done',        color: '#22c55e' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  at_risk:     { label: 'At Risk',     color: '#ef4444' },
  upcoming:    { label: 'Upcoming',    color: '#6b7280' },
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function avatarColor(name = '') {
  const c = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return c[Math.abs(h) % c.length]
}
function initials(n = '') { return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function daysLeft(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── atoms ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 6 }) {
  return (
    <div className={`w-${size} h-${size} rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: avatarColor(name) }} title={name}>
      {initials(name)}
    </div>
  )
}

function Pill({ label, cfg }) {
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg?.bg} ${cfg?.text} ${cfg?.border}`}>
      {label}
    </span>
  )
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-agency-sidebar border border-agency-border rounded-xl shadow-2xl ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-agency-border">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function FInput({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</label>}
      <input className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 placeholder-gray-600 w-full transition-colors" {...props} />
    </div>
  )
}
function FTextarea({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</label>}
      <textarea className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 placeholder-gray-600 resize-none w-full transition-colors" {...props} />
    </div>
  )
}
function FSelect({ label, options, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</label>}
      <select className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 transition-colors" {...props}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER SPLASH — shown on first load, pick who you are
// ══════════════════════════════════════════════════════════════════════════════
function MemberSplash({ team, tasks, onSelect }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-agency-bg p-8">
      <div className="max-w-2xl w-full">
        {/* greeting */}
        <div className="text-center mb-10">
          <p className="text-gray-500 text-sm mb-1">{greeting()}</p>
          <h1 className="text-2xl font-bold text-white">Who are you?</h1>
          <p className="text-gray-500 text-sm mt-2">Select your name to see your tasks for today</p>
        </div>

        {/* member grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {team.map(m => {
            const myTasks    = tasks.filter(t => t.assignee === m.name)
            const todo       = myTasks.filter(t => t.status === 'To Do').length
            const inProgress = myTasks.filter(t => t.status === 'In Progress').length
            const blocked    = myTasks.filter(t => t.status === 'Blocked').length
            const done       = myTasks.filter(t => t.status === 'Done').length

            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.name)}
                className="group bg-agency-card border border-agency-border hover:border-agency-accent/50 rounded-xl p-4 text-left transition-all hover:bg-agency-card/80"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor(m.name) }}>
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-agency-accent transition-colors">{m.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{m.role}</p>
                  </div>
                </div>

                {/* task summary */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'To Do',    count: todo,       color: '#6b7280' },
                    { label: 'Active',   count: inProgress, color: '#3b82f6' },
                    { label: 'Blocked',  count: blocked,    color: '#ef4444' },
                    { label: 'Done',     count: done,       color: '#22c55e' },
                  ].map(s => (
                    <div key={s.label} className="bg-agency-bg border border-agency-border rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-gray-600 uppercase tracking-wide">{s.label}</p>
                      <p className="text-sm font-bold" style={{ color: s.color }}>{s.count}</p>
                    </div>
                  ))}
                </div>

                {blocked > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {blocked} blocker{blocked > 1 ? 's' : ''} need attention
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* view all option */}
        <div className="text-center">
          <button
            onClick={() => onSelect('__all__')}
            className="text-sm text-gray-500 hover:text-white border border-agency-border hover:border-agency-accent/40 px-6 py-2.5 rounded-xl transition-all"
          >
            View full board — all members
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TASK CARD
// ══════════════════════════════════════════════════════════════════════════════
function TaskCard({ task, onStatusChange, onEdit, myMode }) {
  const [updating, setUpdating] = useState(false)
  const scfg = STATUS_CFG[task.status] || STATUS_CFG['To Do']
  const pcfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG['Medium']
  const isDone = task.status === 'Done'
  const d = daysLeft(task.due_date)

  async function cycleStatus(e) {
    e.stopPropagation()
    const idx = STATUSES.indexOf(task.status)
    const next = STATUSES[(idx + 1) % STATUSES.length]
    setUpdating(true)
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    setUpdating(false)
    onStatusChange()
  }

  return (
    <div
      onClick={() => onEdit(task)}
      className={`bg-agency-bg border rounded-xl p-3 group cursor-pointer transition-all hover:border-agency-accent/30 ${
        task.status === 'Blocked'     ? 'border-red-500/30' :
        task.status === 'In Progress' ? 'border-blue-500/20' :
        'border-agency-border'
      } ${isDone ? 'opacity-55' : ''}`}
    >
      {/* accent stripe */}
      {scfg.accent && !isDone && (
        <div className="h-0.5 -mx-3 -mt-3 mb-2.5 rounded-t-xl" style={{ backgroundColor: scfg.accent + '50' }} />
      )}

      {/* title */}
      <p className={`text-xs font-medium leading-snug mb-2 ${isDone ? 'line-through text-gray-600' : 'text-white'}`}>
        {task.title}
      </p>

      {/* due date warning */}
      {task.due_date && !isDone && d !== null && d <= 3 && (
        <div className={`text-[10px] mb-1.5 font-medium ${d < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
          {d < 0 ? `⚠ ${Math.abs(d)}d overdue` : d === 0 ? '⚠ Due today' : `⚠ Due in ${d}d`}
        </div>
      )}

      {/* description preview */}
      {task.description && !isDone && (
        <p className="text-[10px] text-gray-600 mb-2 line-clamp-1">{task.description}</p>
      )}

      {/* bottom row */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          {!myMode && task.assignee && <Avatar name={task.assignee} size={5} />}
          {task.estimated_hours && (
            <span className="text-[10px] text-gray-600">{task.estimated_hours}h</span>
          )}
          <Pill label={task.priority || 'Medium'} cfg={pcfg} />
        </div>

        {/* advance status button */}
        {!isDone ? (
          <button
            onClick={cycleStatus}
            disabled={updating}
            className={`text-[9px] px-2 py-0.5 rounded border font-medium transition-all ${scfg.bg} ${scfg.text} ${scfg.border} hover:opacity-80`}
            title="Advance status"
          >
            {updating ? '…' : '→ ' + STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length]}
          </button>
        ) : (
          <span className="text-[10px] text-green-500">✓ Done</span>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// KANBAN COLUMN
// ══════════════════════════════════════════════════════════════════════════════
function KanbanColumn({ status, tasks, onStatusChange, onEdit, myMode }) {
  const cfg = STATUS_CFG[status]
  return (
    <div className="flex flex-col min-h-0 bg-agency-card border border-agency-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-agency-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span className="text-xs font-semibold text-white">{status}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {tasks.length === 0
          ? <div className="flex items-center justify-center h-12"><p className="text-[10px] text-gray-700">Empty</p></div>
          : tasks.map(t => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} onEdit={onEdit} myMode={myMode} />)
        }
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TASK MODAL
// ══════════════════════════════════════════════════════════════════════════════
function TaskModal({ task, team, sprints, onClose, onSaved }) {
  const isNew = !task?.id
  const [form, setForm] = useState({
    title:           task?.title || '',
    description:     task?.description || '',
    assignee:        task?.assignee || '',
    status:          task?.status || 'To Do',
    priority:        task?.priority || 'Medium',
    estimated_hours: task?.estimated_hours || '',
    sprint_id:       task?.sprint_id || '',
    epic:            task?.epic || '',
    due_date:        task?.due_date?.slice(0, 10) || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, project_id: PROJECT_ID, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null }
    if (isNew) await supabase.from('tasks').insert(payload)
    else await supabase.from('tasks').update(payload).eq('id', task.id)
    setSaving(false); onSaved()
  }

  async function del() {
    if (!window.confirm('Delete this task?')) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false); onSaved()
  }

  return (
    <Modal title={isNew ? 'New Task' : 'Edit Task'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><FInput label="Title *" placeholder="What needs to be done?" value={form.title} onChange={e => set('title', e.target.value)} /></div>
        <div className="col-span-2"><FTextarea label="Description" rows={2} placeholder="More details…" value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <FSelect label="Assignee" value={form.assignee} onChange={e => set('assignee', e.target.value)}
          options={[{value:'',label:'Unassigned'}, ...team.map(m => ({value:m.name,label:m.name}))]} />
        <FSelect label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={STATUSES.map(s => ({value:s,label:s}))} />
        <FSelect label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}
          options={['Critical','High','Medium','Low'].map(p => ({value:p,label:p}))} />
        <FInput label="Estimated Hours" type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} />
        <FSelect label="Sprint" value={form.sprint_id} onChange={e => set('sprint_id', e.target.value)}
          options={[{value:'',label:'No sprint'}, ...sprints.map(s => ({value:s.id,label:s.name}))]} />
        <FInput label="Due Date" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        <div className="col-span-2"><FInput label="Epic" placeholder="e.g. Checkout Flow" value={form.epic} onChange={e => set('epic', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={saving}
          className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
          {saving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
        </button>
        <button onClick={onClose} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
          Cancel
        </button>
        {!isNew && (
          <button onClick={del} disabled={deleting}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors">
            {deleting ? '…' : 'Delete'}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function SprintModal({ sprint, onClose, onSaved }) {
  const isNew = !sprint?.id
  const [form, setForm] = useState({ name: sprint?.name||'', goal: sprint?.goal||'', start_date: sprint?.start_date?.slice(0,10)||'', end_date: sprint?.end_date?.slice(0,10)||'', status: sprint?.status||'planned' })
  const [saving, setSaving] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }
  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (isNew) await supabase.from('sprints').insert({...form, project_id: PROJECT_ID})
    else await supabase.from('sprints').update(form).eq('id', sprint.id)
    setSaving(false); onSaved()
  }
  return (
    <Modal title={isNew ? 'New Sprint' : 'Edit Sprint'} onClose={onClose}>
      <div className="space-y-3">
        <FInput label="Sprint Name *" placeholder="e.g. Sprint 4 — Auth" value={form.name} onChange={e => set('name', e.target.value)} />
        <FInput label="Goal" placeholder="What does this sprint deliver?" value={form.goal} onChange={e => set('goal', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Start Date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          <FInput label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
        <FSelect label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={[{value:'planned',label:'Planned'},{value:'active',label:'Active'},{value:'completed',label:'Completed'},{value:'cancelled',label:'Cancelled'}]} />
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={saving} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">{saving ? 'Saving…' : isNew ? 'Create Sprint' : 'Update'}</button>
        <button onClick={onClose} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MILESTONE MODAL
// ══════════════════════════════════════════════════════════════════════════════
function MilestoneModal({ milestone, onClose, onSaved }) {
  const isNew = !milestone?.id
  const [form, setForm] = useState({ title: milestone?.title||'', due_date: milestone?.due_date?.slice(0,10)||'', status: milestone?.status||'upcoming' })
  const [saving, setSaving] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }
  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    if (isNew) await supabase.from('milestones').insert({...form, project_id: PROJECT_ID})
    else await supabase.from('milestones').update(form).eq('id', milestone.id)
    setSaving(false); onSaved()
  }
  return (
    <Modal title={isNew ? 'New Milestone' : 'Edit Milestone'} onClose={onClose}>
      <div className="space-y-3">
        <FInput label="Title *" value={form.title} onChange={e => set('title', e.target.value)} />
        <FInput label="Due Date" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        <FSelect label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={[{value:'upcoming',label:'Upcoming'},{value:'in_progress',label:'In Progress'},{value:'at_risk',label:'At Risk'},{value:'done',label:'Done'}]} />
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={saving} className="flex-1 py-2 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">{saving ? 'Saving…' : isNew ? 'Create' : 'Update'}</button>
        <button onClick={onClose} className="flex-1 py-2 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
function Sidebar({ sprints, milestones, selectedSprint, onSelectSprint, onEditSprint, onAddSprint, onEditMilestone, onAddMilestone, tasks }) {
  return (
    <div className="flex flex-col w-52 flex-shrink-0 bg-agency-card border border-agency-border rounded-xl overflow-hidden">
      {/* Sprints */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-agency-border flex-shrink-0">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Sprints</span>
        <button onClick={onAddSprint} className="text-agency-accent hover:text-blue-400 text-base leading-none transition-colors" title="Add sprint">+</button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
        <button onClick={() => onSelectSprint(null)}
          className={`w-full text-left px-3 py-2 transition-colors border-b border-agency-border/40 ${!selectedSprint ? 'bg-agency-accent/10 border-l-2 border-l-agency-accent' : 'hover:bg-agency-bg/60'}`}>
          <p className="text-[11px] font-medium text-white">All Sprints</p>
          <p className="text-[10px] text-gray-600">{tasks.length} tasks total</p>
        </button>
        {sprints.map(s => {
          const st = tasks.filter(t => String(t.sprint_id) === String(s.id))
          const done = st.filter(t => t.status === 'Done').length
          const pct  = st.length ? Math.round((done / st.length) * 100) : 0
          const sc   = { active:'#3b82f6', completed:'#22c55e', planned:'#6b7280', cancelled:'#ef4444' }[s.status] || '#6b7280'
          return (
            <button key={s.id} onClick={() => onSelectSprint(s)}
              className={`w-full text-left px-3 py-2.5 border-b border-agency-border/40 last:border-0 transition-colors group ${selectedSprint?.id === s.id ? 'bg-agency-accent/10 border-l-2 border-l-agency-accent' : 'hover:bg-agency-bg/60'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc }} />
                  <p className="text-[11px] font-medium text-white truncate">{s.name}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); onEditSprint(s) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-white text-[10px] transition-all flex-shrink-0 ml-1">✎</button>
              </div>
              {st.length > 0 && (
                <div className="mt-1.5 pl-3">
                  <div className="h-1 bg-agency-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct===100?'#22c55e':sc }} />
                  </div>
                  <p className="text-[9px] text-gray-600 mt-0.5">{done}/{st.length}</p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Milestones */}
      <div className="flex items-center justify-between px-3 py-2.5 border-y border-agency-border flex-shrink-0">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Milestones</span>
        <button onClick={onAddMilestone} className="text-agency-accent hover:text-blue-400 text-base leading-none transition-colors" title="Add milestone">+</button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {milestones.map(m => {
          const cfg = MILESTONE_CFG[m.status] || MILESTONE_CFG.upcoming
          const d   = daysLeft(m.due_date)
          return (
            <button key={m.id} onClick={() => onEditMilestone(m)}
              className="w-full text-left px-3 py-2 border-b border-agency-border/40 last:border-0 hover:bg-agency-bg/60 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <p className="text-[11px] text-white truncate flex-1">{m.title}</p>
                <span className="opacity-0 group-hover:opacity-100 text-gray-600 text-[10px] transition-all">✎</span>
              </div>
              <div className="flex items-center justify-between pl-3.5 mt-0.5">
                <span className="text-[9px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                {d !== null && <span className={`text-[9px] ${d<0?'text-red-400':d<=7?'text-yellow-400':'text-gray-600'}`}>{d<0?`${Math.abs(d)}d over`:d===0?'Today':`${d}d`}</span>}
              </div>
            </button>
          )
        })}
        {milestones.length === 0 && <p className="text-[10px] text-gray-600 px-3 py-2">No milestones yet</p>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
export default function HealthBoard() {
  const [tasks, setTasks]           = useState([])
  const [team, setTeam]             = useState([])
  const [sprints, setSprints]       = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading]       = useState(true)

  const [selectedMember, setSelectedMember] = useState(null) // null = show splash
  const [selectedSprint, setSelectedSprint] = useState(null)
  const [taskModal,      setTaskModal]      = useState(null)
  const [sprintModal,    setSprintModal]    = useState(null)
  const [milestoneModal, setMilestoneModal] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [tRes, tmRes, sRes, mRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', PROJECT_ID).order('id'),
      supabase.from('team_members').select('*').eq('project_id', PROJECT_ID).order('name'),
      supabase.from('sprints').select('*').eq('project_id', PROJECT_ID).order('start_date'),
      supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('due_date'),
    ])
    setTasks(tRes.data || [])
    setTeam(tmRes.data || [])
    setSprints(sRes.data || [])
    setMilestones(mRes.data || [])
    setLoading(false)
  }

  function handleMemberSelect(name) {
    setSelectedMember(name === '__all__' ? '' : name)
  }

  const myMode = selectedMember && selectedMember !== ''

  const filteredTasks = tasks.filter(t => {
    const memberMatch = !myMode || t.assignee === selectedMember
    const sprintMatch = !selectedSprint || String(t.sprint_id) === String(selectedSprint?.id)
    return memberMatch && sprintMatch
  })

  const tasksByStatus = {}
  STATUSES.forEach(s => { tasksByStatus[s] = filteredTasks.filter(t => t.status === s) })

  const totalTasks = filteredTasks.length
  const doneTasks  = filteredTasks.filter(t => t.status === 'Done').length
  const blockedCt  = filteredTasks.filter(t => t.status === 'Blocked').length
  const pct        = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Show splash if no member selected yet
  if (selectedMember === null) {
    return <MemberSplash team={team} tasks={tasks} onSelect={handleMemberSelect} />
  }

  return (
    <div className="h-full flex flex-col bg-agency-bg overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-agency-border flex-shrink-0 bg-agency-card">
        <div className="flex items-center gap-3">
          {/* back to splash */}
          <button onClick={() => setSelectedMember(null)}
            className="text-gray-500 hover:text-white text-xs flex items-center gap-1 transition-colors">
            ← Switch member
          </button>
          <span className="w-px h-4 bg-agency-border" />
          {myMode ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: avatarColor(selectedMember) }}>
                {initials(selectedMember)}
              </div>
              <span className="text-xs font-semibold text-white">{selectedMember}</span>
              <span className="text-[10px] text-gray-500">— My Tasks</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-white">All Tasks</span>
          )}
          {selectedSprint && (
            <span className="text-[10px] text-gray-500 bg-agency-bg border border-agency-border px-2 py-0.5 rounded-lg">
              {selectedSprint.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* stats */}
          <div className="flex items-center gap-3 px-3 py-1 bg-agency-bg border border-agency-border rounded-lg">
            {[
              { label: 'Total',    value: totalTasks, color: 'text-gray-400' },
              { label: 'Done',     value: doneTasks,  color: 'text-green-400' },
              { label: 'Blocked',  value: blockedCt,  color: blockedCt > 0 ? 'text-red-400' : 'text-gray-500' },
              { label: 'Progress', value: `${pct}%`,  color: pct>=80?'text-green-400':pct>=40?'text-yellow-400':'text-blue-400' },
            ].map((s, i) => (
              <span key={s.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-700 text-xs">·</span>}
                <span className="text-[10px] text-gray-600">{s.label}</span>
                <span className={`text-xs font-semibold ${s.color}`}>{s.value}</span>
              </span>
            ))}
          </div>

          {/* member switcher in board view */}
          <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
            className="bg-agency-bg border border-agency-border text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors">
            <option value="">All Members</option>
            {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>

          <button onClick={() => setTaskModal('__new__')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-agency-accent hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
            <span className="text-base leading-none">+</span> Add Task
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">

        <Sidebar
          sprints={sprints} milestones={milestones}
          selectedSprint={selectedSprint} onSelectSprint={setSelectedSprint}
          onEditSprint={s => setSprintModal(s)} onAddSprint={() => setSprintModal('__new__')}
          onEditMilestone={m => setMilestoneModal(m)} onAddMilestone={() => setMilestoneModal('__new__')}
          tasks={tasks}
        />

        {/* Kanban */}
        <div className="flex-1 grid gap-3 min-h-0 overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(0, 1fr))` }}>
          {STATUSES.map(status => (
            <KanbanColumn key={status} status={status}
              tasks={tasksByStatus[status] || []}
              onStatusChange={fetchAll} onEdit={t => setTaskModal(t)}
              myMode={myMode}
            />
          ))}
        </div>
      </div>

      {/* MODALS */}
      {taskModal && (
        <TaskModal task={taskModal === '__new__' ? null : taskModal} team={team} sprints={sprints}
          onClose={() => setTaskModal(null)} onSaved={() => { setTaskModal(null); fetchAll() }} />
      )}
      {sprintModal && (
        <SprintModal sprint={sprintModal === '__new__' ? null : sprintModal}
          onClose={() => setSprintModal(null)} onSaved={() => { setSprintModal(null); fetchAll() }} />
      )}
      {milestoneModal && (
        <MilestoneModal milestone={milestoneModal === '__new__' ? null : milestoneModal}
          onClose={() => setMilestoneModal(null)} onSaved={() => { setMilestoneModal(null); fetchAll() }} />
      )}
    </div>
  )
}