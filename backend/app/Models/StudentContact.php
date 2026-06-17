<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentContact extends Model
{
    protected $fillable = ['mobile', 'name'];

    public function predictionRuns(): HasMany
    {
        return $this->hasMany(PredictionRun::class);
    }
}
