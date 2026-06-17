import { apiBaseUrl, ApiError } from './http'

export type AdminUser = {
  id: number
  name: string
  email: string
}

export type AdminLoginResponse = {
  token: string
  user: AdminUser
}

export type AdminPredictionSummary = {
  id: string
  examName: string | null
  candidateName: string | null
  rollNumber: string | null
  sourceUrl: string | null
  mobile: string | null
  studentName: string | null
  category: string | null
  state: string | null
  gender: string | null
  score: number
  correctAnswers: number
  wrongAnswers: number
  unansweredQuestions: number
  overallRank: number
  categoryRank: number | null
  stateRank: number | null
  createdAt: string | null
  usedUploadedHtml: boolean
}

export type AdminPaginationMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type AdminSettings = {
  pabbly_webhook_url: string | null
}

export type AdminQuestion = {
  id: number
  questionId: string
  sectionName: string | null
  selectedAnswer: string | null
  correctAnswer: string | null
  status: string
  marksAwarded: number
}

export type AdminPredictionDetail = AdminPredictionSummary & {
  metadata: Record<string, unknown> | null
  candidateDetails: Record<string, string | null>
  questions: AdminQuestion[]
}

export type AdminFeedback = {
  id: number
  predictionRunId: string | null
  type: string
  sectionName: string | null
  questionNumber: string | null
  message: string
  status: string
  candidateName: string | null
  examName: string | null
  createdAt: string | null
}

async function adminRequest<TResponse>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : 'The admin request could not be completed.'

    throw new ApiError(message, response.status, payload)
  }

  return payload as TResponse
}

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/v1/admin/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Login failed.', response.status, payload)
  }

  return payload as AdminLoginResponse
}

export const fetchAdminPredictions = (token: string, page = 1) =>
  adminRequest<{ data: AdminPredictionSummary[]; meta: AdminPaginationMeta }>(
    `/v1/admin/predictions?page=${page}`,
    token,
  )

export const fetchAdminPrediction = (token: string, id: string) =>
  adminRequest<{ data: AdminPredictionDetail }>(`/v1/admin/predictions/${id}`, token)

export const fetchAdminFeedback = (token: string) =>
  adminRequest<{ data: AdminFeedback[] }>('/v1/admin/feedback', token)

export const updateAdminFeedbackStatus = (
  token: string,
  id: number,
  status: string,
) =>
  adminRequest<{ data: AdminFeedback }>(`/v1/admin/feedback/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const adminLogout = (token: string) =>
  adminRequest<{ status: string }>('/v1/admin/logout', token, {
    method: 'POST',
  })

export const pruneDuplicatePredictions = (token: string) =>
  adminRequest<{ deleted: number }>('/v1/admin/predictions/prune-duplicates', token, {
    method: 'POST',
  })

export const deleteAdminPredictions = (token: string, ids: string[]) =>
  adminRequest<{ deleted: number }>('/v1/admin/predictions/bulk', token, {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  })

export type AdminScoringRule = {
  examId: number
  examName: string
  slug: string
  scoringRule: {
    id: number
    correctMarks: number
    negativeMarks: number
    unansweredMarks: number
  } | null
}

export const fetchAdminSettings = (token: string) =>
  adminRequest<{ data: AdminSettings }>('/v1/admin/settings', token)

export const updateAdminSettings = (token: string, settings: Partial<AdminSettings>) =>
  adminRequest<{ status: string }>('/v1/admin/settings', token, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })

export const fetchAdminScoringRules = (token: string) =>
  adminRequest<{ data: AdminScoringRule[] }>('/v1/admin/scoring-rules', token)

export const resetParserCache = (token: string) =>
  adminRequest<{ message: string; reset: number }>('/v1/admin/response-sheets/reset-cache', token, {
    method: 'POST',
  })

export async function downloadDatabaseBackup(token: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/v1/admin/backup/download`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new ApiError(
      (payload as { message?: string }).message ?? 'Backup download failed.',
      response.status,
      payload,
    )
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `muppadai-backup-${new Date().toISOString().slice(0, 10)}.sqlite`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const updateAdminScoringRule = (
  token: string,
  id: number,
  correctMarks: number,
  negativeMarks: number,
  unansweredMarks: number,
) =>
  adminRequest<{ data: AdminScoringRule['scoringRule'] }>(
    `/v1/admin/scoring-rules/${id}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        correct_marks: correctMarks,
        negative_marks: negativeMarks,
        unanswered_marks: unansweredMarks,
      }),
    },
  )
