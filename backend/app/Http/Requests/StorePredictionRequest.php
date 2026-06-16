<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePredictionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response_sheet_url' => ['required', 'url', 'max:4096', function ($attribute, $value, $fail) {
                $host = parse_url((string) $value, PHP_URL_HOST);

                $host = is_string($host) ? strtolower($host) : null;

                $isDigialm = $host === 'digialm.com' || str_ends_with($host, '.digialm.com');
                $isCbexams = $host === 'cbexams.com' || str_ends_with($host, '.cbexams.com');

                if ($host === null || (! $isDigialm && ! $isCbexams)) {
                    $fail('Only Digialm (RRB) and cbexams (SSC) response sheet URLs are supported.');
                }
            }],
            'category' => ['nullable', 'string', 'max:64'],
            'horizontal_category' => ['nullable', 'string', 'max:64'],
            'state' => ['nullable', 'string', 'max:64'],
            'rrb_zone' => ['nullable', 'string', 'max:64'],
            'gender' => ['nullable', 'string', 'max:64'],
            'community' => ['nullable', 'string', 'max:64'],
            'paper_language' => ['nullable', 'string', 'max:64'],
            'job_status' => ['nullable', 'string', 'max:64'],
            'exam_tab' => ['nullable', 'string', 'max:32'],
            'answer_key_password' => ['nullable', 'string', 'max:128'],
            'uploaded_html' => ['nullable', 'string'],
            'consent' => ['accepted'],
        ];
    }
}
