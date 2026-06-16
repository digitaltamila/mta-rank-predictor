<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('exam_family')->index();
            $table->string('provider')->default('digialm')->index();
            $table->boolean('is_active')->default(true)->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('exam_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('display_order')->default(1);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['exam_id', 'name']);
        });

        Schema::create('scoring_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->decimal('correct_marks', 8, 3);
            $table->decimal('negative_marks', 8, 3)->default(0);
            $table->decimal('unanswered_marks', 8, 3)->default(0);
            $table->string('rounding_mode')->default('standard');
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique(['exam_id', 'version']);
        });

        Schema::create('historical_cutoffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->string('category')->index();
            $table->string('state')->nullable()->index();
            $table->decimal('cutoff_score', 10, 3);
            $table->string('source_file')->nullable();
            $table->timestamps();

            $table->unique(['exam_id', 'year', 'category', 'state']);
            $table->index(['exam_id', 'category', 'year']);
        });

        Schema::create('prediction_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('category')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->decimal('high_probability_margin', 8, 3)->default(5);
            $table->decimal('medium_probability_margin', 8, 3)->default(0);
            $table->unsignedInteger('minimum_sample_size')->default(100);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique(['exam_id', 'category', 'state']);
        });

        Schema::create('response_sheets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('exam_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->index();
            $table->string('source_url_hash', 64)->unique();
            $table->text('source_url');
            $table->text('candidate_name')->nullable();
            $table->text('roll_number')->nullable();
            $table->string('exam_name')->nullable()->index();
            $table->string('status')->default('parsed')->index();
            $table->json('parsed_payload')->nullable();
            $table->timestamp('parsed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('response_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('response_sheet_id')->constrained()->cascadeOnDelete();
            $table->string('provider_question_id')->index();
            $table->string('section_name')->nullable()->index();
            $table->string('selected_answer')->nullable();
            $table->string('correct_answer')->nullable();
            $table->string('status')->index();
            $table->decimal('marks_awarded', 8, 3)->default(0);
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->unique(['response_sheet_id', 'provider_question_id']);
        });

        Schema::create('prediction_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('response_sheet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('category')->nullable()->index();
            $table->string('state')->nullable()->index();
            $table->string('gender')->nullable()->index();
            $table->string('community')->nullable()->index();
            $table->unsignedInteger('correct_count');
            $table->unsignedInteger('wrong_count');
            $table->unsignedInteger('unanswered_count');
            $table->decimal('score', 10, 3)->index();
            $table->decimal('accuracy_percentage', 6, 2);
            $table->decimal('attempt_rate_percentage', 6, 2);
            $table->unsignedBigInteger('overall_rank');
            $table->unsignedBigInteger('category_rank')->nullable();
            $table->unsignedBigInteger('state_rank')->nullable();
            $table->unsignedBigInteger('gender_rank')->nullable();
            $table->unsignedBigInteger('community_rank')->nullable();
            $table->decimal('percentile', 6, 2);
            $table->string('selection_probability');
            $table->decimal('cutoff_score', 10, 3)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['exam_id', 'score']);
            $table->index(['exam_id', 'category', 'score']);
            $table->index(['exam_id', 'state', 'score']);
            $table->index(['exam_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prediction_runs');
        Schema::dropIfExists('response_questions');
        Schema::dropIfExists('response_sheets');
        Schema::dropIfExists('prediction_settings');
        Schema::dropIfExists('historical_cutoffs');
        Schema::dropIfExists('scoring_rules');
        Schema::dropIfExists('exam_sections');
        Schema::dropIfExists('exams');
    }
};
