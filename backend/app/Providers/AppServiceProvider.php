<?php

namespace App\Providers;

use App\Services\ResponseSheets\Parsers\CbexamsResponseSheetParser;
use App\Services\ResponseSheets\Parsers\DigialmResponseSheetParser;
use App\Services\ResponseSheets\ResponseSheetParserManager;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ResponseSheetParserManager::class, function () {
            return new ResponseSheetParserManager([
                new DigialmResponseSheetParser(),
                new CbexamsResponseSheetParser(),
            ]);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('prediction-submissions', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
