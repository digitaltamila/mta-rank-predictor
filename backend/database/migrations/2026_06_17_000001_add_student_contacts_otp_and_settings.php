<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('mobile', 15)->unique();
            $table->string('name')->nullable();
            $table->timestamps();
        });

        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('mobile', 15)->index();
            $table->string('otp', 6);
            $table->string('session_token', 64)->nullable()->unique();
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::table('prediction_runs', function (Blueprint $table) {
            $table->foreignId('student_contact_id')
                ->nullable()
                ->after('response_sheet_id')
                ->constrained('student_contacts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('prediction_runs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('student_contact_id');
        });
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('otp_verifications');
        Schema::dropIfExists('student_contacts');
    }
};
