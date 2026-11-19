import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowUpRight, BarChart3, BookOpen, CheckCircle2,
  ChevronRight, CircleHelp, Code2, Flame, LayoutDashboard, Menu,
  Play, RotateCcw, Search, Settings, Sparkles, Target, Trophy, X,
} from 'lucide-react'
import './App.css'

type Difficulty = 'easy' | 'medium' | 'hard'
type Language = 'javascript' | 'python' | 'java'
type Problem = {
  _id?: string
  slug: string
  title: string
  difficulty: Difficulty
  statement: string
  starterCode?: Record<Language, string>
  tests?: Array<{ input: string; expectedOutput: string }>
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Problems', icon: Code2, count: '10' },
  { label: 'Progress', icon: BarChart3 },
]

const statCards = [
  { label: 'Problems solved', value: '12', detail: '+3 this week', icon: CheckCircle2, tone: 'green' },
  { label: 'Current streak', value: '4 days', detail: 'Keep it going', icon: Flame, tone: 'orange' },
  { label: 'Total points', value: '840', detail: 'Top 18% this month', icon: Trophy, tone: 'purple' },
]

function App() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [activeView, setActiveView] = useState<'dashboard' | 'problem'>('dashboard')
  const [language, setLanguage] = useState<Language>('javascript')
  const [code, setCode] = useState('')
  const [runOutput, setRunOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadProblems = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/problems`)
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
      setProblems(await response.json())
    } catch {
      setError('We could not load your problem set. Check that the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProblems()
  }, [])

  useEffect(() => {
    const openProblemFromHash = async () => {
      const slug = window.location.hash.replace('#/problem/', '')
      if (!slug) return
      await openProblem({ slug } as Problem)
    }
    void openProblemFromHash()

    const onHashChange = () => {
      if (!window.location.hash.startsWith('#/problem/')) {
        setActiveView('dashboard')
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const filteredProblems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return problems.filter((problem) =>
      (!query || problem.title.toLowerCase().includes(query) || problem.statement.toLowerCase().includes(query)) &&
      (difficulty === 'all' || problem.difficulty === difficulty),
    )
  }, [difficulty, problems, search])

  async function openProblem(problem: Problem) {
    setNotice(null)
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/problems/${problem.slug}`)
      if (!response.ok) throw new Error('Problem not found')
      const detail: Problem = await response.json()
      setSelectedProblem(detail)
      setActiveView('problem')
      setActiveNav('Problems')
      setLanguage('javascript')
      setCode(detail.starterCode?.javascript ?? '')
      setRunOutput('')
      window.location.hash = `#/problem/${detail.slug}`
      window.scrollTo({ top: 0 })
    } catch {
      setError('Could not open this problem.')
    } finally {
      setIsLoading(false)
    }
  }

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage)
    setCode(selectedProblem?.starterCode?.[nextLanguage] ?? '')
    setRunOutput('')
  }

  const runCode = async () => {
    if (!selectedProblem?.tests) return
    setIsRunning(true)
    setRunOutput('')
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: selectedProblem._id ?? selectedProblem.slug,
          language,
          code,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Submission failed')

      const testOutput = (result.results as Array<{
        input: string
        expectedOutput: string
        actualOutput: string
        passed: boolean
        stderr: string | null
      }>).map((test, index) =>
        `Test ${index + 1}: ${test.passed ? 'Passed' : 'Failed'}\nInput: ${test.input}\nExpected: ${test.expectedOutput}\nOutput: ${test.actualOutput || test.stderr || 'No output'}`,
      ).join('\n\n')

      const metrics = [
        result.executionTimeMs !== null ? `Execution: ${result.executionTimeMs} ms` : null,
        result.memoryUsedKb !== null ? `Memory: ${result.memoryUsedKb} KB` : null,
        result.complexity ? `Estimated time: ${result.complexity.time}` : null,
        result.complexity ? `Estimated space: ${result.complexity.space}` : null,
      ].filter(Boolean).join('\n')

      setRunOutput([testOutput, metrics].filter(Boolean).join('\n\n'))
    } catch (submissionError) {
      setRunOutput(submissionError instanceof Error ? submissionError.message : 'Submission failed')
    } finally {
      setIsRunning(false)
    }
  }

  const resetCode = () => {
    setCode(selectedProblem?.starterCode?.[language] ?? '')
    setRunOutput('')
  }

  const goToDashboard = () => {
    window.location.hash = ''
    setActiveView('dashboard')
    setActiveNav('Overview')
  }

  const showSection = (label: string) => {
    setActiveNav(label)
    setNotice(null)
    setIsSidebarOpen(false)
    if (label === 'Problems') {
      goToDashboard()
      window.setTimeout(() => document.getElementById('problem-library')?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else if (label === 'Overview') {
      goToDashboard()
    } else {
      setNotice('Progress data will appear after submissions are connected.')
    }
  }

  const currentProblem = selectedProblem ?? filteredProblems[0]

  if (activeView === 'problem' && selectedProblem) {
    return (
      <div className="app-shell problem-app">
        <main className="problem-workspace">
          <header className="problem-topbar">
            <button type="button" className="icon-button" onClick={goToDashboard} aria-label="Back to problems"><ArrowLeft size={18} /></button>
            <div className="problem-breadcrumb">
              <span>Problem</span><ChevronRight size={14} /><strong>{selectedProblem.title}</strong>
            </div>
            <div className="problem-status"><span className={`difficulty ${selectedProblem.difficulty}`}>{selectedProblem.difficulty}</span></div>
          </header>

          <div className="workspace-grid">
            <article className="description-panel">
              <div className="description-heading">
                <span className="eyebrow">Challenge</span>
                <h1>{selectedProblem.title}</h1>
              </div>
              <p className="statement">{selectedProblem.statement}</p>

              <div className="examples">
                <h2>Examples</h2>
                {(selectedProblem.tests ?? []).slice(0, 2).map((test, index) => (
                  <div className="example" key={`${test.input}-${index}`}>
                    <span>Example {index + 1}</span>
                    <div><b>Input</b><code>{test.input}</code></div>
                    <div><b>Output</b><code>{test.expectedOutput}</code></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="editor-panel">
              <div className="editor-toolbar">
                <div className="language-tabs" aria-label="Programming language">
                  {(['javascript', 'python', 'java'] as const).map((item) => (
                    <button type="button" className={language === item ? 'active' : ''} onClick={() => changeLanguage(item)} key={item}>
                      {item === 'javascript' ? 'JavaScript' : item === 'python' ? 'Python' : 'Java'}
                    </button>
                  ))}
                </div>
                <button type="button" className="icon-button" onClick={resetCode} aria-label="Reset code"><RotateCcw size={15} /></button>
              </div>
              <textarea
                className="code-editor"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                aria-label={`${language} solution`}
              />
              <div className="editor-footer">
                <div className="console-output" role="status" aria-live="polite">
                  {runOutput ? <pre>{runOutput}</pre> : <span>Run your solution to check the visible test cases.</span>}
                </div>
                <button type="button" className="primary-button" onClick={runCode} disabled={isRunning}>
                  <Play size={15} /> {isRunning ? 'Running...' : 'Run code'}
                </button>
              </div>
            </article>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <div className="brand-copy"><strong>VerdictAI</strong><span>Practice with purpose</span></div>
          <button type="button" className="icon-button mobile-close" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">AM</div><div><strong>Alex Morgan</strong><span>Personal workspace</span></div>
          <ChevronRight size={16} className="muted-icon" />
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="eyebrow">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button type="button" className={`nav-item ${activeNav === item.label ? 'active' : ''}`} aria-current={activeNav === item.label ? 'page' : undefined} onClick={() => showSection(item.label)} key={item.label}>
                <Icon size={17} /><span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-goal">
            <div className="goal-heading"><span>Daily goal</span><strong>3 / 5</strong></div>
            <div className="progress-track"><span style={{ width: '60%' }} /></div>
            <p>Two more problems to stay on track.</p>
          </div>
          <button type="button" className="nav-item" onClick={() => setNotice('Settings are connected from your account.')}><Settings size={17} /><span>Settings</span></button>
          <button type="button" className="nav-item" onClick={() => setNotice('Open a problem and run your visible test cases.')}><CircleHelp size={17} /><span>Help center</span></button>
        </div>
      </aside>
      {isSidebarOpen && <button type="button" className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar">
          <button type="button" className="icon-button mobile-menu" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions"><button type="button" className="shortcut-button" onClick={() => searchInputRef.current?.focus()}><span>⌘</span> K</button><div className="avatar">AM</div></div>
        </header>

        <div className="page-content">
          {notice && <p className="page-notice" role="status">{notice}</p>}
          <section className="welcome-row">
            <div><p className="eyebrow">Wednesday, November 19</p><h1>Good morning, Alex.</h1><p className="page-subtitle">A focused session beats a long one. Let&apos;s make today count.</p></div>
            <button type="button" className="primary-button" onClick={() => currentProblem && void openProblem(currentProblem)}><Sparkles size={16} /> Start practice</button>
          </section>

          <section className="stats-grid" aria-label="Progress summary">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return <article className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tone}`}><Icon size={18} /></div><div className="stat-copy"><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></div><ArrowUpRight size={16} className="stat-arrow" /></article>
            })}
          </section>

          <section className="content-grid">
            <div className="problem-panel panel" id="problem-library">
              <div className="panel-header"><div><h2>Problem library</h2><p>Build your fundamentals one problem at a time.</p></div><button type="button" className="text-button" onClick={() => { setSearch(''); setDifficulty('all') }}>View all <ArrowUpRight size={15} /></button></div>
              <div className="problem-toolbar">
                <label className="search-field"><Search size={16} /><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search problems" /></label>
                <div className="filter-group" aria-label="Filter by difficulty">
                  {(['all', 'easy', 'medium', 'hard'] as const).map((value) => <button type="button" className={difficulty === value ? 'filter active' : 'filter'} onClick={() => setDifficulty(value)} key={value}>{value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1)}</button>)}
                </div>
              </div>
              {isLoading && <div className="problem-list" aria-busy="true" role="status">{[1, 2, 3].map((item) => <div className="problem-skeleton" key={item}><span /><div><i /><i /></div><em /></div>)}</div>}
              {!isLoading && error && <div className="state-message error-state" role="alert"><div className="state-icon"><Code2 size={19} /></div><strong>Couldn&apos;t load problems</strong><p>{error}</p><button type="button" className="secondary-button" onClick={() => void loadProblems()}>Try again</button></div>}
              {!isLoading && !error && filteredProblems.length === 0 && <div className="state-message"><div className="state-icon"><Search size={19} /></div><strong>No problems found</strong><p>Try a different search or clear the filter.</p><button type="button" className="secondary-button" onClick={() => { setSearch(''); setDifficulty('all') }}>Clear filters</button></div>}
              {!isLoading && !error && filteredProblems.map((problem, index) => (
                <button type="button" className="problem-row" onClick={() => void openProblem(problem)} key={problem._id ?? problem.slug}>
                  <span className="problem-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="problem-info"><strong>{problem.title}</strong><small>{problem.statement}</small></span>
                  <span className={`difficulty ${problem.difficulty}`}>{problem.difficulty}</span><ChevronRight size={17} className="row-arrow" />
                </button>
              ))}
            </div>

            <div className="side-column">
              <article className="continue-card">
                <div className="continue-topline"><span className="status-dot" /> Up next</div>
                <h2>{currentProblem?.title ?? 'Choose a problem'}</h2>
                <p>{currentProblem?.statement ?? 'Your next problem will appear here.'}</p>
                <div className="continue-meta"><span><Target size={14} /> {currentProblem?.difficulty ?? 'Ready'}</span><span>15 min</span></div>
                <button type="button" className="primary-button full-width" onClick={() => currentProblem && void openProblem(currentProblem)}>Continue problem <ArrowUpRight size={16} /></button>
              </article>
              <article className="tip-card"><div className="tip-icon"><BookOpen size={17} /></div><div><strong>Small hint</strong><p>Write down the input and output before choosing an algorithm.</p></div></article>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
