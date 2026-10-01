<?php

namespace MuenchDev\StatamicAiWriter\Http\Controllers;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use MuenchDev\StatamicAiWriter\Services\AiService;
use Statamic\Facades\Taxonomy;
use Statamic\Facades\Term;

class AiWriterController extends Controller
{
    protected AiService $ai;

    public function __construct(AiService $ai)
    {
        $this->ai = $ai;
    }

    /**
     * Process text manipulation (resize, summarize, translate, custom).
     */
    public function process(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|in:shorten,expand,rephrase,summarize,translate,custom',
            'text' => 'required|string',
            'format' => 'nullable|string|in:bullets,paragraph,tldr',
            'target_language' => 'nullable|string',
            'is_title' => 'nullable|boolean',
            'prompt' => 'nullable|string',
            'instructions' => 'nullable|string',
        ]);

        try {
            $result = match ($validated['action']) {
                'shorten', 'expand', 'rephrase' => $this->ai->resize(
                    $validated['text'],
                    $validated['action'],
                    $validated['instructions'] ?? null
                ),
                'summarize' => $this->ai->summarize(
                    $validated['text'],
                    $validated['format'] ?? 'bullets'
                ),
                'translate' => $this->ai->translate(
                    $validated['text'],
                    $validated['target_language'] ?? config('ai-writer.default_language', 'de'),
                    (bool) ($validated['is_title'] ?? false)
                ),
                'custom' => $this->ai->customPrompt(
                    $validated['text'],
                    $validated['prompt'] ?? 'Refine and improve this text'
                ),
            };

            return response()->json([
                'success' => true,
                'result' => $result,
                'action' => $validated['action'],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Suggest relevant tags and categories based on content.
     */
    public function classify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        try {
            $existingTaxonomies = $this->getExistingTaxonomies();

            $classification = $this->ai->classify(
                $validated['content'],
                $existingTaxonomies
            );

            return response()->json([
                'success' => true,
                'tags' => $classification['tags'],
                'categories' => $classification['categories'],
                'existing' => $existingTaxonomies,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get settings and options for the frontend dialog.
     */
    public function settings(Request $request): JsonResponse
    {
        $apiKey = config('statamic-ai-writer.api_key')
            ?: (config('ai-writer.api_key') ?: env('OPEN_AI_API_KEY'));

        return response()->json([
            'configured' => ! empty($apiKey),
            'model' => config('statamic-ai-writer.model') ?: (config('ai-writer.model') ?: env('OPEN_AI_MODEL', 'gpt-4o-mini')),
            'default_language' => config('statamic-ai-writer.default_language') ?: (config('ai-writer.default_language') ?: 'de'),
            'supported_languages' => config('statamic-ai-writer.supported_languages') ?: (config('ai-writer.supported_languages') ?: []),
            'taxonomies' => array_keys($this->getExistingTaxonomies()),
        ]);
    }

    /**
     * Fetch existing taxonomy terms from Statamic.
     *
     * @return array<string, string[]>
     */
    protected function getExistingTaxonomies(): array
    {
        $result = [];

        try {
            $taxonomies = Taxonomy::all();
            foreach ($taxonomies as $taxonomy) {
                $handle = $taxonomy->handle();
                $terms = Term::whereTaxonomy($handle)
                    ->map(fn($t) => $t->title() ?? $t->slug())
                    ->values()
                    ->all();

                $result[$handle] = $terms;
            }
        } catch (Exception $e) {
            // Statamic terms might not be available or initialized yet
        }

        return $result;
    }
}
