<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\V1\Concerns\ResolvesAdminUser;
use App\Models\Exam;
use App\Models\ScoringRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminScoringRuleController extends Controller
{
    use ResolvesAdminUser;

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $exams = Exam::with('activeScoringRule')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $exams->map(fn (Exam $exam) => [
                'examId' => $exam->id,
                'examName' => $exam->name,
                'slug' => $exam->slug,
                'scoringRule' => $exam->activeScoringRule ? [
                    'id' => $exam->activeScoringRule->id,
                    'correctMarks' => (float) $exam->activeScoringRule->correct_marks,
                    'negativeMarks' => (float) $exam->activeScoringRule->negative_marks,
                    'unansweredMarks' => (float) $exam->activeScoringRule->unanswered_marks,
                ] : null,
            ])->values(),
        ]);
    }

    public function update(Request $request, ScoringRule $scoringRule): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'correct_marks' => ['required', 'numeric', 'min:0', 'max:100'],
            'negative_marks' => ['required', 'numeric', 'min:0', 'max:100'],
            'unanswered_marks' => ['required', 'numeric', 'min:-100', 'max:100'],
        ]);

        $scoringRule->update($validated);

        return response()->json([
            'data' => [
                'id' => $scoringRule->id,
                'correctMarks' => (float) $scoringRule->correct_marks,
                'negativeMarks' => (float) $scoringRule->negative_marks,
                'unansweredMarks' => (float) $scoringRule->unanswered_marks,
            ],
        ]);
    }
}
