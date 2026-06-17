<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Fast2SmsService
{
    private const DLT_SENDER_ID = 'MUPPDI';
    private const DLT_TEMPLATE_ID = '180282';
    private const DLT_ENTITY_ID = '1001167872062816185';

    public function sendOtp(string $mobile, string $otp): bool
    {
        $apiKey = config('services.fast2sms.api_key');

        if (empty($apiKey)) {
            Log::warning('Fast2SMS API key not configured — OTP not sent', ['mobile' => $mobile]);

            return false;
        }

        $response = Http::withHeaders(['authorization' => $apiKey])
            ->timeout(10)
            ->post('https://www.fast2sms.com/dev/bulkV2', [
                'route' => 'dlt',
                'sender_id' => self::DLT_SENDER_ID,
                'message' => self::DLT_TEMPLATE_ID,
                'variables_values' => $otp . '|',
                'flash' => 0,
                'numbers' => $mobile,
                'dlt_entity_id' => self::DLT_ENTITY_ID,
            ]);

        if (! $response->successful() || ($response->json('return') === false)) {
            Log::error('Fast2SMS OTP send failed', [
                'mobile' => $mobile,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        return true;
    }
}
