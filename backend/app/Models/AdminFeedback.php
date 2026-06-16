<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminFeedback extends Model
{
    use HasFactory;

    protected $table = 'admin_feedback';

    protected $fillable = [
        'prediction_run_id',
        'type',
        'section_name',
        'question_number',
        'message',
        'status',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function predictionRun(): BelongsTo
    {
        return $this->belongsTo(PredictionRun::class);
    }
}
