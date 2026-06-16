<?php

namespace App\Repositories;

use App\Models\PredictionRun;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class PredictionRepository
{
    public function higherScoreRank(
        int $examId,
        float $score,
        ?string $dimension = null,
        ?string $value = null,
    ): int {
        $cacheKey = sprintf(
            'rank:%d:%s:%s:%s',
            $examId,
            $dimension ?? 'overall',
            $value ?? 'all',
            number_format($score, 3, '.', ''),
        );

        return Cache::remember($cacheKey, now()->addSeconds(30), function () use (
            $examId,
            $score,
            $dimension,
            $value,
        ) {
            return $this->baseRankQuery($examId, $score, $dimension, $value)->count() + 1;
        });
    }

    public function candidateCount(int $examId): int
    {
        return Cache::remember(
            "candidate-count:{$examId}",
            now()->addSeconds(30),
            fn () => PredictionRun::query()->where('exam_id', $examId)->count(),
        );
    }

    public function topScores(array $filters, int $perPage)
    {
        return PredictionRun::query()
            ->with(['exam', 'responseSheet'])
            ->when($filters['exam_id'] ?? null, fn (Builder $query, int $examId) => $query->where('exam_id', $examId))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
            ->when($filters['state'] ?? null, fn (Builder $query, string $state) => $query->where('state', $state))
            ->orderByDesc('score')
            ->orderBy('created_at')
            ->paginate($perPage);
    }

    private function baseRankQuery(
        int $examId,
        float $score,
        ?string $dimension,
        ?string $value,
    ): Builder {
        return PredictionRun::query()
            ->where('exam_id', $examId)
            ->where('score', '>', $score)
            ->when(
                $dimension !== null && $value !== null,
                fn (Builder $query) => $query->where($dimension, $value),
            );
    }
}
