<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PredictionSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'category',
        'state',
        'high_probability_margin',
        'medium_probability_margin',
        'minimum_sample_size',
        'is_active',
    ];

    protected $casts = [
        'high_probability_margin' => 'decimal:3',
        'medium_probability_margin' => 'decimal:3',
        'minimum_sample_size' => 'integer',
        'is_active' => 'boolean',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
