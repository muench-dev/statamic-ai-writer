<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Exception;
use Illuminate\Support\Facades\Http;
use MuenchDev\StatamicAiWriter\Services\AiService;

class AiServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('statamic-ai-writer.api_key', 'test-api-key');
        config()->set('statamic-ai-writer.base_url', 'https://api.openai.com/v1');
        config()->set('statamic-ai-writer.model', 'gpt-4o-mini');
    }

    public function test_it_throws_exception_when_api_key_is_missing(): void
    {
        config()->set('statamic-ai-writer.api_key', null);

        $service = new AiService(apiKey: null);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('OpenAI API Key is missing');

        $service->resize('Sample text to shorten', 'shorten');
    }

    public function test_classification_limits_use_the_published_config_and_cap_results(): void
    {
        config()->set('statamic-ai-writer.classification.max_tags', 1);
        config()->set('statamic-ai-writer.classification.max_categories', 0);
        Http::fake(['*' => Http::response(['choices' => [['message' => [
            'content' => '{"tags":["one","two"],"categories":["Technology"]}',
        ]]]])]);
        $this->assertSame(['tags' => ['one'], 'categories' => []], (new AiService)->classify('Content'));
        Http::assertSent(fn ($request) => str_contains($request['messages'][0]['content'], 'array of 1')
            && str_contains($request['messages'][0]['content'], 'array of 0'));
    }

    public function test_it_shortens_text(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Shortened text.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->resize('This is a much longer sample text that needs to be shortened.', 'shorten');

        $this->assertEquals('Shortened text.', $result);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.openai.com/v1/chat/completions'
                && $request['model'] === 'gpt-4o-mini'
                && str_contains($request['messages'][0]['content'], 'shorten');
        });
    }

    public function test_it_expands_text(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'An expanded and detailed description of the subject matter.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->resize('Brief note.', 'expand');

        $this->assertEquals('An expanded and detailed description of the subject matter.', $result);
    }

    public function test_it_rephrases_text(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'A beautifully rephrased sentence.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->resize('Clunky sentence.', 'rephrase');

        $this->assertEquals('A beautifully rephrased sentence.', $result);
    }

    public function test_it_summarizes_text_into_bullets(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => "* Point 1\n* Point 2\n* Point 3",
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->summarize('Long content about technology...', 'bullets');

        $this->assertStringContainsString('* Point 1', $result);
    }

    public function test_it_translates_text(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Hallo Welt',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->translate('Hello World', 'de');

        $this->assertEquals('Hallo Welt', $result);
    }

    public function test_it_translates_title(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Der große Leitfaden',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->translate('The Ultimate Guide', 'de', isTitle: true);

        $this->assertEquals('Der große Leitfaden', $result);
    }

    public function test_it_classifies_content_into_tags_and_categories(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => '{"tags": ["laravel", "statamic", "ai"], "categories": ["Development", "Tutorials"]}',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $result = $service->classify('A comprehensive article on building AI addons for Statamic in Laravel.');

        $this->assertEquals(['laravel', 'statamic', 'ai'], $result['tags']);
        $this->assertEquals(['Development', 'Tutorials'], $result['categories']);
    }

    public function test_it_resolves_custom_base_urls(): void
    {
        $service1 = new AiService(baseUrl: 'https://api.opper.ai/v3/compat');
        $this->assertEquals('https://api.opper.ai/v3/compat/chat/completions', $service1->resolveChatCompletionsUrl());

        $service2 = new AiService(baseUrl: 'https://api.opper.ai/v3/compat/chat/completions');
        $this->assertEquals('https://api.opper.ai/v3/compat/chat/completions', $service2->resolveChatCompletionsUrl());
    }
}
