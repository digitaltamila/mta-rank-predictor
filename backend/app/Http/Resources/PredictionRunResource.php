<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PredictionRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $questions = collect($this->responseSheet?->questions ?? []);
        $metadata = $this->responseSheet?->parsed_payload['metadata'] ?? [];
        $scoringRule = $this->exam?->activeScoringRule;
        $sections = $questions
            ->groupBy(fn ($question) => $question->section_name ?: 'Overall')
            ->map(fn ($sectionQuestions, string $sectionName) => [
                'name' => $sectionName,
                'totalQuestions' => $sectionQuestions->count(),
                'correctAnswers' => $sectionQuestions->where('status', 'correct')->count(),
                'wrongAnswers' => $sectionQuestions->where('status', 'wrong')->count(),
                'unansweredQuestions' => $sectionQuestions->where('status', 'unanswered')->count(),
                'score' => round((float) $sectionQuestions->sum('marks_awarded'), 3),
            ])
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'status' => 'completed',
            'candidateName' => $this->responseSheet?->candidate_name,
            'rollNumber' => $this->responseSheet?->roll_number,
            'candidateDetails' => [
                'registrationNumber' => $metadata['registration_number'] ?? null,
                'community' => $metadata['community'] ?? $this->category,
                'testCenterName' => $metadata['test_center_name'] ?? null,
                'examDate' => $metadata['exam_date'] ?? null,
                'examTime' => $metadata['exam_time'] ?? null,
                'subject' => $metadata['subject'] ?? $this->responseSheet?->exam_name ?? $this->exam?->name,
            ],
            'examName' => $this->exam?->name,
            'score' => (float) $this->score,
            'correctAnswers' => $this->correct_count,
            'wrongAnswers' => $this->wrong_count,
            'unansweredQuestions' => $this->unanswered_count,
            'accuracyPercentage' => (float) $this->accuracy_percentage,
            'attemptRatePercentage' => (float) $this->attempt_rate_percentage,
            'percentile' => (float) $this->percentile,
            'predictedRank' => $this->overall_rank,
            'categoryRank' => $this->category_rank,
            'stateRank' => $this->state_rank,
            'genderRank' => $this->gender_rank,
            'communityRank' => $this->community_rank,
            'category' => $this->category,
            'state' => $this->state,
            'gender' => $this->gender,
            'community' => $this->community,
            'paperLanguage' => $this->metadata['paper_language'] ?? null,
            'jobStatus' => $this->metadata['job_status'] ?? null,
            'usedUploadedHtml' => (bool) ($this->metadata['used_uploaded_html'] ?? false),
            'markingScheme' => [
                'correctMarks' => $scoringRule === null ? null : (float) $scoringRule->correct_marks,
                'negativeMarks' => $scoringRule === null ? null : (float) $scoringRule->negative_marks,
                'unansweredMarks' => $scoringRule === null ? null : (float) $scoringRule->unanswered_marks,
            ],
            'sections' => $sections,
            'cutoffPrediction' => [
                'cutoffScore' => $this->cutoff_score === null ? null : (float) $this->cutoff_score,
                'delta' => $this->metadata['cutoff_delta'] ?? null,
            ],
            'selectionProbability' => $this->selection_probability,
        ];
    }
}
