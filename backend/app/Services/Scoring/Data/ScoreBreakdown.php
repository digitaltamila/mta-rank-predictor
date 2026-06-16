<?php

namespace App\Services\Scoring\Data;

final readonly class ScoreBreakdown
{
    public function __construct(
        public int $correctCount,
        public int $wrongCount,
        public int $unansweredCount,
        public float $score,
        public float $accuracyPercentage,
        public float $attemptRatePercentage,
        public array $questionScores,
    ) {
    }
}
