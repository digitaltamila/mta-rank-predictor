<?php

namespace App\Services\ResponseSheets;

use App\Services\ResponseSheets\Data\ParsedResponseSheet;

interface ResponseSheetParser
{
    public function supports(string $url): bool;

    public function parse(string $url, string $html): ParsedResponseSheet;
}
