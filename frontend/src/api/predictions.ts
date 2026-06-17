import { apiBaseUrl, apiRequest, ApiError } from './http'

export type PredictionRequest = {
  responseSheetUrl: string
  category?: string
  gender?: string
  state?: string
  uploadedHtml?: string
  examTab?: 'ssc' | 'rrb'
  mobile?: string
  studentName?: string
  otpSessionToken?: string
}

export type PredictionSectionSummary = {
  name: string
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  unansweredQuestions: number
  score: number
}

export type PredictionSummary = {
  id: string
  status: 'completed' | 'processing' | 'failed'
  candidateName: string | null
  rollNumber: string | null
  candidateDetails: {
    registrationNumber: string | null
    community: string | null
    testCenterName: string | null
    examDate: string | null
    examTime: string | null
    subject: string | null
  }
  examName: string
  score: number
  correctAnswers: number
  wrongAnswers: number
  unansweredQuestions: number
  accuracyPercentage: number
  attemptRatePercentage: number
  percentile: number
  predictedRank: number
  categoryRank: number | null
  stateRank: number | null
  genderRank: number | null
  communityRank: number | null
  category: string | null
  state: string | null
  gender: string | null
  community: string | null
  paperLanguage: string | null
  jobStatus: string | null
  usedUploadedHtml: boolean
  markingScheme: {
    correctMarks: number | null
    negativeMarks: number | null
    unansweredMarks: number | null
  }
  sections: PredictionSectionSummary[]
  cutoffPrediction: {
    cutoffScore: number | null
    delta: number | null
  }
  selectionProbability: 'High Chance' | 'Medium Chance' | 'Low Chance'
  totalParticipants?: number
}

type PredictionApiResponse = PredictionSummary | { data: PredictionSummary }

export async function createPrediction(
  input: PredictionRequest,
): Promise<PredictionSummary> {
  const response = await apiRequest<PredictionApiResponse>('/v1/predictions', {
    method: 'POST',
    body: JSON.stringify({
      response_sheet_url: input.responseSheetUrl,
      category: input.category,
      gender: input.gender,
      state: input.state,
      uploaded_html: input.uploadedHtml,
      exam_tab: input.examTab,
      mobile: input.mobile,
      student_name: input.studentName,
      otp_session_token: input.otpSessionToken,
    }),
  })

  return 'data' in response ? response.data : response
}

export async function sendOtp(mobile: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${apiBaseUrl}/v1/otp/send`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Failed to send OTP.', response.status, payload)
  }
  return payload
}

export type StudentResult = {
  id: string
  examName: string | null
  candidateName: string | null
  rollNumber: string | null
  score: number
  overallRank: number
  categoryRank: number | null
  category: string | null
  state: string | null
  createdAt: string | null
}

export async function fetchStudentResults(
  mobile: string,
  sessionToken: string,
): Promise<{ data: StudentResult[]; name: string | null; mobile: string }> {
  const response = await fetch(`${apiBaseUrl}/v1/student/results`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, session_token: sessionToken }),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Could not load results.', response.status, payload)
  }
  return payload
}

export async function verifyOtp(
  mobile: string,
  otp: string,
): Promise<{ verified: boolean; session_token: string; mobile: string }> {
  const response = await fetch(`${apiBaseUrl}/v1/otp/verify`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, otp }),
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Invalid OTP.', response.status, payload)
  }
  return payload
}
