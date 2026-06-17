<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesAdminUser;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    use ResolvesAdminUser;

    private const ALLOWED_KEYS = [
        'pabbly_webhook_url',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $settings = [];
        foreach (self::ALLOWED_KEYS as $key) {
            $settings[$key] = AppSetting::get($key);
        }

        return response()->json(['data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'pabbly_webhook_url' => ['nullable', 'url', 'max:500'],
        ]);

        foreach ($validated as $key => $value) {
            if (in_array($key, self::ALLOWED_KEYS, true)) {
                AppSetting::set($key, $value);
            }
        }

        return response()->json(['status' => 'saved']);
    }
}
