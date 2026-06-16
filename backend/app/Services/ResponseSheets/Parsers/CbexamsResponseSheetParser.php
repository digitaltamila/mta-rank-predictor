<?php

namespace App\Services\ResponseSheets\Parsers;

use App\Services\ResponseSheets\Data\ParsedQuestion;
use App\Services\ResponseSheets\Data\ParsedResponseSheet;
use App\Services\ResponseSheets\ResponseSheetParser;
use App\Services\ResponseSheets\ResponseSheetParserException;
use DOMDocument;
use DOMElement;
use DOMXPath;

class CbexamsResponseSheetParser implements ResponseSheetParser
{
    public function supports(string $url): bool
    {
        $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');

        return $host === 'cbexams.com' || str_ends_with($host, '.cbexams.com');
    }

    public function parse(string $url, string $html): ParsedResponseSheet
    {
        if (! $this->supports($url)) {
            throw new ResponseSheetParserException('The URL is not a cbexams response sheet.');
        }

        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new DOMXPath($doc);

        $metadata = $this->extractMetadata($xpath);
        $questions = $this->extractQuestions($xpath, $metadata['exam_name'] ?? 'SSC GD');

        if ($questions === []) {
            throw new ResponseSheetParserException(
                'No questions were found in the cbexams response sheet. Please check the URL and try again.',
            );
        }

        return new ParsedResponseSheet(
            provider: 'cbexams',
            candidateName: $metadata['candidate_name'] ?? null,
            rollNumber: $metadata['roll_number'] ?? null,
            examName: $metadata['exam_name'] ?? 'SSC GD',
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

        // Candidate header table: <td class="bld"> key : value pairs
        foreach ($xpath->query('//tr') as $row) {
            $cells = [];
            foreach ($xpath->query('./td', $row) as $cell) {
                $cells[] = $this->normalizeText($cell->textContent);
            }

            if (count($cells) < 2) {
                continue;
            }

            $key = strtolower(trim($cells[0], " :\t\n\r\0\x0B\xc2\xa0"));
            $value = trim($cells[1], " :\t\n\r\0\x0B\xc2\xa0");

            if ($value === '') {
                continue;
            }

            if (str_contains($key, 'candidate name')) {
                $metadata['candidate_name'] = $value;
            } elseif (str_contains($key, 'roll no')) {
                $metadata['roll_number'] = $value;
            } elseif (str_contains($key, 'test date') || str_contains($key, 'exam date')) {
                $metadata['exam_date'] = $value;
            } elseif (str_contains($key, 'test time') || str_contains($key, 'exam time')) {
                $metadata['exam_time'] = $value;
            } elseif (str_contains($key, 'centre') || str_contains($key, 'center')) {
                $metadata['test_center_name'] = $value;
            }
        }

        // Exam name from the disabled dropdown (Exam Level field)
        $selectedOption = $xpath->query('//select[@id="ddltest"]/option[@selected]')->item(0);
        if ($selectedOption !== null) {
            $examName = $this->normalizeText($selectedOption->textContent);
            if ($examName !== '') {
                $metadata['exam_name'] = $examName;
            }
        }

        return $metadata;
    }

    /**
     * @return array<string, ParsedQuestion>
     */
    private function extractQuestions(DOMXPath $xpath, string $sectionName): array
    {
        $questions = [];

        // Each question lives in a <table>. Find the td that shows "Q.No: N"
        $qNoCells = $xpath->query('//td[contains(., "Q.No:")]');

        foreach ($qNoCells as $qNoCell) {
            $cellText = $this->normalizeText($qNoCell->textContent);

            if (! preg_match('/Q\.No[:\s]+(\d+)/i', $cellText, $match)) {
                continue;
            }

            $qNum = (int) $match[1];

            // Walk up to the enclosing <table>
            $table = $qNoCell->parentNode;
            while ($table !== null && $table->nodeName !== 'table') {
                $table = $table->parentNode;
            }

            if (! $table instanceof DOMElement) {
                continue;
            }

            $optionColors = $this->extractOptionColors($xpath, $table, $qNoCell);

            [$selectedAnswer, $correctAnswer] = $this->resolveAnswers($optionColors);

            $questions[(string) $qNum] = new ParsedQuestion(
                questionId: (string) $qNum,
                sectionName: $sectionName,
                selectedAnswer: $selectedAnswer,
                correctAnswer: $correctAnswer,
                rawPayload: [
                    'source' => 'cbexams',
                    'q_num' => $qNum,
                    'option_colors' => $optionColors,
                ],
            );
        }

        ksort($questions, SORT_NUMERIC);

        return $questions;
    }

    /**
     * Collect the bgcolor values of option rows that come after the question row.
     *
     * Each option row has a narrow <td width="2%"> (without valign="top") whose
     * bgcolor attribute encodes the answer status:
     *   green  → candidate selected this and it is correct
     *   red    → candidate selected this but it is wrong
     *   yellow → candidate did NOT select this, but it is the correct answer
     *   (empty)→ unselected, incorrect
     *
     * @return list<string>
     */
    private function extractOptionColors(DOMXPath $xpath, DOMElement $table, \DOMNode $qNoCell): array
    {
        $rows = $xpath->query('./tr', $table);
        $colors = [];
        $pastQuestion = false;

        foreach ($rows as $row) {
            if (! $row instanceof DOMElement) {
                continue;
            }

            // Detect the question row (contains the Q.No cell)
            if (! $pastQuestion) {
                $found = false;
                foreach ($xpath->query('.//td', $row) as $td) {
                    if ($td->isSameNode($qNoCell)) {
                        $found = true;
                        break;
                    }
                }
                if ($found) {
                    $pastQuestion = true;
                }
                continue;
            }

            // Option rows: first <td> has width="2%" and no valign
            $colorCell = $xpath->query('./td[@width="2%" and not(@valign)]', $row)->item(0);

            if (! $colorCell instanceof DOMElement) {
                break; // end of options (hit summary / challenge row)
            }

            $colors[] = strtolower(trim($colorCell->getAttribute('bgcolor')));
        }

        return $colors;
    }

    /**
     * @param  list<string>  $colors  One entry per option (position 1-based)
     * @return array{0: string|null, 1: string|null}  [selectedAnswer, correctAnswer]
     */
    private function resolveAnswers(array $colors): array
    {
        $selected = null;
        $correct = null;

        foreach ($colors as $pos => $color) {
            $optionNum = (string) ($pos + 1);

            if ($color === 'green') {
                // Candidate selected this and it is correct
                $selected = $optionNum;
                $correct = $optionNum;
            } elseif ($color === 'red') {
                // Candidate selected this but it is wrong
                $selected = $optionNum;
            } elseif ($color === 'yellow') {
                // The correct answer the candidate did not choose
                $correct = $optionNum;
            }
        }

        return [$selected, $correct];
    }

    private function normalizeText(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }
}
