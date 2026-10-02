<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use MuenchDev\StatamicAiWriter\Actions\GenerateAltTextAction;
use MuenchDev\StatamicAiWriter\Jobs\GenerateAltTextJob;
use MuenchDev\StatamicAiWriter\Listeners\GenerateAltTextOnUpload;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Contracts\Assets\Asset;
use Statamic\Events\AssetUploaded;

class AltTextTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('statamic.editions.pro', true);
        config()->set('statamic-ai-writer.api_key', 'test-key');
        config()->set('statamic-ai-writer.base_url', 'https://api.openai.com/v1');
        config()->set('statamic-ai-writer.model', 'gpt-4o-mini');
        config()->set('statamic-ai-writer.alt_text.enabled', true);
    }

    public function test_it_generates_alt_text_from_image_payload(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'A clean modern workspace with laptop and coffee cup.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new AiService;
        $payload = [
            'base64' => base64_encode('fake-png-bytes'),
            'mime_type' => 'image/png',
        ];

        $altText = $service->generateAltText($payload, 'en');

        $this->assertEquals('A clean modern workspace with laptop and coffee cup.', $altText);

        Http::assertSent(function ($request) {
            $hasImageUrl = false;
            foreach ($request['messages'] as $message) {
                if (is_array($message['content'])) {
                    foreach ($message['content'] as $part) {
                        if (($part['type'] ?? '') === 'image_url') {
                            $hasImageUrl = str_contains($part['image_url']['url'] ?? '', 'data:image/png;base64,');
                        }
                    }
                }
            }

            return $request->url() === 'https://api.openai.com/v1/chat/completions'
                && $hasImageUrl;
        });
    }

    public function test_it_dispatches_job_from_action(): void
    {
        Queue::fake();
        config()->set('queue.default', 'redis');

        $action = new GenerateAltTextAction;
        $asset = \Mockery::mock(Asset::class);
        $asset->shouldReceive('id')->andReturn('assets::sample.jpg');
        $asset->shouldReceive('isImage')->andReturn(true);
        $asset->shouldReceive('extension')->andReturn('jpg');

        $action->run(collect([$asset]), ['overwrite' => true]);

        Queue::assertPushed(GenerateAltTextJob::class, function ($job) {
            return $job->assetId === 'assets::sample.jpg' && $job->overwrite === true;
        });
    }

    public function test_upload_listener_dispatches_job_when_enabled(): void
    {
        Queue::fake();
        config()->set('statamic-ai-writer.alt_text.generate_on_upload', true);

        $asset = \Mockery::mock(\Statamic\Assets\Asset::class);
        $asset->shouldReceive('id')->andReturn('assets::uploaded.png');
        $asset->shouldReceive('isImage')->andReturn(true);
        $asset->shouldReceive('extension')->andReturn('png');

        $event = new AssetUploaded($asset, 'uploaded.png');
        $listener = new GenerateAltTextOnUpload;
        $listener->handle($event);

        Queue::assertPushed(GenerateAltTextJob::class, function ($job) {
            return $job->assetId === 'assets::uploaded.png';
        });
    }

    public function test_upload_listener_ignores_non_images_or_when_disabled(): void
    {
        Queue::fake();
        config()->set('statamic-ai-writer.alt_text.generate_on_upload', false);

        $asset = \Mockery::mock(\Statamic\Assets\Asset::class);
        $asset->shouldReceive('id')->andReturn('assets::doc.pdf');
        $asset->shouldReceive('isImage')->andReturn(false);

        $event = new AssetUploaded($asset, 'doc.pdf');
        $listener = new GenerateAltTextOnUpload;
        $listener->handle($event);

        Queue::assertNothingPushed();
    }
}
