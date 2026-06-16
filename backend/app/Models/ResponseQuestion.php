<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResponseQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'response_sheet_id',
        'provider_question_id',
        'section_name',
        'selected_answer',
        'correct_answer',
        'status',
        'marks_awarded',
        'raw_payload',
    ];

    protected $casts = [
        'marks_awarded' => 'decimal:3',
        'raw_payload' => 'array',
    ];

    public function responseSheet(): BelongsTo
    {
        return $this->belongsTo(ResponseSheet::class);
    }
}
