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
        return $this->parseMultiPage($url, ['A' => $html]);
    }

    /**
     * Parse all 4 parts of a cbexams SSC response sheet.
     *
     * @param  array<string, string>  $pages  Map of part key (A/B/C/D) to HTML string
     */
    public function parseMultiPage(string $url, array $pages): ParsedResponseSheet
    {
        if (! $this->supports($url)) {
            throw new ResponseSheetParserException('The URL is not a cbexams response sheet.');
        }

        // Metadata is consistent across all parts — extract from first page
        $firstHtml = reset($pages);
        $firstXpath = new DOMXPath($this->loadHtml($firstHtml));
        $metadata = $this->extractMetadata($firstXpath);

        $allQuestions = [];

        foreach ($pages as $html) {
            $xpath = new DOMXPath($this->loadHtml($html));

            // Each page has its own section header in <span id="lblsubject">
            $sectionName = $this->extractPageSectionName($xpath)
                ?? $metadata['exam_name']
                ?? 'SSC GD';

            foreach ($this->extractQuestions($xpath, $sectionName) as $qId => $question) {
                $allQuestions[$qId] = $question;
            }
        }

        ksort($allQuestions, SORT_NUMERIC);

        if ($allQuestions === []) {
            throw new ResponseSheetParserException(
                'No questions were found in the cbexams response sheet. Please check the URL and try again.',
            );
        }

        return new ParsedResponseSheet(
            provider: 'cbexams',
            candidateName: $metadata['candidate_name'] ?? null,
            rollNumber: $metadata['roll_number'] ?? null,
            examName: $metadata['exam_name'] ?? 'SSC GD',
            questions: array_values($allQuestions),
            rawPayload: [
                'metadata' => $metadata,
                'question_count' => count($allQuestions),
                'pages_fetched' => array_keys($pages),
            ],
        );
    }

    private function loadHtml(string $html): DOMDocument
    {
        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $doc;
    }

    /**
     * Extract section name from <span id="lblsubject">, keeping the part prefix.
     * "PART-A (General Intelligence and Reasoning)" → "Part A - General Intelligence and Reasoning"
     */
    private function extractPageSectionName(DOMXPath $xpath): ?string
    {
        $node = $xpath->query('//*[@id="lblsubject"]')->item(0);
        if ($node === null) {
            return null;
        }

        $raw = $this->normalizeText($node->textContent);

        // "PART-A (General Intelligence and Reasoning)" → "Part A - General Intelligence and Reasoning"
        if (preg_match('/PART-([A-D])\s*\((.+)\)\s*$/i', $raw, $m)) {
            return 'Part ' . strtoupper($m[1]) . ' - ' . trim($m[2]);
        }

        return $raw !== '' ? $raw : null;
    }

    private function extractMetadata(DOMXPath $xpath): array
    {
        $metadata = [];

        // Candidate header table: key : value pairs in <tr><td> rows
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

        // Exam name from the disabled test-level dropdown (e.g. "Constable (GD)-2026")
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

        return $questions;
    }

    /**
     * Collect bgcolor values of option rows that follow the question row.
     *
     * Each option row has a narrow <td width="2%"> (without valign="top") whose
     * bgcolor encodes the answer status:
     *   green  → candidate selected this and it is correct
     *   red    → candidate selected this but it is wrong
     *   yellow → candidate did NOT select this but it is the correct answer
     *   (empty)→ unselected and incorrect
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

            $colorCell = $xpath->query('./td[@width="2%" and not(@valign)]', $row)->item(0);

            if (! $colorCell instanceof DOMElement) {
                break;
            }

            $colors[] = strtolower(trim($colorCell->getAttribute('bgcolor')));
        }

        return $colors;
    }

    /**
     * @param  list<string>  $colors
     * @return array{0: string|null, 1: string|null}  [selectedAnswer, correctAnswer]
     */
    private function resolveAnswers(array $colors): array
    {
        $selected = null;
        $correct = null;

        foreach ($colors as $pos => $color) {
            $optionNum = (string) ($pos + 1);

            if ($color === 'green') {
                $selected = $optionNum;
                $correct = $optionNum;
            } elseif ($color === 'red') {
                $selected = $optionNum;
            } elseif ($color === 'yellow') {
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
