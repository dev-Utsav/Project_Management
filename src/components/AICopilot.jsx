import { useState, useEffect } from 'react'

export default function AICopilot({ project, tasks, timesheets, team }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-ai-copilot', handleToggle);
    return () => window.removeEventListener('toggle-ai-copilot', handleToggle);
  }, []);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Project Copilot. I have analyzed your project metrics, team workload, and logs. Ask me anything or select a quick option below!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputText, setInputText] = useState('')

  // Data helpers for context-aware responses
  const getBottlenecks = () => {
    const overloaded = team.filter(m => (m.allocated || 0) > m.capacity)
    const blockedTasks = tasks.filter(t => t.status === 'Blocked')
    
    let msg = ""
    if (overloaded.length > 0) {
      msg += `⚠️ **Overload Alert**: ${overloaded.map(o => `${o.name} (${o.allocated}h/${o.capacity}h allocated)`).join(', ')} exceed weekly capacity. \n\n`
    }
    if (blockedTasks.length > 0) {
      msg += `🚨 **Blocked Tasks**: There are ${blockedTasks.length} blocked tasks: ${blockedTasks.map(t => `"${t.title}"`).join(', ')}. \n\n`
    }
    if (!msg) {
      msg = "✅ **Resource Health**: Great news! No team members are overloaded, and there are currently no blocked tasks in the queue."
    }
    return msg
  }

  const getSprintAnalysis = () => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'Done' || t.status?.toLowerCase() === 'done').length
    const progress = tasks.filter(t => t.status === 'In Progress').length
    const todo = tasks.filter(t => t.status === 'To Do' || t.status === 'todo').length
    const rate = total ? Math.round((done / total) * 100) : 0

    return `📊 **Sprint Progress Analysis**:
* **Completion Rate**: ${rate}% of all tasks are completed (${done}/${total}).
* **Active Working**: ${progress} tasks currently in progress.
* **To Do Queue**: ${todo} tasks remaining in backlog.
* **Estimated Burn**: ${project?.hoursBurned || 0} hours burned out of ${project?.estimatedHours || 0} estimated hours.
* **RAG Status**: Project status is evaluated as **${project?.ragStatus || 'Green'}**.`
  }

  const getHealthAudit = () => {
    const burned = project?.hoursBurned || 0
    const est = project?.estimatedHours || 0
    const burnRatio = est > 0 ? Math.round((burned / est) * 100) : 0

    let recommendations = "👍 Burn-up matches estimation timeline. The project velocity is stable."
    if (burnRatio > 90 && tasks.filter(t => t.status !== 'Done').length > 5) {
      recommendations = "⚠️ **High Burn Warning**: Budget spent is at ${burnRatio}% but significant work remains. Suggest reducing scope."
    }

    return `🩺 **Project Health Report**:
* **Budget Burn**: ${burned}h logged / ${est}h estimated (${burnRatio}% burned).
* **Delivery Schedule**: Target launch is **${project?.goLiveDate || 'on schedule'}**.
* **AI Evaluation**: ${recommendations}`
  }

  const handleSend = (text) => {
    if (!text.trim()) return

    const userMsg = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')

    setTimeout(() => {
      let replyText = ""
      const q = text.toLowerCase()

      if (q.includes('bottleneck') || q.includes('block') || q.includes('overload')) {
        replyText = getBottlenecks()
      } else if (q.includes('sprint') || q.includes('progress') || q.includes('completion')) {
        replyText = getSprintAnalysis()
      } else if (q.includes('health') || q.includes('audit') || q.includes('burn')) {
        replyText = getHealthAudit()
      } else if (q.includes('ticket') || q.includes('draft') || q.includes('create')) {
        replyText = `📝 **Drafted Task Ticket Template**:
**Title**: [Task Name]
**Description**: As a user, I want to [goal] so that [benefit].
**Acceptance Criteria**:
1. Feature performs as expected.
2. Verified responsive styling.
3. Unit tests passing.
*Feel free to copy and log this ticket inside the Project Setup tab!*`
      } else {
        replyText = `I have scanned the project workspace. To help you better, you can ask me about:
1. **"Check bottlenecks"** to find overloaded members or blocked tasks.
2. **"Sprint progress"** to calculate backlog status and completion rates.
3. **"Health audit"** to verify task burning and project timeline RAG status.
4. **"Draft ticket"** to generate clean task descriptions.`
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }, 600)
  }

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-2.5 uppercase tracking-widest border border-white/10"
      >
        <span className="animate-pulse relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        🤖 AI PM Copilot
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] z-50 bg-[#121620]/90 backdrop-blur-xl border border-agency-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease]">
          {/* Header */}
          <div className="p-4 border-b border-agency-border bg-agency-bg/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-agency-accent/20 flex items-center justify-center text-lg">🤖</div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">AI PM Copilot</h3>
                <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Context Aware</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user' 
                    ? 'bg-agency-accent text-white rounded-br-none' 
                    : 'bg-[#1a2030] text-gray-200 border border-agency-border rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span className="block text-[8px] text-gray-500 mt-1.5 text-right font-mono">{m.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick suggestions */}
          <div className="p-3 border-t border-agency-border/50 bg-[#161c2c]/40 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button onClick={() => handleSend("Analyze Sprint Progress")} className="px-2.5 py-1 bg-agency-bg border border-agency-border hover:border-agency-accent/40 rounded-full text-[10px] text-gray-400 hover:text-white transition-all font-bold">📊 Sprint Progress</button>
            <button onClick={() => handleSend("Check Bottlenecks")} className="px-2.5 py-1 bg-agency-bg border border-agency-border hover:border-agency-accent/40 rounded-full text-[10px] text-gray-400 hover:text-white transition-all font-bold">⚠️ Bottlenecks</button>
            <button onClick={() => handleSend("Project Health Audit")} className="px-2.5 py-1 bg-agency-bg border border-agency-border hover:border-agency-accent/40 rounded-full text-[10px] text-gray-400 hover:text-white transition-all font-bold">🩺 Health Audit</button>
            <button onClick={() => handleSend("Draft Task Ticket")} className="px-2.5 py-1 bg-agency-bg border border-agency-border hover:border-agency-accent/40 rounded-full text-[10px] text-gray-400 hover:text-white transition-all font-bold">📝 Draft Ticket</button>
          </div>

          {/* Form Area */}
          <div className="p-3 border-t border-agency-border bg-agency-bg flex gap-2">
            <input 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(inputText)}
              placeholder="Ask about team bottlenecks, tasks..."
              className="flex-1 bg-[#1a2030] border border-agency-border text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-agency-accent transition-colors"
            />
            <button 
              onClick={() => handleSend(inputText)}
              className="px-4 bg-agency-accent hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
