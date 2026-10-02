<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use MuenchDev\StatamicAiWriter\Actions\GenerateAltTextAction;
use MuenchDev\StatamicAiWriter\Listeners\GenerateAltTextOnUpload;
use Statamic\Events\AssetUploaded;
use Statamic\Facades\Asset;
use Statamic\Facades\AssetContainer;
use Statamic\Facades\Role;
use Statamic\Facades\Site;
use Statamic\Facades\Taxonomy;
use Statamic\Facades\Term;
use Statamic\Facades\User;
use Statamic\Statamic;
use Statamic\Taxonomies\TermCollection;

class AuthorizationTest extends TestCase
{
    protected function editor(array $permissions = [])
    {
        config()->set('statamic.editions.pro', true);
        Role::make()->handle('ai-writer-test-editor')->permissions(['access cp', ...$permissions])->save();
        $user = User::make()->id('ai-writer-editor')->email('editor@example.com')->assignRole('ai-writer-test-editor');
        $this->actingAs($user);

        return $user;
    }

    public function test_all_routes_require_the_ai_writer_permission(): void
    {
        $this->editor();
        Http::fake();

        foreach (['process', 'classify', 'titles'] as $route) {
            $this->postJson(cp_route("ai-writer.{$route}"), [
                'action' => 'shorten', 'text' => 'Text', 'content' => 'Content',
            ])->assertForbidden();
        }
        $this->getJson(cp_route('ai-writer.settings'))->assertForbidden();
        Http::assertNothingSent();
        $this->assertFalse(Statamic::jsonVariables(request())['aiWriter']['allowed']);
    }

    public function test_non_super_editor_with_permission_can_use_all_routes(): void
    {
        $user = $this->editor(['use ai writer']);
        $this->assertFalse($user->isSuper());
        config()->set('statamic-ai-writer.api_key', 'test-key');
        Http::fake(['*' => Http::response(['choices' => [['message' => [
            'content' => '{"tags":["ai"],"categories":["Technology"],"titles":["A headline"]}',
        ]]]])]);

        $this->postJson(cp_route('ai-writer.process'), ['action' => 'shorten', 'text' => 'Text'])->assertOk();
        $this->postJson(cp_route('ai-writer.classify'), ['content' => 'Content'])->assertOk();
        $this->postJson(cp_route('ai-writer.titles'), ['content' => 'Content'])->assertOk();
        $this->getJson(cp_route('ai-writer.settings'))->assertOk();
    }

    public function test_taxonomy_context_respects_permissions_and_configured_allowlist(): void
    {
        $this->editor(['use ai writer', 'view tags terms', 'view topics terms']);
        config()->set('statamic-ai-writer.api_key', 'test-key');
        config()->set('statamic-ai-writer.classification.taxonomies', ['tags', 'categories']);
        $taxonomies = collect(['tags', 'categories', 'topics'])->map(fn ($handle) => Taxonomy::make()->handle($handle));
        Taxonomy::shouldReceive('all')->andReturn($taxonomies);
        Taxonomy::shouldReceive('findByHandle')->with('tags')->andReturn($taxonomies->first());
        $term = Term::make()->taxonomy('tags')->slug('public')->data(['title' => 'Public tag']);
        Term::shouldReceive('whereTaxonomy')->once()->with('tags')->andReturn(new TermCollection([
            $term,
        ]));
        Http::fake(['*' => Http::response(['choices' => [['message' => ['content' => '{"tags":[],"categories":[]}']]]])]);

        $this->postJson(cp_route('ai-writer.classify'), ['content' => 'Content'])
            ->assertOk()->assertJsonPath('existing', ['tags' => ['Public tag']]);
        Http::assertSent(fn ($request) => str_contains($request['messages'][0]['content'], 'Public tag')
            && ! str_contains($request['messages'][0]['content'], '[categories:')
            && ! str_contains($request['messages'][0]['content'], '[topics:'));

        Term::shouldReceive('whereTaxonomy')->once()->with('tags')->andReturn(new TermCollection);
        $this->getJson(cp_route('ai-writer.settings'))->assertOk()->assertJsonPath('taxonomies', ['tags']);
    }

    public function test_asset_action_requires_ai_permission_and_edit_access_per_container(): void
    {
        $asset = Asset::make()->container(AssetContainer::make()->handle('assets'))->path('sample.jpg');
        $other = Asset::make()->container(AssetContainer::make()->handle('private'))->path('sample.jpg');
        $action = new GenerateAltTextAction;

        $this->assertFalse($action->authorize($this->editor(['use ai writer', 'view assets assets']), $asset));
        $this->assertFalse($action->authorize($this->editor(['edit assets assets']), $asset));
        $user = $this->editor(['use ai writer', 'edit assets assets']);
        $this->assertTrue($action->authorize($user, $asset));
        $this->assertFalse($action->authorize($user, $other));
    }

    public function test_taxonomy_context_does_not_expose_titles_from_an_inaccessible_site(): void
    {
        $this->editor(['use ai writer', 'view tags terms', 'access french site']);
        config()->set('statamic.system.multisite', true);
        config()->set('statamic-ai-writer.api_key', 'test-key');
        Site::setSites([
            'english' => ['name' => 'English', 'url' => '/', 'locale' => 'en_US'],
            'french' => ['name' => 'French', 'url' => '/fr/', 'locale' => 'fr_FR'],
        ]);
        $taxonomy = Taxonomy::make()->handle('tags')->sites(['english', 'french']);
        Taxonomy::shouldReceive('all')->andReturn(collect([$taxonomy]));
        Taxonomy::shouldReceive('findByHandle')->with('tags')->andReturn($taxonomy);
        $term = Term::make()->taxonomy('tags')->slug('tag');
        $term->in('english')->data(['title' => 'Private English title']);
        $term->in('french')->data(['title' => 'French title']);
        Term::shouldReceive('whereTaxonomy')->with('tags')->andReturn(new TermCollection([$term]));
        Http::fake(['*' => Http::response(['choices' => [['message' => ['content' => '{"tags":[],"categories":[]}']]]])]);

        $this->postJson(cp_route('ai-writer.classify'), ['content' => 'Content'])
            ->assertOk()->assertJsonPath('existing.tags', ['French title']);
        Http::assertSent(fn ($request) => ! str_contains($request['messages'][0]['content'], 'Private English title'));
    }

    public function test_uploads_by_an_editor_without_ai_permission_do_not_spend_credits(): void
    {
        $this->editor(['edit assets assets']);
        config()->set('statamic-ai-writer.alt_text.generate_on_upload', true);
        Queue::fake();
        $asset = Asset::make()->container('assets')->path('sample.jpg');
        (new GenerateAltTextOnUpload)->handle(new AssetUploaded($asset, 'sample.jpg'));
        Queue::assertNothingPushed();
    }
}
