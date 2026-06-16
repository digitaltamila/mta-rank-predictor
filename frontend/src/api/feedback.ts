import { apiRequest } from './http'

export type FeedbackInput = {
  predictionRunId: string
  type: string
  sectionName?: string
  questionNumber?: string
  message: string
}

export async function createFeedback(input: FeedbackInput) {
  return apiRequest<{ data: { id: number; status: string } }>('/v1/feedback', {
    method: 'POST',
    body: JSON.stringify({
      prediction_run_id: input.predictionRunId,
      type: input.type,
      section_name: input.sectionName,
      question_number: input.questionNumber,
      message: input.message,
    }),
  })
}
