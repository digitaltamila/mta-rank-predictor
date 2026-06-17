<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PredictionRunResource;
use App\Models\OtpVerification;
use App\Models\StudentContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function results(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'session_token' => ['required', 'string', 'size:64'],
        ]);

        $mobile = $request->input('mobile');
        $token = $request->input('session_token');

        $verified = OtpVerification::query()
            ->where('mobile', $mobile)
            ->where('session_token', $token)
            ->whereNotNull('verified_at')
            ->exists();

        if (! $verified) {
            return response()->json(['message' => 'Invalid or expired session. Please verify again.'], 401);
        }

        $contact = StudentContact::query()
            ->where('mobile', $mobile)
            ->with(['predictionRuns.exam', 'predictionRuns.responseSheet'])
            ->first();

        if ($contact === null) {
            return response()->json(['data' => [], 'name' => null]);
        }

        $runs = $contact->predictionRuns()
            ->with(['exam', 'responseSheet'])
            ->latest()
            ->get()
            ->map(fn ($run) => [
                'id' => $run->id,
                'examName' => $run->exam?->name,
                'candidateName' => $run->responseSheet?->candidate_name,
                'rollNumber' => $run->responseSheet?->roll_number,
                'score' => (float) $run->score,
                'overallRank' => $run->overall_rank,
                'categoryRank' => $run->category_rank,
                'category' => $run->category,
                'state' => $run->state,
                'createdAt' => $run->created_at?->toISOString(),
            ]);

        return response()->json([
            'data' => $runs,
            'name' => $contact->name,
            'mobile' => $contact->mobile,
        ]);
    }
}
