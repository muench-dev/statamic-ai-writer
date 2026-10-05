<?php

namespace MuenchDev\StatamicAiWriter;

use MuenchDev\StatamicAiWriter\Actions\GenerateAltTextAction;
use MuenchDev\StatamicAiWriter\Listeners\GenerateAltTextOnUpload;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Events\AssetUploaded;
use Statamic\Facades\Permission;
use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $scripts = [
        __DIR__.'/../dist/js/ai-writer.js',
    ];

    protected $stylesheets = [
        __DIR__.'/../dist/css/ai-writer.css',
    ];

    protected $routes = [
        'cp' => __DIR__.'/../routes/cp.php',
    ];

    protected $actions = [
        GenerateAltTextAction::class,
    ];

    protected $listen = [
        AssetUploaded::class => [
            GenerateAltTextOnUpload::class,
        ],
    ];

    protected $config = true;

    public function register()
    {
        parent::register();

        $this->app->singleton(AiService::class, function () {
            return new AiService;
        });
    }

    public function bootAddon()
    {
        $this->bootPermissions();
        Statamic::provideToScript([
            'aiWriter' => fn ($request) => [
                'allowed' => (bool) $request->user()?->can('use ai writer'),
                'configured' => ! empty(config('statamic-ai-writer.api_key')),
                // The CP view composer may leave the translator on its fallback
                // locale, so resolve the dictionary using the CP locale explicitly.
                'translations' => __('statamic-ai-writer::messages', [], Statamic::cpLocale()),
            ],
        ]);
    }

    protected function bootPermissions(): void
    {
        Permission::register('use ai writer')
            ->label(__('statamic-ai-writer::messages.permission_label'))
            ->description(__('statamic-ai-writer::messages.permission_description'));
    }
}
