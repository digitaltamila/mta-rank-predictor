<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesAdminUser;
use App\Http\Controllers\Controller;
use App\Models\ResponseSheet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminResponseSheetController extends Controller
{
    use ResolvesAdminUser;

    public function resetCache(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $count = ResponseSheet::query()->whereNotNull('parsed_at')->count();
        ResponseSheet::query()->update(['parsed_at' => null]);

        return response()->json([
            'message' => "Marked {$count} response sheet(s) for re-parsing. Next submission for each URL will re-fetch the latest data.",
            'reset' => $count,
        ]);
    }

    public function downloadBackup(Request $request): BinaryFileResponse
    {
        $this->ensureAdmin($request);

        $dbPath = config('database.connections.sqlite.database');

        abort_unless(is_string($dbPath) && file_exists($dbPath), 404, 'Database file not found.');

        $filename = 'muppadai-backup-' . now()->format('Y-m-d_H-i-s') . '.sqlite';

        return response()->download($dbPath, $filename, [
            'Content-Type'        => 'application/octet-stream',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
