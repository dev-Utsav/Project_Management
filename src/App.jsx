import { useState, useEffect } from 'react'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Timesheet from './pages/Timesheet'
// import HealthBoard from './pages/HealthBoard'
import Capacity from './pages/Capacity'
import DocumentHub from './pages/DocumentHub'
import { supabase } from './lib/supabase'
import OpenPoints from './pages/OpenPoints'
import ProjectSetup from './pages/ProjectSetup'
import WorkBoard from './pages/WorkBoard'
import AICopilot from './components/AICopilot'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [openPointsCount, setOpenPointsCount] = useState(0)

  useEffect(() => {
    fetchAll()
  }, [])

  const navigateToProject = (id) => {
    setSelectedProjectId(id)
    setActivePage('setup')
  }

  async function fetchAll() {
    setLoading(true)
    try {
      const [projectRes, tasksRes, timesheetsRes, teamRes, openPointsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', 1).single(),
        supabase.from('tasks').select('*').eq('project_id', 1).order('id', { ascending: false }),
        supabase.from('timesheets').select('*').eq('project_id', 1).order('log_date', { ascending: false }),
        supabase.from('team_members').select('*').eq('project_id', 1).order('id'),
        supabase.from('open_points').select('*', { count: 'exact', head: true }).eq('project_id', 1).eq('status', 'open')
      ])

      if (projectRes.data) setProject(mapProject(projectRes.data))
      if (tasksRes.data) setTasks(tasksRes.data.map(mapTask))
      if (timesheetsRes.data) setTimesheets(timesheetsRes.data.map(mapTimesheet))
      if (teamRes.data) {
        const rawTasks = tasksRes.data || []
        const mappedTeam = teamRes.data.map(m => {
          const memberTasks = rawTasks.filter(t => t.assignee === m.name && t.status !== 'done' && t.status !== 'Done')
          const allocated = memberTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
          return {
            ...mapTeamMember(m),
            allocated: allocated
          }
        })
        setTeam(mappedTeam)
      }
      if (openPointsRes && openPointsRes.count !== null && openPointsRes.count !== undefined) {
        setOpenPointsCount(openPointsRes.count)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    }
    setLoading(false)
  }

  function mapProject(p) {
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status,
      sprintNumber: p.sprint_number,
      sprintStart: p.sprint_start,
      sprintEnd: p.sprint_end,
      goLiveDate: formatDate(p.go_live_date),
      totalSprints: p.total_sprints,
      teamLead: p.team_lead,
      ragStatus: p.rag_status,
      estimatedHours: p.hours_estimated,
      hoursBurned: p.hours_burned,
      tasksTotal: p.tasks_total,
      tasksDone: p.tasks_done,
    }
  }

  function mapTask(t) {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      assignee: t.assignee,
      role: t.role,
      status: mapStatus(t.status),
      priority: capitalize(t.priority),
      estimated: t.estimated_hours,
      logged: t.logged_hours,
      epic: t.epic,
      sprintNumber: t.sprint_number,
    }
  }

  function mapTimesheet(t) {
    return {
      id: t.id,
      member: t.team_member,
      role: t.role,
      date: t.log_date,
      description: t.description,
      hours: parseFloat(t.hours),
      billable: t.billable === 'yes' || t.billable === 'true' || t.billable === true,
      taskType: t.task_type,
      status: t.status,
    }
  }

  function mapTeamMember(m) {
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      roleShort: m.role_short,
      avatar: m.avatar,
      email: m.email,
      capacity: m.capacity_hours,
      allocated: m.allocated_hours,
      status: m.status,
    }
  }

  function mapStatus(status) {
    const map = {
      done: 'Done',
      in_progress: 'In Progress',
      todo: 'To Do',
      blocked: 'Blocked',
      review: 'Review',
    }
    return map[status] || status
  }

  function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-agency-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-agency-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading project data...</p>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigateToProject={navigateToProject} />
      case 'timesheet':
        return <Timesheet timesheets={timesheets} team={team} onRefresh={fetchAll} />
      // case 'health':
      //   return <HealthBoard tasks={tasks} project={project} onRefresh={fetchAll} />
      case 'capacity':
        return <Capacity team={team} />
      case 'documents':
        return <DocumentHub project={project} />
      case 'openpoints':
        return <OpenPoints onPointsChanged={fetchAll} />
      case 'setup':
        return <ProjectSetup selectedProjectId={selectedProjectId} onClearProject={() => setSelectedProjectId(null)} />
      case 'workboard':
        return <WorkBoard onRaisePoint={fetchAll} />
      default:
        return <Dashboard project={project} tasks={tasks} timesheets={timesheets} onNavigateToProject={navigateToProject} />
    }
  }

  return (
    <div className="relative h-screen w-screen bg-agency-bg font-sans overflow-hidden select-none">
      {/* Background Dot Grid */}
      <div className="absolute inset-0 bg-dots pointer-events-none z-0"></div>

      {/* Radial Gradient Glow Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-blue-500/10 blur-[130px] pointer-events-none z-0 animate-[pulse_8s_ease-in-out_infinite]"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-purple-500/10 blur-[140px] pointer-events-none z-0 animate-[pulse_10s_ease-in-out_infinite_2s]"></div>
      <div className="absolute top-[30%] left-[30%] w-[35vw] h-[35vw] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0"></div>

      {/* Floating Modern Header */}
      <Header 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openPointsCount={openPointsCount} 
        project={project}
      />

      {/* Main Canvas Area */}
      <main className="h-full w-full pt-20 overflow-hidden relative z-10">
        <div key={activePage} className="page-animate-entry h-full w-full">
          {renderPage()}
        </div>
      </main>

      {/* Floating Copilot */}
      <AICopilot project={project} tasks={tasks} timesheets={timesheets} team={team} />
    </div>
  )
}