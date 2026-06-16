import { type FormEvent, useMemo, useState } from 'react'
import {
  ChevronRight,
  Download,
  FileText,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import {
  adminLogin,
  adminLogout,
  fetchAdminFeedback,
  fetchAdminPrediction,
  fetchAdminPredictions,
  fetchAdminScoringRules,
  updateAdminFeedbackStatus,
  updateAdminScoringRule,
  type AdminFeedback,
  type AdminPredictionDetail,
  type AdminPredictionSummary,
  type AdminScoringRule,
  type AdminUser,
} from '../api/admin'
import { ApiError } from '../api/http'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Select } from './ui/select'

const tokenKey = 'muppadai_admin_token'

const formatDate = (value: string | null) =>
  value === null ? '--' : new Date(value).toLocaleString('en-IN')

const formatScore = (value: number) => value.toFixed(2)

export function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? '')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [email, setEmail] = useState('admin@muppadai.local')
  const [password, setPassword] = useState('admin123')
  const [records, setRecords] = useState<AdminPredictionSummary[]>([])
  const [feedback, setFeedback] = useState<AdminFeedback[]>([])
  const [selectedRecord, setSelectedRecord] =
    useState<AdminPredictionDetail | null>(null)
  const [activeTab, setActiveTab] = useState<'records' | 'feedback' | 'marks'>('records')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scoringRules, setScoringRules] = useState<AdminScoringRule[]>([])
  const [editingRule, setEditingRule] = useState<{
    id: number
    correctMarks: string
    negativeMarks: string
    unansweredMarks: string
  } | null>(null)
  const [marksSaveStatus, setMarksSaveStatus] = useState<Record<number, string>>({})

  const stats = useMemo(
    () => ({
      records: records.length,
      feedback: feedback.filter((item) => item.status !== 'resolved').length,
      uploaded: records.filter((record) => record.usedUploadedHtml).length,
    }),
    [feedback, records],
  )

  const loadAdminData = async (authToken = token) => {
    if (!authToken) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [recordResponse, feedbackResponse, rulesResponse] = await Promise.all([
        fetchAdminPredictions(authToken),
        fetchAdminFeedback(authToken),
        fetchAdminScoringRules(authToken),
      ])
      setRecords(recordResponse.data)
      setFeedback(feedbackResponse.data)
      setScoringRules(rulesResponse.data)
    } catch (exception) {
      setError(
        exception instanceof ApiError
          ? exception.message
          : 'Admin data could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const saveMarks = async (ruleId: number) => {
    if (!editingRule || editingRule.id !== ruleId) return
    try {
      await updateAdminScoringRule(
        token,
        ruleId,
        Number.parseFloat(editingRule.correctMarks),
        Number.parseFloat(editingRule.negativeMarks),
        Number.parseFloat(editingRule.unansweredMarks),
      )
      setMarksSaveStatus((prev) => ({ ...prev, [ruleId]: 'Saved!' }))
      setEditingRule(null)
      await loadAdminData()
    } catch (exception) {
      setMarksSaveStatus((prev) => ({
        ...prev,
        [ruleId]: exception instanceof ApiError ? exception.message : 'Save failed.',
      }))
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const response = await adminLogin(email, password)
      localStorage.setItem(tokenKey, response.token)
      setToken(response.token)
      setUser(response.user)
      await loadAdminData(response.token)
    } catch (exception) {
      setError(
        exception instanceof ApiError
          ? exception.message
          : 'Admin login failed.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    if (token) {
      await adminLogout(token).catch(() => undefined)
    }
    localStorage.removeItem(tokenKey)
    setToken('')
    setUser(null)
    setRecords([])
    setFeedback([])
    setSelectedRecord(null)
  }

  const openRecord = async (recordId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchAdminPrediction(token, recordId)
      setSelectedRecord(response.data)
    } catch (exception) {
      setError(
        exception instanceof ApiError
          ? exception.message
          : 'Record could not be opened.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const printQuestionPaper = (record: AdminPredictionDetail) => {
    const rows = record.questions
      .map(
        (question, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${question.sectionName ?? '--'}</td>
            <td>${question.questionId}</td>
            <td>${question.selectedAnswer ?? '--'}</td>
            <td>${question.correctAnswer ?? '--'}</td>
            <td>${question.status}</td>
            <td>${question.marksAwarded.toFixed(2)}</td>
          </tr>
        `,
      )
      .join('')
    const html = `
      <html>
        <head>
          <title>Muppadai Question Paper</title>
          <style>
            body { font-family: Arial, sans-serif; color: #172033; padding: 24px; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 18px; color: #667085; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #b91c1c; color: #fff; }
            th, td { border: 1px solid #d91f1f; padding: 7px; text-align: left; }
            tr.total { background: #f4d12f; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Muppadai Rank Predictor</h1>
          <p>${record.examName ?? 'Exam'} - ${record.candidateName ?? 'Candidate'} - ${record.rollNumber ?? ''}</p>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Section</th><th>Question ID</th><th>Selected</th><th>Correct</th><th>Status</th><th>Marks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print()</script>
        </body>
      </html>
    `
    const popup = window.open('', '_blank')
    popup?.document.write(html)
    popup?.document.close()
  }

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10 text-foreground">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/muppadai-logo.png"
              alt="Muppadai Academy"
              className="h-14 w-14 object-contain"
            />
            <h1 className="mt-3 text-2xl font-extrabold">Admin Console</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to review submissions and feedback.
            </p>
          </div>
          <Card className="p-6 shadow-[0_20px_50px_rgba(17,24,39,0.10)]">
            <form className="grid gap-4" onSubmit={handleLogin}>
              <label className="grid gap-2 text-sm font-semibold">
                Email
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Password
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <Button type="submit" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Lock aria-hidden size={18} />
                )}
                Sign in
              </Button>
              {error && (
                <p className="rounded-md bg-red/10 px-3 py-2 text-sm font-semibold text-red">
                  {error}
                </p>
              )}
            </form>
          </Card>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck aria-hidden size={14} className="text-green" />
            Secured admin access · Muppadai Academy
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/muppadai-logo.png"
              alt="Muppadai Academy"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-navy">
                Muppadai Admin
              </p>
              <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">
                Submissions Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.email ?? email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadAdminData()}
            >
              <RefreshCw aria-hidden size={17} />
              Refresh
            </Button>
            <Button type="button" variant="ghost" onClick={() => void handleLogout()}>
              <LogOut aria-hidden size={17} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Total Records',
              value: stats.records,
              icon: FileText,
              tone: 'bg-navy/10 text-navy',
            },
            {
              label: 'Open Feedback',
              value: stats.feedback,
              icon: Inbox,
              tone: 'bg-red/10 text-red',
            },
            {
              label: 'HTML Uploads',
              value: stats.uploaded,
              icon: Upload,
              tone: 'bg-green/10 text-green',
            },
          ].map((stat) => {
            const Icon = stat.icon

            return (
              <Card
                key={stat.label}
                className="flex items-center justify-between p-5"
              >
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold">{stat.value}</p>
                </div>
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.tone}`}
                >
                  <Icon aria-hidden size={22} />
                </span>
              </Card>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeTab === 'records' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('records')}
          >
            <FileText aria-hidden size={17} />
            Records
          </Button>
          <Button
            type="button"
            variant={activeTab === 'feedback' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('feedback')}
          >
            <Inbox aria-hidden size={17} />
            Feedback
          </Button>
          <Button
            type="button"
            variant={activeTab === 'marks' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('marks')}
          >
            <Settings aria-hidden size={17} />
            Marks
          </Button>
        </div>

        {error && <p className="text-sm font-semibold text-red">{error}</p>}

        {activeTab === 'records' && (
          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-[1.5fr_0.9fr_0.6fr_0.7fr_0.9fr_auto] gap-3 border-b border-border bg-muted/60 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground md:grid">
              <span>Candidate</span>
              <span>Category / State</span>
              <span>Score</span>
              <span>Rank</span>
              <span>Submitted</span>
              <span className="sr-only">Open</span>
            </div>
            <div className="divide-y divide-border">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className="grid w-full grid-cols-2 items-center gap-2 px-4 py-3.5 text-left transition hover:bg-muted md:grid-cols-[1.5fr_0.9fr_0.6fr_0.7fr_0.9fr_auto] md:gap-3"
                  onClick={() => void openRecord(record.id)}
                >
                  <span className="col-span-2 md:col-span-1">
                    <span className="block font-bold text-foreground">
                      {record.candidateName ?? 'Candidate'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {record.rollNumber ?? '--'} • {record.examName ?? '--'}
                    </span>
                  </span>
                  <span className="text-sm text-foreground">
                    {record.category ?? '--'} / {record.state ?? '--'}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatScore(record.score)}
                  </span>
                  <span className="text-sm">
                    <span className="inline-flex items-center rounded bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
                      Rank {record.overallRank}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(record.createdAt)}
                  </span>
                  <ChevronRight
                    aria-hidden
                    size={18}
                    className="hidden text-muted-foreground md:block"
                  />
                </button>
              ))}
              {records.length === 0 && (
                <p className="p-8 text-center text-muted-foreground">
                  No submissions yet.
                </p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'feedback' && (
          <Card className="grid gap-3 p-4">
            {feedback.map((item) => {
              const statusTone =
                item.status === 'resolved'
                  ? 'bg-green/10 text-green'
                  : item.status === 'reviewing'
                    ? 'bg-blue/10 text-blue'
                    : 'bg-red/10 text-red'

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border p-4 transition hover:border-navy/30"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold capitalize">
                          {item.type.replace('_', ' ')}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusTone}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.candidateName ?? 'Unknown candidate'} •{' '}
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <Select
                      className="sm:w-40"
                      value={item.status}
                      onChange={(event) =>
                        void updateAdminFeedbackStatus(
                          token,
                          item.id,
                          event.target.value,
                        ).then(() => loadAdminData())
                      }
                    >
                      <option value="open">Open</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                    </Select>
                  </div>
                  <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm leading-6">
                    {item.message}
                  </p>
                </div>
              )
            })}
            {feedback.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">
                No feedback yet.
              </p>
            )}
          </Card>
        )}

        {activeTab === 'marks' && (
          <Card className="p-5">
            <div className="mb-5 border-b border-border pb-4">
              <h2 className="text-lg font-extrabold text-foreground">Marking Scheme</h2>
              <p className="text-sm text-muted-foreground">
                Set correct / wrong / unanswered marks per exam. Changes apply immediately to new submissions.
              </p>
            </div>
            <div className="grid gap-6">
              {scoringRules.map((rule) => {
                const sr = rule.scoringRule
                if (!sr) return null
                const isEditing = editingRule?.id === sr.id
                return (
                  <div key={rule.examId} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-extrabold text-foreground">{rule.examName}</h3>
                      {!isEditing && (
                        <button
                          type="button"
                          className="text-sm font-bold text-navy underline"
                          onClick={() =>
                            setEditingRule({
                              id: sr.id,
                              correctMarks: String(sr.correctMarks),
                              negativeMarks: String(sr.negativeMarks),
                              unansweredMarks: String(sr.unansweredMarks),
                            })
                          }
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="grid gap-3">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            ['Correct (+)', 'correctMarks'],
                            ['Wrong (−)', 'negativeMarks'],
                            ['Unanswered', 'unansweredMarks'],
                          ].map(([label, field]) => (
                            <label key={field} className="grid gap-1 text-sm font-semibold">
                              {label}
                              <input
                                type="number"
                                step="0.01"
                                className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                                value={editingRule[field as keyof typeof editingRule]}
                                onChange={(e) =>
                                  setEditingRule((prev) =>
                                    prev ? { ...prev, [field]: e.target.value } : prev,
                                  )
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-md bg-navy px-4 text-sm font-bold text-white transition hover:bg-navy/90"
                            onClick={() => void saveMarks(sr.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:bg-muted"
                            onClick={() => setEditingRule(null)}
                          >
                            Cancel
                          </button>
                        </div>
                        {marksSaveStatus[sr.id] && (
                          <p className="text-sm font-medium text-green">{marksSaveStatus[sr.id]}</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          ['Correct', `+${sr.correctMarks}`],
                          ['Wrong', `−${sr.negativeMarks}`],
                          ['Unanswered', `${sr.unansweredMarks}`],
                        ].map(([label, val]) => (
                          <div key={label} className="rounded-md bg-muted p-3 text-center">
                            <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
                            <p className="mt-1 text-lg font-extrabold text-foreground">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {scoringRules.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No active exams found.</p>
              )}
            </div>
          </Card>
        )}

        {selectedRecord && (
          <Card className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold">
                  {selectedRecord.candidateName ?? 'Candidate'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.rollNumber ?? '--'} •{' '}
                  {selectedRecord.examName ?? '--'}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => printQuestionPaper(selectedRecord)}
              >
                <Download aria-hidden size={17} />
                Export Question PDF
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ['Score', formatScore(selectedRecord.score)],
                ['Correct', selectedRecord.correctAnswers],
                ['Wrong', selectedRecord.wrongAnswers],
                ['Unanswered', selectedRecord.unansweredQuestions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-muted p-3">
                  <p className="text-xs font-bold uppercase text-text3">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 max-h-96 overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-navy text-white">
                  <tr>
                    <th className="px-3 py-2">Question ID</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Selected</th>
                    <th className="px-3 py-2">Correct</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.questions.map((question) => (
                    <tr key={question.id} className="border-t border-border">
                      <td className="px-3 py-2">{question.questionId}</td>
                      <td className="px-3 py-2">{question.sectionName ?? '--'}</td>
                      <td className="px-3 py-2">{question.selectedAnswer ?? '--'}</td>
                      <td className="px-3 py-2">{question.correctAnswer ?? '--'}</td>
                      <td className="px-3 py-2">{question.status}</td>
                      <td className="px-3 py-2">
                        {question.marksAwarded.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
