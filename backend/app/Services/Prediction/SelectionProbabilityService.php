<?php

namespace App\Services\Prediction;

use App\Models\HistoricalCutoff;
use App\Models\PredictionSetting;

class SelectionProbabilityService
{
    public function evaluate(int $examId, float $score, ?string $category, ?string $state): array
    {
        $cutoff = HistoricalCutoff::query()
            ->where('exam_id', $examId)
            ->when($category, fn ($query) => $query->where('category', $category))
            ->when($state, fn ($query) => $query->where(function ($scope) use ($state) {
                $scope->where('state', $state)->orWhereNull('state');
            }))
            ->orderByDesc('year')
            ->first();

        if ($cutoff === null) {
            return [
                'selection_probability' => 'Low Chance',
                'cutoff_score' => null,
                'cutoff_delta' => null,
            ];
        }

        $settings = PredictionSetting::query()
            ->where('exam_id', $examId)
            ->where('is_active', true)
            ->where(function ($query) use ($category) {
                $query->where('category', $category)->orWhereNull('category');
            })
            ->where(function ($query) use ($state) {
                $query->where('state', $state)->orWhereNull('state');
            })
            ->orderByRaw('CASE WHEN category IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw('CASE WHEN state IS NULL THEN 1 ELSE 0 END')
            ->first();

        $highMargin = (float) ($settings?->high_probability_margin ?? 5);
        $mediumMargin = (float) ($settings?->medium_probability_margin ?? 0);
        $delta = round($score - (float) $cutoff->cutoff_score, 3);

        $probability = match (true) {
            $delta >= $highMargin => 'High Chance',
            $delta >= $mediumMargin => 'Medium Chance',
            default => 'Low Chance',
        };

        return [
            'selection_probability' => $probability,
            'cutoff_score' => (float) $cutoff->cutoff_score,
            'cutoff_delta' => $delta,
        ];
    }
}
