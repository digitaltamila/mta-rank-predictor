<?php

namespace App\Services\ResponseSheets\Data;

final readonly class ParsedResponseSheet
{
    /**
     * @param  list<ParsedQuestion>  $questions
     */
    public function __construct(
        public string $provider,
        public ?string $candidateName,
        public ?string $rollNumber,
        public ?string $examName,
        public array $questions,
        public array $rawPayload = [],
    ) {
    }
}
