import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── helpers ─────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0] }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Convert decimal hours → "2h 45m" display
function formatHours(decimal) {
  if (!decimal && decimal !== 0) return '—'
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// hrs + mins → single decimal for storage
function toDecimal(hrs, mins) {
  return parseFloat(hrs || 0) + parseFloat(mins || 0) / 60
}

function avatarColor(name = '') {
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}
function initials(name = '') { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }
function isBillableVal(b) { return b === true || b === 'yes' || b === 'true' || String(b) === 'true' }

// ─── task type detection ──────────────────────────────────────────────────────
const TYPE_KEYWORDS = {
  Development: ['dev','develop','code','build','implement','fix','bug','frontend','backend','api','component','feature','liquid','theme','shopify'],
  Design:      ['design','figma','wireframe','mockup','ui','ux','prototype','visual'],
  QA:          ['test','qa','quality','verify','check','regression'],
  Review:      ['review','pr','pull request','feedback','walkthrough'],
  Meeting:     ['meeting','call','standup','sync','discussion','ceremony','huddle'],
  Management:  ['plan','planning','update','report','client','coordinate','chase','follow up','document','doc','presentation'],
}

function detectType(text) {
  const lower = text.toLowerCase()
  for (const [type, kw] of Object.entries(TYPE_KEYWORDS)) {
    if (kw.some(k => lower.includes(k))) return type
  }
  return 'Development'
}

function detectBillable(text, type) {
  const nonBillable = ['meeting','standup','internal','admin','plan','coordinate']
  if (nonBillable.some(k => text.toLowerCase().includes(k))) return false
  if (type === 'Meeting' || type === 'Management') return false
  return true
}

// ─── atoms ───────────────────────────────────────────────────────────────────
function Pill({ label, color }) {
  const map = {
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${map[color] || map.gray}`}>{label}</span>
}

const TYPE_COLOR = {
  Development: 'blue', Design: 'purple', QA: 'yellow',
  Review: 'green', Meeting: 'gray', Management: 'gray',
}

// ══════════════════════════════════════════════════════════════════════════════
// LOG FORM
// ══════════════════════════════════════════════════════════════════════════════
function LogForm({ team, projectId, onSaved }) {
  const [member, setMember] = useState(team[0]?.name || '')
  const [description, setDescription] = useState('')
  const [hrs, setHrs] = useState('0')
  const [mins, setMins] = useState('0')
  const [type, setType] = useState('Development')
  const [billable, setBillable] = useState(true)
  const [logDate, setLogDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState(null)

  // auto-detect type & billable as user types
  function handleDescChange(val) {
    setDescription(val)
    if (val.length > 4) {
      const t = detectType(val)
      setType(t)
      setBillable(detectBillable(val, t))
    }
  }

  async function handleSubmit() {
    if (!description.trim()) { setErr('Please enter a description.'); return }
    const totalHours = toDecimal(hrs, mins)
    if (totalHours <= 0) { setErr('Please enter at least some hours or minutes.'); return }

    setSaving(true); setErr(null)

    const { error } = await supabase.from('timesheets').insert({
      project_id: projectId,
      team_member: member,
      description: description.trim(),
      hours: parseFloat(totalHours.toFixed(4)),
      task_type: type,
      billable: billable,
      log_date: logDate,
    })

    setSaving(false)
    if (error) { setErr('Failed to save — ' + error.message); return }

    // reset
    setDescription('')
    setHrs('0'); setMins('0')
    setType('Development'); setBillable(true)
    setLogDate(today())
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    onSaved()
  }

  return (
    <div className="bg-agency-card border border-agency-border rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-white mb-4">Log Time</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* member */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 uppercase tracking-wide">Member</label>
          <select
            value={member}
            onChange={e => setMember(e.target.value)}
            className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 transition-colors"
          >
            {team.map(m => <option key={m.id || m.name} value={m.name}>{m.name}</option>)}
          </select>
        </div>

        {/* date */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={logDate}
            onChange={e => setLogDate(e.target.value)}
            className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 transition-colors"
          />
        </div>
      </div>

      {/* description */}
      <div className="flex flex-col gap-1 mb-3">
        <label className="text-[11px] text-gray-500 uppercase tracking-wide">What did you work on?</label>
        <textarea
          rows={2}
          placeholder="e.g. Worked on the checkout API integration and fixed the cart bug"
          value={description}
          onChange={e => handleDescChange(e.target.value)}
          className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 placeholder-gray-600 resize-none transition-colors"
        />
      </div>

      {/* hours + minutes */}
      <div className="flex flex-col gap-1 mb-3">
        <label className="text-[11px] text-gray-500 uppercase tracking-wide">Time Spent</label>
        <div className="flex items-center gap-3">
          {/* hours */}
          <div className="flex items-center gap-2 bg-agency-bg border border-agency-border rounded-lg px-3 py-2 flex-1">
            <button
              onClick={() => setHrs(h => String(Math.max(0, parseInt(h || 0) - 1)))}
              className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center text-lg leading-none transition-colors"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-white text-sm font-semibold">{hrs}</span>
              <span className="text-gray-500 text-xs ml-1">hr</span>
            </div>
            <button
              onClick={() => setHrs(h => String(parseInt(h || 0) + 1))}
              className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center text-lg leading-none transition-colors"
            >+</button>
          </div>

          <span className="text-gray-600 text-sm">:</span>

          {/* minutes */}
          <div className="flex items-center gap-2 bg-agency-bg border border-agency-border rounded-lg px-3 py-2 flex-1">
            <button
              onClick={() => setMins(m => String(Math.max(0, parseInt(m || 0) - 15)))}
              className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center text-lg leading-none transition-colors"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-white text-sm font-semibold">{String(parseInt(mins || 0)).padStart(2, '0')}</span>
              <span className="text-gray-500 text-xs ml-1">min</span>
            </div>
            <button
              onClick={() => setMins(m => {
                const next = parseInt(m || 0) + 15
                if (next >= 60) { setHrs(h => String(parseInt(h || 0) + 1)); return '0' }
                return String(next)
              })}
              className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center text-lg leading-none transition-colors"
            >+</button>
          </div>

          {/* quick chips */}
          <div className="flex gap-1.5">
            {[
              { label: '30m', h: '0', m: '30' },
              { label: '1h', h: '1', m: '0' },
              { label: '2h', h: '2', m: '0' },
              { label: '4h', h: '4', m: '0' },
            ].map(chip => (
              <button
                key={chip.label}
                onClick={() => { setHrs(chip.h); setMins(chip.m) }}
                className="px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:text-white bg-agency-bg border border-agency-border hover:border-agency-accent/40 rounded-lg transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* preview */}
        {toDecimal(hrs, mins) > 0 && (
          <p className="text-[11px] text-agency-accent mt-1">
            = {formatHours(toDecimal(hrs, mins))} total
          </p>
        )}
      </div>

      {/* type + billable */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-gray-500 uppercase tracking-wide">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-agency-bg border border-agency-border text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-agency-accent/60 transition-colors"
          >
            {Object.keys(TYPE_COLOR).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 uppercase tracking-wide">Billable</label>
          <button
            onClick={() => setBillable(b => !b)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              billable
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            {billable ? '✓ Billable' : '✗ Non-billable'}
          </button>
        </div>
      </div>

      {/* errors / success */}
      {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-400 text-xs mb-3">
          <span>✓</span> Time logged successfully!
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving || !description.trim() || toDecimal(hrs, mins) <= 0}
        className="w-full py-2.5 bg-agency-accent hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Log Time'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function Timesheet() {
  const [entries, setEntries] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')     // all | billable | non-billable
  const [memberFilter, setMemberFilter] = useState('all')

  const PROJECT_ID = 1

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [entriesRes, teamRes] = await Promise.all([
      supabase
        .from('timesheets')
        .select('*')
        .eq('project_id', PROJECT_ID)
        .order('log_date', { ascending: false })
        .order('id', { ascending: false }),
      supabase
        .from('team_members')
        .select('*')
        .eq('project_id', PROJECT_ID)
        .order('name'),
    ])
    setEntries(entriesRes.data || [])
    setTeam(teamRes.data || [])
    setLoading(false)
  }

  // ── derived stats ──────────────────────────────────────────────────────────
  const totalHours    = entries.reduce((s, e) => s + (e.hours || 0), 0)
  const billableHours = entries.filter(e => isBillableVal(e.billable)).reduce((s, e) => s + (e.hours || 0), 0)
  const uniqueMembers = [...new Set(entries.map(e => e.team_member))].length
  const todayEntries  = entries.filter(e => e.log_date === today())

  // ── filters ───────────────────────────────────────────────────────────────
  const displayed = entries.filter(e => {
    const billableMatch =
      filter === 'all' ? true :
      filter === 'billable' ? isBillableVal(e.billable) :
      !isBillableVal(e.billable)
    const memberMatch = memberFilter === 'all' || e.team_member === memberFilter
    return billableMatch && memberMatch
  })

  const uniqueMemberNames = [...new Set([
    ...entries.map(e => e.team_member).filter(Boolean),
    ...team.map(m => m.name),
  ])].sort()

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-agency-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">

        {/* ── page title ── */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">Timesheet</h1>
          <p className="text-sm text-gray-500">Log and review time entries across the team.</p>
        </div>

        {/* ── stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Logged',    value: formatHours(totalHours),    sub: `${entries.length} entries` },
            { label: 'Billable',        value: formatHours(billableHours), sub: `${totalHours > 0 ? Math.round(billableHours / totalHours * 100) : 0}% of total` },
            { label: 'Team Members',    value: String(uniqueMembers),       sub: 'have logged time' },
            { label: "Today's Entries", value: String(todayEntries.length), sub: formatDate(today()) },
          ].map(s => (
            <div key={s.label} className="bg-agency-card border border-agency-border rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-xl font-semibold text-white">{s.value}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── log form ── */}
        {team.length > 0 && (
          <LogForm team={team} projectId={PROJECT_ID} onSaved={fetchAll} />
        )}
        {team.length === 0 && (
          <div className="bg-agency-card border border-agency-border rounded-xl p-5 mb-6 text-center">
            <p className="text-gray-500 text-sm">Add team members in Project Setup before logging time.</p>
          </div>
        )}

        {/* ── table header + filters ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-white">All Entries</h2>
          <div className="flex items-center gap-2">
            {/* member filter */}
            <select
              value={memberFilter}
              onChange={e => setMemberFilter(e.target.value)}
              className="bg-agency-card border border-agency-border text-gray-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors"
            >
              <option value="all">All Members</option>
              {uniqueMemberNames.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* billable filter */}
            <div className="flex gap-1 bg-agency-card border border-agency-border rounded-lg p-1">
              {[
                { key: 'all',          label: 'All' },
                { key: 'billable',     label: 'Billable' },
                { key: 'non-billable', label: 'Non-billable' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    filter === tab.key ? 'bg-agency-accent text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── entries table ── */}
        <div className="bg-agency-card border border-agency-border rounded-xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-gray-400 text-sm">No entries match the current filter.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-agency-border">
                  {['Date','Member','Description','Type','Hours','Billable'].map(col => (
                    <th key={col} className="text-left text-[11px] text-gray-500 uppercase tracking-wide px-4 py-3 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((entry, i) => {
                  const isBillable = isBillableVal(entry.billable)
                  return (
                    <tr key={entry.id || `${entry.member}-${entry.log_date}-${i}`} className="border-b border-agency-border/50 hover:bg-agency-bg/30 transition-colors">
                      {/* date */}
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(entry.log_date)}</td>

                      {/* member */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor(entry.team_member) }}>
                            {initials(entry.team_member)}
                          </div>
                          <span className="text-sm text-white whitespace-nowrap">{entry.team_member}</span>
                        </div>
                      </td>

                      {/* description */}
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs">
                        <span className="line-clamp-2">{entry.description}</span>
                      </td>

                      {/* type */}
                      <td className="px-4 py-3">
                        <Pill label={entry.task_type || 'Development'} color={TYPE_COLOR[entry.task_type] || 'gray'} />
                      </td>

                      {/* hours */}
                      <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap">
                        {formatHours(entry.hours)}
                      </td>

                      {/* billable */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${isBillable ? 'text-green-400' : 'text-gray-500'}`}>
                          {isBillable ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* totals footer */}
              <tfoot>
                <tr className="border-t border-agency-border bg-agency-bg/50">
                  <td colSpan={4} className="px-4 py-3 text-[11px] text-gray-500 uppercase tracking-wide">
                    {displayed.length} entries
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap">
                    {formatHours(displayed.reduce((s, e) => s + (e.hours || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-gray-500">
                    {formatHours(displayed.filter(e => isBillableVal(e.billable)).reduce((s, e) => s + (e.hours || 0), 0))} billable
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}