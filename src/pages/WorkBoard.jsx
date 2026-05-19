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

function PriorityDot({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG['Medium']
  return <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]" style={{ color: cfg.color, backgroundColor: cfg.color }} title={priority} />
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-[#0f1117] border border-agency-border rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4 animate-[slideUp_0.3s_ease]">
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
          <button onClick={handleSave} disabled={saving || !hours} className="flex-1 bg-agency-accent hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
            {saving ? 'Logging...' : 'Log Time'}
          </button>
          <button onClick={onClose} className="px-5 bg-agency-bg border border-agency-border text-gray-400 hover:text-white text-xs font-bold py-2.5 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Card (Compact Board View) ───────────────────────────────────────────
function MemberTaskCard({ task, onOpen }) {
  const scfg = STATUS_CFG[task.status] || STATUS_CFG['To Do']
  const d    = dl(task.due_date)
  const isDone = task.status === 'Done'

  return (
    <div onClick={onOpen} className={`border rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 ${
      task.status === 'Blocked'     ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50' :
      task.status === 'In Progress' ? 'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/50' :
      isDone                        ? 'border-agency-border/40 bg-agency-card/30' :
      'border-agency-border bg-agency-card hover:border-agency-accent/50 hover:bg-agency-bg/50'
    }`}>
      <div className="w-full flex flex-col gap-2 p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <PriorityDot priority={task.priority} />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: scfg.light, color: scfg.color }}>
            {task.status}
          </span>
        </div>

        <div className="min-w-0 mt-1">
          <p className={`text-sm font-bold leading-snug line-clamp-2 ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>
            {task.title}
          </p>
          <p className="text-[10px] text-gray-500 mt-1 truncate">{task.projectName} {task.epic && `· ${task.epic}`}</p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-agency-border/50">
          {task.due_date && !isDone ? (
            <span className={`text-[10px] font-bold ${d !== null && d < 0 ? 'text-red-400' : d !== null && d <= 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {d !== null ? (d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `Due in ${d}d`) : fdate(task.due_date)}
            </span>
          ) : <span className="text-[10px] text-gray-600 font-medium italic">{isDone ? 'Completed' : 'No date'}</span>}
          {task.estimated_hours && (
            <span className="text-[10px] text-gray-400 font-bold bg-agency-bg border border-agency-border px-1.5 py-0.5 rounded">{task.estimated_hours}h</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Task Detail Modal (Expanded View) ────────────────────────────────────────
function TaskDetailModal({ task, comments, onUpdateStatus, onPostComment, onLogTime, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [commentText, setCommentText] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [commentPosting, setCommentPosting] = useState(false)
  const isDone = task.status === 'Done'

  async function handleStatus(s) {
    setStatusUpdating(true)
    await onUpdateStatus(task.id, s)
    setStatusUpdating(false)
  }

  async function handleComment() {
    if (!commentText.trim()) return
    setCommentPosting(true)
    await onPostComment(task.id, commentText)
    setCommentText('')
    setCommentPosting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-agency-card border border-agency-border rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-agency-border flex justify-between items-start gap-4 bg-agency-bg/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <PriorityDot priority={task.priority} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{task.projectName}</span>
              {task.epic && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 py-0.5 bg-agency-border/30 rounded">EPIC: {task.epic}</span>}
            </div>
            <h2 className={`text-xl font-extrabold leading-tight ${isDone ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-agency-border/50 text-gray-400 hover:text-white hover:bg-agency-border transition-all flex-shrink-0">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-agency-border px-6 bg-agency-bg/50 gap-8 overflow-x-auto">
          {['overview', 'status', 'comments', 'log time', 'issues'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`py-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === t ? 'border-agency-accent text-agency-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t} {t === 'comments' && `(${comments.length})`}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0f1117]">
          
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Description</h3>
                <div className="bg-agency-bg border border-agency-border rounded-xl p-5 min-h-[120px]">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description || <span className="italic text-gray-600">No description provided. Please update the task to add acceptance criteria.</span>}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-agency-bg border border-agency-border rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Due Date</p>
                  <p className="text-sm font-bold text-white">{fdate(task.due_date)}</p>
                </div>
                <div className="bg-agency-bg border border-agency-border rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Est. Time</p>
                  <p className="text-sm font-bold text-white">{task.estimated_hours ? `${task.estimated_hours} h` : 'Not set'}</p>
                </div>
                <div className="bg-agency-bg border border-agency-border rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Priority</p>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5"><PriorityDot priority={task.priority} /> {task.priority}</p>
                </div>
                <div className="bg-agency-bg border border-agency-border rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Status</p>
                  <p className="text-sm font-bold text-white">{task.status}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="max-w-md mx-auto">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Update Task Status</h3>
              <div className="flex flex-col gap-3">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => handleStatus(s)} disabled={statusUpdating || task.status === s}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      task.status === s ? 'bg-agency-accent/10 border-agency-accent text-agency-accent cursor-default shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 
                      'bg-agency-bg border-agency-border text-gray-400 hover:border-agency-accent hover:text-white'
                    }`}>
                    <span className="font-bold">{s}</span>
                    {task.status === s && <span className="text-xs font-bold uppercase tracking-widest">Current</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4 mb-6">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm font-bold text-gray-400">No comments yet</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="bg-agency-bg rounded-xl p-4 border border-agency-border">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px]" style={{ backgroundColor: ac(c.author) }}>{ini(c.author)}</div>
                          {c.author}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-agency-border/50">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Type an update or comment..."
                  className="flex-1 bg-agency-bg border border-agency-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-agency-accent transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleComment()} />
                <button onClick={handleComment} disabled={commentPosting || !commentText.trim()}
                  className="px-6 py-3 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  Post
                </button>
              </div>
            </div>
          )}

          {activeTab === 'log time' && (
            <div className="max-w-md mx-auto text-center py-6">
               <div className="mb-6 opacity-80">
                 <p className="text-5xl mb-4">⏱</p>
                 <h3 className="text-sm font-bold text-white mb-2">Log Hours for this Task</h3>
                 <p className="text-xs text-gray-400">Quickly add time against this task to update your timesheet and project burn.</p>
               </div>
               <button onClick={onLogTime} className="w-full py-4 bg-agency-accent/10 border-2 border-agency-accent rounded-xl text-agency-accent font-bold hover:bg-agency-accent hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                 Open Time Logger
               </button>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="max-w-md mx-auto text-center py-6">
               <div className="mb-6 opacity-80">
                 <p className="text-5xl mb-4">🚨</p>
                 <h3 className="text-sm font-bold text-red-400 mb-2">Raise an Open Point</h3>
                 <p className="text-xs text-gray-400">Is this task blocked or requires project manager attention? Discuss it in the project's open points.</p>
               </div>
               <button onClick={() => alert("Please coordinate with your Project Manager or log it in the Admin Project Setup screen.")} className="w-full py-4 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all">
                 Acknowledge & Escalate
               </button>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
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
  const [activeTask, setActiveTask] = useState(null) // Controls the detail modal
  
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
    setActiveTask(null)
    setMood('')
  }

  async function handleStatus(taskId, newStatus) {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (error) {
      alert(error.message)
    } else {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
      if (activeTask && activeTask.id === taskId) {
        setActiveTask({ ...activeTask, status: newStatus })
      }
    }
  }

  async function handlePostComment(taskId, commentText) {
    const obj = { task_id: taskId, author: selectedMember.name, content: commentText }
    const { data, error } = await supabase.from('comments').insert([obj]).select()
    if (error) alert(error.message)
    else setComments([...comments, data[0]])
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
                className="bg-agency-card border border-agency-border hover:border-agency-accent/50 rounded-xl p-4 flex items-center gap-3 transition-all group shadow-sm hover:shadow-md">
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
    <div className="h-full flex flex-col bg-agency-bg overflow-hidden relative">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterProject === 'all' ? 'bg-agency-accent border-agency-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-agency-card border-agency-border text-gray-400 hover:text-white'}`}>
                All Projects
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setFilterProject(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterProject === p.id ? 'bg-agency-accent border-agency-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-agency-card border-agency-border text-gray-400 hover:text-white truncate max-w-[150px]'}`}>
                  {p.name}
                </button>
              ))}
            </div>
            
            <div className="mt-2">
               <input value={mood} onChange={e => setMood(e.target.value)}
                placeholder="What's the focus for today?"
                className="w-full max-w-md bg-agency-card border border-agency-border text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-agency-accent/50 transition-colors placeholder-gray-600 italic shadow-sm" />
            </div>
          </div>

          <div className="lg:w-80 flex-shrink-0 bg-agency-card border border-agency-border rounded-2xl p-4 flex gap-4 shadow-sm">
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
              <span className="text-xs font-bold text-gray-500 bg-agency-card border border-agency-border px-2 py-0.5 rounded-md">{doToday.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {doToday.map(t => <MemberTaskCard key={t.id} task={t} onOpen={() => setActiveTask(t)} />)}
              {doToday.length === 0 && <p className="text-xs text-gray-500 italic p-4 text-center border border-dashed border-agency-border rounded-xl">Nothing critical for today.</p>}
            </div>
          </div>

          {/* Column 2: Up Next */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#3b82f6]">📅</span> Up Next</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card border border-agency-border px-2 py-0.5 rounded-md">{upNext.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {upNext.map(t => <MemberTaskCard key={t.id} task={t} onOpen={() => setActiveTask(t)} />)}
            </div>
          </div>

          {/* Column 3: In Review */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#8b5cf6]">👀</span> In Review</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card border border-agency-border px-2 py-0.5 rounded-md">{inReview.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {inReview.map(t => <MemberTaskCard key={t.id} task={t} onOpen={() => setActiveTask(t)} />)}
            </div>
          </div>

          {/* Column 4: Done This Week */}
          <div className="flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between pb-2 border-b border-agency-border">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><span className="text-[#22c55e]">✓</span> Done</h3>
              <span className="text-xs font-bold text-gray-500 bg-agency-card border border-agency-border px-2 py-0.5 rounded-md">{doneTasks.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {doneTasks.map(t => <MemberTaskCard key={t.id} task={t} onOpen={() => setActiveTask(t)} />)}
            </div>
          </div>

        </div>
      </div>

      {activeTask && (
        <TaskDetailModal 
          task={activeTask} 
          comments={comments.filter(c => c.task_id === activeTask.id)}
          onUpdateStatus={handleStatus}
          onPostComment={handlePostComment}
          onLogTime={() => setTimeTask(activeTask)}
          onClose={() => setActiveTask(null)}
        />
      )}

      {timeTask && (
        <QuickLogModal 
          task={timeTask} 
          memberName={selectedMember.name} 
          onClose={() => setTimeTask(null)} 
          onLogged={() => { setTimeTask(null); fetchData() }} 
        />
      )}
    </div>
  )
}