<?php

namespace App\Repositories;

use App\Models\Exam;

class ExamRepository
{
    public function findActiveByParsedName(?string $examName, string $provider): ?Exam
    {
        if ($examName === null || trim($examName) === '') {
            return null;
        }

        $normalized = $this->normalizeName($examName);
        $slug = str($normalized)->slug()->toString();

        $exactMatch = Exam::query()
            ->where('is_active', true)
            ->where('provider', $provider)
            ->where(function ($query) use ($normalized) {
                $query
                    ->whereRaw('LOWER(name) = ?', [$normalized])
                    ->orWhereRaw('LOWER(slug) = ?', [str($normalized)->slug()->toString()]);
            })
            ->with('activeScoringRule')
            ->first();

        if ($exactMatch !== null) {
            return $exactMatch;
        }

        return Exam::query()
            ->where('is_active', true)
            ->where('provider', $provider)
            ->with('activeScoringRule')
            ->get()
            ->first(fn (Exam $exam) => $this->matchesConfiguredName($normalized, $slug, $exam));
    }

    private function matchesConfiguredName(string $normalized, string $slug, Exam $exam): bool
    {
        foreach ($this->candidateNames($exam) as $candidateName) {
            $candidate = $this->normalizeName($candidateName);
            $candidateSlug = str($candidate)->slug()->toString();

            if ($normalized === $candidate || $slug === $candidateSlug) {
                return true;
            }

            if (strlen($candidate) >= 4 && str_contains($normalized, $candidate)) {
                return true;
            }

            if (strlen($normalized) >= 4 && str_contains($candidate, $normalized)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function candidateNames(Exam $exam): array
    {
        $metadata = is_array($exam->metadata) ? $exam->metadata : [];
        $aliases = $metadata['aliases'] ?? [];

        return array_values(array_filter([
            $exam->name,
            $exam->slug,
            ...is_array($aliases) ? $aliases : [],
        ], fn (mixed $value) => is_string($value) && trim($value) !== ''));
    }

    private function normalizeName(string $value): string
    {
        return strtolower(trim(preg_replace('/\s+/u', ' ', $value) ?? $value));
    }
}
