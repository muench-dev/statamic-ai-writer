<?php

namespace MuenchDev\StatamicAiWriter\Listeners;

use MuenchDev\StatamicAiWriter\Jobs\GenerateAltTextJob;
use Statamic\Events\AssetUploaded;

class GenerateAltTextOnUpload
{
    public function handle(AssetUploaded $event): void
    {
        $enabled = config('statamic-ai-writer.alt_text.generate_on_upload', false)
            || config('statamic-ai-writer.alt_text.enabled', true) && env('GENERATE_ALT_TEXT_ON_UPLOAD', false);

        if (! $enabled) {
            return;
        }

        $asset = $event->asset;

        if (! $asset || ! $asset->isImage() || $asset->extension() === 'svg') {
            return;
        }

        GenerateAltTextJob::dispatch($asset->id(), [], false);
    }
}
