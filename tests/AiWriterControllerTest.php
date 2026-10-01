<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Illuminate\Support\Facades\Http;
use MuenchDev\StatamicAiWriter\Services\AiService;

class AiWriterControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('statamic.editions.pro', true);
        config()->set('ai-writer.api_key', 'test-key');
        config()->set('ai-writer.base_url', 'https://api.openai.com/v1');
        config()->set('ai-writer.model', 'gpt-4o-mini');

        $user = \Statamic\Facades\User::make()->email('test@example.com')->makeSuper();
        $user->save();
        $this->actingAs($user);
    }

    public function test_it_handles_process_request(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Succinct version.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson(cp_route('ai-writer.process'), [
            'action' => 'shorten',
            'text' => 'Longer paragraph with unnecessary wordiness.',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'result' => 'Succinct version.',
            'action' => 'shorten',
        ]);
    }

    public function test_it_validates_action_parameter(): void
    {
        $response = $this->postJson(cp_route('ai-writer.process'), [
            'action' => 'invalid-action',
            'text' => 'Some text',
        ]);

        $response->assertStatus(422);
    }

    public function test_it_handles_classify_request(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => '{"tags":["ai","statamic"],"categories":["Technology"]}',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson(cp_route('ai-writer.classify'), [
            'content' => 'Building AI writing tools for the modern web.',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'tags' => ['ai', 'statamic'],
            'categories' => ['Technology'],
        ]);
    }

    public function test_it_returns_settings(): void
    {
        $response = $this->getJson(cp_route('ai-writer.settings'));

        $response->assertOk();
        $response->assertJsonStructure([
            'configured',
            'model',
            'default_language',
            'supported_languages',
            'taxonomies',
        ]);
    }
}
