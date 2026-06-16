<?php

namespace Tests\Unit;

use App\Services\ResponseSheets\Parsers\DigialmResponseSheetParser;
use App\Services\ResponseSheets\ResponseSheetParserException;
use PHPUnit\Framework\TestCase;

class DigialmResponseSheetParserTest extends TestCase
{
    public function test_it_extracts_metadata_and_answer_rows_from_digialm_html(): void
    {
        $html = <<<'HTML'
        <html>
            <body>
                <table>
                    <tr><td>Candidate Name</td><td>Arun Kumar</td></tr>
                    <tr><td>Roll Number</td><td>TN001</td></tr>
                    <tr><td>Exam Name</td><td>RRB NTPC</td></tr>
                </table>
                <section>
                    Question ID : Q1001
                    Section : General Awareness
                    Chosen Option : 2
                    Correct Option : 2
                </section>
                <section>
                    Question ID : Q1002
                    Section : General Awareness
                    Chosen Option : --
                    Correct Option : 4
                </section>
            </body>
        </html>
        HTML;

        $sheet = (new DigialmResponseSheetParser())->parse(
            'https://rrb.digialm.com/sample.html',
            $html,
        );

        $this->assertSame('digialm', $sheet->provider);
        $this->assertSame('Arun Kumar', $sheet->candidateName);
        $this->assertSame('TN001', $sheet->rollNumber);
        $this->assertSame('RRB NTPC', $sheet->examName);
        $this->assertCount(2, $sheet->questions);
        $this->assertSame('Q1001', $sheet->questions[0]->questionId);
        $this->assertSame('2', $sheet->questions[0]->selectedAnswer);
        $this->assertNull($sheet->questions[1]->selectedAnswer);
    }

    public function test_it_rejects_sheets_without_complete_answer_keys(): void
    {
        $this->expectException(ResponseSheetParserException::class);
        $this->expectExceptionMessage('does not include official correct answers yet');

        (new DigialmResponseSheetParser())->parse(
            'https://rrb.digialm.com/sample.html',
            '<html><body>Question ID : Q1001 Chosen Option : 2</body></html>',
        );
    }

    public function test_it_extracts_correct_answers_from_digialm_question_panels(): void
    {
        $html = <<<'HTML'
        <html>
            <body>
                <div class="section-lbl">Section : NTPC</div>
                <div class="question-pnl">
                    <table class="questionRowTbl">
                        <tr><td>1. First option</td></tr>
                        <tr><td class="rightAns">2. Correct option text</td></tr>
                        <tr><td>3. Third option</td></tr>
                    </table>
                    <table>
                        <tr><td>Question ID :</td><td>115135907</td></tr>
                        <tr><td>Status :</td><td>Answered</td></tr>
                        <tr><td>Chosen Option :</td><td>2</td></tr>
                    </table>
                </div>
            </body>
        </html>
        HTML;

        $sheet = (new DigialmResponseSheetParser())->parse(
            'https://rrb.digialm.com/sample.html',
            $html,
        );

        $this->assertCount(1, $sheet->questions);
        $this->assertSame('115135907', $sheet->questions[0]->questionId);
        $this->assertSame('NTPC', $sheet->questions[0]->sectionName);
        $this->assertSame('2', $sheet->questions[0]->selectedAnswer);
        $this->assertSame('2', $sheet->questions[0]->correctAnswer);
    }

    public function test_it_normalizes_multi_answer_question_panel_answers(): void
    {
        $html = <<<'HTML'
        <html>
            <body>
                <div class="section-lbl">Section : Reasoning</div>
                <div class="question-pnl">
                    <table class="questionRowTbl">
                        <tr><td class="rightAns">3. Third option</td></tr>
                        <tr><td>2. Second option</td></tr>
                        <tr><td class="rightAns">1. First option</td></tr>
                    </table>
                    <table>
                        <tr><td>Question ID :</td><td>Q2001</td></tr>
                        <tr><td>Chosen Option :</td><td>3, 1</td></tr>
                    </table>
                </div>
            </body>
        </html>
        HTML;

        $sheet = (new DigialmResponseSheetParser())->parse(
            'https://rrb.digialm.com/sample.html',
            $html,
        );

        $this->assertSame('1,3', $sheet->questions[0]->selectedAnswer);
        $this->assertSame('1,3', $sheet->questions[0]->correctAnswer);
    }

    public function test_it_infers_exam_name_from_digialm_subject_or_section(): void
    {
        $html = <<<'HTML'
        <html>
            <body>
                <table>
                    <tr><td>Registration Number</td><td>J62512833249</td></tr>
                    <tr><td>Roll Number</td><td>1862512900148332</td></tr>
                    <tr><td>Candidate Name</td><td>VIGNESH R</td></tr>
                    <tr><td>Community</td><td>UR</td></tr>
                    <tr><td>Test Center Name</td><td>iON Digital Zone iDZ Tirunelveli</td></tr>
                    <tr><td>Exam Date</td><td>17/03/2026</td></tr>
                    <tr><td>Exam Time</td><td>12:45 PM - 2:15 PM</td></tr>
                    <tr><td>Subject</td><td>NTPC</td></tr>
                </table>
                <div class="section-lbl">Section : NTPC</div>
                <div class="question-pnl">
                    <table class="questionRowTbl">
                        <tr><td class="rightAns">1. Correct option</td></tr>
                    </table>
                    <table>
                        <tr><td>Question ID :</td><td>Q3001</td></tr>
                        <tr><td>Chosen Option :</td><td>1</td></tr>
                    </table>
                </div>
            </body>
        </html>
        HTML;

        $sheet = (new DigialmResponseSheetParser())->parse(
            'https://rrb.digialm.com/sample.html',
            $html,
        );

        $this->assertSame('NTPC', $sheet->examName);
        $this->assertSame('J62512833249', $sheet->rawPayload['metadata']['registration_number']);
        $this->assertSame('17/03/2026', $sheet->rawPayload['metadata']['exam_date']);
        $this->assertSame('12:45 PM - 2:15 PM', $sheet->rawPayload['metadata']['exam_time']);
    }

    public function test_it_only_supports_real_digialm_domains(): void
    {
        $parser = new DigialmResponseSheetParser();

        $this->assertTrue($parser->supports('https://rrb.digialm.com/sample.html'));
        $this->assertTrue($parser->supports('https://digialm.com/sample.html'));
        $this->assertFalse($parser->supports('https://digialm.com.example.org/sample.html'));
    }
}
