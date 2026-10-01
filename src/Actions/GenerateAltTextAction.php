<?php

namespace MuenchDev\StatamicAiWriter\Actions;

use MuenchDev\StatamicAiWriter\Jobs\GenerateAltTextJob;
use Statamic\Actions\Action;
use Statamic\Contracts\Assets\Asset;

class GenerateAltTextAction extends Action
{
    protected $icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/></svg>';

    public static function title()
    {
        return __('Generate AI Alt Text');
    }

    public function buttonText()
    {
        return __('Generate Alt Text|Generate Alt Texts');
    }

    public function confirmationText()
    {
        return __('Generate AI alt text for this image?|Generate AI alt texts for :count images?');
    }

    public function visibleTo($item)
    {
        return $item instanceof Asset
            && $item->isImage()
            && $item->extension() !== 'svg';
    }

    protected function fieldItems()
    {
        return [
            'overwrite' => [
                'display' => __('Overwrite existing alt text'),
                'type' => 'toggle',
                'default' => false,
                'inline_label' => __('No'),
                'inline_label_when_true' => __('Yes'),
            ],
        ];
    }

    public function run($assets, $values)
    {
        $overwrite = (bool) ($values['overwrite'] ?? false);

        $assets->each(function (Asset $asset) use ($overwrite) {
            GenerateAltTextJob::dispatch($asset->id(), [], $overwrite);
        });

        if (config('queue.default') === 'sync') {
            return __('Successfully generated alt texts.');
        }

        return __('Alt text generation queued successfully.');
    }
}
