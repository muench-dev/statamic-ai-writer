<?php

namespace MuenchDev\StatamicAiWriter\Jobs;

use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Facades\Asset;
use Statamic\Facades\Site;

class GenerateAltTextJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public array $result = ['generated' => 0, 'skipped' => 0, 'failed' => 0];

    public function __construct(
        public string $assetId,
        public array $altFieldMappings = [],
        public bool $overwrite = false
    ) {
        $this->queue = config('statamic-ai-writer.alt_text.queue', 'default');
    }

    public function handle(AiService $ai): void
    {
        $this->result = ['generated' => 0, 'skipped' => 0, 'failed' => 0];
        $asset = Asset::findById($this->assetId);

        if (! $asset) {
            Log::warning("AI Writer: Asset not found for alt text generation: {$this->assetId}");
            throw new Exception('The asset could not be found for alt text generation.');
        }

        if (! $asset->isImage() || $asset->extension() === 'svg') {
            return;
        }

        $mappings = ! empty($this->altFieldMappings)
            ? $this->altFieldMappings
            : $this->resolveDefaultMappings();

        foreach ($mappings as $locale => $fieldName) {
            $existing = $asset->get($fieldName);

            if (! $this->overwrite && ! empty(trim((string) $existing))) {
                $this->result['skipped']++;

                continue;
            }

            try {
                $altText = $ai->generateAltText($asset, (string) $locale);

                if (trim($altText) === '') {
                    throw new Exception('The AI provider returned empty alt text.');
                }
                $asset->set($fieldName, $altText);
                $this->result['generated']++;
            } catch (Exception $e) {
                $this->result['failed']++;
                Log::error("AI Writer: Failed to generate alt text for asset [{$this->assetId}] in locale [{$locale}]: ".$e->getMessage());
            }
        }

        if ($this->result['generated'] > 0) {
            try {
                if ($asset->save() === false) {
                    throw new Exception('Alt text could not be saved because the asset save was cancelled.');
                }
            } catch (Exception $e) {
                $this->result['failed'] += $this->result['generated'];
                $this->result['generated'] = 0;
                Log::error("AI Writer: Failed to save alt text for asset [{$this->assetId}].");
                throw $e;
            }
        }

        if ($this->result['failed'] > 0) {
            throw new Exception('AI Writer failed to generate one or more alt texts. Check the application log for details.');
        }
    }

    /**
     * Resolve default alt field mapping based on site configuration.
     *
     * @return array<string, string>
     */
    protected function resolveDefaultMappings(): array
    {
        $customMapping = config('statamic-ai-writer.alt_text.field_mapping', []);
        if (! empty($customMapping)) {
            return $customMapping;
        }

        $sites = Site::all();
        $languages = $sites->map(fn ($site) => $site->lang())->values()->unique();

        if ($languages->count() <= 1) {
            $lang = $languages->first() ?: config('statamic-ai-writer.alt_text.default_language', 'de');

            return [$lang => 'alt'];
        }

        return $languages->flatMap(fn ($lang) => [$lang => "alt_{$lang}"])->all();
    }
}
