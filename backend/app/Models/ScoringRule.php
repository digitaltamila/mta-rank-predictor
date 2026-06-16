<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScoringRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'correct_marks',
        'negative_marks',
        'unanswered_marks',
        'rounding_mode',
        'version',
        'is_active',
    ];

    protected $casts = [
        'correct_marks' => 'decimal:3',
        'negative_marks' => 'decimal:3',
        'unanswered_marks' => 'decimal:3',
        'version' => 'integer',
        'is_active' => 'boolean',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
