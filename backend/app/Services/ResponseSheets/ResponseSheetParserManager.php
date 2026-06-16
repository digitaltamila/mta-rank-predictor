<?php

namespace App\Services\ResponseSheets;

class ResponseSheetParserManager
{
    /**
     * @param  iterable<ResponseSheetParser>  $parsers
     */
    public function __construct(private readonly iterable $parsers)
    {
    }

    public function parserFor(string $url): ResponseSheetParser
    {
        foreach ($this->parsers as $parser) {
            if ($parser->supports($url)) {
                return $parser;
            }
        }

        throw new UnsupportedResponseSheetProviderException(
            'This response sheet provider is not supported yet.',
        );
    }
}
