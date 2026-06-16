<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\PredictionRepository;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function __construct(
        private readonly PredictionRepository $predictions,
    ) {
    }

    public function __invoke(Request $request)
    {
        $filters = $request->validate([
            'exam_id' => ['nullable', 'integer', 'exists:exams,id'],
            'category' => ['nullable', 'string', 'max:64'],
            'state' => ['nullable', 'string', 'max:64'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        return $this->predictions->topScores($filters, (int) ($filters['per_page'] ?? 25));
    }
}
