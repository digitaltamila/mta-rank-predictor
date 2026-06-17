<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('db:backup', function () {
    $dbPath = config('database.connections.sqlite.database');

    if (! is_string($dbPath) || ! file_exists($dbPath)) {
        $this->error('Database file not found at: ' . ($dbPath ?? 'unknown'));
        return 1;
    }

    $dir = storage_path('app/backups');
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $filename = 'database-' . now()->format('Y-m-d_H-i-s') . '.sqlite';
    copy($dbPath, $dir . '/' . $filename);

    // Keep only the 7 most recent backups
    $files = glob($dir . '/database-*.sqlite') ?: [];
    sort($files);
    foreach (array_slice($files, 0, max(0, count($files) - 7)) as $old) {
        unlink($old);
    }

    $this->info("Backup saved: {$filename}");
    return 0;
})->purpose('Backup the SQLite database to storage/app/backups (keeps last 7)');

// Run daily at 2 AM server time
Schedule::command('db:backup')->dailyAt('02:00');
