<?php

namespace Database\Seeders;

use App\Models\Exam;
use App\Models\ExamSection;
use App\Models\PredictionSetting;
use App\Models\ScoringRule;
use Illuminate\Database\Seeder;

class ExamCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $exam = Exam::query()->updateOrCreate(
            ['slug' => 'rrb-ntpc'],
            [
                'name' => 'RRB NTPC',
                'exam_family' => 'Railway',
                'provider' => 'digialm',
                'is_active' => true,
                'metadata' => [
                    'aliases' => [
                        'NTPC',
                        'RRB NTPC Graduate',
                        'RRB NTPC Graduate CBT 1',
                        'RRB NTPC CBT 1',
                        'CEN 05/2024',
                    ],
                    'source_note' => 'Starter config for Digialm RRB NTPC answer-key pages.',
                ],
            ],
        );

        ScoringRule::query()->updateOrCreate(
            [
                'exam_id' => $exam->id,
                'version' => 1,
            ],
            [
                'correct_marks' => 1,
                'negative_marks' => 0.333,
                'unanswered_marks' => 0,
                'rounding_mode' => 'standard',
                'is_active' => true,
            ],
        );

        foreach ([
            'General Awareness',
            'Mathematics',
            'General Intelligence and Reasoning',
            'NTPC',
        ] as $index => $sectionName) {
            ExamSection::query()->updateOrCreate(
                [
                    'exam_id' => $exam->id,
                    'name' => $sectionName,
                ],
                [
                    'display_order' => $index + 1,
                    'metadata' => null,
                ],
            );
        }

        PredictionSetting::query()->updateOrCreate(
            [
                'exam_id' => $exam->id,
                'category' => null,
                'state' => null,
            ],
            [
                'high_probability_margin' => 5,
                'medium_probability_margin' => 0,
                'minimum_sample_size' => 100,
                'is_active' => true,
            ],
        );
    }
}
