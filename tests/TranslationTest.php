<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Illuminate\Support\Facades\Http;
use MuenchDev\StatamicAiWriter\Actions\GenerateAltTextAction;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Http\View\Composers\JavascriptComposer;
use Statamic\Statamic;

class TranslationTest extends TestCase
{
    public function test_catalogues_have_matching_keys_and_placeholders(): void
    {
        $english = require __DIR__.'/../lang/en/messages.php';
        $german = require __DIR__.'/../lang/de/messages.php';
        $this->assertSame(array_keys($english), array_keys($german));

        foreach ($english as $key => $message) {
            $this->assertNotEmpty($german[$key], $key);
            preg_match_all('/:([a-z_]+)/', $message, $englishPlaceholders);
            preg_match_all('/:([a-z_]+)/', $german[$key], $germanPlaceholders);
            $this->assertSame($englishPlaceholders[0], $germanPlaceholders[0], $key);
            $this->assertSame(substr_count($message, '|'), substr_count($german[$key], '|'), $key);
        }
    }

    public function test_translations_are_registered_and_provided_in_the_current_cp_locale(): void
    {
        foreach (['en' => 'AI Assistant', 'de' => 'KI-Assistent'] as $locale => $label) {
            $this->app->setLocale($locale);
            $this->assertSame($label, __('statamic-ai-writer::messages.assistant'));
            $script = Statamic::jsonVariables(request())['aiWriter'];
            $this->assertSame($label, $script['translations']['assistant']);
            $this->assertArrayNotHasKey('api_key', $script);
        }
    }

    public function test_missing_locale_uses_english_fallback(): void
    {
        $this->app->setLocale('xx');
        $this->assertSame('AI Assistant', __('statamic-ai-writer::messages.assistant'));
    }

    public function test_cp_script_translations_survive_statamic_loading_english_fallback(): void
    {
        $this->app->setLocale('de');
        // The real CP view composer loads core fallback translations before
        // evaluating the addon's deferred script-data callback.
        $composer = $this->app->make(JavascriptComposer::class);
        $composer->compose(view('statamic::partials.scripts'));

        $script = Statamic::jsonVariables(request());
        $this->assertSame('de', $script['locale']);
        $this->assertSame('KI-Assistent', $script['aiWriter']['translations']['assistant']);
        $this->assertSame('Kürzen', $script['aiWriter']['translations']['shorten']);
    }

    public function test_german_alt_text_action_and_plural_confirmation(): void
    {
        $this->app->setLocale('de');
        $action = new GenerateAltTextAction;
        $this->assertSame('KI-Alternativtext generieren', $action::title());
        $this->assertSame('Alternativtext generieren|Alternativtexte generieren', $action->buttonText());
        $this->assertSame('KI-Alternativtext für dieses Bild generieren?', trans_choice('statamic-ai-writer::messages.alt_text_confirmation', 1));
        $this->assertSame('KI-Alternativtexte für 3 Bilder generieren?', trans_choice('statamic-ai-writer::messages.alt_text_confirmation', 3));
        $this->assertSame('2 Alternativtexte generiert. 1 vorhandene Alternativtexte übersprungen. Fehlgeschlagen: 0.', __('statamic-ai-writer::messages.alt_text_result', [
            'generated' => 2, 'skipped' => 1, 'failed' => 0,
        ]));
    }

    public function test_package_owned_provider_errors_are_translated_without_sending_requests(): void
    {
        $this->app->setLocale('de');
        config()->set('statamic-ai-writer.api_key', null);
        Http::fake();

        try {
            (new AiService)->resize('Text', 'shorten');
            $this->fail('Missing credentials must fail.');
        } catch (\Exception $e) {
            $this->assertSame(__('statamic-ai-writer::messages.missing_api_key'), $e->getMessage());
            $this->assertStringContainsString('Der OpenAI-API-Schlüssel fehlt.', $e->getMessage());
        }

        Http::assertNothingSent();
    }
}
