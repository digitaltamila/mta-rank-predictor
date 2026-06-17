import { type FormEvent, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Inbox,
  Link2,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import {
  adminLogin,
  adminLogout,
  deleteAdminPredictions,
  downloadDatabaseBackup,
  fetchAdminFeedback,
  fetchAdminPrediction,
  fetchAdminPredictions,
  fetchAdminScoringRules,
  fetchAdminSettings,
  pruneDuplicatePredictions,
  resetParserCache,
  updateAdminFeedbackStatus,
  updateAdminScoringRule,
  updateAdminSettings,
  type AdminFeedback,
  type AdminPaginationMeta,
  type AdminPredictionDetail,
  type AdminPredictionSummary,
  type AdminScoringRule,
  type AdminSettings,
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

const categoryOptions = ['UR', 'OBC', 'SC', 'ST', 'EWS']

function exportToCsv(records: AdminPredictionSummary[]) {
  const headers = [
    'Name', 'Roll Number', 'Mobile', 'Exam', 'Category', 'State', 'Gender',
    'Score', 'Correct', 'Wrong', 'Unanswered',
    'Overall Rank', 'Category Rank', 'State Rank',
    'Response Sheet URL', 'Submitted At',
  ]

  const escape = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  const rows = records.map((r) =>
    [
      r.candidateName, r.rollNumber, r.mobile, r.examName,
      r.category, r.state, r.gender,
      r.score, r.correctAnswers, r.wrongAnswers, r.unansweredQuestions,
      r.overallRank, r.categoryRank, r.stateRank,
      r.sourceUrl, r.createdAt,
    ]
      .map(escape)
      .join(','),
  )

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `muppadai-records-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? '')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [records, setRecords] = useState<AdminPredictionSummary[]>([])
  const [paginationMeta, setPaginationMeta] = useState<AdminPaginationMeta | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [feedback, setFeedback] = useState<AdminFeedback[]>([])
  const [selectedRecord, setSelectedRecord] = useState<AdminPredictionDetail | null>(null)
  const [activeTab, setActiveTab] = useState<'records' | 'feedback' | 'marks' | 'settings'>('records')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scoringRules, setScoringRules] = useState<AdminScoringRule[]>([])
  const [settings, setSettings] = useState<AdminSettings>({ pabbly_webhook_url: null })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null)
  const [cacheResetting, setCacheResetting] = useState(false)
  const [cacheResetStatus, setCacheResetStatus] = useState<string | null>(null)
  const [backupDownloading, setBackupDownloading] = useState(false)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<{
    id: number
    correctMarks: string
    negativeMarks: string
    unansweredMarks: string
  } | null>(null)
  const [marksSaveStatus, setMarksSaveStatus] = useState<Record<number, string>>({})
  const [pruneStatus, setPruneStatus] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterExam, setFilterExam] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterState, setFilterState] = useState('all')

  const uniqueStates = useMemo(
    () => [...new Set(records.map((r) => r.state).filter(Boolean))].sort() as string[],
    [records],
  )

  const filteredRecords = useMemo(() => {
    const search = filterSearch.toLowerCase().trim()
    return records.filter((r) => {
      if (filterExam !== 'all') {
        const name = r.examName?.toLowerCase() ?? ''
        if (filterExam === 'ssc' && !name.includes('ssc')) return false
        if (filterExam === 'rrb' && !name.includes('rrb')) return false
      }
      if (filterCategory !== 'all') {
        if (filterCategory === 'none' && r.category !== null) return false
        if (filterCategory !== 'none' && r.category !== filterCategory) return false
      }
      if (filterState !== 'all' && r.state !== filterState) return false
      if (search) {
        const name = r.candidateName?.toLowerCase() ?? ''
        const roll = r.rollNumber?.toLowerCase() ?? ''
        const mobile = r.mobile?.toLowerCase() ?? ''
        if (!name.includes(search) && !roll.includes(search) && !mobile.includes(search)) return false
      }
      return true
    })
  }, [records, filterExam, filterCategory, filterState, filterSearch])

  const hasActiveFilter =
    filterSearch !== '' ||
    filterExam !== 'all' ||
    filterCategory !== 'all' ||
    filterState !== 'all'

  const clearFilters = () => {
    setFilterSearch('')
    setFilterExam('all')
    setFilterCategory('all')
    setFilterState('all')
  }

  const stats = useMemo(
    () => ({
      total: paginationMeta?.total ?? records.length,
      sscGd: records.filter((r) => r.examName?.toLowerCase().includes('ssc')).length,
      rrb: records.filter((r) => r.examName?.toLowerCase().includes('rrb')).length,
      openFeedback: feedback.filter((item) => item.status !== 'resolved').length,
    }),
    [feedback, records, paginationMeta],
  )

  const loadAdminData = async (authToken = token, page = currentPage) => {
    if (!authToken) return
    setIsLoading(true)
    setError(null)
    try {
      const [recordResponse, feedbackResponse, rulesResponse, settingsResponse] = await Promise.all([
        fetchAdminPredictions(authToken, page),
        fetchAdminFeedback(authToken),
        fetchAdminScoringRules(authToken),
        fetchAdminSettings(authToken),
      ])
      setRecords(recordResponse.data)
      setPaginationMeta(recordResponse.meta)
      setCurrentPage(recordResponse.meta.current_page)
      setFeedback(feedbackResponse.data)
      setScoringRules(rulesResponse.data)
      setSettings(settingsResponse.data)
    } catch (exception) {
      setError(
        exception instanceof ApiError ? exception.message : 'Admin data could not be loaded.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const goToPage = async (page: number) => {
    if (!paginationMeta || page < 1 || page > paginationMeta.last_page) return
    setCurrentPage(page)
    await loadAdminData(token, page)
  }

  const handlePruneDuplicates = async () => {
    setPruneStatus('Removing duplicates…')
    try {
      const result = await pruneDuplicatePredictions(token)
      setPruneStatus(
        result.deleted === 0
          ? 'No duplicates found.'
          : `Removed ${result.deleted} duplicate record(s).`,
      )
      if (result.deleted > 0) await loadAdminData(token, 1)
    } catch (exception) {
      setPruneStatus(
        exception instanceof ApiError ? exception.message : 'Cleanup failed.',
      )
    }
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!window.confirm(`Delete ${ids.length} selected record(s)? This cannot be undone.`)) return
    setIsBulkDeleting(true)
    try {
      const result = await deleteAdminPredictions(token, ids)
      setSelectedIds(new Set())
      if (selectedRecord && ids.includes(selectedRecord.id)) setSelectedRecord(null)
      await loadAdminData(token, 1)
      setError(null)
      setPruneStatus(`Deleted ${result.deleted} record(s).`)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Bulk delete failed.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const filteredIds = filteredRecords.map((r) => r.id)
    const allSelected = filteredIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...filteredIds]))
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

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setSettingsStatus(null)
    try {
      await updateAdminSettings(token, { pabbly_webhook_url: settings.pabbly_webhook_url || null })
      setSettingsStatus('Settings saved.')
    } catch (exception) {
      setSettingsStatus(exception instanceof ApiError ? exception.message : 'Save failed.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleResetCache = async () => {
    if (!window.confirm('This will mark all cached response sheets for re-parsing. No data will be deleted. Proceed?')) return
    setCacheResetting(true)
    setCacheResetStatus(null)
    try {
      const result = await resetParserCache(token)
      setCacheResetStatus(result.message)
    } catch (exception) {
      setCacheResetStatus(exception instanceof ApiError ? exception.message : 'Reset failed.')
    } finally {
      setCacheResetting(false)
    }
  }

  const handleDownloadBackup = async () => {
    setBackupDownloading(true)
    setBackupStatus(null)
    try {
      await downloadDatabaseBackup(token)
      setBackupStatus('Backup downloaded successfully.')
    } catch (exception) {
      setBackupStatus(exception instanceof ApiError ? exception.message : 'Download failed.')
    } finally {
      setBackupDownloading(false)
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
      await loadAdminData(response.token, 1)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Admin login failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    if (token) await adminLogout(token).catch(() => undefined)
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
        exception instanceof ApiError ? exception.message : 'Record could not be opened.',
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
              <p className="text-sm text-muted-foreground">{user?.email ?? email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadAdminData()}
              disabled={isLoading}
            >
              <RefreshCw aria-hidden size={17} className={isLoading ? 'animate-spin' : ''} />
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
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Total Records', value: stats.total, icon: FileText, tone: 'bg-navy/10 text-navy' },
            { label: 'SSC GD', value: stats.sscGd, icon: FileText, tone: 'bg-blue/10 text-blue' },
            { label: 'RRB', value: stats.rrb, icon: FileText, tone: 'bg-purple/10 text-purple' },
            { label: 'Open Feedback', value: stats.openFeedback, icon: Inbox, tone: 'bg-red/10 text-red' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-3xl font-extrabold">{stat.value}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.tone}`}>
                  <Icon aria-hidden size={22} />
                </span>
              </Card>
            )
          })}
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'records', label: 'Records', icon: FileText },
              { id: 'feedback', label: 'Feedback', icon: Inbox },
              { id: 'marks', label: 'Marks', icon: Settings },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={activeTab === id ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(id)}
            >
              <Icon aria-hidden size={17} />
              {label}
            </Button>
          ))}
        </div>

        {error && <p className="text-sm font-semibold text-red">{error}</p>}

        {/* ── Records tab ── */}
        {activeTab === 'records' && (
          <div className="grid gap-4">
            {/* Filter bar */}
            <Card className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid flex-1 gap-1 text-xs font-semibold text-muted-foreground" style={{ minWidth: '180px' }}>
                  Search
                  <Input
                    type="search"
                    placeholder="Name, roll number or mobile…"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  Exam
                  <Select value={filterExam} onChange={(e) => setFilterExam(e.target.value)} className="w-36">
                    <option value="all">All Exams</option>
                    <option value="ssc">SSC GD</option>
                    <option value="rrb">RRB</option>
                  </Select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  Category
                  <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-36">
                    <option value="all">All Categories</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="none">Not chosen</option>
                  </Select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  State
                  <Select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="w-40">
                    <option value="all">All States</option>
                    {uniqueStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </label>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 rounded-md border border-border bg-surface px-3 text-sm font-bold text-muted-foreground transition hover:bg-muted"
                  >
                    × Clear
                  </button>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                  {selectedIds.size > 0 && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void handleBulkDelete()}
                      disabled={isBulkDeleting}
                      className="bg-red hover:bg-red/90"
                    >
                      {isBulkDeleting ? (
                        <Loader2 className="animate-spin" aria-hidden size={16} />
                      ) : (
                        <Trash2 aria-hidden size={16} />
                      )}
                      Delete {selectedIds.size} selected
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => exportToCsv(filteredRecords)}
                    disabled={filteredRecords.length === 0}
                  >
                    <Download aria-hidden size={16} />
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handlePruneDuplicates()}
                  >
                    <Trash2 aria-hidden size={16} />
                    Remove Duplicates
                  </Button>
                </div>
              </div>
              {pruneStatus && (
                <p className="mt-3 text-sm font-medium text-muted-foreground">{pruneStatus}</p>
              )}
            </Card>

            {/* Results count */}
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-muted-foreground">
                {filteredRecords.length === records.length
                  ? `${records.length} of ${paginationMeta?.total ?? records.length} records (page ${currentPage})`
                  : `${filteredRecords.length} of ${records.length} records (filtered)`}
              </p>
            </div>

            {/* Records table */}
            <Card className="overflow-hidden p-0">
              <div className="hidden grid-cols-[auto_1.5fr_0.9fr_0.6fr_0.7fr_0.9fr_auto_auto] gap-3 border-b border-border bg-muted/60 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground md:grid">
                <span className="flex items-center">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="h-4 w-4 cursor-pointer rounded border-border accent-navy"
                    checked={
                      filteredRecords.length > 0 &&
                      filteredRecords.every((r) => selectedIds.has(r.id))
                    }
                    onChange={toggleSelectAll}
                  />
                </span>
                <span>Candidate</span>
                <span>Category / State</span>
                <span>Score</span>
                <span>Rank</span>
                <span>Submitted</span>
                <span>URL</span>
                <span className="sr-only">Open</span>
              </div>
              <div className="divide-y divide-border">
                {filteredRecords.map((record) => {
                  const isSelected = selectedIds.has(record.id)
                  return (
                    <div
                      key={record.id}
                      className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3.5 transition md:grid-cols-[auto_1.5fr_0.9fr_0.6fr_0.7fr_0.9fr_auto_auto] md:gap-3 ${isSelected ? 'bg-navy/5' : 'hover:bg-muted/50'}`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        aria-label={`Select ${record.candidateName ?? 'record'}`}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-navy"
                        checked={isSelected}
                        onChange={() => toggleSelect(record.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Main clickable area */}
                      <button
                        type="button"
                        className="col-span-1 text-left md:col-span-5 md:grid md:grid-cols-[1.5fr_0.9fr_0.6fr_0.7fr_0.9fr] md:items-center md:gap-3"
                        onClick={() => void openRecord(record.id)}
                      >
                        <span className="block">
                          <span className="block font-bold text-foreground hover:text-navy">
                            {record.candidateName ?? 'Candidate'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {record.rollNumber ?? '--'} · {record.examName ?? '--'}
                          </span>
                          {record.mobile && (
                            <span className="mt-0.5 block text-xs font-semibold text-navy">
                              {record.mobile}
                              {record.studentName ? ` · ${record.studentName}` : ''}
                            </span>
                          )}
                        </span>
                        <span className="hidden text-sm text-foreground md:block">
                          {record.category ?? '--'} / {record.state ?? '--'}
                        </span>
                        <span className="hidden font-bold text-foreground md:block">
                          {formatScore(record.score)}
                        </span>
                        <span className="hidden md:block">
                          <span className="inline-flex items-center rounded bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
                            #{record.overallRank}
                          </span>
                        </span>
                        <span className="hidden text-sm text-muted-foreground md:block">
                          {formatDate(record.createdAt)}
                        </span>
                      </button>

                      {/* URL link icon */}
                      {record.sourceUrl ? (
                        <a
                          href={record.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open response sheet URL"
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-navy transition hover:bg-navy hover:text-white"
                        >
                          <Link2 aria-hidden size={15} />
                        </a>
                      ) : (
                        <span className="h-8 w-8" />
                      )}

                      <ChevronRight
                        aria-hidden
                        size={18}
                        className="hidden cursor-pointer text-muted-foreground md:block"
                        onClick={() => void openRecord(record.id)}
                      />
                    </div>
                  )
                })}
                {filteredRecords.length === 0 && (
                  <p className="p-8 text-center text-muted-foreground">
                    {records.length === 0 ? 'No submissions yet.' : 'No records match the current filters.'}
                  </p>
                )}
              </div>
            </Card>

            {/* Pagination */}
            {paginationMeta && paginationMeta.last_page > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => void goToPage(currentPage - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: paginationMeta.last_page }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === paginationMeta.last_page || Math.abs(p - currentPage) <= 2)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e${idx}`} className="px-1 text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void goToPage(item as number)}
                        className={`flex h-9 min-w-[36px] items-center justify-center rounded-md border px-3 text-sm font-bold transition ${
                          currentPage === item
                            ? 'border-navy bg-navy text-white'
                            : 'border-border bg-surface text-foreground hover:bg-muted'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  type="button"
                  disabled={currentPage >= paginationMeta.last_page || isLoading}
                  onClick={() => void goToPage(currentPage + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Feedback tab ── */}
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
                        <p className="font-bold capitalize">{item.type.replace('_', ' ')}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusTone}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.candidateName ?? 'Unknown candidate'} · {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <Select
                      className="sm:w-40"
                      value={item.status}
                      onChange={(event) =>
                        void updateAdminFeedbackStatus(token, item.id, event.target.value).then(
                          () => loadAdminData(),
                        )
                      }
                    >
                      <option value="open">Open</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                    </Select>
                  </div>
                  <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm leading-6">{item.message}</p>
                </div>
              )
            })}
            {feedback.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No feedback yet.</p>
            )}
          </Card>
        )}

        {/* ── Marks tab ── */}
        {activeTab === 'marks' && (
          <Card className="p-5">
            <div className="mb-5 border-b border-border pb-4">
              <h2 className="text-lg font-extrabold text-foreground">Marking Scheme</h2>
              <p className="text-sm text-muted-foreground">
                Set correct / wrong / unanswered marks per exam. Changes apply immediately to new
                submissions.
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

        {/* ── Settings tab ── */}
        {activeTab === 'settings' && (
          <Card className="p-5">
            <div className="mb-5 border-b border-border pb-4">
              <h2 className="text-lg font-extrabold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure webhook and notification integrations.
              </p>
            </div>
            <div className="grid max-w-xl gap-5">
              <div className="grid gap-2">
                <label htmlFor="pabbly-webhook" className="text-sm font-semibold text-foreground">
                  Pabbly Connect Webhook URL
                </label>
                <p className="text-xs text-muted-foreground">
                  When a student submits their result with a verified mobile number, this webhook is
                  triggered with their details — name, mobile, exam, score, and rank. Use this to
                  send a WhatsApp notification via Pabbly Connect.
                </p>
                <Input
                  id="pabbly-webhook"
                  type="url"
                  placeholder="https://connect.pabbly.com/workflow/sendwebhookdata/..."
                  value={settings.pabbly_webhook_url ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, pabbly_webhook_url: e.target.value || null }))
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void handleSaveSettings()}
                  disabled={settingsSaving}
                >
                  {settingsSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                  Save Settings
                </Button>
                {settingsStatus && (
                  <p className="text-sm font-medium text-muted-foreground">{settingsStatus}</p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <p className="font-semibold text-foreground">Webhook payload fields</p>
                <ul className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
                  <li><span className="text-navy">mobile</span> — verified mobile number</li>
                  <li><span className="text-navy">name</span> — student name (if entered)</li>
                  <li><span className="text-navy">exam</span> — exam name</li>
                  <li><span className="text-navy">score</span> — total score</li>
                  <li><span className="text-navy">overall_rank</span> — rank among all students</li>
                  <li><span className="text-navy">category</span> — chosen category</li>
                  <li><span className="text-navy">state</span> — chosen state</li>
                  <li><span className="text-navy">prediction_id</span> — unique run ID</li>
                </ul>
              </div>

              {/* Parser Cache Reset */}
              <div className="border-t border-border pt-5">
                <h3 className="text-base font-extrabold text-foreground">Parser Cache</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Force all response sheets to be re-fetched and re-parsed on the next submission.
                  This is safe — it only marks sheets for re-parsing, it does <strong>not</strong> delete any prediction records.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleResetCache()}
                    disabled={cacheResetting}
                  >
                    {cacheResetting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    Reset Parser Cache
                  </Button>
                  {cacheResetStatus && (
                    <p className="text-sm font-medium text-muted-foreground">{cacheResetStatus}</p>
                  )}
                </div>
              </div>

              {/* Database Backup */}
              <div className="border-t border-border pt-5">
                <h3 className="text-base font-extrabold text-foreground">Database Backup</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Download a full copy of the SQLite database. The server also saves a backup automatically every day at 2 AM (keeps last 7).
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleDownloadBackup()}
                    disabled={backupDownloading}
                  >
                    {backupDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    Download Backup
                  </Button>
                  {backupStatus && (
                    <p className="text-sm font-medium text-muted-foreground">{backupStatus}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Record detail ── */}
        {selectedRecord && (
          <Card className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold">{selectedRecord.candidateName ?? 'Candidate'}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.rollNumber ?? '--'} · {selectedRecord.examName ?? '--'}
                </p>
                {selectedRecord.mobile && (
                  <p className="mt-0.5 text-sm font-semibold text-navy">
                    {selectedRecord.mobile}
                    {selectedRecord.studentName ? ` · ${selectedRecord.studentName}` : ''}
                  </p>
                )}
                {selectedRecord.sourceUrl && (
                  <a
                    href={selectedRecord.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-navy underline"
                  >
                    <Link2 aria-hidden size={12} />
                    View Response Sheet
                  </a>
                )}
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
                  <p className="text-xs font-bold uppercase text-text3">{label}</p>
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
                      <td className="px-3 py-2">{question.marksAwarded.toFixed(2)}</td>
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
