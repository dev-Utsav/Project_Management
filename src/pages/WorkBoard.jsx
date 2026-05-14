import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PROJECT_ID = 1
const STATUSES = ['To Do', 'In Progress', 'Review', 'Blocked', 'Done']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

const STATUS_CFG = {
  'To Do':       { color: '#6b7280', light: '#6b728020' },
  'In Progress': { color: '#3b82f6', light: '#3b82f620' },
  'Review':      { color: '#8b5cf6', light: '#8b5cf620' },
  'Blocked':     { color: '#ef4444', light: '#ef444420' },
  'Done':        { color: '#22c55e', light: '#22c55e20' },
}
const PRIORITY_CFG = {
  'Critical': { color: '#ef4444', label: '🔴 Critical' },
  'High':     { color: '#f97316', label: '🟠 High' },
  'Medium':   { color: '#f59e0b', label: '🟡 Medium' },
  'Low':      { color: '#6b7280', label: '⚪ Low' },
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function ac(n = '') {
  const c = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
  return c[Math.abs(h) % c.length]
}
function ini(n = '') { return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }
function fdate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
function fdateFull(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
function dl(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Av({ name, size = 7 }) {
  return (
    <div className={`w-${size} h-${size} rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: ac(name) }} title={name}>{ini(name)}</div>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status, onClick }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['To Do']
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all hover:opacity-80"
      style={{ backgroundColor: cfg.light, color: cfg.color, borderColor: cfg.color + '40' }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {status}
    </button>
  )
}

// ─── Priority dot ─────────────────────────────────────────────────────────────
function PriorityDot({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG['Medium']
  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} title={priority} />
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-[#0f1117] border border-agency-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-agency-border flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white hover:bg-agency-border rounded-lg transition-all text-lg leading-none">×</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function FInput({ label, ...p }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">{label}</label>}
      <input className="bg-agency-bg border border-agency-border text-white text-base rounded-xl px-3 py-2.5 focus:outline-none focus:border-agency-accent/60 placeholder-gray-700 w-full transition-colors" {...p} />
    </div>
  )
}
function FTextarea({ label, ...p }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">{label}</label>}
      <textarea className="bg-agency-bg border border-agency-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-agency-accent/60 placeholder-gray-700 resize-y w-full transition-colors min-h-[120px]" {...p} />
    </div>
  )
}
function FSelect({ label, options, ...p }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">{label}</label>}
      <select className="bg-agency-bg border border-agency-border text-white text-base rounded-xl px-3 py-2.5 focus:outline-none focus:border-agency-accent/60 w-full transition-colors" {...p}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TASK FORM MODAL (PM)
// ══════════════════════════════════════════════════════════════════════════════
function TaskFormModal({ task, team, sprints, epics = [], parentTasks = [], onClose, onSaved }) {
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
    parent_task_id:  task?.parent_task_id || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  function s(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title:           form.title.trim(),
      description:     form.description || null,
      assignee:        form.assignee || null,
      status:          form.status || 'To Do',
      priority:        form.priority || 'Medium',
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      sprint_id:       form.sprint_id ? Number(form.sprint_id) : null,
      epic:            form.epic || null,
      due_date:        form.due_date || null,
      parent_task_id:  form.parent_task_id ? Number(form.parent_task_id) : null,
      project_id:      PROJECT_ID,
    }
    const { error } = isNew
      ? await supabase.from('tasks').insert(payload)
      : await supabase.from('tasks').update(payload).eq('id', task.id)
    if (error) { alert('Failed to save task: ' + error.message); setSaving(false); return }
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
      <div className="space-y-4">
        <FInput label="Task Title *" placeholder="What needs to be done?" value={form.title} onChange={e => s('title', e.target.value)} />
        <FTextarea label="Description" rows={6} placeholder="Describe the task in detail — acceptance criteria, links, context…" value={form.description} onChange={e => s('description', e.target.value)} />
        <FSelect label="Epic / Feature Area" value={form.epic} onChange={e => s('epic', e.target.value)}
          options={[
            { value: '', label: '— No Epic' },
            ...epics.map((e, i) => ({ value: e.name, label: `Epic ${i + 1}: ${e.name}` }))
          ]} />
        <div className="grid grid-cols-2 gap-3">
          <FSelect label="Assign To" value={form.assignee} onChange={e => s('assignee', e.target.value)}
            options={[{ value: '', label: 'Unassigned' }, ...team.map(m => ({ value: m.name, label: m.name }))]} />
          <FSelect label="Sprint" value={form.sprint_id} onChange={e => s('sprint_id', e.target.value)}
            options={[{ value: '', label: '— No Sprint' }, ...sprints.map((sp, i) => ({ value: sp.id, label: `Sprint ${i + 1}: ${sp.name}` }))]} />
          <FSelect label="Priority" value={form.priority} onChange={e => s('priority', e.target.value)}
            options={PRIORITIES.map(p => ({ value: p, label: p }))} />
          <FSelect label="Status" value={form.status} onChange={e => s('status', e.target.value)}
            options={STATUSES.map(st => ({ value: st, label: st }))} />
          <FInput label="Estimated Hours" type="number" min="0" step="0.5" placeholder="e.g. 4" value={form.estimated_hours} onChange={e => s('estimated_hours', e.target.value)} />
          <FInput label="Due Date" type="date" value={form.due_date} onChange={e => s('due_date', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        <button onClick={save} disabled={saving || !form.title.trim()}
          className="flex-1 py-2.5 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors">
          {saving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
        </button>
        <button onClick={onClose} className="flex-1 py-2.5 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-sm rounded-xl transition-colors">Cancel</button>
        {!isNew && (
          <button onClick={del} disabled={deleting}
            className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-sm transition-colors">
            {deleting ? '…' : 'Delete'}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PM VIEW — task table with grouping + right drawer
// ══════════════════════════════════════════════════════════════════════════════
function PMView({ tasks, team, sprints, milestones, epics = [], onRefresh }) {
  const [groupBy, setGroupBy] = useState('assignee') // assignee | sprint | epic | status
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [drawer, setDrawer] = useState(null)   // task object
  const [taskModal, setTaskModal] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = tasks.filter(t => {
    const statusOk   = filterStatus === 'all' || t.status === filterStatus
    const assigneeOk = filterAssignee === 'all' || t.assignee === filterAssignee
    const searchOk   = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.assignee?.toLowerCase().includes(search.toLowerCase())
    return statusOk && assigneeOk && searchOk
  })

  // group tasks
  function getGroups() {
    if (groupBy === 'assignee') {
      const members = [...new Set(filtered.map(t => t.assignee || 'Unassigned'))]
      return members.map(m => ({ key: m, label: m, tasks: filtered.filter(t => (t.assignee || 'Unassigned') === m) }))
    }
    if (groupBy === 'sprint') {
      const sprintMap = {}
      sprints.forEach(s => { sprintMap[s.id] = s.name })
      const groups = [...new Set(filtered.map(t => t.sprint_id || '__none__'))]
      return groups.map(sid => ({
        key: sid, label: sid === '__none__' ? 'No Sprint' : (sprintMap[sid] || `Sprint ${sid}`),
        tasks: filtered.filter(t => (t.sprint_id || '__none__') === sid)
      }))
    }
    if (groupBy === 'epic') {
      const epics = [...new Set(filtered.map(t => t.epic || 'No Epic'))]
      return epics.map(e => ({ key: e, label: e, tasks: filtered.filter(t => (t.epic || 'No Epic') === e) }))
    }
    if (groupBy === 'status') {
      return STATUSES.map(s => ({ key: s, label: s, tasks: filtered.filter(t => t.status === s) }))
    }
    return []
  }

  const groups = getGroups()
  const totalDone = filtered.filter(t => t.status === 'Done').length
  const blocked   = filtered.filter(t => t.status === 'Blocked').length

  return (
    <div className="flex h-full min-h-0">
      {/* ── main table area ── */}
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${drawer ? 'mr-0' : ''}`}>

        {/* toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-agency-border flex-shrink-0 bg-agency-card">
          {/* search */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
              className="bg-agency-bg border border-agency-border text-white text-xs rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:border-agency-accent/50 placeholder-gray-700 w-44 transition-colors" />
          </div>

          {/* group by */}
          <div className="flex items-center gap-1.5 bg-agency-bg border border-agency-border rounded-lg p-1">
            {[['assignee','By Member'],['sprint','By Sprint'],['epic','By Epic'],['status','By Status']].map(([val, lbl]) => (
              <button key={val} onClick={() => setGroupBy(val)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${groupBy === val ? 'bg-agency-accent text-white' : 'text-gray-500 hover:text-white'}`}>
                {lbl}
              </button>
            ))}
          </div>

          {/* filters */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-agency-bg border border-agency-border text-gray-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors">
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="bg-agency-bg border border-agency-border text-gray-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors">
            <option value="all">All Members</option>
            {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>

          <div className="flex-1" />

          {/* stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span><strong className="text-white">{filtered.length}</strong> tasks</span>
            <span><strong className="text-green-400">{totalDone}</strong> done</span>
            {blocked > 0 && <span><strong className="text-red-400">{blocked}</strong> blocked</span>}
          </div>

          <button onClick={() => setTaskModal('__new__')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-agency-accent hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
            + New Task
          </button>
        </div>

        {/* table */}
        <div className="flex-1 overflow-y-auto">
          {groups.map(group => (
            <GroupSection key={group.key} group={group} groupBy={groupBy}
              onOpen={t => setDrawer(t)} onEdit={t => setTaskModal(t)} />
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-gray-500 text-sm">No tasks match the current filter</p>
            </div>
          )}
        </div>
      </div>

      {/* ── right drawer ── */}
      {drawer && (
        <TaskDrawer task={drawer} allTasks={tasks} team={team} sprints={sprints}
          onClose={() => setDrawer(null)}
          onEdit={() => { setTaskModal(drawer); setDrawer(null) }}
          onRefresh={onRefresh} />
      )}

      {taskModal && (
        <TaskFormModal task={taskModal === '__new__' ? null : taskModal} team={team} sprints={sprints} epics={epics}
          parentTasks={tasks.filter(t => !t.parent_task_id)}
          onClose={() => setTaskModal(null)} onSaved={() => { setTaskModal(null); onRefresh() }} />
      )}
    </div>
  )
}

// ─── Group section row ────────────────────────────────────────────────────────
function GroupSection({ group, groupBy, onOpen, onEdit }) {
  const [collapsed, setCollapsed] = useState(false)
  const done    = group.tasks.filter(t => t.status === 'Done').length
  const blocked = group.tasks.filter(t => t.status === 'Blocked').length
  const pct     = group.tasks.length ? Math.round((done / group.tasks.length) * 100) : 0

  return (
    <div className="border-b border-agency-border/50 last:border-0">
      {/* group header */}
      <button onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-agency-card/30 transition-colors text-left">
        <span className="text-gray-600 text-xs transition-transform duration-200" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
        {groupBy === 'assignee' && group.key !== 'Unassigned' && (
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ac(group.key) }}>
            {ini(group.key)}
          </div>
        )}
        <span className="text-sm font-semibold text-white">{group.label}</span>
        <span className="text-[11px] text-gray-600">{group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}</span>
        {blocked > 0 && <span className="text-[10px] text-red-400 font-medium">{blocked} blocked</span>}
        <div className="flex-1" />
        {/* mini progress */}
        {group.tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1 bg-agency-border rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : '#3b82f6' }} />
            </div>
            <span className="text-[10px] text-gray-500 w-7">{pct}%</span>
          </div>
        )}
      </button>

      {/* rows */}
      {!collapsed && (
        <div>
          {/* column headers */}
          <div className="grid px-5 py-1.5 border-b border-agency-border/30 bg-agency-bg/30"
            style={{ gridTemplateColumns: '1fr 110px 90px 80px 80px 70px 60px' }}>
            {['Task','Assignee','Sprint/Epic','Priority','Status','Hours','Due'].map(h => (
              <span key={h} className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">{h}</span>
            ))}
          </div>
          {group.tasks.filter(t => !t.parent_task_id).map(t => (
            <div key={t.id}>
              <TaskRow task={t} onOpen={onOpen} onEdit={onEdit} />
              {/* subtasks */}
              {group.tasks.filter(st => String(st.parent_task_id) === String(t.id)).map(st => (
                <div key={st.id} className="flex items-stretch">
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    <div className="w-px h-full bg-agency-border ml-5" />
                  </div>
                  <div className="flex-1 border-l-2 border-agency-border/40 ml-0 pl-1 bg-agency-bg/20">
                    <TaskRow task={st} onOpen={onOpen} onEdit={onEdit} isSubtask />
                  </div>
                </div>
              ))}
            </div>
          ))}
          {/* orphan subtasks not matching any parent in this group */}
          {group.tasks.filter(t => t.parent_task_id && !group.tasks.find(p => String(p.id) === String(t.parent_task_id))).map(t => (
            <TaskRow key={t.id} task={t} onOpen={onOpen} onEdit={onEdit} isSubtask />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onOpen, onEdit, isSubtask }) {
  const scfg = STATUS_CFG[task.status] || STATUS_CFG['To Do']
  const d    = dl(task.due_date)
  const isDone = task.status === 'Done'

  return (
    <div onClick={() => onOpen(task)}
      className={`grid px-5 py-3 border-b border-agency-border/20 hover:bg-agency-card/40 cursor-pointer transition-colors group items-center ${isDone ? 'opacity-60' : ''}`}
      style={{ gridTemplateColumns: '1fr 110px 90px 80px 80px 70px 60px' }}>

      {/* title */}
      <div className="flex items-center gap-2 min-w-0 pr-3">
        {isSubtask && <span className="text-gray-700 text-[10px] flex-shrink-0">↳</span>}
        <PriorityDot priority={task.priority} />
        <span className={`${isSubtask ? 'text-xs' : 'text-sm'} text-white truncate ${isDone ? 'line-through text-gray-500' : ''}`}>{task.title}</span>
        {task.description && <span className="text-gray-700 text-[10px] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">📝</span>}
      </div>

      {/* assignee */}
      <div className="flex items-center gap-1.5">
        {task.assignee ? (
          <>
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ac(task.assignee) }}>
              {ini(task.assignee)}
            </div>
            <span className="text-[11px] text-gray-400 truncate">{task.assignee.split(' ')[0]}</span>
          </>
        ) : <span className="text-[11px] text-gray-700">—</span>}
      </div>

      {/* sprint/epic */}
      <div className="text-[11px] text-gray-500 truncate pr-2">{task.epic || '—'}</div>

      {/* priority */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_CFG[task.priority]?.color || '#6b7280' }} />
        <span className="text-[11px] text-gray-400">{task.priority || '—'}</span>
      </div>

      {/* status */}
      <div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ backgroundColor: scfg.light, color: scfg.color }}>
          {task.status}
        </span>
      </div>

      {/* hours */}
      <div className="text-[11px] text-gray-500">{task.estimated_hours ? `${task.estimated_hours}h` : '—'}</div>

      {/* due */}
      <div className={`text-[11px] ${d !== null && d < 0 && !isDone ? 'text-red-400' : d !== null && d <= 3 && !isDone ? 'text-yellow-400' : 'text-gray-600'}`}>
        {task.due_date ? fdate(task.due_date) : '—'}
      </div>
    </div>
  )
}

// ─── Right drawer ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// SUBTASKS PANEL — shown inside task drawer
// ══════════════════════════════════════════════════════════════════════════════
function SubtasksPanel({ task, allTasks, team, onRefresh }) {
  const subtasks = allTasks.filter(t => String(t.parent_task_id) === String(task.id))
  const done = subtasks.filter(t => t.status === 'Done').length
  const pct  = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0

  const [adding, setAdding]     = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]     = useState(false)

  const blank = { title: '', assignee: '', priority: 'Medium', estimated_hours: '', status: 'To Do' }
  const [form, setForm] = useState(blank)
  function sf(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function startEdit(st) {
    setEditingId(st.id)
    setForm({ title: st.title, assignee: st.assignee || '', priority: st.priority || 'Medium', estimated_hours: st.estimated_hours || '', status: st.status || 'To Do' })
    setAdding(false)
  }

  async function saveSubtask() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title:           form.title.trim(),
      assignee:        form.assignee || null,
      priority:        form.priority || 'Medium',
      status:          form.status || 'To Do',
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      parent_task_id:  task.id,
      project_id:      task.project_id,
      sprint_id:       task.sprint_id || null,
      epic:            task.epic || null,
    }
    const { error } = editingId
      ? await supabase.from('tasks').update(payload).eq('id', editingId)
      : await supabase.from('tasks').insert(payload)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setForm(blank); setAdding(false); setEditingId(null); setSaving(false)
    onRefresh()
  }

  async function toggleDone(st) {
    const next = st.status === 'Done' ? 'To Do' : 'Done'
    await supabase.from('tasks').update({ status: next }).eq('id', st.id)
    onRefresh()
  }

  async function deleteSubtask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    onRefresh()
  }

  const isFormOpen = adding || !!editingId

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
            Subtasks
          </p>
          {subtasks.length > 0 && (
            <span className="text-[10px] text-gray-600">{done}/{subtasks.length}</span>
          )}
        </div>
        {!isFormOpen && (
          <button onClick={() => { setAdding(true); setEditingId(null); setForm(blank) }}
            className="text-[11px] text-agency-accent hover:text-blue-400 font-medium transition-colors">
            + Add Subtask
          </button>
        )}
      </div>

      {/* progress bar */}
      {subtasks.length > 0 && (
        <div className="h-1 bg-agency-border rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : '#3b82f6' }} />
        </div>
      )}

      {/* subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {subtasks.map(st => {
            const scfg = STATUS_CFG[st.status] || STATUS_CFG['To Do']
            const pcfg = PRIORITY_CFG[st.priority] || PRIORITY_CFG['Medium']
            const isDone = st.status === 'Done'
            return (
              <div key={st.id}
                className={`border rounded-xl p-2.5 group transition-all ${isDone ? 'border-agency-border/40 bg-agency-bg/30' : 'border-agency-border bg-agency-bg'}`}>
                <div className="flex items-center gap-2">
                  {/* done checkbox */}
                  <button onClick={() => toggleDone(st)}
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isDone ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-blue-400'
                    }`}>
                    {isDone && <span className="text-white text-[9px] font-bold">✓</span>}
                  </button>

                  {/* title */}
                  <span className={`text-xs flex-1 truncate ${isDone ? 'line-through text-gray-600' : 'text-white'}`}>
                    {st.title}
                  </span>

                  {/* meta chips */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {st.estimated_hours && (
                      <span className="text-[10px] text-gray-600">{st.estimated_hours}h</span>
                    )}
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pcfg.color }} title={st.priority} />
                    {st.assignee && (
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: ac(st.assignee) }} title={st.assignee}>
                        {ini(st.assignee)}
                      </div>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: scfg.light, color: scfg.color }}>
                      {st.status}
                    </span>
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-1">
                    <button onClick={() => startEdit(st)}
                      className="text-gray-600 hover:text-white text-[10px] px-1 transition-colors">✎</button>
                    <button onClick={() => deleteSubtask(st.id)}
                      className="text-gray-700 hover:text-red-400 text-[10px] px-1 transition-colors">✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* add / edit form */}
      {isFormOpen && (
        <div className="border border-agency-accent/30 bg-agency-accent/5 rounded-xl p-3 space-y-3">
          <p className="text-[10px] text-agency-accent uppercase tracking-widest font-medium">
            {editingId ? 'Edit Subtask' : 'New Subtask'}
          </p>

          {/* title */}
          <input value={form.title} onChange={e => sf('title', e.target.value)}
            placeholder="Subtask title…" autoFocus
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && saveSubtask()}
            className="w-full bg-agency-bg border border-agency-border text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-agency-accent/60 placeholder-gray-700 transition-colors" />

          {/* row: assignee + hours + priority */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-600 uppercase tracking-wide">Assignee</label>
              <select value={form.assignee} onChange={e => sf('assignee', e.target.value)}
                className="bg-agency-bg border border-agency-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-agency-accent/50 transition-colors">
                <option value="">Unassigned</option>
                {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-600 uppercase tracking-wide">Hours</label>
              <input type="number" min="0" step="0.5" placeholder="e.g. 2"
                value={form.estimated_hours} onChange={e => sf('estimated_hours', e.target.value)}
                className="bg-agency-bg border border-agency-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-agency-accent/50 transition-colors" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-600 uppercase tracking-wide">Priority</label>
              <select value={form.priority} onChange={e => sf('priority', e.target.value)}
                className="bg-agency-bg border border-agency-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-agency-accent/50 transition-colors">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* status (only when editing) */}
          {editingId && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-600 uppercase tracking-wide">Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => sf('status', s)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all"
                    style={form.status === s
                      ? { backgroundColor: STATUS_CFG[s]?.color, borderColor: STATUS_CFG[s]?.color, color: '#fff' }
                      : { backgroundColor: 'transparent', borderColor: '#2a2d3a', color: '#6b7280' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* inherited context — read only */}
          {(task.epic || task.sprint_id) && (
            <div className="flex items-center gap-2 text-[10px] text-gray-600 pt-1 border-t border-agency-border/40">
              <span>Inherits from parent:</span>
              {task.epic && <span className="text-gray-500 bg-agency-border/30 px-1.5 py-0.5 rounded">📁 {task.epic}</span>}
              {task.sprint_id && <span className="text-gray-500 bg-agency-border/30 px-1.5 py-0.5 rounded">🏃 Sprint</span>}
            </div>
          )}

          {/* actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={saveSubtask} disabled={saving || !form.title.trim()}
              className="flex-1 py-1.5 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              {saving ? 'Saving…' : editingId ? 'Update Subtask' : 'Add Subtask'}
            </button>
            <button onClick={() => { setAdding(false); setEditingId(null); setForm(blank) }}
              className="px-4 py-1.5 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-xs rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {subtasks.length === 0 && !isFormOpen && (
        <p className="text-[11px] text-gray-700 italic">No subtasks yet — break this task down</p>
      )}
    </div>
  )
}


function TaskDrawer({ task, allTasks, team, sprints, onClose, onEdit, onRefresh }) {
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])
  const [posting, setPosting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const scfg = STATUS_CFG[task.status] || STATUS_CFG['To Do']
  const d    = dl(task.due_date)

  useEffect(() => { loadComments() }, [task.id])

  async function loadComments() {
    const { data } = await supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at')
    setComments(data || [])
  }

  async function postComment() {
    if (!comment.trim()) return
    setPosting(true)
    await supabase.from('task_comments').insert({ task_id: task.id, project_id: PROJECT_ID, content: comment.trim(), author: 'PM' })
    setComment('')
    await loadComments()
    setPosting(false)
  }

  async function updateStatus(newStatus) {
    setUpdatingStatus(true)
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setUpdatingStatus(false)
    onRefresh()
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-agency-border bg-[#0f1117] flex flex-col min-h-0 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-agency-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <PriorityDot priority={task.priority} />
          <span className="text-xs font-semibold text-white truncate max-w-[180px]">{task.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-gray-600 hover:text-white text-xs px-2 py-1 rounded transition-colors">✎ Edit</button>
          <button onClick={onClose} className="text-gray-600 hover:text-white w-6 h-6 flex items-center justify-center rounded transition-colors">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* status changer */}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={updatingStatus}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${task.status === s ? 'text-white border-transparent' : 'text-gray-500 border-agency-border hover:text-white hover:border-gray-500'}`}
                style={task.status === s ? { backgroundColor: STATUS_CFG[s]?.color, borderColor: STATUS_CFG[s]?.color } : {}}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* details */}
        <div className="space-y-3">
          {[
            { label: 'Assignee',  value: task.assignee || 'Unassigned' },
            { label: 'Priority',  value: task.priority || '—' },
            { label: 'Epic',      value: task.epic || '—' },
            { label: 'Est. Hours',value: task.estimated_hours ? `${task.estimated_hours}h` : '—' },
            { label: 'Due Date',  value: task.due_date ? fdateFull(task.due_date) : '—', warn: d !== null && d < 0 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">{item.label}</span>
              <span className={`text-[11px] font-medium ${item.warn ? 'text-red-400' : 'text-gray-300'}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* subtasks */}
        <SubtasksPanel task={task} allTasks={allTasks} team={team} onRefresh={onRefresh} />

        {/* description */}
        {task.description && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Description</p>
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* comments */}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Comments ({comments.length})</p>
          {comments.length === 0 && <p className="text-[11px] text-gray-700">No comments yet</p>}
          <div className="space-y-2.5">
            {comments.map(c => (
              <div key={c.id} className="bg-agency-bg border border-agency-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-white">{c.author}</span>
                  <span className="text-[10px] text-gray-600">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* comment input */}
      <div className="p-3 border-t border-agency-border flex-shrink-0">
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Add a comment…" rows={2}
          className="w-full bg-agency-bg border border-agency-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-agency-accent/50 placeholder-gray-700 resize-none transition-colors mb-2" />
        <button onClick={postComment} disabled={posting || !comment.trim()}
          className="w-full py-1.5 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
          {posting ? 'Posting…' : 'Post Comment'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER VIEW — personal daily board
// ══════════════════════════════════════════════════════════════════════════════
function MemberView({ member, tasks, onRefresh, onSwitchMember }) {
  const myTasks    = tasks.filter(t => t.assignee === member.name)
  const [expanded, setExpanded] = useState({})
  const [comment, setComment]   = useState({})
  const [posting, setPosting]   = useState({})
  const [comments, setComments] = useState({})
  const [updating, setUpdating] = useState({})

  // bucket tasks
  const doToday  = myTasks.filter(t => {
    const d = dl(t.due_date)
    return t.status !== 'Done' && (
      t.status === 'In Progress' || t.status === 'Blocked' ||
      (d !== null && d <= 1) ||
      t.priority === 'Critical'
    )
  })
  const upNext   = myTasks.filter(t => t.status === 'To Do' && !doToday.includes(t))
  const inReview = myTasks.filter(t => t.status === 'Review')
  const done     = myTasks.filter(t => t.status === 'Done')

  async function toggleExpand(id) {
    const isOpen = expanded[id]
    setExpanded(e => ({ ...e, [id]: !isOpen }))
    if (!isOpen && !comments[id]) {
      const { data } = await supabase.from('task_comments').select('*').eq('task_id', id).order('created_at')
      setComments(c => ({ ...c, [id]: data || [] }))
    }
  }

  async function updateStatus(task, newStatus) {
    setUpdating(u => ({ ...u, [task.id]: true }))
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setUpdating(u => ({ ...u, [task.id]: false }))
    onRefresh()
  }

  async function postComment(taskId, author) {
    const text = comment[taskId]?.trim()
    if (!text) return
    setPosting(p => ({ ...p, [taskId]: true }))
    await supabase.from('task_comments').insert({ task_id: taskId, project_id: PROJECT_ID, content: text, author })
    const { data } = await supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at')
    setComments(c => ({ ...c, [taskId]: data || [] }))
    setComment(c => ({ ...c, [taskId]: '' }))
    setPosting(p => ({ ...p, [taskId]: false }))
  }

  const sections = [
    { key: 'today',  label: '🔥 Do Today',  tasks: doToday,  accent: '#ef4444', desc: 'In progress, blocked, critical or due soon' },
    { key: 'next',   label: '📋 Up Next',   tasks: upNext,   accent: '#3b82f6', desc: 'Assigned and waiting to be started' },
    { key: 'review', label: '👀 In Review', tasks: inReview, accent: '#8b5cf6', desc: 'Waiting for review or approval' },
    { key: 'done',   label: '✅ Completed', tasks: done,     accent: '#22c55e', desc: 'Tasks you\'ve finished' },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* personal header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-agency-border bg-agency-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
              style={{ backgroundColor: ac(member.name) }}>
              {ini(member.name)}
            </div>
            <div>
              <p className="text-[11px] text-gray-500">{greet()},</p>
              <h2 className="text-lg font-bold text-white leading-tight">{member.name}</h2>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          </div>

          {/* daily stats */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Do Today', count: doToday.length,  color: '#ef4444' },
              { label: 'Up Next',  count: upNext.length,   color: '#3b82f6' },
              { label: 'Review',   count: inReview.length, color: '#8b5cf6' },
              { label: 'Done',     count: done.length,     color: '#22c55e' },
            ].map(s => (
              <div key={s.label} className="bg-agency-bg border border-agency-border rounded-xl px-4 py-2.5 text-center min-w-[72px]">
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
            <button onClick={onSwitchMember}
              className="ml-2 text-xs text-gray-500 hover:text-white border border-agency-border hover:border-agency-accent/40 px-3 py-2 rounded-xl transition-all">
              Switch →
            </button>
          </div>
        </div>
      </div>

      {/* task sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {myTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-white font-semibold">No tasks assigned yet</p>
            <p className="text-gray-500 text-sm mt-1">Check back once your PM has allocated tasks</p>
          </div>
        ) : (
          sections.map(sec => sec.tasks.length > 0 && (
            <div key={sec.key}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-agency-border" />
                <span className="text-xs font-semibold text-white px-3 py-1 rounded-full border border-agency-border bg-agency-card">
                  {sec.label} · {sec.tasks.length}
                </span>
                <div className="h-px flex-1 bg-agency-border" />
              </div>
              <p className="text-[11px] text-gray-600 mb-3 text-center">{sec.desc}</p>

              <div className="space-y-2">
                {sec.tasks.map(t => (
                  <MemberTaskCard
                    key={t.id} task={t} expanded={!!expanded[t.id]}
                    comments={comments[t.id] || []}
                    commentText={comment[t.id] || ''}
                    posting={!!posting[t.id]}
                    updating={!!updating[t.id]}
                    onToggle={() => toggleExpand(t.id)}
                    onStatusChange={newStatus => updateStatus(t, newStatus)}
                    onCommentChange={val => setComment(c => ({ ...c, [t.id]: val }))}
                    onPostComment={() => postComment(t.id, member.name)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Member task card (expandable) ────────────────────────────────────────────
function MemberTaskCard({ task, expanded, comments, commentText, posting, updating, onToggle, onStatusChange, onCommentChange, onPostComment }) {
  const scfg = STATUS_CFG[task.status] || STATUS_CFG['To Do']
  const pcfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG['Medium']
  const d    = dl(task.due_date)
  const isDone = task.status === 'Done'

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
      task.status === 'Blocked'     ? 'border-red-500/30 bg-red-500/5' :
      task.status === 'In Progress' ? 'border-blue-500/20 bg-blue-500/5' :
      isDone                        ? 'border-agency-border/40 bg-agency-card/30' :
      'border-agency-border bg-agency-card'
    }`}>
      {/* collapsed header — always visible */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <PriorityDot priority={task.priority} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>
            {task.title}
          </p>
          {task.epic && <p className="text-[10px] text-gray-600 mt-0.5">{task.epic}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {task.due_date && !isDone && (
            <span className={`text-[10px] font-medium ${d !== null && d < 0 ? 'text-red-400' : d !== null && d <= 3 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {d !== null ? (d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `Due in ${d}d`) : fdate(task.due_date)}
            </span>
          )}
          {task.estimated_hours && (
            <span className="text-[10px] text-gray-600">{task.estimated_hours}h</span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
            style={{ backgroundColor: scfg.light, color: scfg.color }}>
            {task.status}
          </span>
          <span className="text-gray-600 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* expanded content */}
      {expanded && (
        <div className="border-t border-agency-border/40 px-4 pb-4 pt-3 space-y-4">
          {/* description */}
          {task.description ? (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Description</p>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          ) : (
            <p className="text-[11px] text-gray-700 italic">No description provided</p>
          )}

          {/* status updater */}
          {!isDone && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Update Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.filter(s => s !== task.status).map(s => (
                  <button key={s} onClick={() => onStatusChange(s)} disabled={updating}
                    className="px-3 py-1.5 text-[11px] font-medium rounded-xl border border-agency-border text-gray-400 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50">
                    {updating ? '…' : `→ ${s}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* mark done shortcut */}
          {!isDone && (
            <button onClick={() => onStatusChange('Done')} disabled={updating}
              className="w-full py-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/15 text-xs font-semibold rounded-xl transition-all">
              {updating ? '…' : '✓ Mark as Done'}
            </button>
          )}

          {/* comments */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Comments ({comments.length})</p>
            {comments.length > 0 && (
              <div className="space-y-2 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-agency-bg rounded-xl p-3 border border-agency-border">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] font-medium text-white">{c.author}</span>
                      <span className="text-[10px] text-gray-600">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={commentText} onChange={e => onCommentChange(e.target.value)}
                placeholder="Add a comment or update…"
                className="flex-1 bg-agency-bg border border-agency-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-agency-accent/50 placeholder-gray-700 transition-colors"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onPostComment()} />
              <button onClick={onPostComment} disabled={posting || !commentText.trim()}
                className="px-3 py-2 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors">
                {posting ? '…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER PICKER SPLASH
// ══════════════════════════════════════════════════════════════════════════════
function MemberPicker({ team, tasks, onPickMember, onPickPM }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-agency-bg p-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <p className="text-gray-500 text-sm mb-1">{greet()}</p>
          <h1 className="text-2xl font-bold text-white mb-2">Work Board</h1>
          <p className="text-gray-500 text-sm">Who's viewing? Select your role to get started.</p>
        </div>

        {/* PM entry */}
        <button onClick={onPickPM}
          className="w-full mb-4 bg-agency-accent/10 border border-agency-accent/30 hover:border-agency-accent hover:bg-agency-accent/15 rounded-2xl p-5 text-left transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-agency-accent/20 flex items-center justify-center text-xl flex-shrink-0">📋</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white group-hover:text-agency-accent transition-colors">Project Manager View</p>
              <p className="text-xs text-gray-500 mt-0.5">Allocate tasks, manage sprints, track the full team — your command centre</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-agency-bg border border-agency-border px-2 py-1 rounded-lg">{tasks.length} tasks</span>
              <span className="text-gray-600">→</span>
            </div>
          </div>
        </button>

        {/* divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-agency-border" />
          <span className="text-xs text-gray-600">or choose your name</span>
          <div className="h-px flex-1 bg-agency-border" />
        </div>

        {/* team member cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {team.map(m => {
            const myTasks    = tasks.filter(t => t.assignee === m.name)
            const urgent     = myTasks.filter(t => t.status !== 'Done' && (t.status === 'Blocked' || t.priority === 'Critical' || (dl(t.due_date) !== null && dl(t.due_date) <= 1))).length
            const inProgress = myTasks.filter(t => t.status === 'In Progress').length
            const done       = myTasks.filter(t => t.status === 'Done').length
            const total      = myTasks.length

            return (
              <button key={m.id} onClick={() => onPickMember(m)}
                className="group bg-agency-card border border-agency-border hover:border-agency-accent/40 rounded-2xl p-4 text-left transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: ac(m.name) }}>{ini(m.name)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-agency-accent transition-colors">{m.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{m.role}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">{total} tasks · {done} done</span>
                  {urgent > 0 && (
                    <span className="flex items-center gap-1 text-red-400 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {urgent} urgent
                    </span>
                  )}
                  {inProgress > 0 && urgent === 0 && (
                    <span className="text-blue-400">{inProgress} active</span>
                  )}
                </div>

                {/* mini task bar */}
                {total > 0 && (
                  <div className="mt-2 h-1 bg-agency-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.round((done/total)*100)}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function WorkBoard() {
  const [tasks, setTasks]       = useState([])
  const [team, setTeam]         = useState([])
  const [sprints, setSprints]   = useState([])
  const [milestones, setMilestones] = useState([])
  const [epics, setEpics]       = useState([])
  const [loading, setLoading]   = useState(true)

  // view: null = splash | '__pm__' = PM | member object = member
  const [view, setView] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [tRes, tmRes, sRes, mRes, eRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', PROJECT_ID).order('id').order('parent_task_id', { nullsFirst: true }),
      supabase.from('team_members').select('*').eq('project_id', PROJECT_ID).order('name'),
      supabase.from('sprints').select('*').eq('project_id', PROJECT_ID).order('start_date'),
      supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('due_date'),
      supabase.from('epics').select('*').eq('project_id', PROJECT_ID).order('id'),
    ])
    setTasks(tRes.data || [])
    setTeam(tmRes.data || [])
    setSprints(sRes.data || [])
    setMilestones(mRes.data || [])
    setEpics(eRes.data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── splash ──
  if (view === null) {
    return <MemberPicker team={team} tasks={tasks} onPickMember={m => setView(m)} onPickPM={() => setView('__pm__')} />
  }

  // ── shared top bar ──
  return (
    <div className="h-full flex flex-col bg-agency-bg overflow-hidden">
      {/* top nav */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-agency-border flex-shrink-0 bg-agency-card">
        <button onClick={() => setView(null)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
          ← Work Board
        </button>
        <span className="w-px h-4 bg-agency-border" />

        {view === '__pm__' ? (
          <span className="text-xs font-semibold text-white flex items-center gap-2">
            📋 Project Manager View
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: ac(view.name) }}>{ini(view.name)}</div>
            <span className="text-xs font-semibold text-white">{view.name}</span>
            <span className="text-[10px] text-gray-500">— My Tasks</span>
          </div>
        )}

        <div className="flex-1" />

        {/* quick member switcher */}
        <div className="flex items-center gap-1">
          <button onClick={() => setView('__pm__')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${view === '__pm__' ? 'bg-agency-accent text-white border-agency-accent' : 'text-gray-500 border-agency-border hover:text-white'}`}>
            PM
          </button>
          {team.slice(0, 6).map(m => (
            <button key={m.id} onClick={() => setView(m)} title={m.name}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white transition-all border ${view?.id === m.id ? 'scale-110 border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: ac(m.name) }}>
              {ini(m.name)}
            </button>
          ))}
        </div>
      </div>

      {/* view content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === '__pm__' ? (
          <PMView tasks={tasks} team={team} sprints={sprints} milestones={milestones} epics={epics} onRefresh={fetchAll} />
        ) : (
          <MemberView member={view} tasks={tasks} onRefresh={fetchAll} onSwitchMember={() => setView(null)} />
        )}
      </div>
    </div>
  )
}