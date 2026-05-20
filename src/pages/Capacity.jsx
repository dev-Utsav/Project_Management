export default function Capacity({ team }) {
  const totalCapacity = team.reduce((acc, curr) => acc + curr.capacity, 0);
  const totalAllocated = team.reduce((acc, curr) => acc + (curr.allocated || 0), 0);
  const overloadedCount = team.filter(t => (t.allocated || 0) > t.capacity).length;
  const availableHours = totalCapacity - totalAllocated;
  const overloadedMember = team.find(t => (t.allocated || 0) > t.capacity);
  const helperMember = overloadedMember
    ? team.find(t => t.id !== overloadedMember.id && (t.allocated || 0) < t.capacity && t.role === overloadedMember.role) ||
      team.find(t => t.id !== overloadedMember.id && (t.allocated || 0) < t.capacity)
    : null;
  const utilPct = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

  const getBarColor = (allocated, capacity) => {
    const ratio = allocated / capacity;
    if (ratio > 1) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
    if (ratio >= 0.8) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
  };

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capacity Chart */}
        <div className="lg:col-span-2 bg-agency-card rounded-xl border border-agency-border p-6 shadow-sm">
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
          
          <div className={`${overloadedMember ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'} p-5 rounded-xl shadow-sm border`}>
            <div className="flex gap-3 mb-2">
              <span className={overloadedMember ? 'text-red-500' : 'text-green-500'}>{overloadedMember ? '⚠️' : '✨'}</span>
              <span className={`font-medium ${overloadedMember ? 'text-red-500' : 'text-green-500'}`}>
                {overloadedMember ? 'Overload Warning' : 'Workload Balanced'}
              </span>
            </div>
            <p className={`text-sm ${overloadedMember ? 'text-red-200/80' : 'text-green-200/80'} leading-relaxed`}>
              {overloadedMember ? (
                `${overloadedMember.name} (${overloadedMember.role}) is allocated for ${overloadedMember.allocated}h this week (capacity: ${overloadedMember.capacity}h). Consider reassigning ${overloadedMember.allocated - overloadedMember.capacity}h to ${helperMember ? helperMember.name : 'another member'} who has available capacity.`
              ) : (
                'All team members are within their weekly capacity limits. Great workload balance across the board!'
              )}
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl shadow-sm">
            <div className="flex gap-3 mb-2">
              <span className="text-amber-500">⚡</span>
              <span className="font-medium text-amber-500">Sprint Risk</span>
            </div>
            <p className="text-sm text-amber-200/80 leading-relaxed">
              {utilPct > 85 ? (
                `Overall team utilization is high at ${utilPct}%. Any unexpected task overruns may put the sprint goals at risk.`
              ) : overloadedCount > 0 ? (
                `High resource allocation for overloaded team members could result in bottlenecks. Keep an eye on task dependencies.`
              ) : (
                'Team capacity is well-distributed. Delivery risks related to resource constraints are currently low.'
              )}
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-xl shadow-sm">
            <div className="flex gap-3 mb-2">
              <span className="text-green-500">✨</span>
              <span className="font-medium text-green-500">On Track</span>
            </div>
            <p className="text-sm text-green-200/80 leading-relaxed">
              {overloadedCount === 0 ? (
                'Resource allocations are perfectly aligned with active sprint requirements. Progress remains stable.'
              ) : (
                'Minor bottlenecks detected but overall critical path milestones are currently staffed and on track.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
