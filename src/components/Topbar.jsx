export default function Topbar({ activePage }) {
  const pageTitles = {
    dashboard: 'Command Dashboard',
    timesheet: 'Timesheet Entry',
    health: 'Project Health Board',
    capacity: 'Team Capacity',
    documents: 'Document Hub',
    openpoints: 'Open Points Log',
    setup: 'Project Workspace',
    workboard: 'Execution Workboard',
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-agency-border bg-agency-bg/80 backdrop-blur-md sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-100 tracking-tight">
          {pageTitles[activePage] || 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Topbar actions can go here in the future */}
      </div>
    </header>
  );
}
