import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatHours(h) {
  if (!h && h !== 0) return '—'
  const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}
function daysLeft(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
function ac(n = '') {
  const c = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
  return c[Math.abs(h) % c.length]
}
function ini(n = '') { return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }

function Bar({ pct, color, h = 6 }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 120); return () => clearTimeout(t) }, [])
  return (
    <div style={{ height: h, backgroundColor: '#1f2937', borderRadius: h, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: h,
        width: ready ? `${Math.min(pct, 100)}%` : '0%',
        backgroundColor: color,
        boxShadow: `0 0 10px ${color}50`,
        transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)'
      }} />
    </div>
  )
}

function VerticalBarChart({ data }) {
  const max = Math.max(...data.map(d => Math.max(d.val1, d.val2, 1)))
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 150); return () => clearTimeout(t) }, [])
  
  return (
    <div className="flex items-end h-48 gap-6 mt-4 px-4 border-b border-agency-border/50 pb-2">
       {data.map((d, i) => (
         <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
           <div className="flex-1 flex items-end justify-center gap-3 w-full h-full">
             {/* Bar 1 */}
             <div className="w-1/3 max-w-[32px] bg-blue-500 rounded-t-md relative group-hover:bg-blue-400 transition-all flex justify-center" 
                  style={{ height: ready ? `${(d.val1 / max) * 100}%` : '0%', transitionDuration: '1s', boxShadow: '0 0 10px rgba(59,130,246,0.3)' }}>
               <div className="absolute -top-7 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white bg-gray-800 px-2 py-1 rounded transition-opacity shadow-lg">{d.val1}</div>
             </div>
             {/* Bar 2 */}
             <div className="w-1/3 max-w-[32px] bg-purple-500 rounded-t-md relative group-hover:bg-purple-400 transition-all flex justify-center" 
                  style={{ height: ready ? `${(d.val2 / max) * 100}%` : '0%', transitionDuration: '1s', transitionDelay: '100ms', boxShadow: '0 0 10px rgba(168,85,247,0.3)' }}>
               <div className="absolute -top-7 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white bg-gray-800 px-2 py-1 rounded transition-opacity shadow-lg">{Math.round(d.val2)}</div>
             </div>
           </div>
           <span className="text-[10px] text-gray-500 font-extrabold tracking-widest uppercase whitespace-nowrap">{d.label}</span>
         </div>
       ))}
    </div>
  )
}

function AutoSlider({ slides, intervalMs = 8000 }) {
  const [idx, setIdx] = useState(0)
  
  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), intervalMs)
    return () => clearInterval(t)
  }, [slides.length, intervalMs])

  return (
    <div className="relative w-full h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-5 flex-shrink-0">
        <h2 className="text-sm font-extrabold text-white tracking-widest uppercase">{slides[idx].title}</h2>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${i === idx ? 'w-4 bg-agency-accent shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'w-1.5 bg-agency-border'}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      </div>
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {slides.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-700 flex flex-col ${i === idx ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
             {s.content}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigateToProject }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [leftTab, setLeftTab] = useState('pulse')
  const [rightTab, setRightTab] = useState('utilization')

  useEffect(() => { fetchAll() }, [])
  async function fetchAll() {
    const [pRes, tRes, tsRes, tmRes, mRes, opRes, spRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('timesheets').select('*').order('log_date', { ascending: false }),
      supabase.from('team_members').select('*'),
      supabase.from('milestones').select('*').order('due_date'),
      supabase.from('open_points').select('*'),
      supabase.from('sprints').select('*').order('start_date'),
    ])
    setData({
      projects: pRes.data || [],
      tasks: tRes.data || [],
      timesheets: tsRes.data || [],
      team: tmRes.data || [],
      milestones: mRes.data || [],
      openPoints: opRes.data || [],
      sprints: spRes.data || []
    })
    setLoading(false)
  }

  if (loading || !data) return (
    <div className="flex items-center justify-center h-full bg-agency-bg">
      <div className="w-7 h-7 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { projects, tasks, timesheets, team, milestones, openPoints, sprints } = data

  const activeProjects = projects.filter(p => p.status === 'active')
  const onTrackProjects = activeProjects.filter(p => p.rag_status === 'green')
  const onTrackPct = activeProjects.length ? Math.round((onTrackProjects.length / activeProjects.length) * 100) : 0

  const thisMonth = new Date().toISOString().slice(0, 7)
  const hoursThisMonth = timesheets.filter(t => t.log_date?.startsWith(thisMonth)).reduce((s, e) => s + (e.hours || 0), 0)
  
  const totalHours = timesheets.reduce((s, e) => s + (e.hours || 0), 0)
  const billableHours = timesheets.filter(e => e.billable === true || e.billable === 'yes').reduce((s, e) => s + (e.hours || 0), 0)
  const billablePct = totalHours ? Math.round((billableHours / totalHours) * 100) : 0
  
  const globalBlockers = openPoints.filter(p => p.category?.toLowerCase() === 'blocker' && !['resolved','closed'].includes(p.status?.toLowerCase())).length
  const tasksThisMonth = tasks.filter(t => t.status?.toLowerCase() === 'done' && t.updated_at?.startsWith(thisMonth)).length

  // utilization for the month
  const uniqueMembers = [...new Set(team.map(t => t.name))]
  const uniqueTeamAgg = uniqueMembers.map(name => {
    const t = team.find(m => m.name === name)
    const capMonth = (t.capacity || 40) * 4
    const loggedMonth = timesheets.filter(ts => ts.team_member === name && ts.log_date?.startsWith(thisMonth)).reduce((s, e) => s + (e.hours || 0), 0)
    return { name, role: t.role, logged: loggedMonth, pct: capMonth ? Math.round((loggedMonth/capMonth)*100) : 0 }
  }).sort((a,b) => b.pct - a.pct)

  // weeks data for chart
  const now = new Date()
  const weeks = [3, 2, 1, 0].map(offset => {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay() - (offset * 7) + 1)
    const startStr = d.toISOString().slice(0, 10)
    const dEnd = new Date(d)
    dEnd.setDate(dEnd.getDate() + 7)
    const endStr = dEnd.toISOString().slice(0, 10)
    
    const tDone = tasks.filter(t => t.status?.toLowerCase() === 'done' && t.updated_at >= startStr && t.updated_at < endStr).length
    const hLogged = timesheets.filter(t => t.log_date >= startStr && t.log_date < endStr).reduce((s, e) => s + (e.hours || 0), 0)
    
    return { label: offset === 0 ? 'This Wk' : offset === 1 ? 'Last Wk' : `${offset}W Ago`, val1: tDone, val2: hLogged }
  })

  const enrichedMilestones = milestones.map(m => {
    const p = projects.find(proj => proj.id === m.project_id)
    return { ...m, projectName: p?.name || 'Unknown' }
  })
  
  const timesheetsWithProject = timesheets.map(t => {
    const p = projects.find(proj => proj.id === t.project_id)
    return { ...t, projectName: p?.name || 'Unknown' }
  })

  const risks = enrichedMilestones.filter(m => m.status === 'at_risk').sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  const upcoming = enrichedMilestones.filter(m => m.status !== 'at_risk' && m.status !== 'done').sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5)

  // Sub-components for Sliders
  const TeamUtilList = (
    <div className="flex-1 overflow-y-auto space-y-5 pr-2 w-full">
      {uniqueTeamAgg.map(m => (
        <div key={m.name}>
          <div className="flex justify-between text-xs mb-2">
            <span className="font-bold text-gray-300">{m.name}</span>
            <span className="text-gray-500 font-mono">{m.pct}%</span>
          </div>
          <div className="h-2.5 bg-agency-bg rounded-full overflow-hidden border border-agency-border/50">
            <div className="h-full rounded-full transition-all duration-1000" 
                 style={{ width: `${Math.min(m.pct, 100)}%`, backgroundColor: m.pct > 100 ? '#ef4444' : m.pct > 80 ? '#f59e0b' : '#3b82f6', boxShadow: `0 0 10px ${m.pct > 100 ? '#ef4444' : m.pct > 80 ? '#f59e0b' : '#3b82f6'}80` }} />
          </div>
        </div>
      ))}
    </div>
  )

  const LiveActivityList = (
    <div className="flex-1 overflow-y-auto space-y-3 pr-2 w-full live-activity-container">
      {timesheetsWithProject.slice(0, 10).map((ts, i) => (
        <div key={ts.id} className="flex gap-3 items-center p-3 bg-agency-bg/50 border border-agency-border rounded-xl transition-all hover:bg-agency-bg">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ac(ts.team_member), boxShadow: `0 0 12px ${ac(ts.team_member)}60` }}>{ini(ts.team_member)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate"><span className="font-bold">{ts.team_member}</span> logged {formatHours(ts.hours)} on {ts.projectName}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{ts.description || 'No description'}</p>
          </div>
          <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">{formatDate(ts.log_date)}</span>
        </div>
      ))}
      <style>{`
        .live-activity-container > div {
          animation: pulseFade 4s ease-in-out infinite;
        }
        .live-activity-container > div:nth-child(1) { animation-delay: 0s; }
        .live-activity-container > div:nth-child(2) { animation-delay: 1.5s; }
        .live-activity-container > div:nth-child(3) { animation-delay: 3s; }
        @keyframes pulseFade {
          0%, 100% { border-color: rgba(59,130,246,0.1); background-color: rgba(30,41,59,0.5); }
          50% { border-color: rgba(59,130,246,0.5); background-color: rgba(59,130,246,0.05); }
        }
      `}</style>
    </div>
  )

  const RisksList = (
    <div className="flex-1 overflow-y-auto space-y-3 pr-2 w-full">
      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center pb-4">
          <p className="text-4xl mb-3" style={{ animation: 'float 3s ease-in-out infinite' }}>🎯</p>
          <p className="text-green-400 font-extrabold text-sm uppercase tracking-widest">All Clear</p>
          <p className="text-gray-500 text-xs mt-1">No milestones at risk.</p>
        </div>
      ) : risks.map(r => (
        <div key={r.id} onClick={() => onNavigateToProject(r.project_id)} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer hover:border-red-500/40 hover:bg-red-500/20 transition-all">
          <p className="text-sm font-bold text-red-400 truncate mb-1.5">{r.name}</p>
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{r.projectName}</p>
            <p className="text-[10px] text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded">{formatDate(r.due_date)}</p>
          </div>
        </div>
      ))}
    </div>
  )

  const UpcomingList = (
    <div className="flex-1 overflow-y-auto space-y-3 pr-2 w-full">
      {upcoming.map(m => (
        <div key={m.id} onClick={() => onNavigateToProject(m.project_id)} className="p-4 bg-agency-bg border border-agency-border rounded-xl cursor-pointer hover:border-agency-accent/40 transition-all">
          <p className="text-sm font-bold text-white truncate mb-1.5">{m.name}</p>
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{m.projectName}</p>
            <p className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">{formatDate(m.due_date)}</p>
          </div>
        </div>
      ))}
    </div>
  )

  const middleRightSlides = [
    { title: 'Live Activity', content: LiveActivityList },
    { title: 'Team Utilization', content: TeamUtilList },
  ]

  const bottomRightSlides = [
    { title: 'Top Risks', content: RisksList },
    { title: 'Upcoming Milestones', content: UpcomingList },
  ]

  return (
    <div className="h-full bg-agency-bg flex flex-col overflow-y-auto relative" style={{ padding: '24px', gap: '24px' }}>
      
      {/* Live System Indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-bold uppercase tracking-widest z-50">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" />
        Live Feed
      </div>

      {/* ── TOP KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0 animate-[fadeInUp_0.5s_ease_backwards]">
        
        <div className="bg-agency-card border border-agency-border rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">Active Projects</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl font-extrabold text-white">{activeProjects.length}</h3>
              <span className="text-sm font-semibold text-gray-500">of {projects.length} total</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-green-400">{onTrackPct}% On Track</span>
            </div>
            <Bar pct={onTrackPct} color="#22c55e" h={6} />
          </div>
        </div>

        <div className="bg-agency-card border border-agency-border rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-colors" style={{ animationDelay: '50ms' }}>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">Hours Logged</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl font-extrabold text-white">{Math.round(hoursThisMonth)}</h3>
              <span className="text-sm font-semibold text-gray-500">this month</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-purple-400">{billablePct}% Billable</span>
            </div>
            <Bar pct={billablePct} color="#8b5cf6" h={6} />
          </div>
        </div>

        <div className="bg-agency-card border border-agency-border rounded-2xl p-6 flex flex-col justify-between hover:border-pink-500/40 transition-colors" style={{ animationDelay: '100ms' }}>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">Tasks Completed</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl font-extrabold text-white">{tasksThisMonth}</h3>
              <span className="text-sm font-semibold text-gray-500">this month</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-agency-border/50">
            <p className="text-xs text-gray-400 font-medium">Agency velocity is stable.</p>
          </div>
        </div>

        <div className="bg-agency-card border border-agency-border rounded-2xl p-6 flex flex-col justify-between hover:border-red-500/40 transition-colors" style={{ animationDelay: '150ms' }}>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">Active Blockers</p>
            <div className="flex items-baseline gap-3">
              <h3 className={`text-4xl font-extrabold ${globalBlockers > 0 ? 'text-red-400' : 'text-green-400'}`}>{globalBlockers}</h3>
              <span className="text-sm font-semibold text-gray-500">across portfolio</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-agency-border/50">
            <p className="text-xs text-gray-400 font-medium">
              {globalBlockers > 0 ? 'Requires immediate PM attention.' : 'No active blockers right now.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── HIGH DENSITY TAB PANELS ── */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
        
        {/* Left Interactive Panel */}
        <div className="flex-[2] bg-agency-card border border-agency-border rounded-2xl p-6 flex flex-col animate-[fadeInUp_0.5s_ease_backwards]" style={{ animationDelay: '200ms' }}>
          {/* Tabs */}
          <div className="flex justify-between items-center mb-5 flex-shrink-0 border-b border-agency-border/50 pb-3">
            <div className="flex gap-4">
              {[
                { id: 'pulse', label: 'Agency Pulse' },
                { id: 'portfolio', label: 'Project Portfolio' },
                { id: 'activity', label: 'Live Activity' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setLeftTab(t.id)}
                  className={`text-xs font-extrabold uppercase tracking-wider transition-colors relative pb-1.5 ${
                    leftTab === t.id ? 'text-agency-accent' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.label}
                  {leftTab === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-agency-accent rounded-full shadow-[0_0_8px_rgba(94,106,210,0.6)]" />
                  )}
                </button>
              ))}
            </div>
            {leftTab === 'pulse' && (
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]"/><span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Tasks</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-purple-500 rounded-sm shadow-[0_0_8px_rgba(168,85,247,0.6)]"/><span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Hours</span></div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {leftTab === 'pulse' && (
              <div className="h-full flex flex-col justify-end min-h-[300px]">
                <VerticalBarChart data={weeks} />
              </div>
            )}
            {leftTab === 'portfolio' && (
              <div className="space-y-3">
                {projects.map(p => {
                  const pTasks = tasks.filter(t => t.project_id === p.id)
                  const doneTasks = pTasks.filter(t => t.status?.toLowerCase() === 'done').length
                  const taskPct = pTasks.length ? Math.round((doneTasks/pTasks.length)*100) : 0
                  
                  const pHours = timesheets.filter(t => t.project_id === p.id).reduce((s,e) => s + (e.hours||0), 0)
                  const est = p.estimated_hours || 0
                  const burnPct = est ? Math.min(Math.round((pHours/est)*100), 100) : 0
                  
                  const days = daysLeft(p.go_live_date)
                  const ragColor = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' }[p.rag_status] || '#22c55e'

                  return (
                    <div key={p.id} onClick={() => onNavigateToProject(p.id)} className="flex items-center gap-6 p-4 bg-agency-bg border border-agency-border rounded-xl hover:border-agency-accent/40 cursor-pointer transition-colors group">
                      <div className="w-1/3 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ragColor, boxShadow: `0 0 8px ${ragColor}` }} />
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white group-hover:text-agency-accent transition-colors truncate">{p.name}</h3>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider truncate">{p.client}</p>
                        </div>
                      </div>
                      <div className="w-1/4">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Tasks</span>
                          <span className="text-[10px] text-white font-bold">{taskPct}%</span>
                        </div>
                        <Bar pct={taskPct} color={taskPct >= 100 ? '#22c55e' : '#3b82f6'} h={5} />
                      </div>
                      <div className="w-1/4">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Burn</span>
                          <span className="text-[10px] text-white font-bold">{est ? `${burnPct}%` : 'N/A'}</span>
                        </div>
                        <Bar pct={burnPct} color={burnPct > 90 ? '#ef4444' : burnPct > 70 ? '#f59e0b' : '#8b5cf6'} h={5} />
                      </div>
                      <div className="flex-1 text-right">
                        <p className={`text-xl font-extrabold leading-none ${days < 0 ? 'text-red-400' : 'text-white'}`}>{days !== null ? Math.abs(days) : '—'}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 tracking-widest">{days < 0 ? 'days late' : 'days left'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {leftTab === 'activity' && LiveActivityList}
          </div>
        </div>

        {/* Right Interactive Panel */}
        <div className="flex-[1] bg-agency-card border border-agency-border rounded-2xl p-6 flex flex-col animate-[fadeInUp_0.5s_ease_backwards]" style={{ animationDelay: '250ms' }}>
          {/* Tabs */}
          <div className="flex justify-between items-center mb-5 flex-shrink-0 border-b border-agency-border/50 pb-3">
            <div className="flex gap-4">
              {[
                { id: 'utilization', label: 'Team Utilization' },
                { id: 'risks', label: 'Top Risks' },
                { id: 'milestones', label: 'Milestones' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setRightTab(t.id)}
                  className={`text-xs font-extrabold uppercase tracking-wider transition-colors relative pb-1.5 ${
                    rightTab === t.id ? 'text-agency-accent' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.label}
                  {rightTab === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-agency-accent rounded-full shadow-[0_0_8px_rgba(94,106,210,0.6)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {rightTab === 'utilization' && TeamUtilList}
            {rightTab === 'risks' && RisksList}
            {rightTab === 'milestones' && UpcomingList}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  )
}