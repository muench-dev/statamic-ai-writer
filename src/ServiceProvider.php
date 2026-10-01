<?php

namespace MuenchDev\StatamicAiWriter;

use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Facades\Permission;
use Statamic\Providers\AddonServiceProvider;

class ServiceProvider extends AddonServiceProvider
{
    protected $scripts = [
        __DIR__ . '/../dist/js/ai-writer.js',
    ];

    protected $stylesheets = [
        __DIR__ . '/../dist/css/ai-writer.css',
    ];

    protected $routes = [
        'cp' => __DIR__ . '/../routes/cp.php',
    ];

    protected $config = true;

    public function register()
    {
        parent::register();

        $this->app->singleton(AiService::class, function () {
            return new AiService();
        });
    }

    public function bootAddon()
    {
        $this->bootPermissions();
    }

    protected function bootPermissions(): void
    {
        Permission::register('use ai writer')
            ->label(__('Use AI Writer'))
            ->description(__('Allows using the AI Writer assistant in content editors.'));
    }
}
