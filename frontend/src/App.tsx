import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
type SubmissionHistoryItem = {
  _id: string
  problemSlug: string
  language: Language
  status: 'passed' | 'failed'
  passedTests: number
  totalTests: number
  executionTimeMs: number | null
  memoryUsedKb: number | null
  createdAt: string
}
type AuthUser = { email: string; displayName: string }
type AuthMode = 'login' | 'register'

const API_URL = import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:4000` : '')
const dashboardNow = new Date()
const clientId = (() => {
  const key = 'verdictai-client-id'
  try {
    const existing = localStorage.getItem(key)
    if (existing && existing.length >= 16 && existing.length <= 128) return existing
    const created = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `client-${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
    localStorage.setItem(key, created)
    return created
  } catch {
    return `client-${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  }
})()

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Problems', icon: Code2 },
  { label: 'Progress', icon: BarChart3 },
]

function AuthModal({
  mode,
  user,
  name,
  email,
  password,
  error,
  isLoading,
  showClose,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onLogout,
  onClose,
}: {
  mode: AuthMode
  user: AuthUser | null
  name: string
  email: string
  password: string
  error: string | null
  isLoading: boolean
  showClose: boolean
  onModeChange: (mode: AuthMode) => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onLogout: () => void
  onClose: () => void
}) {
  const cardRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    cardRef.current?.querySelector<HTMLInputElement>('input')?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showClose) {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [])
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showClose])

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => showClose && event.target === event.currentTarget && onClose()}>
      <section ref={cardRef} className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        {showClose && <button type="button" className="auth-close icon-button" onClick={onClose} aria-label="Close account dialog"><X size={17} /></button>}
        {user ? (
          <>
            <span className="eyebrow">Account</span>
            <h2 id="auth-title">Welcome, {user.displayName}</h2>
            <p className="auth-subtitle">{user.email}</p>
            <button type="button" className="secondary-button full-width" onClick={onLogout}>Log out</button>
          </>
        ) : (
          <>
            <span className="eyebrow">VerdictAI account</span>
            <h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="auth-subtitle">{mode === 'login' ? 'Sign in to keep your learning progress with you.' : 'Save your progress and submission history securely.'}</p>
            <form className="auth-form" onSubmit={onSubmit}>
              {mode === 'register' && <label>Name<input value={name} onChange={(event) => onNameChange(event.target.value)} autoComplete="name" required /></label>}
              <label>Email<input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} autoComplete="email" required /></label>
              <label>Password<input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="primary-button full-width" disabled={isLoading}>{isLoading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}</button>
            </form>
            <button type="button" className="text-button auth-switch" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
            </button>
          </>
        )}
      </section>
    </div>
  )
}

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
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryItem[]>([])
  const [dailySolvedCount, setDailySolvedCount] = useState(0)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('verdictai-solved-problems')
      const ids = saved ? JSON.parse(saved) as string[] : []
      return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [])
    } catch {
      return new Set()
    }
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem('verdictai-solved-problems', JSON.stringify([...solvedProblems]))
    } catch {
      // Progress remains available for this session if storage is unavailable.
    }
  }, [solvedProblems])

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
    // oxlint-disable-next-line react/set-state-in-effect -- Initial async resource load updates loading and error state.
    void loadProblems()
  }, [])

  useEffect(() => {
    let ignore = false

    void fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return
        const user = (await response.json()).user as AuthUser | null
        if (!ignore) {
          setAuthUser(user)
          setIsAuthOpen(!user)
          if (user) void loadSubmissionHistory()
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ignore) setIsAuthChecking(false)
      })

    return () => {
      ignore = true
    }
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

  async function loadSubmissionHistory() {
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        headers: { 'x-client-id': clientId },
        credentials: 'include',
      })
      if (response.ok) {
        const history = await response.json() as SubmissionHistoryItem[]
        setSubmissionHistory(history)
        setDailySolvedCount(new Set(history.filter((item) =>
          item.status === 'passed' &&
          new Date(item.createdAt).toDateString() === new Date().toDateString(),
        ).map((item) => item.problemSlug)).size)
        setSolvedProblems((current) => {
          const passed = new Set(history.filter((item) => item.status === 'passed').map((item) => item.problemSlug))
          return passed.size ? passed : current
        })
      }
    } catch {
      setSubmissionHistory([])
    }
  }

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAuthLoading(true)
    setAuthError(null)
    try {
      const response = await fetch(`${API_URL}/api/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(authMode === 'register' ? { displayName: authName } : {}),
          email: authEmail,
          password: authPassword,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Authentication failed')
      setAuthUser(result.user)
      setAuthPassword('')
      setIsAuthOpen(false)
      void loadSubmissionHistory()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      // Clear local account state even if the server is unreachable.
    }
    setAuthUser(null)
    setAuthMode('register')
    setAuthError(null)
    setSubmissionHistory([])
    setDailySolvedCount(0)
    setIsAuthOpen(true)
    void loadSubmissionHistory()
  }

  const closeAuth = () => {
    if (authUser) setIsAuthOpen(false)
  }

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
      await loadSubmissionHistory()
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
    if (!selectedProblem?.tests || !code.trim()) {
      setRunOutput('Write some code before running the submission.')
      return
    }
    const problemSlug = selectedProblem.slug
    const startedAt = performance.now()
    const isActiveProblem = () => window.location.hash === `#/problem/${problemSlug}`
    setIsRunning(true)
    setRunOutput('')
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        credentials: 'include',
        body: JSON.stringify({
          problemId: selectedProblem._id ?? selectedProblem.slug,
          language,
          code,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Submission failed')
      if (response.status === 202) {
        setRunOutput('Queued...')
        const deadline = Date.now() + 120_000
        let submission
        while (Date.now() < deadline) {
          await new Promise((resolve) => window.setTimeout(resolve, 500))
          if (!isActiveProblem()) return
          const statusResponse = await fetch(`${API_URL}/api/submissions/${result.submissionId}/status`, {
            headers: { 'x-client-id': clientId },
            credentials: 'include',
          })
          if (!statusResponse.ok) {
            if (statusResponse.status === 404) throw new Error('Could not read submission status')
            continue
          }
          submission = await statusResponse.json()
          if (isActiveProblem()) {
            setRunOutput(submission.status === 'running' ? 'Running tests...' : 'Queued...')
          }
          if (submission.status === 'passed' || submission.status === 'failed') break
        }
        if (!submission || (submission.status !== 'passed' && submission.status !== 'failed')) {
          throw new Error('Submission timed out')
        }
        result.status = submission.status
        result.results = submission.results ?? []
        result.totalExecutionTimeMs = submission.totalExecutionTimeMs
        result.executionTimeMs = submission.executionTimeMs
        result.maxMemoryUsedKb = submission.maxMemoryUsedKb
        result.memoryUsedKb = submission.memoryUsedKb
        result.complexity = submission.complexity
      }

      if (!isActiveProblem()) return

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
        `Wall-clock time: ${Math.round(performance.now() - startedAt)} ms`,
        result.totalExecutionTimeMs !== null ? `Total judge runtime: ${result.totalExecutionTimeMs} ms` : null,
        result.executionTimeMs !== null ? `Average judge runtime: ${result.executionTimeMs} ms` : null,
        result.maxMemoryUsedKb !== null ? `Peak memory: ${result.maxMemoryUsedKb} KB` : null,
        result.memoryUsedKb !== null ? `Average memory: ${result.memoryUsedKb} KB` : null,
        result.complexity ? `Estimated time: ${result.complexity.time}` : null,
        result.complexity ? `Estimated space: ${result.complexity.space}` : null,
      ].filter(Boolean).join('\n')

      setRunOutput([testOutput, metrics].filter(Boolean).join('\n\n'))
      void loadSubmissionHistory()
      if (result.status === 'passed') {
        setSolvedProblems((current) => {
          const next = new Set(current)
          next.add(selectedProblem.slug)
          return next
        })
      }
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
      setNotice(`${solvedCount} problem${solvedCount === 1 ? '' : 's'} solved. ${dailyProgress} of ${dailyGoal} daily goal completed.`)
    }
  }

  const currentProblem = selectedProblem ?? filteredProblems[0]
  const solvedCount = solvedProblems.size
  const dailyGoal = 5
  const dailyProgress = Math.min(authUser ? dailySolvedCount : solvedCount, dailyGoal)
  const accountName = authUser?.displayName ?? 'Learner'
  const accountInitials = authUser
    ? accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'VA'
    : 'VA'
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(dashboardNow)
  const hour = dashboardNow.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const statCards = [
    { label: 'Problems solved', value: String(solvedCount), detail: solvedCount ? 'Saved with your account' : 'Start solving', icon: CheckCircle2, tone: 'green' },
    { label: 'Daily progress', value: `${dailyProgress} / ${dailyGoal}`, detail: dailyProgress === dailyGoal ? 'Daily goal complete' : 'Keep your streak going', icon: Flame, tone: 'orange' },
    { label: 'Total points', value: String(solvedCount * 70), detail: '70 points per problem', icon: Trophy, tone: 'purple' },
  ]

  if (isAuthChecking) {
    return (
      <div className="auth-loading" role="status" aria-label="Checking account">
        <div className="brand-mark"><Sparkles size={17} /></div>
      </div>
    )
  }

  if (!authUser) {
    return (
      <main className="auth-gate">
        {isAuthOpen && <AuthModal
          mode={authMode}
          user={null}
          name={authName}
          email={authEmail}
          password={authPassword}
          error={authError}
          isLoading={isAuthLoading}
          showClose={false}
          onModeChange={(mode) => { setAuthMode(mode); setAuthError(null) }}
          onNameChange={setAuthName}
          onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword}
          onSubmit={submitAuth}
          onLogout={() => void logout()}
          onClose={closeAuth}
        />}
      </main>
    )
  }

  if (activeView === 'problem' && selectedProblem) {
    return (
      <div className="app-shell problem-app">
        <main className="problem-workspace">
          <header className="problem-topbar">
            <button type="button" className="icon-button" onClick={goToDashboard} aria-label="Back to problems"><ArrowLeft size={18} /></button>
            <div className="problem-breadcrumb">
              <span>Problem</span><ChevronRight size={14} /><strong>{selectedProblem.title}</strong>
            </div>
            <div className="problem-status"><span className={`difficulty ${selectedProblem.difficulty}`}>{selectedProblem.difficulty}</span><button type="button" className="avatar account-avatar" onClick={() => setIsAuthOpen(true)} aria-label="Open account">{accountInitials}</button></div>
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

              <div className="submission-history">
                <div className="history-heading"><h2>Recent submissions</h2><span>{submissionHistory.filter((item) => item.problemSlug === selectedProblem.slug).length}</span></div>
                {submissionHistory.filter((item) => item.problemSlug === selectedProblem.slug).slice(0, 5).map((submission) => (
                  <div className="history-row" key={submission._id}>
                    <span className={`history-status ${submission.status}`}>{submission.status === 'passed' ? 'Passed' : 'Failed'}</span>
                    <span>{submission.language}</span>
                    <span>{submission.passedTests}/{submission.totalTests}</span>
                    <time dateTime={submission.createdAt}>{new Date(submission.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                ))}
                {!submissionHistory.some((item) => item.problemSlug === selectedProblem.slug) && <p className="history-empty">Your submissions will appear here.</p>}
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
        {isAuthOpen && <AuthModal mode={authMode} user={authUser} name={authName} email={authEmail} password={authPassword} error={authError} isLoading={isAuthLoading} showClose={true} onModeChange={(mode) => { setAuthMode(mode); setAuthError(null) }} onNameChange={setAuthName} onEmailChange={setAuthEmail} onPasswordChange={setAuthPassword} onSubmit={submitAuth} onLogout={() => void logout()} onClose={closeAuth} />}
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
          <div className="workspace-avatar">{accountInitials}</div><div><strong>{accountName}</strong><span>Personal workspace</span></div>
          <ChevronRight size={16} className="muted-icon" />
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="eyebrow">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const count = item.label === 'Problems' ? String(problems.length) : undefined
            return (
              <button type="button" className={`nav-item ${activeNav === item.label ? 'active' : ''}`} aria-current={activeNav === item.label ? 'page' : undefined} onClick={() => showSection(item.label)} key={item.label}>
                <Icon size={17} /><span>{item.label}</span>{count && <span className="nav-count">{count}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-goal">
            <div className="goal-heading"><span>Daily goal</span><strong>{dailyProgress} / {dailyGoal}</strong></div>
            <div className="progress-track"><span style={{ width: `${(dailyProgress / dailyGoal) * 100}%` }} /></div>
            <p>{dailyProgress === dailyGoal ? 'Daily goal complete.' : `${dailyGoal - dailyProgress} more problem${dailyGoal - dailyProgress === 1 ? '' : 's'} to stay on track.`}</p>
          </div>
          <button type="button" className="nav-item" onClick={() => setIsAuthOpen(true)}><Settings size={17} /><span>Account settings</span></button>
          <button type="button" className="nav-item" onClick={() => setNotice('Open a problem and run your visible test cases.')}><CircleHelp size={17} /><span>Help center</span></button>
        </div>
      </aside>
      {isSidebarOpen && <button type="button" className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar">
          <button type="button" className="icon-button mobile-menu" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions"><button type="button" className="shortcut-button" onClick={() => searchInputRef.current?.focus()}><span>⌘</span> K</button><button type="button" className="avatar" onClick={() => setIsAuthOpen(true)} aria-label="Open account">{accountInitials}</button></div>
        </header>

        <div className="page-content">
          {notice && <p className="page-notice" role="status">{notice}</p>}
          <section className="welcome-row">
            <div><p className="eyebrow">{todayLabel}</p><h1>{greeting}, {authUser?.displayName.split(/\s+/)[0] ?? 'Learner'}.</h1><p className="page-subtitle">A focused session beats a long one. Let&apos;s make today count.</p></div>
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
      {isAuthOpen && <AuthModal mode={authMode} user={authUser} name={authName} email={authEmail} password={authPassword} error={authError} isLoading={isAuthLoading} showClose={true} onModeChange={(mode) => { setAuthMode(mode); setAuthError(null) }} onNameChange={setAuthName} onEmailChange={setAuthEmail} onPasswordChange={setAuthPassword} onSubmit={submitAuth} onLogout={() => void logout()} onClose={closeAuth} />}
    </div>
  )
}

export default App
