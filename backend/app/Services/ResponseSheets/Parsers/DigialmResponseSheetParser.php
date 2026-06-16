<?php

namespace App\Services\ResponseSheets\Parsers;

use App\Services\ResponseSheets\Data\ParsedQuestion;
use App\Services\ResponseSheets\Data\ParsedResponseSheet;
use App\Services\ResponseSheets\ResponseSheetParser;
use App\Services\ResponseSheets\ResponseSheetParserException;
use DOMDocument;
use DOMElement;
use DOMXPath;

class DigialmResponseSheetParser implements ResponseSheetParser
{
    public function supports(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host)) {
            return false;
        }

        $host = strtolower($host);

        return $host === 'digialm.com' || str_ends_with($host, '.digialm.com');
    }

    public function parse(string $url, string $html): ParsedResponseSheet
    {
        if (! $this->supports($url)) {
            throw new ResponseSheetParserException('The URL is not a Digialm response sheet.');
        }

        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($document);
        $metadata = $this->extractMetadata($xpath);
        $bodyText = $this->normalizeText($xpath->query('//body')->item(0)?->textContent ?? $html);
        $questions = $this->extractQuestionsFromDom($xpath);

        if ($questions === []) {
            $questions = $this->extractQuestionsFromText($bodyText);
        }

        if ($questions === []) {
            throw new ResponseSheetParserException(
                'No questions were found in the Digialm response sheet.',
            );
        }

        $missingAnswerKeys = array_filter(
            $questions,
            fn (ParsedQuestion $question) => $question->correctAnswer === null,
        );

        if ($missingAnswerKeys !== []) {
            $missingCount = count($missingAnswerKeys);
            $totalCount = count($questions);
            $message = $missingCount === $totalCount
                ? 'This Digialm page does not include official correct answers yet. Please paste the answer-key/objection-tracker HTML URL after the answer key is released.'
                : "Correct answers were missing for {$missingCount} of {$totalCount} parsed questions. Please paste the full Digialm answer-key HTML URL.";

            throw new ResponseSheetParserException($message);
        }

        $metadata['exam_name'] ??= $this->inferExamNameFromQuestions($questions);

        return new ParsedResponseSheet(
            provider: 'digialm',
            candidateName: $metadata['candidate_name'] ?? null,
            rollNumber: $metadata['roll_number'] ?? null,
            examName: $metadata['exam_name'] ?? null,
            questions: array_values($questions),
            rawPayload: [
                'metadata' => $metadata,
                'question_count' => count($questions),
            ],
        );
    }

    private function extractMetadata(DOMXPath $xpath): array
    {
        $metadata = [];

        foreach ($xpath->query('//tr') as $row) {
            $cells = [];

            foreach ($xpath->query('./th|./td', $row) as $cell) {
                $cells[] = $this->normalizeText($cell->textContent);
            }

            if (count($cells) < 2) {
                continue;
            }

            $key = strtolower(trim($cells[0], " :\t\n\r\0\x0B"));
            $value = trim($cells[1]);

            if ($value === '') {
                continue;
            }

            if (str_contains($key, 'candidate') || str_contains($key, 'applicant')) {
                $metadata['candidate_name'] = $value;
            }

            if (str_contains($key, 'registration')) {
                $metadata['registration_number'] = $value;
            }

            if (str_contains($key, 'roll')) {
                $metadata['roll_number'] = $value;
            }

            if (
                (str_contains($key, 'exam name') || str_contains($key, 'assessment'))
                && ! str_contains($key, 'date')
                && ! str_contains($key, 'time')
            ) {
                $metadata['exam_name'] = $value;
            }

            if (str_contains($key, 'community') || str_contains($key, 'category')) {
                $metadata['community'] = $value;
            }

            if (str_contains($key, 'test center') || str_contains($key, 'centre') || str_contains($key, 'center')) {
                $metadata['test_center_name'] = $value;
            }

            if (str_contains($key, 'date')) {
                $metadata['exam_date'] = $value;
            }

            if (str_contains($key, 'time')) {
                $metadata['exam_time'] = $value;
            }

            if (str_contains($key, 'subject')) {
                $metadata['subject'] = $value;
            }
        }

        $metadata['exam_name'] ??= $metadata['subject'] ?? null;

        return $metadata;
    }

    /**
     * @param  array<string, ParsedQuestion>  $questions
     */
    private function inferExamNameFromQuestions(array $questions): ?string
    {
        foreach ($questions as $question) {
            if ($question->sectionName !== null && trim($question->sectionName) !== '') {
                return $question->sectionName;
            }
        }

        return null;
    }

    /**
     * @return array<string, ParsedQuestion>
     */
    private function extractQuestionsFromDom(DOMXPath $xpath): array
    {
        $panels = $xpath->query(
            "//*[contains(concat(' ', normalize-space(@class), ' '), ' question-pnl ')]",
        );
        $questions = [];

        foreach ($panels as $panel) {
            if (! $panel instanceof DOMElement) {
                continue;
            }

            $panelText = $this->normalizeText($panel->textContent);

            if (! preg_match('/Question\s*ID\s*[:\-]?\s*([A-Za-z0-9_-]+)/i', $panelText, $idMatch)) {
                continue;
            }

            $questionId = $idMatch[1];

            $questions[$questionId] = new ParsedQuestion(
                questionId: $questionId,
                sectionName: $this->extractSectionName($xpath, $panel) ?? $this->extractValue($panelText, [
                    'Section',
                    'Subject',
                    'Topic',
                ]),
                selectedAnswer: $this->normalizeAnswer($this->extractValue($panelText, [
                    'Chosen Option',
                    'Selected Option',
                    'Candidate Answer',
                    'Your Answer',
                    'Given Answer',
                ])),
                correctAnswer: $this->extractCorrectAnswerFromPanel($xpath, $panel)
                    ?? $this->normalizeAnswer($this->extractValue($panelText, $this->correctAnswerLabels())),
                rawPayload: [
                    'source' => 'digialm',
                    'extractor' => 'question-pnl',
                ],
            );
        }

        return $questions;
    }

    /**
     * @return array<string, ParsedQuestion>
     */
    private function extractQuestionsFromText(string $text): array
    {
        $parts = preg_split('/(?=Question\s*ID\s*[:\-]?\s*[A-Za-z0-9_-]+)/i', $text);
        $questions = [];

        foreach ($parts ?: [] as $part) {
            if (! preg_match('/Question\s*ID\s*[:\-]?\s*([A-Za-z0-9_-]+)/i', $part, $idMatch)) {
                continue;
            }

            $questionId = $idMatch[1];

            $questions[$questionId] = new ParsedQuestion(
                questionId: $questionId,
                sectionName: $this->extractValue($part, [
                    'Section',
                    'Subject',
                    'Topic',
                ]),
                selectedAnswer: $this->normalizeAnswer($this->extractValue($part, [
                    'Chosen Option',
                    'Selected Option',
                    'Candidate Answer',
                    'Your Answer',
                    'Given Answer',
                ])),
                correctAnswer: $this->normalizeAnswer($this->extractValue($part, $this->correctAnswerLabels())),
                rawPayload: [
                    'source' => 'digialm',
                    'extractor' => 'text',
                ],
            );
        }

        return $questions;
    }

    private function extractSectionName(DOMXPath $xpath, DOMElement $panel): ?string
    {
        $sectionNode = $xpath->query(
            "preceding::*[contains(concat(' ', normalize-space(@class), ' '), ' section-lbl ') or contains(concat(' ', normalize-space(@class), ' '), ' section-title ')][1]",
            $panel,
        )->item(0);

        if ($sectionNode === null) {
            return null;
        }

        $section = $this->normalizeText($sectionNode->textContent);
        $section = preg_replace('/^Section\s*:\s*/i', '', $section) ?? $section;

        return $section === '' ? null : $section;
    }

    private function extractCorrectAnswerFromPanel(DOMXPath $xpath, DOMElement $panel): ?string
    {
        $answers = [];
        $rightAnswerNodes = $xpath->query(
            ".//*[contains(concat(' ', normalize-space(@class), ' '), ' rightAns ')]",
            $panel,
        );

        foreach ($rightAnswerNodes as $rightAnswerNode) {
            $answer = $this->extractOptionMarker($rightAnswerNode->textContent);

            if ($answer !== null) {
                $answers[] = $answer;
            }
        }

        $answers = array_values(array_unique($answers));

        if ($answers === []) {
            return null;
        }

        return $this->normalizeAnswer(implode(',', $answers));
    }

    /**
     * @param  list<string>  $labels
     */
    private function extractValue(string $text, array $labels): ?string
    {
        $start = null;

        foreach ($labels as $label) {
            if (! preg_match('/'.$this->labelExpression($label).'/i', $text, $match, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            $candidateStart = $match[0][1] + strlen($match[0][0]);
            $start = $start === null ? $candidateStart : min($start, $candidateStart);
        }

        if ($start === null) {
            return null;
        }

        $tail = substr($text, $start);
        $end = strlen($tail);
        $boundaries = [
            'Question ID',
            'Section',
            'Subject',
            'Topic',
            'Chosen Option',
            'Selected Option',
            'Candidate Answer',
            'Your Answer',
            'Given Answer',
            'Correct Option',
            'Correct Option(s)',
            'Correct Answer',
            'Right Option',
            'Right Answer',
            'Answer Key',
        ];

        foreach ($boundaries as $boundary) {
            if (! preg_match('/\s+'.$this->labelExpression($boundary).'/i', $tail, $match, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            if ($match[0][1] > 0) {
                $end = min($end, $match[0][1]);
            }
        }

        $value = trim(substr($tail, 0, $end), " \t\n\r\0\x0B:-");

        return $value === '' ? null : $value;
    }

    private function labelExpression(string $label): string
    {
        return preg_quote($label, '/').'(?=\s*[:\-]|\s|$)\s*[:\-]?';
    }

    /**
     * @return list<string>
     */
    private function correctAnswerLabels(): array
    {
        return [
            'Correct Option',
            'Correct Option(s)',
            'Correct Answer',
            'Right Option',
            'Right Answer',
            'Answer Key',
        ];
    }

    private function normalizeAnswer(?string $answer): ?string
    {
        if ($answer === null) {
            return null;
        }

        $answer = trim($answer);
        $emptyValues = ['--', '-', 'not answered', 'not attempted', 'unanswered', 'na', 'n/a'];

        if (in_array(strtolower($answer), $emptyValues, true)) {
            return null;
        }

        $answer = preg_replace('/\s+/u', '', strtoupper($answer)) ?? $answer;

        if (str_contains($answer, ',')) {
            $parts = array_values(array_filter(
                array_map('trim', explode(',', $answer)),
                fn (string $part) => $part !== '',
            ));
            sort($parts, SORT_NATURAL);

            return $parts === [] ? null : implode(',', $parts);
        }

        return $answer;
    }

    private function extractOptionMarker(string $text): ?string
    {
        $text = trim($this->normalizeText($text));

        if ($text === '') {
            return null;
        }

        if (preg_match('/^(?:Ans\s*)?([A-Z]|\d+)\s*[\).:\-]/i', $text, $match)) {
            return strtoupper($match[1]);
        }

        if (preg_match('/^(?:Ans\s*)?([A-Z]|\d+)\b/i', $text, $match)) {
            return strtoupper($match[1]);
        }

        return null;
    }

    private function normalizeText(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }
}
