<?php

namespace App\Services\ResponseSheets;

use App\Services\ResponseSheets\Data\ParsedResponseSheet;
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
                'SSL error: the Digialm response sheet could not be downloaded from this server. Please try again later.',
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

        return $isDigialm && (bool) config('services.digialm.allow_insecure_ssl_fallback', false);
    }
}
