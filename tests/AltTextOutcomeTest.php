<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Mockery;
use MuenchDev\StatamicAiWriter\Actions\GenerateAltTextAction;
use MuenchDev\StatamicAiWriter\Jobs\GenerateAltTextJob;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Contracts\Assets\Asset as AssetContract;
use Statamic\Facades\Asset;

class AltTextOutcomeTest extends TestCase
{
    protected function asset(array $existing = [])
    {
        config()->set('statamic-ai-writer.api_key', 'test-key');
        config()->set('statamic-ai-writer.alt_text.field_mapping', ['en' => 'alt']);
        config()->set('queue.default', 'sync');
        $asset = Mockery::mock(AssetContract::class);
        $asset->shouldReceive('id')->andReturn('assets::sample.jpg');
        $asset->shouldReceive('isImage')->andReturn(true);
        $asset->shouldReceive('extension')->andReturn('jpg');
        $asset->shouldReceive('get')->andReturnUsing(fn ($field) => $existing[$field] ?? null);
        Asset::shouldReceive('findById')->with('assets::sample.jpg')->andReturn($asset);

        return $asset;
    }

    public function test_missing_api_key_reports_setup_error_before_dispatch(): void
    {
        config()->set('statamic-ai-writer.api_key', null);
        Queue::fake();
        try {
            (new GenerateAltTextAction)->run(collect(), []);
            $this->fail('Missing configuration must fail.');
        } catch (Exception $e) {
            $this->assertStringContainsString('OPEN_AI_API_KEY', $e->getMessage());
        }
        Queue::assertNothingPushed();
    }

    public function test_sync_action_reports_provider_failure_and_preserves_asset(): void
    {
        $asset = $this->asset();
        $asset->shouldNotReceive('set');
        $asset->shouldNotReceive('save');
        $ai = Mockery::mock(AiService::class);
        $ai->shouldReceive('generateAltText')->once()->andThrow(new Exception('Provider unavailable'));
        $this->app->instance(AiService::class, $ai);
        $this->expectExceptionMessage('Generated 0 alt texts. Skipped 0 existing alt texts. Failed: 1.');
        (new GenerateAltTextAction)->run(collect([$asset]), []);
    }

    public function test_job_with_missing_api_key_fails_without_writing_or_sending_a_request(): void
    {
        $asset = $this->asset();
        $asset->shouldReceive('contents')->andReturn('fake-image-bytes');
        $asset->shouldReceive('mimeType')->andReturn('image/jpeg');
        $asset->shouldNotReceive('save');
        config()->set('statamic-ai-writer.api_key', null);
        Http::fake();
        $job = new GenerateAltTextJob($asset->id());
        try {
            $job->handle(new AiService);
            $this->fail('Missing credentials must fail the job.');
        } catch (Exception $e) {
            $this->assertSame(1, $job->result['failed']);
        }
        Http::assertNothingSent();
    }

    public function test_existing_alt_text_is_reported_as_skipped_without_calling_provider(): void
    {
        $asset = $this->asset(['alt' => 'Existing description.']);
        $asset->shouldNotReceive('save');
        Http::fake();
        $message = (new GenerateAltTextAction)->run(collect([$asset]), []);
        $this->assertSame('Generated 0 alt texts. Skipped 1 existing alt texts. Failed: 0.', $message);
        Http::assertNothingSent();
    }

    public function test_overwrite_generates_and_saves_alt_text(): void
    {
        $asset = $this->asset(['alt' => 'Old description.']);
        $asset->shouldReceive('set')->once()->with('alt', 'New description.');
        $asset->shouldReceive('save')->once();
        $ai = Mockery::mock(AiService::class);
        $ai->shouldReceive('generateAltText')->once()->with($asset, 'en')->andReturn('New description.');
        $this->app->instance(AiService::class, $ai);
        $this->assertSame('Generated 1 alt texts. Skipped 0 existing alt texts. Failed: 0.',
            (new GenerateAltTextAction)->run(collect([$asset]), ['overwrite' => true]));
    }

    public function test_multilingual_job_saves_successful_fields_and_throws_for_failed_fields(): void
    {
        $asset = $this->asset();
        $asset->shouldReceive('set')->once()->with('alt_en', 'Description.');
        $asset->shouldReceive('save')->once();
        $ai = Mockery::mock(AiService::class);
        $ai->shouldReceive('generateAltText')->with($asset, 'en')->andReturn('Description.');
        $ai->shouldReceive('generateAltText')->with($asset, 'de')->andReturn('');
        $job = new GenerateAltTextJob($asset->id(), ['en' => 'alt_en', 'de' => 'alt_de']);
        try {
            $job->handle($ai);
            $this->fail('Failed fields must fail the queued job.');
        } catch (Exception $e) {
            $this->assertStringContainsString('failed to generate', $e->getMessage());
        }
        $this->assertSame(['generated' => 1, 'skipped' => 0, 'failed' => 1], $job->result);
    }
}
