import { apiRequest } from './http'

export type PredictionRequest = {
  responseSheetUrl: string
  category?: string
  gender?: string
  state?: string
  uploadedHtml?: string
  examTab?: 'ssc' | 'rrb'
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
    }),
  })

  return 'data' in response ? response.data : response
}
