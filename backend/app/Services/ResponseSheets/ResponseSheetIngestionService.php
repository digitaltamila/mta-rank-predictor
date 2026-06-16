<?php

namespace App\Services\ResponseSheets;

use App\Services\ResponseSheets\Data\ParsedResponseSheet;
use App\Services\ResponseSheets\Parsers\CbexamsResponseSheetParser;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class ResponseSheetIngestionService
{
    public function __construct(
        private readonly ResponseSheetParserManager $parserManager,
    ) {
    }

    public function ingest(string $url): ParsedResponseSheet
    {
        $parser = $this->parserManager->parserFor($url);

        // cbexams SSC pages are paginated (Part A–D). Fetch all 4 parts and parse together.
        if ($parser instanceof CbexamsResponseSheetParser) {
            $pages = $this->downloadCbexamsAllParts($url);

            return $parser->parseMultiPage($url, $pages);
        }

        $response = $this->downloadHtml($url);

        if (! $response->successful()) {
            throw new ResponseSheetParserException(
                'The response sheet could not be downloaded from the provider.',
            );
        }

        return $parser->parse($url, $response->body());
    }

    public function ingestHtml(string $url, string $html): ParsedResponseSheet
    {
        $parser = $this->parserManager->parserFor($url);

        return $parser->parse($url, $html);
    }

    /**
     * Fetch all 4 parts of a cbexams SSC response sheet.
     *
     * The page is an ASP.NET WebForms app. Part A loads via GET; Parts B–D
     * require a form POST with the page's __VIEWSTATE tokens. A single GET
     * of Part A is enough to derive viewstate for all three POSTs — no
     * session cookie sharing is needed.
     *
     * @return array<string, string>  Keys: 'A', 'B', 'C', 'D'
     */
    private function downloadCbexamsAllParts(string $url): array
    {
        // GET Part A (standard fetch, SSL bypass always on for cbexams)
        $partAResponse = $this->downloadHtmlWithoutSslVerification($url);

        if (! $partAResponse->successful()) {
            throw new ResponseSheetParserException(
                'The response sheet could not be downloaded from the provider.',
            );
        }

        $partAHtml = $partAResponse->body();
        $pages = ['A' => $partAHtml];

        // Extract ASP.NET form state needed for postbacks
        $formState = $this->extractAspNetFormState($partAHtml);

        if (empty($formState['__VIEWSTATE'])) {
            // Single-page response (or not a paginated cbexams page)
            return $pages;
        }

        // Resolve form action URL (relative → absolute)
        preg_match('/<form[^>]+action="([^"]+)"/i', $partAHtml, $fa);
        $formAction = $this->resolveUrl($url, $fa[1] ?? '');

        // POST for Parts B, C, D using Part A's viewstate
        foreach (['P2' => 'B', 'P3' => 'C', 'P4' => 'D'] as $param => $partLetter) {
            $fields = array_merge($formState, [$param => "Click Here for PART-$partLetter"]);

            try {
                $response = $this->cbexamsHttpClient()
                    ->withHeaders([
                        'Content-Type' => 'application/x-www-form-urlencoded',
                        'Referer' => $url,
                    ])
                    ->asForm()
                    ->post($formAction, $fields);

                if ($response->successful()) {
                    $pages[$partLetter] = $response->body();
                }
            } catch (ConnectionException) {
                // If one part fails, continue with what we have
            }
        }

        return $pages;
    }

    /**
     * Extract the three ASP.NET hidden form fields needed for postbacks.
     *
     * @return array<string, string>
     */
    private function extractAspNetFormState(string $html): array
    {
        $state = [];

        foreach (['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION'] as $field) {
            if (preg_match('/<input[^>]+name="' . $field . '"[^>]+value="([^"]*)"/i', $html, $m)) {
                $state[$field] = $m[1];
            }
        }

        return $state;
    }

    /**
     * Resolve a relative URL against a base URL.
     */
    private function resolveUrl(string $base, string $relative): string
    {
        if ($relative === '' || str_starts_with($relative, 'http')) {
            return $relative ?: $base;
        }

        $parsed = parse_url($base);
        $scheme = ($parsed['scheme'] ?? 'https') . '://';
        $host = $parsed['host'] ?? '';
        $dir = rtrim(dirname($parsed['path'] ?? '/'), '/') . '/';

        return $scheme . $host . $dir . ltrim($relative, './');
    }

    private function downloadHtml(string $url): Response
    {
        try {
            return $this->httpClient()->get($url);
        } catch (ConnectionException $exception) {
            if ($this->isSslFailure($exception) && $this->canRetryWithoutSslVerification($url)) {
                return $this->downloadHtmlWithoutSslVerification($url);
            }

            if ($this->isSslFailure($exception)) {
                throw new ResponseSheetParserException(
                    'SSL certificate validation failed while downloading the response sheet. Please try again later or contact support.',
                    previous: $exception,
                );
            }

            throw new ResponseSheetParserException(
                'The response sheet provider could not be reached. Please check the URL and try again.',
                previous: $exception,
            );
        }
    }

    private function downloadHtmlWithoutSslVerification(string $url): Response
    {
        try {
            return $this->httpClient()
                ->withoutVerifying()
                ->get($url);
        } catch (ConnectionException $exception) {
            throw new ResponseSheetParserException(
                'SSL error: the response sheet could not be downloaded from this server. Please try uploading the HTML file instead.',
                previous: $exception,
            );
        }
    }

    private function httpClient(): PendingRequest
    {
        return Http::timeout(20)
            ->connectTimeout(8)
            ->retry(2, 300)
            ->withUserAgent('MuppadaiRankPredictor/1.0')
            ->accept('text/html');
    }

    private function cbexamsHttpClient(): PendingRequest
    {
        return Http::timeout(20)
            ->connectTimeout(8)
            ->withoutVerifying()
            ->withUserAgent('MuppadaiRankPredictor/1.0')
            ->accept('text/html');
    }

    private function isSslFailure(ConnectionException $exception): bool
    {
        return str_contains(strtolower($exception->getMessage()), 'ssl')
            || str_contains(strtolower($exception->getMessage()), 'certificate');
    }

    private function canRetryWithoutSslVerification(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host)) {
            return false;
        }

        $host = strtolower($host);
        $isDigialm = $host === 'digialm.com' || str_ends_with($host, '.digialm.com');
        $isCbexams = $host === 'cbexams.com' || str_ends_with($host, '.cbexams.com');

        if ($isDigialm) {
            return (bool) config('services.digialm.allow_insecure_ssl_fallback', false);
        }

        return $isCbexams;
    }
}
