import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
function today() { return new Date().toISOString().split('T')[0] }
function ac(n = '') {
  const c = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
  return c[Math.abs(h) % c.length]
}
function ini(n = '') { return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }
function fdate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
function dl(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }
function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Av({ name, size = 7 }) {
  return (
    <div className={`w-${size} h-${size} rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: ac(name) }} title={name}>{ini(name)}</div>
  )
}

function PriorityDot({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG['Medium']
  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} title={priority} />
}

// ─── Quick Log Time Modal ─────────────────────────────────────────────────────
function QuickLogModal({ task, memberName, onClose, onLogged }) {
  const [hours, setHours] = useState('')
  const [desc, setDesc] = useState(`Worked on ${task.title}`)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!hours) return
    setSaving(true)
    const { error } = await supabase.from('timesheets').insert([{
      project_id: task.project_id,
      team_member: memberName,
      log_date: today(),
      hours: Number(hours),
      description: desc,
      billable: true,
      task_type: 'Development'
    }])
    setSaving(false)
    if (error) alert('Failed to log time: ' + error.message)
    else onLogged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1117] border border-agency-border rounded-2xl w-full max-w-sm shadow-2xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Log Time</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.title}</p>
        </div>
        
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Hours</label>
          <input type="number" step="0.25" min="0" value={hours} onChange={e => setHours(e.target.value)}
            className="w-full bg-agency-bg border border-agency-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-agency-accent" placeholder="e.g. 2.5" />
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full bg-agency-bg border border-agency-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-agency-accent resize-y min-h-[60px]" />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving || !hours} className="flex-1 bg-agency-accent hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors">
            {saving ? 'Logging...' : 'Log Time'}
          </button>
          <button onClick={onClose} className="px-4 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-xs font-bold py-2 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function MemberTaskCard({ task, expanded, comments, commentText, posting, updating, onToggle, onStatusChange, onCommentChange, onPostComment, onLogTime }) {
  const scfg = STATUS_CFG[task.status] || STATUS_CFG['To Do']
  const d    = dl(task.due_date)
  const isDone = task.status === 'Done'

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
      task.status === 'Blocked'     ? 'border-red-500/30 bg-red-500/5' :
      task.status === 'In Progress' ? 'border-blue-500/20 bg-blue-500/5' :
      isDone                        ? 'border-agency-border/40 bg-agency-card/30' :
      'border-agency-border bg-agency-card'
    }`}>
      {/* collapsed header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors">
        <PriorityDot priority={task.priority} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>
            {task.title}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{task.projectName} {task.epic && `· ${task.epic}`}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {task.due_date && !isDone && (
            <span className={`text-[10px] font-medium ${d !== null && d < 0 ? 'text-red-400' : d !== null && d <= 3 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {d !== null ? (d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `Due in ${d}d`) : fdate(task.due_date)}
            </span>
          )}
          {task.estimated_hours && (
            <span className="text-[10px] text-gray-600 font-bold">{task.estimated_hours}h</span>
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
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-1">Description</p>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{task.description || <span className="italic">No description</span>}</p>
            </div>
            <button onClick={onLogTime} className="flex-shrink-0 px-3 py-1.5 bg-agency-bg border border-agency-border hover:border-agency-accent/50 text-xs text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm">
              <span className="text-agency-accent">⏱</span> Log Time
            </button>
          </div>

          {!isDone && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Update Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.filter(s => s !== task.status).map(s => (
                  <button key={s} onClick={() => onStatusChange(s)} disabled={updating}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-agency-border text-gray-400 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50">
                    {updating ? '…' : `→ ${s}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Comments ({comments.length})</p>
            {comments.length > 0 && (
              <div className="space-y-2 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-agency-bg rounded-xl p-3 border border-agency-border">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] font-bold text-white">{c.author}</span>
                      <span className="text-[10px] text-gray-500">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={commentText} onChange={e => onCommentChange(e.target.value)}
                placeholder="Write an update…"
                className="flex-1 bg-agency-bg border border-agency-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-agency-accent/50 transition-colors"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onPostComment()} />
              <button onClick={onPostComment} disabled={posting || !commentText.trim()}
                className="px-3 py-2 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors">
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
// ROOT WORKBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function WorkBoard() {
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  const [filterProject, setFilterProject] = useState('all')
  const [expandedTask, setExpandedTask] = useState(null)
  
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(null)
  
  const [mood, setMood] = useState('')
  const [timeTask, setTimeTask] = useState(null)

  // 1. Fetch all team members on mount
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('team_members').select('*')
      // deduplicate by name
      const unique = []
      const names = new Set()
      if (data) {
        data.forEach(m => {
          if (!names.has(m.name)) {
            names.add(m.name)
            unique.push(m)
          }
        })
      }
      setTeamMembers(unique.sort((a,b) => a.name.localeCompare(b.name)))
      
      // Auto-select based on localStorage
      const saved = localStorage.getItem('agency_workboard_member')
      if (saved) {
        const found = unique.find(u => u.name === saved)
        if (found) setSelectedMember(found)
      }
      setLoading(false)
    }
    init()
  }, [])

  // 2. Fetch tasks & project data when member changes
  useEffect(() => {
    if (!selectedMember) return
    fetchData()
  }, [selectedMember])

  async function fetchData() {
    setLoading(true)
    const [tRes, pRes, tsRes, cRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('assignee', selectedMember.name), // Note: using assignee based on existing DB
      supabase.from('projects').select('id, name'),
      supabase.from('timesheets').select('*').eq('team_member', selectedMember.name).eq('log_date', today()),
      supabase.from('comments').select('*').order('created_at', { ascending: true })
    ])
    
    // Map project names to tasks
    const pMap = {}
    if (pRes.data) pRes.data.forEach(p => pMap[p.id] = p.name)
    const enrichedTasks = (tRes.data || []).map(t => ({ ...t, projectName: pMap[t.project_id] || 'Unknown Project' }))
    
    setTasks(enrichedTasks)
    setProjects(pRes.data || [])
    setTimesheets(tsRes.data || [])
    setComments(cRes.data || [])
    setLoading(false)
  }

  function handleSelectMember(m) {
    setSelectedMember(m)
    localStorage.setItem('agency_workboard_member', m.name)
    setFilterProject('all')
    setExpandedTask(null)
    setMood('')
  }

  async function handleStatus(taskId, newStatus) {
    setUpdatingTask(taskId)
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setUpdatingTask(null)
    if (error) alert(error.message)
    else {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
      if (newStatus === 'Done') setExpandedTask(null)
    }
  }

  async function handlePostComment(taskId) {
    if (!commentText.trim()) return
    setPostingComment(true)
    const obj = { task_id: taskId, author: selectedMember.name, content: commentText.trim() }
    const { data, error } = await supabase.from('comments').insert([obj]).select()
    setPostingComment(false)
    if (error) alert(error.message)
    else {
      setCommentText('')
      setComments([...comments, data[0]])
    }
  }

  if (!selectedMember) {
    return (
      <div className="h-full bg-agency-bg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <p className="text-gray-500 text-sm mb-1 font-bold tracking-widest uppercase">{greet()}</p>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Work Board</h1>
          <p className="text-gray-500">Who's viewing? Select your name to see your tasks.</p>
        </div>
        {loading ? (
          <div className="w-6 h-6 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl w-full">
            {teamMembers.map(m => (
              <button key={m.id || m.name} onClick={() => handleSelectMember(m)}
                className="bg-agency-card border border-agency-border hover:border-agency-accent/50 rounded-xl p-4 flex items-center gap-3 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0" style={{ backgroundColor: ac(m.name) }}>{ini(m.name)}</div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-white truncate group-hover:text-agency-accent transition-colors">{m.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold truncate">{m.role || 'Member'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Filter Tasks
  const filteredTasks = filterProject === 'all' ? tasks : tasks.filter(t => t.project_id === filterProject)
  
  // Categorise Tasks
  const now = new Date()
  const todayStr = today()
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().slice(0, 10)

  const doToday = filteredTasks.filter(t => (t.due_date && t.due_date <= todayStr) && ['To Do', 'In Progress'].includes(t.status))
  const upNext  = filteredTasks.filter(t => (!t.due_date || t.due_date > todayStr) && t.status === 'To Do').sort((a,b) => new Date(a.due_date||'9999-12-31') - new Date(b.due_date||'9999-12-31'))
  const inReview = filteredTasks.filter(t => t.status === 'Review')
  const doneTasks = filteredTasks.filter(t => t.status === 'Done' && t.updated_at >= weekStart)

  // My Day Summary Data
  const hrsToday = timesheets.reduce((s, e) => s + (e.hours || 0), 0)
  const doneToday = tasks.filter(t => t.status === 'Done' && t.updated_at >= todayStr).length
  const leftToday = doToday.length

  return (
    <div className="h-full flex flex-col bg-agency-bg overflow-hidden">
      {/* ── Topbar ── */}
      <div className="px-6 py-4 border-b border-agency-border bg-agency-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <select value={selectedMember.name} onChange={e => handleSelectMember(teamMembers.find(m => m.name === e.target.value))}
            className="bg-transparent text-white text-lg font-extrabold focus:outline-none cursor-pointer appearance-none">
            {teamMembers.map(m => <option key={m.name} value={m.name} className="bg-agency-bg text-sm">{m.name}</option>)}
          </select>
          <span className="text-gray-600 text-lg">/</span>
          <p className="text-sm font-bold text-gray-400">Execution Board</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="w-4 h-4 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />}
          <button onClick={() => fetchData()} className="text-xs font-bold text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-agency-border transition-all">Refresh</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* ── Filters & Summary Row ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter Project</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterProject('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterProject === 'all' ? 'bg-agency-accent border-agency-accent text-white' : 'bg-agency-card border-agency-border text-gray-400 hover:text-white'}`}>
                All Projects
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setFilterProject(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterProject === p.id ? 'bg-agency-accent border-agency-accent text-white' : 'bg-agency-card border-agency-border text-gray-400 hover:text-white truncate max-w-[150px]'}`}>
                  {p.name}
                </button>
              ))}
            </div>
            
            <div className="mt-2">
               <input value={mood} onChange={e => setMood(e.target.value)}
                placeholder="What's the focus for today?"
                className="w-full max-w-md bg-agency-bg border border-agency-border text-white text-xs rounded-xl px-4 py-2 focus:outline-none focus:border-agency-accent/50 transition-colors placeholder-gray-600 italic" />
            </div>
          </div>

          <div className="lg:w-80 flex-shrink-0 bg-agency-card border border-agency-border rounded-2xl p-4 flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-3xl font-extrabold text-[#8b5cf6]">{hrsToday}h</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Logged Today</p>
            </div>
            <div className="w-px bg-agency-border" />
            <div className="flex-1 text-center">
              <p className="text-3xl font-extrabold text-[#22c55e]">{doneToday}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Tasks Done</p>
            </div>
            <div className="w-px bg-agency-border" />
            <div className="flex-1 text-center">
              <p className="text-3xl font-extrabold text-[#f59e0b]">{leftToday}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Remaining</p>
            </div>
          </div>
        </div>

        {/* ── Task Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-start min-h-0">
          
          {/* Column 1: Do Today */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#f59e0b]">🔥</span> Do Today</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card px-2 py-0.5 rounded-md">{doToday.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {doToday.map(t => (
                <MemberTaskCard key={t.id} task={t} 
                  expanded={expandedTask === t.id} onToggle={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                  comments={comments.filter(c => c.task_id === t.id)} commentText={expandedTask === t.id ? commentText : ''}
                  onCommentChange={setCommentText} onPostComment={() => handlePostComment(t.id)} posting={postingComment}
                  updating={updatingTask === t.id} onStatusChange={s => handleStatus(t.id, s)}
                  onLogTime={(e) => { e.stopPropagation(); setTimeTask(t) }}
                />
              ))}
              {doToday.length === 0 && <p className="text-xs text-gray-500 italic p-4 text-center border border-dashed border-agency-border rounded-xl">Nothing critical for today.</p>}
            </div>
          </div>

          {/* Column 2: Up Next */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#3b82f6]">📅</span> Up Next</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card px-2 py-0.5 rounded-md">{upNext.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {upNext.map(t => (
                <MemberTaskCard key={t.id} task={t} 
                  expanded={expandedTask === t.id} onToggle={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                  comments={comments.filter(c => c.task_id === t.id)} commentText={expandedTask === t.id ? commentText : ''}
                  onCommentChange={setCommentText} onPostComment={() => handlePostComment(t.id)} posting={postingComment}
                  updating={updatingTask === t.id} onStatusChange={s => handleStatus(t.id, s)}
                  onLogTime={(e) => { e.stopPropagation(); setTimeTask(t) }}
                />
              ))}
            </div>
          </div>

          {/* Column 3: In Review */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#8b5cf6]">👀</span> In Review</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card px-2 py-0.5 rounded-md">{inReview.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {inReview.map(t => (
                <MemberTaskCard key={t.id} task={t} 
                  expanded={expandedTask === t.id} onToggle={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                  comments={comments.filter(c => c.task_id === t.id)} commentText={expandedTask === t.id ? commentText : ''}
                  onCommentChange={setCommentText} onPostComment={() => handlePostComment(t.id)} posting={postingComment}
                  updating={updatingTask === t.id} onStatusChange={s => handleStatus(t.id, s)}
                  onLogTime={(e) => { e.stopPropagation(); setTimeTask(t) }}
                />
              ))}
            </div>
          </div>

          {/* Column 4: Done This Week */}
          <div className="flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#22c55e]">✓</span> Done (This Week)</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card px-2 py-0.5 rounded-md">{doneTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {doneTasks.map(t => (
                <MemberTaskCard key={t.id} task={t} 
                  expanded={expandedTask === t.id} onToggle={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                  comments={comments.filter(c => c.task_id === t.id)} commentText={expandedTask === t.id ? commentText : ''}
                  onCommentChange={setCommentText} onPostComment={() => handlePostComment(t.id)} posting={postingComment}
                  updating={updatingTask === t.id} onStatusChange={s => handleStatus(t.id, s)}
                  onLogTime={(e) => { e.stopPropagation(); setTimeTask(t) }}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {timeTask && <QuickLogModal task={timeTask} memberName={selectedMember.name} onClose={() => setTimeTask(null)} onLogged={() => { setTimeTask(null); fetchData() }} />}
    </div>
  )
}