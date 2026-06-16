<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesAdminUser;
use App\Http\Controllers\Controller;
use App\Models\AdminFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeedbackController extends Controller
{
    use ResolvesAdminUser;

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prediction_run_id' => ['nullable', 'uuid', 'exists:prediction_runs,id'],
            'type' => ['required', 'string', Rule::in(['wrong_answer', 'message', 'feedback'])],
            'section_name' => ['nullable', 'string', 'max:255'],
            'question_number' => ['nullable', 'string', 'max:64'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $feedback = AdminFeedback::query()->create([
            ...$data,
            'status' => 'open',
            'metadata' => [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'data' => [
                'id' => $feedback->id,
                'status' => $feedback->status,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $feedback = AdminFeedback::query()
            ->with(['predictionRun.responseSheet', 'predictionRun.exam'])
            ->latest()
            ->limit(200)
            ->get()
            ->map(fn (AdminFeedback $item) => $this->payload($item));

        return response()->json(['data' => $feedback]);
    }

    public function update(Request $request, AdminFeedback $feedback): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'status' => ['required', Rule::in(['open', 'reviewing', 'resolved'])],
        ]);

        $feedback->update($data);

        return response()->json(['data' => $this->payload($feedback->fresh(['predictionRun.responseSheet', 'predictionRun.exam']))]);
    }

    private function payload(AdminFeedback $item): array
    {
        return [
            'id' => $item->id,
            'predictionRunId' => $item->prediction_run_id,
            'type' => $item->type,
            'sectionName' => $item->section_name,
            'questionNumber' => $item->question_number,
            'message' => $item->message,
            'status' => $item->status,
            'candidateName' => $item->predictionRun?->responseSheet?->candidate_name,
            'examName' => $item->predictionRun?->exam?->name,
            'createdAt' => $item->created_at?->toISOString(),
        ];
    }
}
