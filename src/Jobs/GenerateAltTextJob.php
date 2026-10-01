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

class GenerateAltTextJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $assetId,
        public array $altFieldMappings = [],
        public bool $overwrite = false
    ) {
        $this->queue = config('statamic-ai-writer.alt_text.queue', 'default');
    }

    public function handle(AiService $ai): void
    {
        $asset = Asset::findById($this->assetId);

        if (! $asset) {
            Log::warning("AI Writer: Asset not found for alt text generation: {$this->assetId}");
            return;
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
                continue;
            }

            try {
                $altText = $ai->generateAltText($asset, (string) $locale);

                if (! empty($altText)) {
                    $asset->set($fieldName, $altText);
                }
            } catch (Exception $e) {
                Log::error("AI Writer: Failed to generate alt text for asset [{$this->assetId}] in locale [{$locale}]: " . $e->getMessage());
            }
        }

        $asset->save();
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

        $sites = \Statamic\Facades\Site::all();
        $languages = $sites->map(fn($site) => $site->lang())->values()->unique();

        if ($languages->count() <= 1) {
            $lang = $languages->first() ?: config('statamic-ai-writer.alt_text.default_language', 'de');
            return [$lang => 'alt'];
        }

        return $languages->flatMap(fn($lang) => [$lang => "alt_{$lang}"])->all();
    }
}
