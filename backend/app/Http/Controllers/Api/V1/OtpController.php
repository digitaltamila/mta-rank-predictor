<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OtpVerification;
use App\Services\Sms\Fast2SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OtpController extends Controller
{
    public function __construct(private readonly Fast2SmsService $sms) {}

    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
        ]);

        $mobile = $request->input('mobile');

        // Allow max 3 OTP requests per mobile per 10 minutes
        $recentCount = OtpVerification::query()
            ->where('mobile', $mobile)
            ->where('created_at', '>=', now()->subMinutes(10))
            ->count();

        if ($recentCount >= 3) {
            return response()->json(
                ['message' => 'Too many OTP requests. Please wait 10 minutes.'],
                429,
            );
        }

        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        OtpVerification::query()->create([
            'mobile' => $mobile,
            'otp' => $otp,
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->sms->sendOtp($mobile, $otp);

        return response()->json(['status' => 'sent', 'message' => 'OTP sent to ' . substr($mobile, 0, 2) . '******' . substr($mobile, -2)]);
    }

    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $mobile = $request->input('mobile');
        $otp = $request->input('otp');

        $verification = OtpVerification::query()
            ->where('mobile', $mobile)
            ->where('otp', $otp)
            ->where('expires_at', '>', now())
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if ($verification === null) {
            return response()->json(['message' => 'Invalid or expired OTP. Please try again.'], 422);
        }

        $sessionToken = Str::random(64);

        $verification->update([
            'verified_at' => now(),
            'session_token' => $sessionToken,
        ]);

        return response()->json([
            'verified' => true,
            'session_token' => $sessionToken,
            'mobile' => $mobile,
        ]);
    }
}
