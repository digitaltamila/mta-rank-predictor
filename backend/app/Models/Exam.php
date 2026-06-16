<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Exam extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'exam_family',
        'provider',
        'is_active',
        'metadata',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];

    public function sections(): HasMany
    {
        return $this->hasMany(ExamSection::class);
    }

    public function activeScoringRule(): HasOne
    {
        return $this->hasOne(ScoringRule::class)->where('is_active', true)->latestOfMany();
    }

    public function predictionRuns(): HasMany
    {
        return $this->hasMany(PredictionRun::class);
    }
}
