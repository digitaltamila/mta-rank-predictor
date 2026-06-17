<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PredictionRun extends Model
{
    use HasFactory;
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'response_sheet_id',
        'exam_id',
        'student_contact_id',
        'category',
        'state',
        'gender',
        'community',
        'correct_count',
        'wrong_count',
        'unanswered_count',
        'score',
        'accuracy_percentage',
        'attempt_rate_percentage',
        'overall_rank',
        'category_rank',
        'state_rank',
        'gender_rank',
        'community_rank',
        'percentile',
        'selection_probability',
        'cutoff_score',
        'metadata',
    ];

    protected $casts = [
        'correct_count' => 'integer',
        'wrong_count' => 'integer',
        'unanswered_count' => 'integer',
        'score' => 'decimal:3',
        'accuracy_percentage' => 'decimal:2',
        'attempt_rate_percentage' => 'decimal:2',
        'overall_rank' => 'integer',
        'category_rank' => 'integer',
        'state_rank' => 'integer',
        'gender_rank' => 'integer',
        'community_rank' => 'integer',
        'percentile' => 'decimal:2',
        'cutoff_score' => 'decimal:3',
        'metadata' => 'array',
    ];

    public function responseSheet(): BelongsTo
    {
        return $this->belongsTo(ResponseSheet::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function studentContact(): BelongsTo
    {
        return $this->belongsTo(StudentContact::class);
    }
}
