import { useState } from 'react';

export default function Header({ activePage, setActivePage, openPointsCount }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'timesheet', label: 'Timesheet' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'documents', label: 'Docs' },
    { id: 'openpoints', label: 'Open Points', badge: openPointsCount > 0 ? openPointsCount : null },
    { id: 'setup', label: 'Projects' },
    { id: 'workboard', label: 'Workboard' },
  ];

  return (
    <div className="fixed top-5 left-0 right-0 z-50 px-4 md:px-8 flex justify-center">
      {/* Outer Floating Pill (Refined Glassmorphic) */}
      <div className="bg-[#090b11]/30 backdrop-blur-xl border border-white/[0.08] hover:bg-[#090b11]/45 hover:border-white/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(255,255,255,0.02)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="h-12 px-3 flex items-center justify-between md:justify-center gap-4">
          
          {/* Mobile Active Page Label */}
          <div className="md:hidden text-white text-[13px] font-bold select-none px-4">
            {navItems.find(n => n.id === activePage)?.label}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`text-[13px] font-semibold tracking-wide transition-all duration-200 flex items-center justify-center ${
                    isActive
                      ? 'bg-agency-accent text-white px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.35)] font-bold'
                      : 'text-gray-400 hover:text-white px-4 py-1.5 rounded-full border border-transparent hover:bg-white/[0.06] hover:backdrop-blur-xs hover:border-white/10'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 border shadow-[0_0_8px_rgba(239,68,68,0.4)] ${
                      isActive 
                        ? 'bg-red-500 text-white border-red-600' 
                        : 'bg-red-500 text-white border-red-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <span className="text-sm">{isOpen ? '✕' : '☰'}</span>
          </button>

        </div>

        {/* Mobile Dropdown Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#0c0e15]/95 backdrop-blur-md rounded-b-3xl p-4 animate-[fadeIn_0.2s_ease-out] min-w-[200px]">
            <nav className="flex flex-col gap-2.5">
              {navItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-red-600 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

      </div>
    </div>
  );
}
