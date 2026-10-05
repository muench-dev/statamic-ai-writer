<?php

namespace MuenchDev\StatamicAiWriter\Actions;

use Exception;
use MuenchDev\StatamicAiWriter\Jobs\GenerateAltTextJob;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Actions\Action;
use Statamic\Contracts\Assets\Asset;

class GenerateAltTextAction extends Action
{
    // Adapted from Lucide (ISC); see the copyright and permission notice in LICENSE.
    protected $icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/></svg>';

    public static function title()
    {
        return __('statamic-ai-writer::messages.alt_text_action');
    }

    public function buttonText()
    {
        return __('statamic-ai-writer::messages.alt_text_button');
    }

    public function confirmationText()
    {
        return __('statamic-ai-writer::messages.alt_text_confirmation');
    }

    public function visibleTo($item)
    {
        return config('statamic-ai-writer.alt_text.enabled', true)
            && $item instanceof Asset
            && $item->isImage()
            && $item->extension() !== 'svg';
    }

    public function authorize($user, $asset)
    {
        return $user->can('use ai writer') && $user->can('edit', $asset);
    }

    protected function fieldItems()
    {
        return [
            'overwrite' => [
                'display' => __('statamic-ai-writer::messages.overwrite_alt_text'),
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

        if (empty(config('statamic-ai-writer.api_key'))) {
            throw new Exception(__('statamic-ai-writer::messages.alt_text_setup_required'));
        }

        if (config('queue.default') === 'sync') {
            $counts = ['generated' => 0, 'skipped' => 0, 'failed' => 0];
            foreach ($assets as $asset) {
                $job = new GenerateAltTextJob($asset->id(), [], $overwrite);
                try {
                    $job->handle(app(AiService::class));
                } catch (Exception $e) {
                    // The job records per-language failures and logs their details.
                    $job->result['failed'] = max(1, $job->result['failed']);
                }
                foreach ($counts as $key => $count) {
                    $counts[$key] += $job->result[$key];
                }
            }
            $message = __('statamic-ai-writer::messages.alt_text_result', $counts);
            if ($counts['failed'] > 0) {
                throw new Exception($message);
            }

            return $message;
        }

        $assets->each(fn (Asset $asset) => GenerateAltTextJob::dispatch($asset->id(), [], $overwrite));

        return __('statamic-ai-writer::messages.alt_text_queued');
    }
}
