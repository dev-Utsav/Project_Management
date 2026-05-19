import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Sidebar({ activePage, setActivePage, project, width, setWidth }) {
  const [isResizing, setIsResizing] = useState(false);
  const [openPointsCount, setOpenPointsCount] = useState(0);

  useEffect(() => {
    async function fetchOpenPointsCount() {
      const { count, error } = await supabase
        .from('open_points')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', 1)
        .eq('status', 'open');
      
      if (!error && count !== null) {
        setOpenPointsCount(count);
      }
    }

    fetchOpenPointsCount();

    const channel = supabase
      .channel('open_points_sidebar_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'open_points' },
        () => fetchOpenPointsCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth > 180 && newWidth < 400) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWidth]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'timesheet', label: 'Timesheet', icon: '⏱️' },
    // { id: 'health', label: 'Health Board', icon: '🏥', badge: 3 },
    { id: 'capacity', label: 'Capacity', icon: '👥' },
    { id: 'documents', label: 'Document Hub', icon: '📄' },
    { id: 'openpoints', label: 'Open Points', icon: '📌', badge: openPointsCount > 0 ? openPointsCount : null },
    { id: 'setup', label: 'Projects', icon: '📂' },
    { id: 'workboard', label: 'Workboard', icon: '📋' },
  ]

  return (
    <aside 
      style={{ width }}
      className="flex flex-col bg-agency-sidebar border-r border-agency-border h-full pt-6 px-4 pb-6 relative flex-shrink-0 select-none transition-[width] duration-0"
    >
      <div 
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-agency-accent/50 z-50 transition-colors"
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
      />
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded bg-agency-accent flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          M
        </div>
        <span className="font-semibold text-gray-100 tracking-tight">Magneto</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
              activePage === item.id
                ? 'bg-agency-accent/10 text-agency-accent border border-agency-accent/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-agency-card'
            }`}
          >
            <span>{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-medium border border-red-500/20">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        {project && (
          <div className="bg-agency-card rounded-lg p-3 border border-agency-border mb-4">
            <div className="text-xs text-gray-500 mb-1">Active Project</div>
            <div className="font-medium text-sm text-gray-200 truncate">{project.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{project.client} · Sprint {project.sprintNumber}</div>
          </div>
        )}

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-agency-accent/20 flex items-center justify-center text-xs font-medium text-agency-accent border border-agency-accent/30">
            UV
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-200">Utsav Dodiya</span>
            <span className="text-xs text-gray-500">Project Coordinator</span>
          </div>
        </div>
      </div>
    </aside>
  )
} 