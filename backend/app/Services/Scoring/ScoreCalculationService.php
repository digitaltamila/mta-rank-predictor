<?php

namespace App\Services\Scoring;

use App\Models\ScoringRule;
use App\Services\ResponseSheets\Data\ParsedQuestion;
use App\Services\ResponseSheets\Data\ParsedResponseSheet;
use App\Services\Scoring\Data\ScoreBreakdown;

class ScoreCalculationService
{
    public function calculate(ParsedResponseSheet $sheet, ScoringRule $rule): ScoreBreakdown
    {
        $correctCount = 0;
        $wrongCount = 0;
        $unansweredCount = 0;
        $score = 0.0;
        $questionScores = [];

        foreach ($sheet->questions as $question) {
            $marksAwarded = $this->marksForQuestion($question, $rule);
            $score += $marksAwarded;

            if ($question->isUnanswered()) {
                $unansweredCount++;
                $status = 'unanswered';
            } elseif ($this->answersMatch($question->selectedAnswer, $question->correctAnswer)) {
                $correctCount++;
                $status = 'correct';
            } else {
                $wrongCount++;
                $status = 'wrong';
            }

            $questionScores[$question->questionId] = [
                'status' => $status,
                'marks_awarded' => round($marksAwarded, 3),
            ];
        }

        $totalQuestions = count($sheet->questions);
        $attempted = $correctCount + $wrongCount;

        return new ScoreBreakdown(
            correctCount: $correctCount,
            wrongCount: $wrongCount,
            unansweredCount: $unansweredCount,
            score: round($score, 3),
            accuracyPercentage: $attempted === 0
                ? 0.0
                : round(($correctCount / $attempted) * 100, 2),
            attemptRatePercentage: $totalQuestions === 0
                ? 0.0
                : round(($attempted / $totalQuestions) * 100, 2),
            questionScores: $questionScores,
        );
    }

    private function marksForQuestion(ParsedQuestion $question, ScoringRule $rule): float
    {
        if ($question->isUnanswered()) {
            return (float) $rule->unanswered_marks;
        }

        if ($this->answersMatch($question->selectedAnswer, $question->correctAnswer)) {
            return (float) $rule->correct_marks;
        }

        return -1 * (float) $rule->negative_marks;
    }

    private function answersMatch(?string $selectedAnswer, ?string $correctAnswer): bool
    {
        return $selectedAnswer !== null
            && $correctAnswer !== null
            && strtoupper(trim($selectedAnswer)) === strtoupper(trim($correctAnswer));
    }
}
