<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResponseSheet extends Model
{
    use HasFactory;
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'exam_id',
        'provider',
        'source_url_hash',
        'source_url',
        'candidate_name',
        'roll_number',
        'exam_name',
        'status',
        'parsed_payload',
        'parsed_at',
    ];

    protected $casts = [
        'source_url' => 'encrypted',
        'candidate_name' => 'encrypted',
        'roll_number' => 'encrypted',
        'parsed_payload' => 'array',
        'parsed_at' => 'datetime',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ResponseQuestion::class);
    }

    public function predictionRuns(): HasMany
    {
        return $this->hasMany(PredictionRun::class);
    }
}
