<?php

namespace MuenchDev\StatamicAiWriter\Listeners;

use MuenchDev\StatamicAiWriter\Jobs\GenerateAltTextJob;
use Statamic\Events\AssetUploaded;

class GenerateAltTextOnUpload
{
    public function handle(AssetUploaded $event): void
    {
        $enabled = config('statamic-ai-writer.alt_text.enabled', true)
            && config('statamic-ai-writer.alt_text.generate_on_upload', false);

        if (! $enabled) {
            return;
        }

        $asset = $event->asset;

        if (! $asset || ! $asset->isImage() || $asset->extension() === 'svg') {
            return;
        }

        if (($user = auth()->user()) && (! $user->can('use ai writer') || ! $user->can('edit', $asset))) {
            return;
        }

        GenerateAltTextJob::dispatch($asset->id(), [], false);
    }
}
