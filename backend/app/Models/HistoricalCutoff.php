<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoricalCutoff extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'year',
        'category',
        'state',
        'cutoff_score',
        'source_file',
    ];

    protected $casts = [
        'year' => 'integer',
        'cutoff_score' => 'decimal:3',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
