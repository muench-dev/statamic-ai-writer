<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Exception;
use Illuminate\Support\Facades\Http;
use MuenchDev\StatamicAiWriter\Services\AiService;

class TitleGenerationTest extends TestCase
{
    public function test_it_generates_titles_with_content_title_and_tone(): void
    {
        Http::fake(['*' => Http::response([
            'choices' => [['message' => ['content' => '{"titles":["Better headlines","Writing with AI"]}']]],
        ])]);

        $service = new AiService(apiKey: 'test-key');

        $this->assertSame(['Better headlines', 'Writing with AI'], $service->generateTitles(
            'AI helps editors brainstorm accurate headlines.', 'professional', 'Draft headline'
        ));

        Http::assertSent(fn ($request) =>
            str_contains($request['messages'][0]['content'], 'professional, authoritative')
            && str_contains($request['messages'][0]['content'], 'same language')
            && str_contains($request['messages'][1]['content'], 'Draft headline')
            && str_contains($request['messages'][1]['content'], 'AI helps editors')
        );
    }

    public function test_it_normalizes_fenced_json_filters_invalid_values_and_limits_suggestions(): void
    {
        Http::fake(['*' => Http::response([
            'choices' => [['message' => ['content' => "```json\n".json_encode([
                'titles' => [' One ', '', null, 42, ['invalid'], 'One', 'Two', 'Three', 'Four', 'Five', 'Six'],
            ])."\n```"]]],
        ])]);

        $this->assertSame(['One', 'Two', 'Three', 'Four', 'Five'], (new AiService(apiKey: 'test-key'))->generateTitles('Post content'));
    }

    public function test_it_rejects_malformed_provider_output(): void
    {
        Http::fake(['*' => Http::response([
            'choices' => [['message' => ['content' => 'Here are some titles: One, Two']]],
        ])]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('invalid title suggestions');
        (new AiService(apiKey: 'test-key'))->generateTitles('Post content');
    }

    public function test_it_rejects_empty_suggestions(): void
    {
        Http::fake(['*' => Http::response([
            'choices' => [['message' => ['content' => '{"titles":[" ",null]}']]],
        ])]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('no title suggestions');
        (new AiService(apiKey: 'test-key'))->generateTitles('Post content');
    }
}
