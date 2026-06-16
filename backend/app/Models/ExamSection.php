<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'name',
        'display_order',
        'metadata',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'metadata' => 'array',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
