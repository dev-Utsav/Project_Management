import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Timesheet from './pages/Timesheet'
// import HealthBoard from './pages/HealthBoard'
import Capacity from './pages/Capacity'
import DocumentHub from './pages/DocumentHub'
import { supabase } from './lib/supabase'
import OpenPoints from './pages/OpenPoints'
import ProjectSetup from './pages/ProjectSetup'
import WorkBoard from './pages/WorkBoard'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

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
      const [projectRes, tasksRes, timesheetsRes, teamRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', 1).single(),
        supabase.from('tasks').select('*').eq('project_id', 1).order('id', { ascending: false }),
        supabase.from('timesheets').select('*').eq('project_id', 1).order('log_date', { ascending: false }),
        supabase.from('team_members').select('*').eq('project_id', 1).order('id'),
      ])

      if (projectRes.data) setProject(mapProject(projectRes.data))
      if (tasksRes.data) setTasks(tasksRes.data.map(mapTask))
      if (timesheetsRes.data) setTimesheets(timesheetsRes.data.map(mapTimesheet))
      if (teamRes.data) setTeam(teamRes.data.map(mapTeamMember))
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
      billable: t.billable === 'yes',
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
        return <OpenPoints />
      case 'setup':
        return <ProjectSetup selectedProjectId={selectedProjectId} onClearProject={() => setSelectedProjectId(null)} />
      case 'workboard':
        return <WorkBoard />
      default:
        return <Dashboard project={project} tasks={tasks} timesheets={timesheets} />
    }
  }

  return (
    <div className="flex h-screen bg-agency-bg font-sans overflow-hidden transition-colors duration-300">
      <Sidebar activePage={activePage} setActivePage={setActivePage} project={project} width={sidebarWidth} setWidth={setSidebarWidth} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar activePage={activePage} onRefresh={fetchAll} />
        <main className="flex-1 bg-agency-bg relative overflow-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}