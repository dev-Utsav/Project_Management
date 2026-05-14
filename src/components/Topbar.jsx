export default function Topbar({ activePage }) {
  const pageTitles = {
    dashboard: 'Command Dashboard',
    timesheet: 'Timesheet Entry',
    health: 'Project Health Board',
    capacity: 'Team Capacity',
    documents: 'Document Hub',
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-agency-border bg-agency-bg/80 backdrop-blur-md sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-100 tracking-tight">
          {pageTitles[activePage] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors">
          <span>🔔</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
        </button>
        <button className="px-4 py-2 bg-agency-accent hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          + New Task
        </button>
      </div>
    </header>
  );
}
