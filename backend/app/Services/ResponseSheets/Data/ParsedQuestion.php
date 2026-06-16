<?php

namespace App\Services\ResponseSheets\Data;

final readonly class ParsedQuestion
{
    public function __construct(
        public string $questionId,
        public ?string $sectionName,
        public ?string $selectedAnswer,
        public ?string $correctAnswer,
        public array $rawPayload = [],
    ) {
    }

    public function isUnanswered(): bool
    {
        return $this->selectedAnswer === null || $this->selectedAnswer === '';
    }
}
