<?php

namespace App\Services\Prediction;

use App\Repositories\PredictionRepository;

class RankPredictionService
{
    public function __construct(
        private readonly PredictionRepository $predictions,
    ) {
    }

    public function ranksFor(
        int $examId,
        float $score,
        ?string $category,
        ?string $state,
        ?string $gender,
        ?string $community,
    ): array {
        return [
            'overall_rank' => $this->predictions->higherScoreRank($examId, $score),
            'category_rank' => $category === null
                ? null
                : $this->predictions->higherScoreRank($examId, $score, 'category', $category),
            'state_rank' => $state === null
                ? null
                : $this->predictions->higherScoreRank($examId, $score, 'state', $state),
            'gender_rank' => $gender === null
                ? null
                : $this->predictions->higherScoreRank($examId, $score, 'gender', $gender),
            'community_rank' => $community === null
                ? null
                : $this->predictions->higherScoreRank($examId, $score, 'community', $community),
        ];
    }

    public function percentile(int $examId, int $rank): float
    {
        $totalCandidates = max($this->predictions->candidateCount($examId) + 1, 1);

        return round((($totalCandidates - $rank) / $totalCandidates) * 100, 2);
    }
}
