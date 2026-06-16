<?php

use App\Http\Controllers\Api\V1\AdminAuthController;
use App\Http\Controllers\Api\V1\AdminPredictionController;
use App\Http\Controllers\Api\V1\FeedbackController;
use App\Http\Controllers\Api\V1\LeaderboardController;
use App\Http\Controllers\Api\V1\PredictionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json([
        'status' => 'ok',
        'service' => 'muppadai-rank-predictor-api',
    ]));

    Route::post('/predictions', [PredictionController::class, 'store'])
        ->middleware('throttle:prediction-submissions');

    Route::get('/leaderboard', LeaderboardController::class)
        ->middleware('throttle:60,1');

    Route::post('/feedback', [FeedbackController::class, 'store'])
        ->middleware('throttle:30,1');

    Route::post('/admin/login', [AdminAuthController::class, 'login'])
        ->middleware('throttle:10,1');

    Route::get('/admin/me', [AdminAuthController::class, 'me']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    Route::get('/admin/predictions', [AdminPredictionController::class, 'index']);
    Route::get('/admin/predictions/{predictionRun}', [AdminPredictionController::class, 'show']);
    Route::get('/admin/feedback', [FeedbackController::class, 'index']);
    Route::patch('/admin/feedback/{feedback}', [FeedbackController::class, 'update']);
});
