<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesAdminUser;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    use ResolvesAdminUser;

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (
            $user === null
            || ! $user->is_admin
            || ! Hash::check($credentials['password'], $user->password)
        ) {
            throw ValidationException::withMessages([
                'email' => 'The admin credentials are invalid.',
            ]);
        }

        $plainTextToken = Str::random(64);
        $accessToken = $user->tokens()->create([
            'name' => 'admin-panel',
            'token' => hash('sha256', $plainTextToken),
            'abilities' => ['admin'],
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json([
            'token' => $accessToken->id.'|'.$plainTextToken,
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $this->ensureAdmin($request);

        return response()->json([
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $this->resolveBearerAccessToken($request)?->delete();

        return response()->json(['status' => 'ok']);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }
}
