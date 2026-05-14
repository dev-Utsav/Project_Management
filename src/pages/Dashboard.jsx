import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PROJECT_ID = 1

// ─── helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0] }
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

// ─── Count up ─────────────────────────────────────────────────────────────────
function useCountUp(target, dur = 1000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target && target !== 0) return
    let raf, st
    const run = (ts) => {
      if (!st) st = ts
      const p = Math.min((ts - st) / dur, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(run)
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return val
}

// ─── Donut ring ───────────────────────────────────────────────────────────────
function DonutRing({ pct = 0, size = 80, stroke = 7, color = '#3b82f6', bg = '#1e2937' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t) }, [])
  const offset = ready ? circ - (Math.min(pct, 100) / 100) * circ : circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color}90)` }} />
    </svg>
  )
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────
function Pulse({ color = '#22c55e', size = 2 }) {
  return (
    <span className="relative flex-shrink-0" style={{ width: size * 4, height: size * 4, display: 'inline-flex' }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full w-full h-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
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

// ─── Slider (auto-cycling panels) ────────────────────────────────────────────
function Slider({ slides, intervalMs = 5000 }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [animDir, setAnimDir] = useState(1) // 1 = forward, -1 = back

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(() => goTo((idx + 1) % slides.length, 1), intervalMs)
    return () => clearInterval(t)
  }, [idx, paused, slides.length, intervalMs])

  function goTo(next, dir = 1) {
    setAnimDir(dir)
    setIdx(next)
  }

  const s = slides[idx]

  return (
    <div
      className="flex flex-col h-full bg-agency-card border border-agency-border rounded-2xl overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-agency-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {slides.map((sl, i) => (
            <button key={sl.key} onClick={() => goTo(i, i > idx ? 1 : -1)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
                i === idx
                  ? 'text-white bg-agency-bg'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-agency-bg/50'
              }`}
              style={i === idx ? { boxShadow: `inset 0 -2px 0 ${sl.color}` } : {}}>
              <span>{sl.icon}</span>
              <span className="hidden sm:inline">{sl.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {slides.map((sl, i) => (
              <div key={i} onClick={() => goTo(i)} className="cursor-pointer rounded-full transition-all duration-400"
                style={{
                  height: 6, width: i === idx ? 20 : 6,
                  backgroundColor: i === idx ? s.color : '#2d3748',
                  boxShadow: i === idx ? `0 0 8px ${s.color}` : 'none'
                }} />
            ))}
          </div>
          {slides.length > 1 && (
            <button onClick={() => setPaused(p => !p)}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-bold w-5 h-5 flex items-center justify-center">
              {paused ? '▶' : '⏸'}
            </button>
          )}
        </div>
      </div>

      {/* progress strip */}
      {!paused && slides.length > 1 && (
        <div className="h-px flex-shrink-0 overflow-hidden bg-agency-border/30">
          <div key={`${idx}-${paused}`} style={{
            height: '100%', backgroundColor: s.color,
            animation: `progSlide ${intervalMs}ms linear forwards`,
            boxShadow: `0 0 4px ${s.color}`,
          }} />
          <style>{`@keyframes progSlide { from { width:0% } to { width:100% } }`}</style>
        </div>
      )}

      {/* slide content */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          key={idx}
          className="absolute inset-0 p-4 overflow-y-auto"
          style={{ animation: `slideIn 0.35s cubic-bezier(0.4,0,0.2,1)` }}
        >
          <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(${animDir * 10}px) } to { opacity:1; transform:translateY(0) } }`}</style>
          {s.content}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE CONTENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Sprint progress slide
function SprintSlide({ tasks, tasksDone, tasksTotal, tasksPct, inProgress, blockers, activeSprint }) {
  const todo = Math.max(tasksTotal - tasksDone - inProgress - blockers, 0)
  const color = tasksPct >= 80 ? '#22c55e' : tasksPct >= 40 ? '#f59e0b' : '#3b82f6'
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-widest">Sprint Progress</p>
          <p className="text-[11px] text-gray-500 mt-0.5 font-medium line-clamp-1">{activeSprint?.name || 'No active sprint'}</p>
        </div>
        <p className="text-3xl font-extrabold flex-shrink-0 ml-2" style={{ color, textShadow: `0 0 20px ${color}60` }}>
          {tasksPct}%
        </p>
      </div>

      <Bar pct={tasksPct} color={color} h={8} />

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Done',    count: tasksDone,  color: '#22c55e' },
          { label: 'Active',  count: inProgress, color: '#3b82f6' },
          { label: 'Blocked', count: blockers,   color: '#ef4444' },
          { label: 'To Do',   count: todo,       color: '#6b7280' },
        ].map(s => (
          <div key={s.label} className="bg-agency-bg border border-agency-border rounded-xl py-2.5 text-center">
            <p className="text-xl font-extrabold leading-none mb-1" style={{ color: s.color, textShadow: `0 0 10px ${s.color}40` }}>{s.count}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {activeSprint?.goal && (
        <div className="bg-agency-bg border border-agency-border rounded-xl px-3 py-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-0.5">Sprint Goal</p>
          <p className="text-xs text-gray-300 font-medium">{activeSprint.goal}</p>
        </div>
      )}
    </div>
  )
}

// Live activity slide
function ActivitySlide({ timesheets }) {
  const [idx, setIdx] = useState(0)
  const [vis, setVis] = useState(true)
  const items = timesheets.slice(0, 15).map(e => ({
    name: e.team_member || 'Team',
    action: `logged ${formatHours(e.hours)} — ${(e.description || '').slice(0, 55)}${(e.description?.length || 0) > 55 ? '…' : ''}`,
    time: formatDate(e.log_date),
    type: e.task_type || 'Dev',
  }))

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => {
      setVis(false)
      setTimeout(() => { setIdx(i => (i + 1) % items.length); setVis(true) }, 300)
    }, 3500)
    return () => clearInterval(t)
  }, [items.length])

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center h-full">
      <p className="text-2xl mb-2">📭</p>
      <p className="text-sm text-gray-500 font-medium">No activity yet</p>
      <p className="text-xs text-gray-600 mt-1">Log time to see it here</p>
    </div>
  )

  const item = items[idx]
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* big ticker */}
      <div className="flex items-center gap-3 bg-agency-bg border border-agency-border rounded-xl p-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
          style={{ backgroundColor: ac(item.name), boxShadow: `0 0 16px ${ac(item.name)}50` }}>
          {ini(item.name)}
        </div>
        <div className="flex-1 min-w-0"
          style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(5px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
          <p className="text-sm text-white font-semibold leading-snug">
            <span className="font-extrabold">{item.name}</span>
            <span className="text-gray-400 font-normal"> {item.action}</span>
          </p>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">{item.time}</p>
        </div>
      </div>

      {/* mini list of recent */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {items.slice(0, 6).map((it, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${i === idx ? 'border-agency-accent/30 bg-agency-accent/5' : 'border-agency-border bg-agency-bg/40'}`}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: ac(it.name) }}>{ini(it.name)}</div>
            <p className="text-[11px] text-gray-300 truncate flex-1">{it.name}: {it.action.slice(0, 45)}…</p>
            <span className="text-[10px] text-gray-600 font-medium flex-shrink-0">{it.time}</span>
          </div>
        ))}
      </div>

      {/* indicator dots */}
      <div className="flex justify-center gap-1 flex-shrink-0">
        {items.slice(0, 8).map((_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{ width: i === idx ? 14 : 6, height: 4, backgroundColor: i === idx ? '#3b82f6' : '#2d3748' }} />
        ))}
      </div>
    </div>
  )
}

// Team slide
function TeamSlide({ teamRows }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      {teamRows.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-6">No team data yet</p>
      ) : (
        teamRows.slice(0, 6).map((m, i) => (
          <div key={m.id || m.name} className="bg-agency-bg border border-agency-border rounded-xl p-2.5"
            style={{ animation: `fadeUp 0.4s ease ${i * 60}ms backwards` }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: ac(m.name), boxShadow: `0 0 10px ${ac(m.name)}40` }}>{ini(m.name)}</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-none truncate">{m.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5 truncate">{m.role}</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-white flex-shrink-0 ml-2">{formatHours(m.logged)}</span>
            </div>
            <Bar pct={m.pct} color={m.pct > 90 ? '#ef4444' : m.pct > 65 ? '#f59e0b' : '#3b82f6'} h={4} />
            <p className="text-[9px] text-gray-600 mt-1 font-bold">{m.pct}% utilized</p>
          </div>
        ))
      )}
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// Milestones slide
function MilestonesSlide({ milestones, msDone }) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-medium text-gray-400">{msDone}/{milestones.length} complete</p>
        <span className="text-lg font-extrabold text-white">{milestones.length ? Math.round((msDone/milestones.length)*100) : 0}%</span>
      </div>

      {milestones.length > 0 && (
        <div className="flex items-center gap-1.5 px-1 flex-shrink-0">
          {milestones.map((m, i) => {
            const sc = { done: '#22c55e', in_progress: '#3b82f6', at_risk: '#ef4444', upcoming: '#4b5563' }[m.status] || '#4b5563'
            return (
              <div key={m.id} className="flex-1 flex items-center" title={m.name || m.title}>
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sc, boxShadow: m.status !== 'upcoming' ? `0 0 8px ${sc}` : 'none' }} />
                {i < milestones.length - 1 && <div className="flex-1 h-px" style={{ backgroundColor: sc + (m.status === 'done' ? 'FF' : '30') }} />}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {milestones.filter(m => m.status !== 'done').slice(0, 5).map((m, i) => {
          const d = daysLeft(m.due_date)
          const sc = { in_progress: '#3b82f6', at_risk: '#ef4444', upcoming: '#6b7280' }[m.status] || '#6b7280'
          return (
            <div key={m.id} className="flex items-center gap-2.5 p-2.5 bg-agency-bg border border-agency-border rounded-xl transition-all hover:border-agency-accent/30"
              style={{ animation: `fadeUp 0.4s ease ${i * 60}ms backwards` }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc, boxShadow: `0 0 6px ${sc}` }} />
              <p className="text-xs font-semibold text-white truncate flex-1">{m.name || m.title}</p>
              {d !== null && (
                <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-md ${d < 0 ? 'text-red-400 bg-red-500/10' : d <= 7 ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-500 bg-agency-border/30'}`}>
                  {d < 0 ? `${Math.abs(d)}d over` : d === 0 ? 'Today' : `${d}d`}
                </span>
              )}
            </div>
          )
        })}
        {milestones.filter(m => m.status !== 'done').length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4 italic">All done 🎉</p>
        )}
      </div>
    </div>
  )
}

// Blockers slide
function BlockersSlide({ blockers, openPoints }) {
  const list = openPoints.filter(p => p.category?.toLowerCase() === 'blocker' && !['resolved','closed'].includes(p.status?.toLowerCase()))
  const accent = blockers > 0 ? '#ef4444' : '#22c55e'
  if (!blockers) return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <div className="text-5xl" style={{ animation: 'float 3s ease-in-out infinite' }}>🎯</div>
      <p className="text-base font-extrabold text-green-400">All Clear</p>
      <p className="text-xs text-gray-500">No active blockers</p>
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  )
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-medium text-gray-400">Need immediate attention</p>
        <span className="text-2xl font-extrabold" style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>{blockers}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {list.slice(0, 5).map((p, i) => (
          <div key={p.id} className="bg-red-500/8 border border-red-500/25 rounded-xl p-3 hover:border-red-500/40 transition-all"
            style={{ animation: `fadeUp 0.4s ease ${i * 70}ms backwards` }}>
            <div className="flex gap-2">
              <span className="text-red-500 text-sm flex-shrink-0">▸</span>
              <div>
                <p className="text-sm font-bold text-red-300 leading-snug">{p.title}</p>
                <p className="text-[11px] text-red-500/60 font-medium mt-0.5">{p.raised_by || p.assigned_to || 'Unassigned'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Vitals slide
function VitalsSlide({ project, team, totalHours, billableHours, todayHours, openPoints, days }) {
  const vitals = [
    { label: 'Go-Live',     value: formatDate(project?.go_live_date), color: days !== null && days <= 14 ? '#f59e0b' : '#e2e8f0' },
    { label: 'Team Lead',   value: project?.team_lead || '—',          color: '#e2e8f0' },
    { label: 'Team Size',   value: `${team.length} members`,           color: '#e2e8f0' },
    { label: 'Budget',      value: project?.estimated_hours ? `${project.estimated_hours}h` : '—', color: '#e2e8f0' },
    { label: 'Logged',      value: formatHours(totalHours),            color: '#8b5cf6' },
    { label: 'Billable',    value: formatHours(billableHours),         color: '#10b981' },
    { label: 'Open Points', value: openPoints.filter(p => !['resolved','closed'].includes(p.status?.toLowerCase())).length, color: '#f59e0b' },
    { label: 'Today',       value: formatHours(todayHours),            color: '#3b82f6' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 h-full content-start">
      {vitals.map((v, i) => (
        <div key={v.label} className="bg-agency-bg border border-agency-border rounded-xl px-3 py-2.5 hover:border-agency-accent/30 transition-all"
          style={{ animation: `fadeUp 0.4s ease ${i * 40}ms backwards` }}>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">{v.label}</p>
          <p className="text-sm font-extrabold truncate" style={{ color: v.color }}>{v.value}</p>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [project, setProject]       = useState(null)
  const [tasks, setTasks]           = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [team, setTeam]             = useState([])
  const [milestones, setMilestones] = useState([])
  const [openPoints, setOpenPoints] = useState([])
  const [sprints, setSprints]       = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { fetchAll() }, [])
  async function fetchAll() {
    const [pRes, tRes, tsRes, tmRes, mRes, opRes, spRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', PROJECT_ID).single(),
      supabase.from('tasks').select('*').eq('project_id', PROJECT_ID),
      supabase.from('timesheets').select('*').eq('project_id', PROJECT_ID).order('log_date', { ascending: false }).limit(50),
      supabase.from('team_members').select('*').eq('project_id', PROJECT_ID),
      supabase.from('milestones').select('*').eq('project_id', PROJECT_ID).order('due_date'),
      supabase.from('open_points').select('*').eq('project_id', PROJECT_ID),
      supabase.from('sprints').select('*').eq('project_id', PROJECT_ID).order('start_date'),
    ])
    setProject(pRes.data); setTasks(tRes.data || []); setTimesheets(tsRes.data || [])
    setTeam(tmRes.data || []); setMilestones(mRes.data || [])
    setOpenPoints(opRes.data || []); setSprints(spRes.data || [])
    setLoading(false)
  }

  // metrics
  const tasksDone   = tasks.filter(t => t.status?.toLowerCase().trim() === 'done').length
  const tasksTotal  = tasks.length
  const tasksPct    = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const inProgress  = tasks.filter(t => ['in progress','in_progress'].includes(t.status?.toLowerCase().trim())).length
  const totalHours    = timesheets.reduce((s, e) => s + (e.hours || 0), 0)
  const billableHours = timesheets.filter(e => e.billable === true || e.billable === 'yes').reduce((s, e) => s + (e.hours || 0), 0)
  const billablePct   = totalHours ? Math.round((billableHours / totalHours) * 100) : 0
  const estHours      = project?.estimated_hours || 0
  const burnPct       = estHours ? Math.min(Math.round((totalHours / estHours) * 100), 100) : 0
  const blockers      = openPoints.filter(p => p.category?.toLowerCase() === 'blocker' && !['resolved','closed'].includes(p.status?.toLowerCase())).length
  const todayHours    = timesheets.filter(e => e.log_date === today()).reduce((s, e) => s + (e.hours || 0), 0)
  const msDone        = milestones.filter(m => m.status === 'done').length
  const msPct         = milestones.length ? Math.round((msDone / milestones.length) * 100) : 0

  const days = daysLeft(project?.go_live_date)
  const ragColor = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' }[project?.rag_status] || '#22c55e'
  const ragLabel = { green: 'On Track', amber: 'At Risk', red: 'Critical' }[project?.rag_status] || 'On Track'
  const activeSprint = sprints.find(s => s.status === 'active') || sprints[0]

  const teamRows = team.map(m => {
    const logged = timesheets.filter(e => e.team_member === m.name).reduce((s, e) => s + (e.hours || 0), 0)
    return { ...m, logged, pct: Math.min(Math.round((logged / ((m.capacity || 40) * 4)) * 100), 100) }
  }).sort((a, b) => b.logged - a.logged)

  // animated counters
  const aTask  = useCountUp(tasksDone)
  const aPct   = useCountUp(tasksPct)
  const aHours = useCountUp(Math.round(totalHours))
  const aBurn  = useCountUp(estHours ? burnPct : billablePct)
  const aBill  = useCountUp(billablePct)
  const aMs    = useCountUp(msPct)

  // metric cards config
  const metrics = [
    {
      label: 'Task Completion', value: `${aTask}/${tasksTotal}`, sub: `${inProgress} active · ${blockers} blocked`,
      pct: tasksPct, color: tasksPct >= 80 ? '#22c55e' : tasksPct >= 40 ? '#f59e0b' : '#3b82f6',
    },
    {
      label: 'Hours Burned', value: `${aHours}h`, sub: estHours ? `${aBurn}% of ${estHours}h budget` : `${timesheets.length} entries`,
      pct: estHours ? burnPct : billablePct, color: estHours ? (burnPct >= 90 ? '#ef4444' : burnPct >= 70 ? '#f59e0b' : '#8b5cf6') : '#8b5cf6',
    },
    {
      label: 'Billable Rate', value: `${aBill}%`, sub: `${formatHours(billableHours)} billable`,
      pct: billablePct, color: '#10b981',
    },
    {
      label: 'Milestones', value: `${msDone}/${milestones.length}`, sub: `${milestones.filter(m => m.status === 'at_risk').length} at risk`,
      pct: msPct, color: msPct >= 80 ? '#22c55e' : '#f59e0b',
    },
  ]

  // left slider
  const leftSlides = [
    {
      key: 'sprint', label: 'Sprint', icon: '🏃', color: '#3b82f6',
      content: <SprintSlide tasks={tasks} tasksDone={tasksDone} tasksTotal={tasksTotal} tasksPct={tasksPct} inProgress={inProgress} blockers={blockers} activeSprint={activeSprint} />
    },
    {
      key: 'activity', label: 'Activity', icon: '⚡', color: '#f59e0b',
      content: <ActivitySlide timesheets={timesheets} />
    },
  ]

  // right slider
  const rightSlides = [
    {
      key: 'team', label: 'Team', icon: '👥', color: '#3b82f6',
      content: <TeamSlide teamRows={teamRows} />
    },
    {
      key: 'milestones', label: 'Milestones', icon: '🎯', color: '#8b5cf6',
      content: <MilestonesSlide milestones={milestones} msDone={msDone} />
    },
    {
      key: 'blockers', label: blockers > 0 ? `Blockers (${blockers})` : 'Clear', icon: blockers > 0 ? '🚨' : '✅',
      color: blockers > 0 ? '#ef4444' : '#22c55e',
      content: <BlockersSlide blockers={blockers} openPoints={openPoints} />
    },
    {
      key: 'vitals', label: 'Vitals', icon: 'ℹ️', color: '#6b7280',
      content: <VitalsSlide project={project} team={team} totalHours={totalHours} billableHours={billableHours} todayHours={todayHours} openPoints={openPoints} days={days} />
    },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-full bg-agency-bg flex flex-col overflow-hidden" style={{ padding: 'clamp(12px, 1.5vw, 20px)', gap: 'clamp(10px, 1.2vw, 16px)' }}>

      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-extrabold text-white tracking-tight" style={{ fontSize: 'clamp(16px, 1.5vw, 22px)' }}>
            {project?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border"
            style={{ borderColor: ragColor + '40', backgroundColor: ragColor + '18' }}>
            <Pulse color={ragColor} size={2} />
            <span className="text-[11px] font-extrabold tracking-widest uppercase" style={{ color: ragColor }}>{ragLabel}</span>
          </div>
          {project?.client && <span className="text-sm text-gray-400 font-semibold">{project.client}</span>}
          {days !== null && (
            <span className={`text-sm font-bold ${days < 0 ? 'text-red-400' : days <= 14 ? 'text-yellow-400' : 'text-gray-500'}`}>
              · {days > 0 ? `${days}d to go-live` : days === 0 ? 'Go-live today!' : `${Math.abs(days)}d overdue`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-agency-card border border-agency-border rounded-xl px-3 py-1.5">
          <Pulse color="#3b82f6" size={2} />
          <span className="text-[11px] font-extrabold text-gray-400 tracking-widest">LIVE</span>
          <span className="text-[11px] text-gray-600 font-medium">{formatDate(today())}</span>
        </div>
      </div>

      {/* ── TOP ROW: 4 static metric cards full width ── */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0" style={{ gap: 'clamp(8px, 1vw, 14px)' }}>
        {metrics.map((m, i) => (
          <div key={i} className="bg-agency-card border border-agency-border rounded-2xl flex items-center overflow-hidden relative"
            style={{ padding: 'clamp(10px, 1.2vw, 16px)', gap: 'clamp(10px, 1vw, 16px)', animation: `fadeInUp 0.5s ease ${i * 90}ms backwards` }}>
            {/* top accent glow */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: m.color, boxShadow: `0 0 12px ${m.color}` }} />

            <div className="relative flex-shrink-0" style={{ width: 'clamp(60px, 5.5vw, 80px)', height: 'clamp(60px, 5.5vw, 80px)' }}>
              <DonutRing pct={m.pct} size={undefined} stroke={6} color={m.color} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-extrabold text-white" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{m.pct}%</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-gray-500 uppercase font-bold" style={{ fontSize: 'clamp(9px, 0.7vw, 11px)', letterSpacing: '0.08em' }}>{m.label}</p>
              <p className="font-extrabold text-white leading-tight my-0.5" style={{ fontSize: 'clamp(18px, 1.8vw, 26px)' }}>{m.value}</p>
              <p className="text-gray-500 font-medium truncate" style={{ fontSize: 'clamp(10px, 0.8vw, 12px)' }}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* ── BOTTOM ROW: two sliders side by side ── */}
      <div className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden" style={{ gap: 'clamp(8px, 1vw, 14px)' }}>
        <Slider slides={leftSlides} intervalMs={6000} />
        <Slider slides={rightSlides} intervalMs={5000} />
      </div>
    </div>
  )
}