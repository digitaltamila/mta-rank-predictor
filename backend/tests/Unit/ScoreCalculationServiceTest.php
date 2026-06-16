<?php

namespace Tests\Unit;

use App\Models\ScoringRule;
use App\Services\ResponseSheets\Data\ParsedQuestion;
use App\Services\ResponseSheets\Data\ParsedResponseSheet;
use App\Services\Scoring\ScoreCalculationService;
use PHPUnit\Framework\TestCase;

class ScoreCalculationServiceTest extends TestCase
{
    public function test_it_applies_configured_positive_negative_and_unanswered_marks(): void
    {
        $sheet = new ParsedResponseSheet(
            provider: 'digialm',
            candidateName: 'Candidate',
            rollNumber: 'ROLL1',
            examName: 'RRB NTPC',
            questions: [
                new ParsedQuestion('Q1', 'Maths', 'A', 'A'),
                new ParsedQuestion('Q2', 'Maths', 'B', 'C'),
                new ParsedQuestion('Q3', 'Maths', null, 'D'),
            ],
        );

        $rule = new ScoringRule([
            'correct_marks' => 2,
            'negative_marks' => 0.5,
            'unanswered_marks' => 0,
        ]);

        $result = (new ScoreCalculationService())->calculate($sheet, $rule);

        $this->assertSame(1, $result->correctCount);
        $this->assertSame(1, $result->wrongCount);
        $this->assertSame(1, $result->unansweredCount);
        $this->assertSame(1.5, $result->score);
        $this->assertSame(50.0, $result->accuracyPercentage);
        $this->assertSame(66.67, $result->attemptRatePercentage);
    }
}
