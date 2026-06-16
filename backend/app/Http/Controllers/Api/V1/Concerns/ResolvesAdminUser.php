<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Http\Request;

trait ResolvesAdminUser
{
    private function ensureAdmin(Request $request): User
    {
        $user = $this->resolveBearerUser($request);

        abort_unless($user?->is_admin, 403, 'Admin access required.');

        return $user;
    }

    private function resolveBearerUser(Request $request): ?User
    {
        $accessToken = $this->resolveBearerAccessToken($request);

        if ($accessToken === null) {
            return null;
        }

        $tokenable = $accessToken->tokenable;

        if (! $tokenable instanceof User) {
            return null;
        }

        $accessToken->forceFill(['last_used_at' => now()])->save();

        return $tokenable;
    }

    private function resolveBearerAccessToken(Request $request): ?PersonalAccessToken
    {
        $bearerToken = $request->bearerToken();

        if (! is_string($bearerToken) || ! str_contains($bearerToken, '|')) {
            return null;
        }

        [$id, $plainTextToken] = explode('|', $bearerToken, 2);

        if (! ctype_digit($id) || $plainTextToken === '') {
            return null;
        }

        $accessToken = PersonalAccessToken::query()->find((int) $id);

        if ($accessToken === null) {
            return null;
        }

        if (! hash_equals($accessToken->token, hash('sha256', $plainTextToken))) {
            return null;
        }

        if ($accessToken->expires_at !== null && $accessToken->expires_at->isPast()) {
            return null;
        }

        return $accessToken;
    }
}
