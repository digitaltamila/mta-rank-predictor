<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesAdminUser;
use App\Http\Controllers\Controller;
use App\Models\PredictionRun;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPredictionController extends Controller
{
    use ResolvesAdminUser;

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $runs = PredictionRun::query()
            ->with(['exam', 'responseSheet'])
            ->latest()
            ->limit(200)
            ->get()
            ->map(fn (PredictionRun $run) => $this->summaryPayload($run));

        return response()->json(['data' => $runs]);
    }

    public function show(Request $request, PredictionRun $predictionRun): JsonResponse
    {
        $this->ensureAdmin($request);

        $predictionRun->load(['exam.activeScoringRule', 'responseSheet.questions']);

        return response()->json([
            'data' => [
                ...$this->summaryPayload($predictionRun),
                'metadata' => $predictionRun->metadata,
                'candidateDetails' => $this->candidateDetails($predictionRun),
                'questions' => $predictionRun->responseSheet?->questions
                    ->map(fn ($question) => [
                        'id' => $question->id,
                        'questionId' => $question->provider_question_id,
                        'sectionName' => $question->section_name,
                        'selectedAnswer' => $question->selected_answer,
                        'correctAnswer' => $question->correct_answer,
                        'status' => $question->status,
                        'marksAwarded' => (float) $question->marks_awarded,
                        'rawPayload' => $question->raw_payload,
                    ])
                    ->values()
                    ->all() ?? [],
            ],
        ]);
    }

    private function summaryPayload(PredictionRun $run): array
    {
        return [
            'id' => $run->id,
            'examName' => $run->exam?->name,
            'candidateName' => $run->responseSheet?->candidate_name,
            'rollNumber' => $run->responseSheet?->roll_number,
            'category' => $run->category,
            'state' => $run->state,
            'gender' => $run->gender,
            'score' => (float) $run->score,
            'correctAnswers' => $run->correct_count,
            'wrongAnswers' => $run->wrong_count,
            'unansweredQuestions' => $run->unanswered_count,
            'overallRank' => $run->overall_rank,
            'categoryRank' => $run->category_rank,
            'stateRank' => $run->state_rank,
            'createdAt' => $run->created_at?->toISOString(),
            'usedUploadedHtml' => (bool) ($run->metadata['used_uploaded_html'] ?? false),
        ];
    }

    private function candidateDetails(PredictionRun $run): array
    {
        $metadata = $run->responseSheet?->parsed_payload['metadata'] ?? [];

        return [
            'registrationNumber' => $metadata['registration_number'] ?? null,
            'community' => $metadata['community'] ?? $run->category,
            'testCenterName' => $metadata['test_center_name'] ?? null,
            'examDate' => $metadata['exam_date'] ?? null,
            'examTime' => $metadata['exam_time'] ?? null,
            'subject' => $metadata['subject'] ?? $run->responseSheet?->exam_name ?? $run->exam?->name,
        ];
    }
}
