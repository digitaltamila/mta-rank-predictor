import { type FormEvent, useMemo, useState } from 'react'
import {
  Download,
  FileText,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import {
  adminLogin,
  adminLogout,
  fetchAdminFeedback,
  fetchAdminPrediction,
  fetchAdminPredictions,
  updateAdminFeedbackStatus,
  type AdminFeedback,
  type AdminPredictionDetail,
  type AdminPredictionSummary,
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
  const [activeTab, setActiveTab] = useState<'records' | 'feedback'>('records')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const [recordResponse, feedbackResponse] = await Promise.all([
        fetchAdminPredictions(authToken),
        fetchAdminFeedback(authToken),
      ])
      setRecords(recordResponse.data)
      setFeedback(feedbackResponse.data)
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
      <div className="min-h-svh bg-background px-4 py-10 text-foreground">
        <Card className="mx-auto max-w-md p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-navy text-white">
              <Lock aria-hidden size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Admin Login</h1>
              <p className="text-sm text-muted-foreground">
                View submissions and feedback.
              </p>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={handleLogin}>
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <Button type="submit" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" size={18} />}
              Login
            </Button>
            {error && <p className="text-sm font-semibold text-red">{error}</p>}
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-navy">
              Muppadai Admin
            </p>
            <h1 className="text-2xl font-extrabold">Submissions Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email ?? email}
            </p>
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
            ['Total Records', stats.records],
            ['Open Feedback', stats.feedback],
            ['HTML Uploads', stats.uploaded],
          ].map(([label, value]) => (
            <Card key={label} className="p-5">
              <p className="text-sm font-semibold text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 text-3xl font-extrabold">{value}</p>
            </Card>
          ))}
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
        </div>

        {error && <p className="text-sm font-semibold text-red">{error}</p>}

        {activeTab === 'records' && (
          <Card className="overflow-hidden p-0">
            <div className="grid gap-3 p-4">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className="grid gap-3 rounded-md border border-border bg-surface p-4 text-left transition hover:border-navy hover:bg-muted md:grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_auto]"
                  onClick={() => void openRecord(record.id)}
                >
                  <span>
                    <span className="block font-bold">
                      {record.candidateName ?? 'Candidate'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {record.rollNumber ?? '--'} • {record.examName ?? '--'}
                    </span>
                  </span>
                  <span className="text-sm">
                    {record.category ?? '--'} / {record.state ?? '--'}
                  </span>
                  <span className="font-bold">{formatScore(record.score)}</span>
                  <span>Rank {record.overallRank}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(record.createdAt)}
                  </span>
                </button>
              ))}
              {records.length === 0 && (
                <p className="p-6 text-center text-muted-foreground">
                  No submissions yet.
                </p>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'feedback' && (
          <Card className="grid gap-3 p-4">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold">{item.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
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
                <p className="mt-3 text-sm leading-6">{item.message}</p>
              </div>
            ))}
            {feedback.length === 0 && (
              <p className="p-6 text-center text-muted-foreground">
                No feedback yet.
              </p>
            )}
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
