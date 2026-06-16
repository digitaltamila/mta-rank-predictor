<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePredictionRequest;
use App\Http\Resources\PredictionRunResource;
use App\Models\Exam;
use App\Models\PredictionRun;
use App\Models\ResponseQuestion;
use App\Models\ResponseSheet;
use App\Repositories\ExamRepository;
use App\Services\Prediction\RankPredictionService;
use App\Services\Prediction\SelectionProbabilityService;
use App\Services\ResponseSheets\Data\ParsedQuestion;
use App\Services\ResponseSheets\Data\ParsedResponseSheet;
use App\Services\ResponseSheets\ResponseSheetIngestionService;
use App\Services\ResponseSheets\ResponseSheetParserException;
use App\Services\ResponseSheets\UnsupportedResponseSheetProviderException;
use App\Services\Scoring\ScoreCalculationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PredictionController extends Controller
{
    public function __construct(
        private readonly ResponseSheetIngestionService $ingestion,
        private readonly ExamRepository $exams,
        private readonly ScoreCalculationService $scoring,
        private readonly RankPredictionService $ranking,
        private readonly SelectionProbabilityService $selectionProbability,
    ) {
    }

    public function store(StorePredictionRequest $request): PredictionRunResource
    {
        $url = trim($request->string('response_sheet_url')->toString());
        $uploadedHtml = $request->string('uploaded_html')->toString();
        $usedUploadedHtml = trim($uploadedHtml) !== '';

        // Check for a cached parsed sheet to avoid re-fetching from the remote server
        $urlHash = hash('sha256', $url);
        $cachedSheet = $usedUploadedHtml
            ? null
            : ResponseSheet::query()
                ->with('questions')
                ->where('source_url_hash', $urlHash)
                ->where('status', 'parsed')
                ->first();

        $hasCachedQuestions = $cachedSheet !== null && $cachedSheet->questions->isNotEmpty();

        if ($hasCachedQuestions) {
            // Reconstruct from DB — no HTTP request needed
            $parsedSheet = $this->sheetFromCache($cachedSheet);
            $exam = Exam::query()->with('activeScoringRule')->find($cachedSheet->exam_id);
        } else {
            // Fresh fetch and parse
            try {
                $parsedSheet = $usedUploadedHtml
                    ? $this->ingestion->ingestHtml($url, $uploadedHtml)
                    : $this->ingestion->ingest($url);
            } catch (UnsupportedResponseSheetProviderException|ResponseSheetParserException $exception) {
                throw ValidationException::withMessages([
                    'response_sheet_url' => $exception->getMessage(),
                ]);
            }

            $exam = $this->exams->findActiveByParsedName($parsedSheet->examName, $parsedSheet->provider);
        }

        if ($exam === null) {
            throw ValidationException::withMessages([
                'response_sheet_url' => 'This exam is not enabled yet. RRB NTPC is enabled for Digialm answer-key URLs.',
            ]);
        }

        $scoringRule = $exam->activeScoringRule;

        if ($scoringRule === null) {
            throw ValidationException::withMessages([
                'response_sheet_url' => 'The active scoring rule is missing for this exam.',
            ]);
        }

        $category = $this->nullableDimension($request->input('category'));
        $state = $this->nullableDimension($request->input('rrb_zone')) ?? $this->nullableDimension($request->input('state'));
        $gender = $this->nullableDimension($request->input('gender'));
        $community = $this->nullableDimension($request->input('horizontal_category')) ?? $this->nullableDimension($request->input('community'));
        $paperLanguage = $this->nullableDimension($request->input('paper_language'));
        $jobStatus = $this->nullableDimension($request->input('job_status'));
        $examTab = $this->nullableDimension($request->input('exam_tab'));
        $answerKeyPasswordSupplied = $this->nullableDimension($request->input('answer_key_password')) !== null;

        $score = $this->scoring->calculate($parsedSheet, $scoringRule);
        $ranks = $this->ranking->ranksFor(
            $exam->id, $score->score, $category, $state, $gender, $community,
        );
        $probability = $this->selectionProbability->evaluate(
            $exam->id, $score->score, $category, $state,
        );

        $predictionRun = DB::transaction(function () use (
            $url, $urlHash, $parsedSheet, $exam, $cachedSheet, $hasCachedQuestions,
            $category, $state, $gender, $community, $paperLanguage, $jobStatus,
            $examTab, $answerKeyPasswordSupplied, $usedUploadedHtml,
            $score, $ranks, $probability,
        ) {
            // Persist the response sheet and its questions only when not using cached data
            if ($hasCachedQuestions) {
                $responseSheet = $cachedSheet;
            } else {
                $responseSheet = ResponseSheet::query()->updateOrCreate(
                    ['source_url_hash' => $urlHash],
                    [
                        'exam_id' => $exam->id,
                        'provider' => $parsedSheet->provider,
                        'source_url' => $url,
                        'candidate_name' => $parsedSheet->candidateName,
                        'roll_number' => $parsedSheet->rollNumber,
                        'exam_name' => $parsedSheet->examName,
                        'status' => 'parsed',
                        'parsed_payload' => $parsedSheet->rawPayload,
                        'parsed_at' => now(),
                    ],
                );

                $responseSheet->questions()->delete();

                foreach ($parsedSheet->questions as $question) {
                    $questionScore = $score->questionScores[$question->questionId];

                    $responseSheet->questions()->create([
                        'provider_question_id' => $question->questionId,
                        'section_name' => $question->sectionName,
                        'selected_answer' => $question->selectedAnswer,
                        'correct_answer' => $question->correctAnswer,
                        'status' => $questionScore['status'],
                        'marks_awarded' => $questionScore['marks_awarded'],
                        'raw_payload' => $question->rawPayload,
                    ]);
                }
            }

            // Upsert PredictionRun — same sheet + same dimension filters → update ranks
            return PredictionRun::query()->updateOrCreate(
                [
                    'response_sheet_id' => $responseSheet->id,
                    'category' => $category,
                    'state' => $state,
                    'gender' => $gender,
                ],
                [
                    'exam_id' => $exam->id,
                    'community' => $community,
                    'correct_count' => $score->correctCount,
                    'wrong_count' => $score->wrongCount,
                    'unanswered_count' => $score->unansweredCount,
                    'score' => $score->score,
                    'accuracy_percentage' => $score->accuracyPercentage,
                    'attempt_rate_percentage' => $score->attemptRatePercentage,
                    'overall_rank' => $ranks['overall_rank'],
                    'category_rank' => $ranks['category_rank'],
                    'state_rank' => $ranks['state_rank'],
                    'gender_rank' => $ranks['gender_rank'],
                    'community_rank' => $ranks['community_rank'],
                    'percentile' => $this->ranking->percentile($exam->id, $ranks['overall_rank']),
                    'selection_probability' => $probability['selection_probability'],
                    'cutoff_score' => $probability['cutoff_score'],
                    'metadata' => [
                        'cutoff_delta' => $probability['cutoff_delta'],
                        'paper_language' => $paperLanguage,
                        'job_status' => $jobStatus,
                        'exam_tab' => $examTab,
                        'answer_key_password_supplied' => $answerKeyPasswordSupplied,
                        'used_uploaded_html' => $usedUploadedHtml,
                        'submitted_fields' => [
                            'category' => $category,
                            'horizontal_category' => $community,
                            'gender' => $gender,
                            'state' => $state,
                            'paper_language' => $paperLanguage,
                            'job_status' => $jobStatus,
                            'exam_tab' => $examTab,
                            'used_uploaded_html' => $usedUploadedHtml,
                        ],
                    ],
                ],
            );
        });

        return new PredictionRunResource(
            $predictionRun->load(['exam.activeScoringRule', 'responseSheet.questions']),
        );
    }

    /**
     * Reconstruct a ParsedResponseSheet from a cached ResponseSheet and its questions.
     * Used to skip the remote HTTP fetch on repeat submissions.
     */
    private function sheetFromCache(ResponseSheet $sheet): ParsedResponseSheet
    {
        $questions = $sheet->questions->map(fn (ResponseQuestion $q) => new ParsedQuestion(
            questionId: $q->provider_question_id,
            sectionName: $q->section_name,
            selectedAnswer: $q->selected_answer,
            correctAnswer: $q->correct_answer,
        ))->all();

        return new ParsedResponseSheet(
            provider: $sheet->provider,
            candidateName: $sheet->candidate_name,
            rollNumber: $sheet->roll_number,
            examName: $sheet->exam_name,
            questions: $questions,
        );
    }

    private function nullableDimension(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
