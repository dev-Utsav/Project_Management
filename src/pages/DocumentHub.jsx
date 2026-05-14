import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TEMPLATES = [
  { name: 'Weekly Update', type: 'Client Facing', icon: '📋' },
  { name: 'Sprint Plan', type: 'Client Facing', icon: '🗓️' },
  { name: 'Sprint Summary', type: 'Client Facing', icon: '📊' },
  { name: 'Open Points Log', type: 'Client Facing', icon: '📌' },
  { name: 'Change Request', type: 'Client Facing', icon: '🔄' },
  { name: 'Go-Live Checklist', type: 'Client Facing', icon: '🚀' },
  { name: 'Project Closure Report', type: 'Client Facing', icon: '✅' },
  { name: 'Discovery Notes', type: 'Internal', icon: '🔍' },
  { name: 'Technical Spec', type: 'Internal', icon: '⚙️' },
  { name: 'Risk Log', type: 'Internal', icon: '⚠️' },
  { name: 'Retrospective Report', type: 'Internal', icon: '🔁' },
  { name: 'Resource Allocation Plan', type: 'Internal', icon: '👥' },
]

export default function DocumentHub({ project }) {
  const [documents, setDocuments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({
    title: '',
    drive_link: '',
    notes: '',
  })

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', 1)
      .order('created_at', { ascending: false })
    if (!error) setDocuments(data || [])
  }

  function openModal(template) {
    setSelectedTemplate(template)
    setForm({ title: template.name, drive_link: '', notes: '' })
    setError(null)
    setShowModal(true)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    if (!form.drive_link.trim()) {
      setError('Please add a Google Drive link.')
      return
    }
    if (!form.drive_link.startsWith('http')) {
      setError('Please enter a valid URL starting with http.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase.from('documents').insert([{
        project_id: 1,
        title: form.title,
        type: selectedTemplate?.type || 'Internal',
        content: form.drive_link,
        status: 'saved',
        created_by: 'Utsav Dodiya',
      }])

      if (insertError) throw insertError

      setShowModal(false)
      setForm({ title: '', drive_link: '', notes: '' })
      fetchDocuments()
    } catch (err) {
      setError('Failed to save document. Please try again.')
      console.error(err)
    }

    setSubmitting(false)
  }

  async function handleDelete(id) {
    await supabase.from('documents').delete().eq('id', id)
    fetchDocuments()
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filteredTemplates = filter === 'All'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.type === filter)

  const latestDoc = documents[0]

  return (
    <div className="p-8 space-y-8 h-[calc(100vh-64px)] overflow-y-auto">

      {/* Latest Document */}
      {latestDoc && (
        <div className="bg-agency-card p-6 rounded-xl border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.08)] relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Latest
                </span>
                <span className="text-sm text-gray-400">{latestDoc.type}</span>
                <span className="text-sm text-gray-600">· {formatDate(latestDoc.created_at)}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-100">{latestDoc.title}</h2>
              <p className="text-gray-500 mt-1 text-sm">Added by {latestDoc.created_by}</p>
            </div>
            <div className="flex gap-3">
              <a
                href={latestDoc.content}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-lg font-semibold transition-colors text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              >
                Open in Drive ↗
              </a>
              <button
                onClick={() => handleDelete(latestDoc.id)}
                className="px-3 py-2.5 bg-agency-bg border border-agency-border text-gray-500 hover:text-red-400 rounded-lg transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Documents */}
      {documents.length > 0 && (
        <div className="bg-agency-card rounded-xl border border-agency-border overflow-hidden">
          <div className="p-5 border-b border-agency-border">
            <h2 className="text-lg font-medium text-gray-200">Saved Documents ({documents.length})</h2>
          </div>
          <div className="divide-y divide-agency-border">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-agency-bg/30 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xl">📄</span>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{doc.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatDate(doc.created_at)} · {doc.created_by}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    doc.type === 'Client Facing'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {doc.type}
                  </span>
                  <a
                    href={doc.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-agency-bg border border-agency-border text-gray-400 hover:text-agency-accent hover:border-agency-accent rounded-lg text-xs transition-colors"
                  >
                    Open ↗
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Library */}
      <div>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-medium text-gray-200">Template Library</h2>
          <div className="flex gap-2">
            {['All', 'Client Facing', 'Internal'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-agency-accent text-white'
                    : 'bg-agency-bg border border-agency-border text-gray-400 hover:text-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const saved = documents.filter(d => d.title === template.name)
            return (
              <div
                key={template.name}
                onClick={() => openModal(template)}
                className="bg-agency-card p-5 rounded-xl border border-agency-border hover:border-agency-accent/50 transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl">{template.icon}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    template.type === 'Client Facing'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {template.type === 'Client Facing' ? 'Client' : 'Internal'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-200 mb-1 group-hover:text-agency-accent transition-colors">{template.name}</h3>
                <p className="text-xs text-gray-600">
                  {saved.length > 0
                    ? `${saved.length} saved · Last ${formatDate(saved[0].created_at)}`
                    : 'No documents yet — click to add'
                  }
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-agency-card border border-agency-border rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{selectedTemplate?.icon} {selectedTemplate?.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add Google Drive link to save this document</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Document title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-agency-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Google Drive link *</label>
                <input
                  name="drive_link"
                  value={form.drive_link}
                  onChange={handleChange}
                  placeholder="https://docs.google.com/..."
                  className="w-full bg-agency-bg border border-agency-border rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-agency-accent"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-agency-bg border border-agency-border text-gray-400 rounded-lg text-sm font-medium hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-agency-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}