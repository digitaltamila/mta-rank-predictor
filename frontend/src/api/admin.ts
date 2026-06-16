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

export const fetchAdminPredictions = (token: string) =>
  adminRequest<{ data: AdminPredictionSummary[] }>('/v1/admin/predictions', token)

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
