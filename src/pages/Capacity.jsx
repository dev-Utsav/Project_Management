export default function Capacity({ team }) {
  const totalCapacity = team.reduce((acc, curr) => acc + curr.capacity, 0);
  const totalAllocated = team.reduce((acc, curr) => acc + (curr.allocated || 0), 0);
  const overloadedCount = team.filter(t => (t.allocated || 0) > t.capacity).length;
  const availableHours = totalCapacity - totalAllocated;

  const getBarColor = (allocated, capacity) => {
    const ratio = allocated / capacity;
    if (ratio > 1) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
    if (ratio >= 0.8) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
  };

  return (
    <div className="p-8 space-y-8 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border shadow-sm">
          <div className="text-gray-400 text-sm mb-2 font-medium">Total Capacity</div>
          <div className="text-3xl font-semibold text-gray-100">{totalCapacity}h</div>
        </div>
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border shadow-sm">
          <div className="text-gray-400 text-sm mb-2 font-medium">Allocated</div>
          <div className="text-3xl font-semibold text-agency-accent">{totalAllocated}h</div>
        </div>
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border shadow-sm">
          <div className="text-gray-400 text-sm mb-2 font-medium">Overloaded</div>
          <div className={`text-3xl font-semibold ${overloadedCount > 0 ? 'text-red-500' : 'text-gray-100'}`}>
            {overloadedCount} <span className="text-gray-500 text-xl font-normal">people</span>
          </div>
        </div>
        <div className="bg-agency-card p-6 rounded-xl border border-agency-border shadow-sm">
          <div className="text-gray-400 text-sm mb-2 font-medium">Available</div>
          <div className="text-3xl font-semibold text-green-500">{Math.max(0, availableHours)}h</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Capacity Chart */}
        <div className="col-span-2 bg-agency-card rounded-xl border border-agency-border p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-200 mb-6">Team Utilization</h2>
          <div className="space-y-6">
            {team.map((member, idx) => {
              const allocated = member.allocated || 0;
              const ratio = Math.min((allocated / member.capacity) * 100, 100);
              
              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-200">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className={allocated > member.capacity ? 'text-red-400 font-medium' : 'text-gray-300'}>{allocated}h</span>
                      <span className="text-gray-500"> / {member.capacity}h</span>
                    </div>
                  </div>
                  <div className="w-full bg-agency-bg rounded-full h-2.5 border border-agency-border">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor(allocated, member.capacity)}`} 
                      style={{ width: `${ratio}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Suggestions Panel */}
        <div className="col-span-1 space-y-4">
          <h2 className="text-lg font-medium text-gray-200 mb-2">AI Resource Insights</h2>
          
          <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl shadow-sm">
            <div className="flex gap-3 mb-2">
              <span className="text-red-500">⚠️</span>
              <span className="font-medium text-red-500">Overload Warning</span>
            </div>
            <p className="text-sm text-red-200/80 leading-relaxed">
              Mike (Frontend) is allocated for 45h this week. Consider reassigning 5h of "Checkout Optimization" to Sarah who has available capacity.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl shadow-sm">
            <div className="flex gap-3 mb-2">
              <span className="text-amber-500">⚡</span>
              <span className="font-medium text-amber-500">Sprint Risk</span>
            </div>
            <p className="text-sm text-amber-200/80 leading-relaxed">
              Backend capacity is tight. If the database migration (Est. 12h) runs over, it will block the remaining API tasks.
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-xl shadow-sm">
            <div className="flex gap-3 mb-2">
              <span className="text-green-500">✨</span>
              <span className="font-medium text-green-500">On Track</span>
            </div>
            <p className="text-sm text-green-200/80 leading-relaxed">
              Design resources are perfectly balanced this sprint. The UI handoff is scheduled on time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
