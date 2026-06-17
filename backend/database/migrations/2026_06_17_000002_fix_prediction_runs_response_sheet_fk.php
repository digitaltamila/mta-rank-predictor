<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prediction_runs', function (Blueprint $table) {
            $table->dropForeign(['response_sheet_id']);
            $table->foreignUuid('response_sheet_id')
                ->nullable()
                ->change();
            $table->foreign('response_sheet_id')
                ->references('id')
                ->on('response_sheets')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('prediction_runs', function (Blueprint $table) {
            $table->dropForeign(['response_sheet_id']);
            $table->foreignUuid('response_sheet_id')
                ->nullable(false)
                ->change();
            $table->foreign('response_sheet_id')
                ->references('id')
                ->on('response_sheets')
                ->cascadeOnDelete();
        });
    }
};
